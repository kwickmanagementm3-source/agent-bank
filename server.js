import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import pg from 'pg'

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'agent-bank-secret-2026'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Initialize database tables
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS balances (
      user_id UUID PRIMARY KEY REFERENCES users(id),
      amount DECIMAL(15,2) DEFAULT 0
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      name TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      api_key TEXT,
      status TEXT DEFAULT 'connected',
      balance DECIMAL(15,2) DEFAULT 0,
      daily_limit DECIMAL(15,2) DEFAULT 100,
      transaction_limit DECIMAL(15,2) DEFAULT 50,
      category TEXT DEFAULT 'other',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY,
      agent_id UUID REFERENCES agents(id),
      type TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      source TEXT,
      destination TEXT,
      status TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  console.log('Database initialized')
}

app.use(cors())
app.use(express.json())

// Routes
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  try {
    const id = uuidv4()
    const hash = await bcrypt.hash(password, 10)
    await pool.query('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)', [id, email, hash])
    await pool.query('INSERT INTO balances (user_id, amount) VALUES ($1, $2)', [id, 0])
    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id, email } })
  } catch (e) {
    res.status(400).json({ error: 'Email already exists' })
  }
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try { req.userId = jwt.verify(token, JWT_SECRET).userId; next() }
  catch { res.status(401).json({ error: 'Invalid token' }) }
}

app.get('/api/me', auth, async (req, res) => {
  const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.userId])
  res.json(result.rows[0])
})

app.get('/api/balance', auth, async (req, res) => {
  const result = await pool.query('SELECT amount FROM balances WHERE user_id = $1', [req.userId])
  res.json({ balance: parseFloat(result.rows[0]?.amount) || 0 })
})

app.post('/api/fund', auth, async (req, res) => {
  const { amount } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' })
  await pool.query('UPDATE balances SET amount = amount + $1 WHERE user_id = $2', [amount, req.userId])
  const result = await pool.query('SELECT amount FROM balances WHERE user_id = $1', [req.userId])
  res.json({ balance: parseFloat(result.rows[0].amount) })
})

app.get('/api/agents', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM agents WHERE user_id = $1', [req.userId])
  res.json(result.rows.map(a => ({ ...a, balance: parseFloat(a.balance) })))
})

app.post('/api/agents', auth, async (req, res) => {
  const { name, agentId, apiKey, category } = req.body
  if (!name || !agentId) return res.status(400).json({ error: 'Name and Agent ID required' })
  const id = uuidv4()
  await pool.query(
    'INSERT INTO agents (id, user_id, name, agent_id, api_key, category) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, req.userId, name, agentId, apiKey || '', category || 'other']
  )
  res.json({ id, user_id: req.userId, name, agent_id: agentId, api_key: apiKey, status: 'connected', balance: 0 })
})

app.get('/api/transactions', auth, async (req, res) => {
  const agt = await pool.query('SELECT id, name FROM agents WHERE user_id = $1', [req.userId])
  const agentMap = new Map(agt.rows.map(a => [a.id, a.name]))
  const ids = agt.rows.map(a => a.id)
  if (ids.length === 0) return res.json([])
  const result = await pool.query(`SELECT * FROM transactions WHERE agent_id = ANY($1) ORDER BY created_at DESC`, [ids])
  res.json(result.rows.map(t => ({ ...t, agent_name: agentMap.get(t.agent_id), amount: parseFloat(t.amount) })))
})

app.get('/api/stats', auth, async (req, res) => {
  const bal = await pool.query('SELECT amount FROM balances WHERE user_id = $1', [req.userId])
  const agts = await pool.query('SELECT * FROM agents WHERE user_id = $1', [req.userId])
  const ids = agts.rows.map(a => a.id)
  const txs = ids.length > 0 ? await pool.query(`SELECT * FROM transactions WHERE agent_id = ANY($1)`, [ids]) : { rows: [] }
  const today = new Date().toISOString().split('T')[0]
  const todaySpend = txs.rows
    .filter(t => t.type === 'agent_spend' && t.status === 'completed' && t.created_at?.startsWith(today))
    .reduce((s, t) => s + parseFloat(t.amount), 0)
  res.json({
    balance: parseFloat(bal.rows[0]?.amount) || 0,
    totalAgentBalance: agts.rows.reduce((s, a) => s + parseFloat(a.balance), 0),
    agentCount: agts.rows.length,
    totalTransactions: txs.rows.length,
    todaySpend,
    activeAgents: agts.rows.filter(a => a.status === 'connected').length
  })
})

