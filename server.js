import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'agent-bank-secret-2026'
const DATA_FILE = path.join(process.cwd(), 'data.json')

// Load or initialize data
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    }
  } catch (e) { console.error('Error loading data:', e) }
  return { users: [], agents: [], transactions: [], balances: {} }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

let data = loadData()

app.use(cors())
app.use(express.json())

// Helper functions
function createUser(email, password) {
  const id = uuidv4()
  const user = { id, email, password, created_at: new Date().toISOString() }
  data.users.push(user)
  data.balances[id] = 0
  saveData()
  return { id, email }
}

function getUserByEmail(email) {
  return data.users.find(u => u.email === email)
}

function getUserById(id) {
  const u = data.users.find(u => u.id === id)
  return u ? { id: u.id, email: u.email, created_at: u.created_at } : null
}

function getUserBalance(userId) {
  return data.balances[userId] || 0
}

function updateUserBalance(userId, amount) {
  data.balances[userId] = (data.balances[userId] || 0) + amount
  saveData()
}

function connectAgent(userId, name, agentId, apiKey, category) {
  const id = uuidv4()
  const agent = {
    id, user_id: userId, name, agent_id: agentId,
    api_key: apiKey || '', status: 'connected', balance: 0,
    daily_limit: 100, transaction_limit: 50,
    category: category || 'other', created_at: new Date().toISOString()
  }
  data.agents.push(agent)
  saveData()
  return agent
}

function getUserAgents(userId) {
  return data.agents.filter(a => a.user_id === userId)
}

function getAgentById(id) {
  return data.agents.find(a => a.id === id)
}

function getAgentByAgentId(agentId) {
  return data.agents.find(a => a.agent_id === agentId)
}

function updateAgentBalance(id, amount) {
  const a = data.agents.find(a => a.id === id)
  if (a) { a.balance = (a.balance || 0) + amount; saveData() }
}

function updateAgentStatus(id, status) {
  const a = data.agents.find(a => a.id === id)
  if (a) { a.status = status; saveData() }
}

function updateAgentRules(id, dl, tl) {
  const a = data.agents.find(a => a.id === id)
  if (a) { a.daily_limit = dl || 100; a.transaction_limit = tl || 50; saveData() }
}

function updateAgentCategory(id, cat) {
  const a = data.agents.find(a => a.id === id)
  if (a) { a.category = cat; saveData() }
}

function createTransaction(agentId, type, amount, source, destination, status, reason) {
  const id = uuidv4()
  const tx = { id, agent_id: agentId, type, amount, source, destination, status, reason, created_at: new Date().toISOString() }
  data.transactions.push(tx)
  if (status === 'completed') {
    if (type === 'fund_agent') {
      updateAgentBalance(agentId, amount)
      const a = data.agents.find(a => a.id === agentId)
      if (a) updateUserBalance(a.user_id, -amount)
    } else if (type === 'agent_spend') {
      updateAgentBalance(agentId, -amount)
    }
  }
  return tx
}

