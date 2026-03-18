import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db, { initDatabase, createUser, getUserByEmail, getUserById, getUserBalance, updateUserBalance, connectAgent, getUserAgents, getAgentById, updateAgentBalance, updateAgentStatus, updateAgentRules, createTransaction, getAgentTransactions, getUserTransactions, getTodayAgentSpending } from './db.js'

const app = express()
const PORT = 3001
const JWT_SECRET = 'agent-bank-secret-2026'

app.use(cors())
app.use(express.json())

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try { 
    req.userId = jwt.verify(token, JWT_SECRET).userId
    next() 
  } catch { 
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = createUser(email, await bcrypt.hash(password, 10))
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' })
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const user = getUserByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

app.get('/api/me', auth, (req, res) => res.json(getUserById(req.userId)))

// Balance & funding
app.get('/api/balance', auth, (req, res) => res.json({ balance: getUserBalance(req.userId) }))
app.post('/api/fund', auth, (req, res) => {
  const { amount } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' })
  updateUserBalance(req.userId, amount)
  res.json({ balance: getUserBalance(req.userId) })
})

// Agent routes
app.get('/api/agents', auth, (req, res) => res.json(getUserAgents(req.userId)))
app.post('/api/agents', auth, (req, res) => {
  const { name, agentId, apiKey } = req.body
  if (!name || !agentId) return res.status(400).json({ error: 'Name and Agent ID required' })
  res.json(connectAgent(req.userId, name, agentId, apiKey || ''))
})
app.get('/api/agents/:id', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Agent not found' })
  res.json(agent)
})
app.put('/api/agents/:id/status', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Agent not found' })
  updateAgentStatus(req.params.id, req.body.status)
  res.json({ success: true })
})
app.put('/api/agents/:id/rules', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Agent not found' })
  updateAgentRules(req.params.id, req.body.dailyLimit || 100, req.body.transactionLimit || 50)
  res.json({ success: true })
})

app.post('/api/agents/:id/fund', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Agent not found' })
  const { amount } = req.body
  const userBalance = getUserBalance(req.userId)
  if (userBalance < amount) return res.status(400).json({ error: 'Insufficient balance' })
  createTransaction(req.params.id, 'fund_agent', amount, 'user', 'agent', 'completed', 'User funded agent wallet')
  updateUserBalance(req.userId, -amount)
  updateAgentBalance(req.params.id, amount)
  res.json({ success: true })
})

// Transaction routes
app.get('/api/transactions', auth, (req, res) => res.json(getUserTransactions(req.userId)))
app.get('/api/agents/:id/transactions', auth, (req, res) => {
  const agent = getAgentById(req.params.id)
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Agent not found' })
  res.json(getAgentTransactions(req.params.id))
})

// Agent spend API (for OpenClaw agents to call)
app.post('/api/agent/spend', async (req, res) => {
  const { agentId, apiKey, amount, reason, destination } = req.body
  if (!agentId || !amount || !reason) return res.status(400).json({ error: 'Missing required fields' })
  const agent = getAgentById(agentId)
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  if (agent.api_key && agent.api_key !== apiKey) return res.status(401).json({ error: 'Invalid API key' })
  if (agent.status !== 'connected') return res.status(400).json({ error: 'Agent is not active' })
  if (agent.balance < amount) {
    createTransaction(agentId, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason)
    return res.status(400).json({ error: 'Insufficient balance' })
  }
  const todaySpend = getTodayAgentSpending(agentId)
  if (todaySpend + amount > agent.daily_limit) {
    createTransaction(agentId, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason)
    return res.status(400).json({ error: 'Daily limit exceeded' })
  }
  if (amount > agent.transaction_limit) {
    createTransaction(agentId, 'agent_spend', amount, 'agent', destination || 'system', 'pending', reason)
    return res.status(202).json({ status: 'pending', message: 'Amount exceeds transaction limit - pending approval' })
  }
  createTransaction(agentId, 'agent_spend', amount, 'agent', destination || 'system', 'completed', reason)
  updateAgentBalance(agentId, -amount)
  res.json({ success: true, message: 'Transaction completed' })
})

// Stats endpoint
app.get('/api/stats', auth, (req, res) => {
  const agents = getUserAgents(req.userId)
  const txs = getUserTransactions(req.userId)
  const balance = getUserBalance(req.userId)
  
  const totalAgentBalance = agents.reduce((sum, a) => sum + a.balance, 0)
  const today = new Date().toISOString().split('T')[0]
  const todaySpend = txs
    .filter(t => t.type === 'agent_spend' && t.status === 'completed' && t.created_at?.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0)
  
  res.json({
    balance,
    totalAgentBalance,
    agentCount: agents.length,
    totalTransactions: txs.length,
    todaySpend,
    activeAgents: agents.filter(a => a.status === 'connected').length
  })
})

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => console.log(`🏦 Agent Bank API running on http://localhost:${PORT}`))
}).catch(e => {
  console.error('Failed to initialize database:', e)
  process.exit(1)
})