// Single agent routes
app.get('/api/agents/:id', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id])
  if (!result.rows[0] || result.rows[0].user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  res.json({ ...result.rows[0], balance: parseFloat(result.rows[0].balance) })
})

app.put('/api/agents/:id/status', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id])
  if (!result.rows[0] || result.rows[0].user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  await pool.query('UPDATE agents SET status = $1 WHERE id = $2', [req.body.status, req.params.id])
  res.json({ success: true })
})

app.put('/api/agents/:id/rules', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id])
  if (!result.rows[0] || result.rows[0].user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  await pool.query('UPDATE agents SET daily_limit = $1, transaction_limit = $2 WHERE id = $3', 
    [req.body.dailyLimit || 100, req.body.transactionLimit || 50, req.params.id])
  res.json({ success: true })
})

app.put('/api/agents/:id/category', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id])
  if (!result.rows[0] || result.rows[0].user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  await pool.query('UPDATE agents SET category = $1 WHERE id = $2', [req.body.category, req.params.id])
  res.json({ success: true })
})

app.post('/api/agents/:id/fund', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id])
  if (!result.rows[0] || result.rows[0].user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  const { amount } = req.body
  const bal = await pool.query('SELECT amount FROM balances WHERE user_id = $1', [req.userId])
  if (parseFloat(bal.rows[0].amount) < amount) return res.status(400).json({ error: 'Insufficient balance' })
  const txId = uuidv4()
  await pool.query('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [txId, req.params.id, 'fund_agent', amount, 'user', 'agent', 'completed', 'User funded agent wallet'])
  await pool.query('UPDATE balances SET amount = amount - $1 WHERE user_id = $2', [amount, req.userId])
  await pool.query('UPDATE agents SET balance = balance + $1 WHERE id = $2', [amount, req.params.id])
  res.json({ success: true })
})

app.get('/api/agents/:id/transactions', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id])
  if (!result.rows[0] || result.rows[0].user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  const txs = await pool.query('SELECT * FROM transactions WHERE agent_id = $1 ORDER BY created_at DESC', [req.params.id])
  res.json(txs.rows.map(t => ({ ...t, amount: parseFloat(t.amount) })))
})

// Public spend API
app.post('/api/agent/spend', async (req, res) => {
  const { agentId, apiKey, amount, reason, destination } = req.body
  if (!agentId || !amount || !reason) return res.status(400).json({ error: 'Missing required fields' })
  const result = await pool.query('SELECT * FROM agents WHERE agent_id = $1', [agentId])
  const agent = result.rows[0]
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  if (agent.api_key && agent.api_key !== apiKey) return res.status(401).json({ error: 'Invalid API key' })
  if (agent.status !== 'connected') return res.status(400).json({ error: 'Agent is not active' })
  if (parseFloat(agent.balance) < amount) {
    const txId = uuidv4()
    await pool.query('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [txId, agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason])
    return res.status(400).json({ error: 'Insufficient balance' })
  }
  const today = new Date().toISOString().split('T')[0]
  const todayTxs = await pool.query(
    'SELECT SUM(amount) as total FROM transactions WHERE agent_id = $1 AND type = $2 AND status = $3 AND created_at::text LIKE $4',
    [agent.id, 'agent_spend', 'completed', today + '%']
  )
  const todaySpend = parseFloat(todayTxs.rows[0]?.total) || 0
  if (todaySpend + amount > parseFloat(agent.daily_limit)) {
    const txId = uuidv4()
    await pool.query('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [txId, agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason])
    return res.status(400).json({ error: 'Daily limit exceeded' })
  }
  if (amount > parseFloat(agent.transaction_limit)) {
    const txId = uuidv4()
    await pool.query('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [txId, agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'pending', reason])
    return res.status(202).json({ status: 'pending', message: 'Amount exceeds transaction limit' })
  }
  const txId = uuidv4()
  await pool.query('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [txId, agent.id, 'agent_spend', amount, 'agent', destination || 'system', 'completed', reason])
  await pool.query('UPDATE agents SET balance = balance - $1 WHERE id = $2', [amount, agent.id])
  res.json({ success: true, message: 'Transaction completed' })
})

// Error handlers
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

initDB().then(() => {
  app.listen(PORT, () => console.log('Agent Bank API running on port ' + PORT))
})
