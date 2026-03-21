import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import fs from 'fs'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'agent-bank-secret-2026'
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const MARKUP_PERCENT = parseInt(process.env.MARKUP_PERCENT || '20')
const DB_PATH = path.join(process.cwd(), 'data.json')

// Initialize Stripe
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null

// Initialize file if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], agents: [], transactions: [], balances: {} }, null, 2))
  }
}

// Load data
function loadData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
    }
  } catch (e) { console.error('Error loading data:', e) }
  return { users: [], agents: [], transactions: [], balances: {} }
}

// Save data
function saveData(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

let data = loadData()
initDB()

app.use(cors())
app.use(express.json())

// Stripe webhook
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' })
  
  const sig = req.headers['stripe-signature']
  let event
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id
    const amount = session.amount_total / 100
    
    if (userId && amount > 0) {
      data = loadData()
      data.balances[userId] = (data.balances[userId] || 0) + amount
      data.payments = data.payments || []
      data.payments.push({ id: session.id, user_id: userId, amount, status: 'completed', created_at: new Date().toISOString() })
      saveData(data)
      console.log(`Payment completed: $${amount} for user ${userId}`)
    }
  }
  
  res.json({ received: true })
})

// Helper functions
function createUser(email, password) {
  const id = Date.now().toString()
  const user = { id, email, password, created_at: new Date().toISOString() }
  data = loadData()
  data.users.push(user)
  data.balances[id] = 0
  saveData(data)
  return { id, email }
}

function getUserByEmail(email) {
  data = loadData()
  return data.users.find(u => u.email === email)
}

function getUserById(id) {
  data = loadData()
  const u = data.users.find(u => u.id === id)
  return u ? { id: u.id, email: u.email, created_at: u.created_at } : null
}

function getUserBalance(userId) {
  data = loadData()
  return data.balances[userId] || 0
}

function updateUserBalance(userId, amount) {
  data = loadData()
  data.balances[userId] = (data.balances[userId] || 0) + amount
  saveData(data)
}

function connectAgent(userId, name, agentId, apiKey, category) {
  const id = Date.now().toString()
  const agent = {
    id, user_id: userId, name, agent_id: agentId,
    api_key: apiKey || '', status: 'connected', balance: 0,
    daily_limit: 100, transaction_limit: 50,
    category: category || 'other', created_at: new Date().toISOString()
  }
  data = loadData()
  data.agents.push(agent)
  saveData(data)
  return agent
}

function getUserAgents(userId) {
  data = loadData()
  return data.agents.filter(a => a.user_id === userId)
}

function getAgentById(id) {
  data = loadData()
  return data.agents.find(a => a.id === id)
}

function getAgentByAgentId(agentId) {
  data = loadData()
  return data.agents.find(a => a.agent_id === agentId)
}

function updateAgentBalance(id, amount) {
  data = loadData()
  const a = data.agents.find(a => a.id === id)
  if (a) { a.balance = (a.balance || 0) + amount; saveData(data) }
}

function updateAgentStatus(id, status) {
  data = loadData()
  const a = data.agents.find(a => a.id === id)
  if (a) { a.status = status; saveData(data) }
}

function updateAgentRules(id, dl, tl) {
  data = loadData()
  const a = data.agents.find(a => a.id === id)
  if (a) { a.daily_limit = dl || 100; a.transaction_limit = tl || 50; saveData(data) }
}

function updateAgentCategory(id, cat) {
  data = loadData()
  const a = data.agents.find(a => a.id === id)
  if (a) { a.category = cat; saveData(data) }
}

function createTransaction(agentId, type, amount, source, destination, status, reason) {
  const id = Date.now().toString()
  const tx = { id, agent_id: agentId, type, amount, source, destination, status, reason, created_at: new Date().toISOString() }
  data = loadData()
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
  saveData(data)
  return tx
}

function getAgentTransactions(id) {
  data = loadData()
  return data.transactions.filter(t => t.agent_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function getUserTransactions(userId) {
  data = loadData()
  const uas = getUserAgents(userId)
  const ids = new Set(uas.map(a => a.id))
  return data.transactions.filter(t => ids.has(t.agent_id))
    .map(t => ({ ...t, agent_name: data.agents.find(a => a.id === t.agent_id)?.name }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function getTodaySpending(id) {
  data = loadData()
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

app.post('/api/create-checkout-session', auth, async (req, res) => {
  const { amount } = req.body
  
  if (!stripe) {
    updateUserBalance(req.userId, amount)
    return res.json({ 
      success: true, 
      demo: true,
      balance: getUserBalance(req.userId),
      message: 'Demo mode: Funds added directly (no real payment)'
    })
  }
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount required' })
  }
  
  const amountInCents = Math.round(amount * 100)
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Agent Bank Wallet Funding' },
          unit_amount: amountInCents
        },
        quantity: 1
      }],
      mode: 'payment',
      client_reference_id: req.userId,
      success_url: `${req.headers.origin || 'https://agent-bank-ruby.vercel.app'}?payment=success`,
      cancel_url: `${req.headers.origin || 'https://agent-bank-ruby.vercel.app'}?payment=cancelled`
    })
    
    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/stripe-config', auth, (req, res) => {
  res.json({ 
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    markupPercent: MARKUP_PERCENT,
    demoMode: !stripe
  })
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

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received')
  process.exit(0)
})

app.listen(PORT, () => {
  console.log('Agent Bank API running on port ' + PORT)
  if (!stripe) {
    console.log('⚠️  Stripe not configured - running in DEMO mode')
  } else {
    console.log('💳 Stripe enabled with ' + MARKUP_PERCENT + '% markup')
  }
})