function getAgentTransactions(id) {
  return data.transactions.filter(t => t.agent_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function getUserTransactions(userId) {
  const uas = getUserAgents(userId)
  const ids = new Set(uas.map(a => a.id))
  return data.transactions.filter(t => ids.has(t.agent_id))
    .map(t => ({ ...t, agent_name: data.agents.find(a => a.id === t.agent_id)?.name }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function getTodaySpending(id) {
  const today = new Date().toISOString().split('T')[0]
  return data.transactions
    .filter(x => x.agent_id === id && x.type === 'agent_spend' && x.status === 'completed' && x.created_at?.startsWith(today))
    .reduce((s, x) => s + x.amount, 0)
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try { req.userId = jwt.verify(token, JWT_SECRET).userId; next() }
  catch { res.status(401).json({ error: 'Invalid token' }) }
}

// Routes
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const existing = getUserByEmail(email)
  if (existing) return res.status(400).json({ error: 'Email already exists' })
  const user = createUser(email, await bcrypt.hash(password, 10))
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const user = getUserByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

app.get('/api/me', auth, (req, res) => res.json(getUserById(req.userId)))
app.get('/api/balance', auth, (req, res) => res.json({ balance: getUserBalance(req.userId) }))

app.post('/api/fund', auth, (req, res) => {
  const { amount } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' })
  updateUserBalance(req.userId, amount)
  res.json({ balance: getUserBalance(req.userId) })
})

app.get('/api/agents', auth, (req, res) => res.json(getUserAgents(req.userId)))
app.post('/api/agents', auth, (req, res) => {
  const { name, agentId, apiKey, category } = req.body
  if (!name || !agentId) return res.status(400).json({ error: 'Name and Agent ID required' })
  res.json(connectAgent(req.userId, name, agentId, apiKey, category))
})

app.get('/api/transactions', auth, (req, res) => res.json(getUserTransactions(req.userId)))

app.get('/api/stats', auth, (req, res) => {
  const agts = getUserAgents(req.userId)
  const txs = getUserTransactions(req.userId)
  const bal = getUserBalance(req.userId)
  const today = new Date().toISOString().split('T')[0]
  res.json({
    balance: bal,
    totalAgentBalance: agts.reduce((s, a) => s + a.balance, 0),
    agentCount: agts.length,
    totalTransactions: txs.length,
    todaySpend: txs.filter(t => t.type === 'agent_spend' && t.status === 'completed' && t.created_at?.startsWith(today)).reduce((s, t) => s + t.amount, 0),
    activeAgents: agts.filter(a => a.status === 'connected').length
  })
})

// Single agent routes
app.get('/api/agents/:id', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  res.json(agent)
})

app.put('/api/agents/:id/status', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  updateAgentStatus(req.params.id, req.body.status)
  res.json({ success: true })
})

app.put('/api/agents/:id/rules', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  updateAgentRules(req.params.id, req.body.dailyLimit, req.body.transactionLimit)
  res.json({ success: true })
})

app.put('/api/agents/:id/category', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  updateAgentCategory(req.params.id, req.body.category)
  res.json({ success: true })
})

app.post('/api/agents/:id/fund', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  const { amount } = req.body
  const bal = getUserBalance(req.userId)
  if (bal < amount) return res.status(400).json({ error: 'Insufficient balance' })
  createTransaction(req.params.id, 'fund_agent', amount, 'user', 'agent', 'completed', 'User funded agent wallet')
  updateUserBalance(req.userId, -amount)
  updateAgentBalance(req.params.id, amount)
  res.json({ success: true })
})

app.get('/api/agents/:id/transactions', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  res.json(getAgentTransactions(req.params.id))
})

// Public spend API
app.post('/api/agent/spend', async (req, res) => {
  const { agentId, apiKey, amount, reason, destination } = req.body
  if (!agentId || !amount || !reason) return res.status(400).json({ error: 'Missing required fields' })
  const agent = getAgentByAgentId(agentId)
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  if (agent.api_key && agent.api_key !== apiKey) return res.status(401).json({ error: 'Invalid API key' })
  if (agent.status !== 'connected') return res.status(400).json({ error: 'Agent is not active' })
  if (agent.balance < amount) {
    createTransaction(agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason)
    return res.status(400).json({ error: 'Insufficient balance' })
  }
  const todaySpend = getTodaySpending(agent.id)
  if (todaySpend + amount > agent.daily_limit) {
    createTransaction(agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason)
    return res.status(400).json({ error: 'Daily limit exceeded' })
  }
  if (amount > agent.transaction_limit) {
    createTransaction(agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'pending', reason)
    return res.status(202).json({ status: 'pending', message: 'Amount exceeds transaction limit' })
  }
  createTransaction(agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'completed', reason)
  updateAgentBalance(agent.id, -amount)
  res.json({ success: true, message: 'Transaction completed' })
})

// Error handlers
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  saveData()
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
  saveData()
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, saving data before exit...')
  saveData()
  process.exit(0)
})

app.listen(PORT, () => console.log('Agent Bank API running on port ' + PORT))
