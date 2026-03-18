import initSqlJs from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'agent-bank-secret-2026'
const DB_PATH = './bank.db'

app.use(cors())
app.use(express.json())

// Database
let db = null

async function getDb() {
  if (db) return db
  const SQL = await initSqlJs()
  try {
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(fileBuffer)
    } else {
      db = new SQL.Database()
    }
  } catch (e) {
    db = new SQL.Database()
  }
  db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`)
  db.run(`CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, agent_id TEXT NOT NULL, api_key TEXT, status TEXT DEFAULT 'connected', balance REAL DEFAULT 0, daily_limit REAL DEFAULT 100, transaction_limit REAL DEFAULT 50, category TEXT DEFAULT 'other', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`)
  db.run(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, source TEXT NOT NULL, destination TEXT NOT NULL, status TEXT DEFAULT 'pending', reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`)
  db.run(`CREATE TABLE IF NOT EXISTS user_balance (id INTEGER PRIMARY KEY, user_id TEXT UNIQUE NOT NULL, balance REAL DEFAULT 0)`)
  saveDb()
  return db
}

function saveDb() {
  if (!db) return
  try {
    const data = db.export()
    fs.writeFileSync(DB_PATH, Buffer.from(data))
  } catch (e) { console.error('Save error:', e) }
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row }
  stmt.free()
  return null
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) { results.push(stmt.getAsObject()) }
  stmt.free()
  return results
}

function run(sql, params = []) { db.run(sql, params); saveDb() }

// Auth
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try { req.userId = jwt.verify(token, JWT_SECRET).userId; next() } 
  catch { res.status(401).json({ error: 'Invalid token' }) }
}

// Routes
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const id = uuidv4()
  run('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [id, email, await bcrypt.hash(password, 10)])
  run('INSERT INTO user_balance (user_id, balance) VALUES (?, 0)', [id])
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id, email } })
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const user = queryOne('SELECT * FROM users WHERE email = ?', [email])
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

app.get('/api/me', auth, (req, res) => res.json(queryOne('SELECT id, email, created_at FROM users WHERE id = ?', [req.userId])))

app.get('/api/balance', auth, (req, res) => {
  const r = queryOne('SELECT balance FROM user_balance WHERE user_id = ?', [req.userId])
  res.json({ balance: r ? r.balance : 0 })
})

app.post('/api/fund', auth, (req, res) => {
  const { amount } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' })
  run('UPDATE user_balance SET balance = balance + ? WHERE user_id = ?', [amount, req.userId])
  const r = queryOne('SELECT balance FROM user_balance WHERE user_id = ?', [req.userId])
  res.json({ balance: r.balance })
})

app.get('/api/agents', auth, (req, res) => res.json(queryAll('SELECT * FROM agents WHERE user_id = ?', [req.userId])))

app.post('/api/agents', auth, (req, res) => {
  const { name, agentId, apiKey, category } = req.body
  if (!name || !agentId) return res.status(400).json({ error: 'Name and Agent ID required' })
  const id = uuidv4()
  run('INSERT INTO agents (id, user_id, name, agent_id, api_key, balance, status, category) VALUES (?, ?, ?, ?, ?, 0, ?, ?)', [id, req.userId, name, agentId, apiKey || '', 'connected', category || 'other'])
  res.json({ id, name, agent_id: agentId, balance: 0, status: 'connected', daily_limit: 100, transaction_limit: 50, category: category || 'other' })
})

app.get('/api/transactions', auth, (req, res) => {
  const txs = queryAll('SELECT t.*, a.name as agent_name FROM transactions t JOIN agents a ON t.agent_id = a.id WHERE a.user_id = ? ORDER BY t.created_at DESC', [req.userId])
  res.json(txs)
})

