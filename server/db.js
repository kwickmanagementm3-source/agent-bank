import initSqlJs from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

const DB_PATH = './bank.db'

let db = null

async function getDb() {
  if (db) return db
  
  const SQL = await initSqlJs()
  
  // Try to load existing database
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
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      api_key TEXT,
      status TEXT DEFAULT 'connected',
      balance REAL DEFAULT 0,
      daily_limit REAL DEFAULT 100,
      transaction_limit REAL DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS user_balance (
      id INTEGER PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  
  saveDb()
  return db
}

function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function run(sql, params = []) {
  db.run(sql, params)
  saveDb()
}

// User functions
export const createUser = (email, password) => {
  const id = uuidv4()
  run('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [id, email, password])
  run('INSERT INTO user_balance (user_id, balance) VALUES (?, 0)', [id])
  return { id, email }
}

export const getUserByEmail = (email) => queryOne('SELECT * FROM users WHERE email = ?', [email])
export const getUserById = (id) => queryOne('SELECT id, email, created_at FROM users WHERE id = ?', [id])

export const getUserBalance = (userId) => {
  const r = queryOne('SELECT balance FROM user_balance WHERE user_id = ?', [userId])
  return r ? r.balance : 0
}

export const updateUserBalance = (userId, amount) => {
  run('UPDATE user_balance SET balance = balance + ? WHERE user_id = ?', [amount, userId])
}

// Agent functions
export const connectAgent = (userId, name, agentId, apiKey) => {
  const id = uuidv4()
  run('INSERT INTO agents (id, user_id, name, agent_id, api_key, balance, status) VALUES (?, ?, ?, ?, ?, 0, ?)', 
    [id, userId, name, agentId, apiKey || '', 'connected'])
  return { id, name, agent_id: agentId, balance: 0, status: 'connected', daily_limit: 100, transaction_limit: 50 }
}

export const getUserAgents = (userId) => queryAll('SELECT * FROM agents WHERE user_id = ?', [userId])
export const getAgentById = (agentId) => queryOne('SELECT * FROM agents WHERE id = ?', [agentId])

export const updateAgentBalance = (agentId, amount) => {
  run('UPDATE agents SET balance = balance + ? WHERE id = ?', [amount, agentId])
}

export const updateAgentStatus = (agentId, status) => {
  run('UPDATE agents SET status = ? WHERE id = ?', [status, agentId])
}

export const updateAgentRules = (agentId, dailyLimit, txLimit) => {
  run('UPDATE agents SET daily_limit = ?, transaction_limit = ? WHERE id = ?', [dailyLimit || 100, txLimit || 50, agentId])
}

// Transaction functions
export const createTransaction = (agentId, type, amount, source, destination, status, reason) => {
  const id = uuidv4()
  run('INSERT INTO transactions (id, agent_id, type, amount, source, destination, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [id, agentId, type, amount, source, destination, status, reason])
  
  if (status === 'completed') {
    if (type === 'fund_agent') {
      updateAgentBalance(agentId, amount)
      const agent = getAgentById(agentId)
      if (agent) updateUserBalance(agent.user_id, -amount)
    } else if (type === 'agent_spend') {
      updateAgentBalance(agentId, -amount)
    }
  }
  saveDb()
  return { id, type, amount, source, destination, status, reason }
}

export const getAgentTransactions = (agentId) => queryAll('SELECT * FROM transactions WHERE agent_id = ? ORDER BY created_at DESC', [agentId])

export const getUserTransactions = (userId) => 
  queryAll('SELECT t.*, a.name as agent_name FROM transactions t JOIN agents a ON t.agent_id = a.id WHERE a.user_id = ? ORDER BY t.created_at DESC', [userId])

export const getTodayAgentSpending = (agentId) => {
  const today = new Date().toISOString().split('T')[0]
  const r = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE agent_id = ? AND type = 'agent_spend' AND status = 'completed' AND date(created_at) = ?", [agentId, today])
  return r ? r.total : 0
}

export const initDatabase = async () => {
  await getDb()
  console.log('📁 Database initialized')
}

export default { getDb, initDatabase }