app.get('/api/stats', auth, (req, res) => {
  const agents = queryAll('SELECT * FROM agents WHERE user_id = ?', [req.userId])
  const txs = queryAll('SELECT t.* FROM transactions t JOIN agents a ON t.agent_id = a.id WHERE a.user_id = ?', [req.userId])
  const r = queryOne('SELECT balance FROM user_balance WHERE user_id = ?', [req.userId])
  const today = new Date().toISOString().split('T')[0]
  const todaySpend = txs.filter(t => t.type === 'agent_spend' && t.status === 'completed' && t.created_at?.startsWith(today)).reduce((s, t) => s + t.amount, 0)
  res.json({ balance: r?.balance || 0, totalAgentBalance: agents.reduce((s, a) => s + a.balance, 0), agentCount: agents.length, totalTransactions: txs.length, todaySpend, activeAgents: agents.filter(a => a.status === 'connected').length })
})

// Single agent routes
app.get('/api/agents/:id', auth, (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id])
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  res.json(agent)
})

app.put('/api/agents/:id/status', auth, (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id])
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  run('UPDATE agents SET status = ? WHERE id = ?', [req.body.status, req.params.id])
  res.json({ success: true })
})

app.put('/api/agents/:id/rules', auth, (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id])
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  run('UPDATE agents SET daily_limit = ?, transaction_limit = ? WHERE id = ?', [req.body.dailyLimit || 100, req.body.transactionLimit || 50, req.params.id])
  res.json({ success: true })
})

app.put('/api/agents/:id/category', auth, (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id])
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  run('UPDATE agents SET category = ? WHERE id = ?', [req.body.category, req.params.id])
  res.json({ success: true })
})

app.post('/api/agents/:id/fund', auth, (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id])
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  const { amount } = req.body
  const bal = queryOne('SELECT balance FROM user_balance WHERE user_id = ?', [req.userId])
  if (bal.balance < amount) return res.status(400).json({ error: 'Insufficient balance' })
  const txId = uuidv4()
  run('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [txId, req.params.id, 'fund_agent', amount, 'user', 'agent', 'completed', 'User funded agent wallet'])
  run('UPDATE user_balance SET balance = balance - ? WHERE user_id = ?', [amount, req.userId])
  run('UPDATE agents SET balance = balance + ? WHERE id = ?', [amount, req.params.id])
  res.json({ success: true })
})

app.get('/api/agents/:id/transactions', auth, (req, res) => {
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [req.params.id])
  if (!agent || agent.user_id !== req.userId) return res.status(404).json({ error: 'Not found' })
  res.json(queryAll('SELECT * FROM transactions WHERE agent_id = ? ORDER BY created_at DESC', [req.params.id]))
})

// Public spend API
app.post('/api/agent/spend', async (req, res) => {
  const { agentId, apiKey, amount, reason, destination } = req.body
  if (!agentId || !amount || !reason) return res.status(400).json({ error: 'Missing required fields' })
  const agent = queryOne('SELECT * FROM agents WHERE id = ?', [agentId])
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  if (agent.api_key && agent.api_key !== apiKey) return res.status(401).json({ error: 'Invalid API key' })
  if (agent.status !== 'connected') return res.status(400).json({ error: 'Agent is not active' })
  const today = new Date().toISOString().split('T')[0]
  const todaySpend = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE agent_id = ? AND type = 'agent_spend' AND status = 'completed' AND created_at LIKE ?", [agentId, today + '%'])
  if (agent.balance < amount) { run('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uuidv4(), agentId, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason]); return res.status(400).json({ error: 'Insufficient balance' }) }
  if (todaySpend.total + amount > agent.daily_limit) { run('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uuidv4(), agentId, 'agent_spend', amount, 'agent', destination || 'system', 'rejected', reason]); return res.status(400).json({ error: 'Daily limit exceeded' }) }
  if (amount > agent.transaction_limit) { run('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uuidv4(), agentId, 'agent_spend', amount, 'agent', destination || 'system', 'pending', reason]); return res.status(202).json({ status: 'pending', message: 'Amount exceeds transaction limit' }) }
  run('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uuidv4(), agentId, 'agent_spend', amount, 'agent', destination || 'system', 'completed', reason])
  run('UPDATE agents SET balance = balance - ? WHERE id = ?', [amount, agentId])
  res.json({ success: true, message: 'Transaction completed' })
})

await getDb()
app.listen(PORT, () => console.log(`🏦 Agent Bank API running on port ${PORT}`))
