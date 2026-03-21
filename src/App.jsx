import { useState, useEffect } from 'react'

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f9fafb' },
  header: { backgroundColor: 'white', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 10 },
  headerContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoText: { fontSize: '20px', fontWeight: 'bold', color: '#111827' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  balance: { textAlign: 'right' },
  balanceLabel: { fontSize: '12px', color: '#6b7280' },
  balanceValue: { fontWeight: 'bold', color: '#059669', fontSize: '18px' },
  btn: { padding: '8px 16px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', border: 'none', fontSize: '14px' },
  btnPrimary: { backgroundColor: '#059669', color: 'white' },
  btnSecondary: { backgroundColor: '#e5e7eb', color: '#374151' },
  btnSmall: { padding: '6px 12px', fontSize: '12px' },
  btnOutline: { backgroundColor: 'transparent', border: '1px solid #d1d5db', color: '#374151' },
  nav: { backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' },
  navContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '4px', padding: '0 16px', flexWrap: 'wrap' },
  navBtn: { padding: '12px 16px', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '2px solid transparent', fontSize: '14px' },
  navBtnActive: { color: '#059669', borderBottomColor: '#059669' },
  navBtnInactive: { color: '#6b7280' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' },
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' },
  cardTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '12px', fontSize: '14px', backgroundColor: 'white' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' },
  stat: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statLabel: { fontSize: '13px', color: '#6b7280', marginBottom: '4px' },
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#059669' },
  agentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  agent: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  agentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' },
  agentName: { fontSize: '18px', fontWeight: 'bold', color: '#111827' },
  status: { fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', fontWeight: '500' },
  statusConnected: { backgroundColor: '#d1fae5', color: '#059669' },
  statusPaused: { backgroundColor: '#fef3c7', color: '#d97706' },
  txItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' },
  txAmount: { fontWeight: 'bold' },
  txPositive: { color: '#059669' },
  txNegative: { color: '#dc2626' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' },
  loginBox: { maxWidth: '420px', margin: '60px auto', backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  loginTitle: { fontSize: '28px', fontWeight: 'bold', textAlign: 'center', color: '#059669', marginBottom: '8px' },
  loginSubtitle: { textAlign: 'center', color: '#6b7280', marginBottom: '24px' },
  formGroup: { marginBottom: '16px' },
  fullBtn: { width: '100%', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '15px' },
  primaryBtn: { backgroundColor: '#059669', color: 'white' },
  linkBtn: { background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  switchLink: { textAlign: 'center', marginTop: '16px', color: '#6b7280', fontSize: '14px' },
  badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' },
  badgeGreen: { backgroundColor: '#d1fae5', color: '#059669' },
  badgeYellow: { backgroundColor: '#fef3c7', color: '#d97706' },
  badgeBlue: { backgroundColor: '#dbeafe', color: '#2563eb' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
  modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' },
  tabBtn: { padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px' },
  tabBtnActive: { backgroundColor: '#059669', color: 'white', borderColor: '#059669' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  empty: { textAlign: 'center', padding: '48px', color: '#6b7280' },
  emptyIcon: { fontSize: '48px', marginBottom: '16px' },
  emptyTitle: { fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' },
  emptyText: { fontSize: '14px', color: '#6b7280', marginBottom: '16px' },
  alert: { padding: '12px 16px', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' },
  alertWarning: { backgroundColor: '#fef3c7', color: '#92400e' },
  alertInfo: { backgroundColor: '#dbeafe', color: '#1e40af' },
  progressBar: { height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  categoryTag: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' },
  catProductive: { backgroundColor: '#dbeafe', color: '#1e40af' },
  catCreative: { backgroundColor: '#fce7f3', color: '#9d174d' },
  catUtility: { backgroundColor: '#d1fae5', color: '#065f46' },
  catOther: { backgroundColor: '#f3f4f6', color: '#6b7280' }
}

const CATEGORIES = [
  { id: 'productive', label: '💼 Productive', style: styles.catProductive },
  { id: 'creative', label: '🎨 Creative', style: styles.catCreative },
  { id: 'utility', label: '🔧 Utility', style: styles.catUtility },
  { id: 'other', label: '📦 Other', style: styles.catOther }
]

const API = 'https://agent-bank-api.onrender.com/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [view, setView] = useState('dashboard')
  const [agents, setAgents] = useState([])
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({})
  const [balance, setBalance] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentId, setNewAgentId] = useState('')
  const [newAgentKey, setNewAgentKey] = useState('')
  const [newAgentCategory, setNewAgentCategory] = useState('other')
  const [fundAmount, setFundAmount] = useState('')
  const [fundAgentId, setFundAgentId] = useState('')
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [agentTransactions, setAgentTransactions] = useState([])
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [rulesDaily, setRulesDaily] = useState(100)
  const [rulesTx, setRulesTx] = useState(50)
  const [txFilter, setTxFilter] = useState('all')
  const [agentCategoryEdit, setAgentCategoryEdit] = useState('other')

  useEffect(() => { if (token) fetchData() }, [token])

  const fetchData = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` }
      const [b, a, t, s] = await Promise.all([
        fetch(`${API}/balance`, { headers: h }),
        fetch(`${API}/agents`, { headers: h }),
        fetch(`${API}/transactions`, { headers: h }),
        fetch(`${API}/stats`, { headers: h })
      ])
      const bd = await b.json()
      setBalance(bd.balance || 0)
      setAgents(await a.json())
      setTransactions(await t.json())
      setStats(await s.json())
    } catch (e) { console.error(e) }
  }

  const getAlerts = () => {
    const alerts = []
    agents.forEach(agent => {
      const todaySpend = stats.todaySpend || 0
      if (agent.daily_limit > 0 && todaySpend >= agent.daily_limit * 0.8) {
        alerts.push({ type: 'warning', message: `${agent.name} has used ${Math.round(todaySpend/agent.daily_limit*100)}% of daily limit` })
      }
      if (agent.balance < 10 && agent.balance > 0) {
        alerts.push({ type: 'info', message: `${agent.name} wallet is running low ($${agent.balance.toFixed(2)})` })
      }
      if (agent.balance <= 0) {
        alerts.push({ type: 'warning', message: `${agent.name} wallet is empty` })
      }
    })
    return alerts
  }

  const alerts = getAlerts()

  const handleAuth = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API}/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        alert('Server error: ' + res.status)
        return
      }
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
      } else {
        alert(data.error || 'Registration failed')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const connectAgent = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newAgentName, agentId: newAgentId, apiKey: newAgentKey, category: newAgentCategory })
    })
    if (res.ok) {
      setNewAgentName(''); setNewAgentId(''); setNewAgentKey(''); setNewAgentCategory('other')
      fetchData(); setView('agents')
    }
  }

  const fundAgent = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/agents/${fundAgentId}/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: parseFloat(fundAmount) })
    })
    if (res.ok) { setFundAmount(''); fetchData() }
    else { alert((await res.json()).error) }
  }

  const toggleStatus = async (id, status) => {
    await fetch(`${API}/agents/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: status === 'connected' ? 'paused' : 'connected' })
    })
    fetchData()
  }

  const saveRules = async () => {
    await fetch(`${API}/agents/${selectedAgent.id}/rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dailyLimit: parseFloat(rulesDaily), transactionLimit: parseFloat(rulesTx) })
    })
    setShowRulesModal(false)
    fetchData()
    selectAgent({ ...selectedAgent, daily_limit: rulesDaily, transaction_limit: rulesTx })
  }

  const saveCategory = async () => {
    await fetch(`${API}/agents/${selectedAgent.id}/category`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category: agentCategoryEdit })
    })
    setShowCategoryModal(false)
    fetchData()
    selectAgent({ ...selectedAgent, category: agentCategoryEdit })
  }

  const addFunds = async () => {
    const amt = prompt('Amount to add (USD):')
    if (!amt || parseFloat(amt) <= 0) return
    const amount = parseFloat(amt)
    
    try {
      // Call checkout session endpoint
      const res = await fetch(`${API}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
      })
      const data = await res.json()
      
      if (data.demo) {
        // Demo mode - funds added directly
        alert(data.message)
        fetchData()
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        alert(data.error || 'Payment failed')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const selectAgent = async (agent) => {
    setSelectedAgent(agent)
    setRulesDaily(agent.daily_limit || 100)
    setRulesTx(agent.transaction_limit || 50)
    setAgentCategoryEdit(agent.category || 'other')
    const res = await fetch(`${API}/agents/${agent.id}/transactions`, { headers: { Authorization: `Bearer ${token}` } })
    setAgentTransactions(await res.json())
    setView('agent-detail')
  }

  const logout = () => { localStorage.removeItem('token'); setToken(null) }

  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'all') return true
    if (txFilter === 'income') return tx.type === 'fund_agent'
    if (txFilter === 'spending') return tx.type === 'agent_spend'
    if (txFilter === 'pending') return tx.status === 'pending'
    return true
  })

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Agent', 'Status', 'Reason']
    const rows = transactions.map(tx => [
      new Date(tx.created_at).toLocaleString(),
      tx.type,
      tx.amount,
      tx.agent_name || 'N/A',
      tx.status,
      tx.reason || ''
    ])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-bank-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    setShowExportModal(false)
  }

  const getCategoryStyle = (cat) => CATEGORIES.find(c => c.id === cat)?.style || styles.catOther
  const getCategoryLabel = (cat) => CATEGORIES.find(c => c.id === cat)?.label || '📦 Other'

  const getProgressColor = (spent, limit) => {
    const pct = (spent / limit) * 100
    if (pct >= 90) return '#dc2626'
    if (pct >= 70) return '#f59e0b'
    return '#059669'
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>🏦 AI Agent Bank</h1>
          <p style={styles.loginSubtitle}>Financial control for AI agents</p>
          <form onSubmit={handleAuth}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button style={{ ...styles.fullBtn, ...styles.primaryBtn }} type="submit">
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <p style={styles.switchLink}>
            {isRegister ? 'Already have account?' : "Don't have account?"}{' '}
            <button style={styles.linkBtn} onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={{ fontSize: '28px' }}>🏦</span>
            <span style={styles.logoText}>AI Agent Bank</span>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.balance}>
              <p style={styles.balanceLabel}>Your Balance</p>
              <p style={styles.balanceValue}>${balance.toFixed(2)}</p>
            </div>
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={addFunds}>+ Add Funds</button>
            <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        <div style={styles.navContent}>
          {['dashboard', 'agents', 'transactions'].map(v => (
            <button key={v} style={{ ...styles.navBtn, ...(view === v ? styles.navBtnActive : styles.navBtnInactive) }} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      <main style={styles.main}>
        {view === 'dashboard' && (
          <>
            {alerts.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                {alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} style={{ ...styles.alert, ...(alert.type === 'warning' ? styles.alertWarning : styles.alertInfo) }}>
                    <span>{alert.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.statGrid}>
              <div style={styles.stat}><p style={styles.statLabel}>Your Balance</p><p style={styles.statValue}>${balance.toFixed(2)}</p></div>
              <div style={styles.stat}><p style={styles.statLabel}>Agent Wallets</p><p style={{...styles.statValue, color: '#111827'}}>${stats.totalAgentBalance?.toFixed(2) || '0.00'}</p></div>
              <div style={styles.stat}><p style={styles.statLabel}>Active Agents</p><p style={{...styles.statValue, color: '#111827'}}>{stats.activeAgents || 0} / {stats.agentCount || 0}</p></div>
              <div style={styles.stat}><p style={styles.statLabel}>Today's Spending</p><p style={{...styles.statValue, color: '#dc2626'}}>${stats.todaySpend?.toFixed(2) || '0.00'}</p></div>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardTitle}>
                <span>Recent Activity</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnOutline }} onClick={() => setShowExportModal(true)}>📥 Export</button>
                  <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnSecondary }} onClick={() => setView('transactions')}>View All</button>
                </div>
              </div>
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} style={styles.txItem}>
                  <div>
                    <p style={{ fontWeight: '500', textTransform: 'capitalize' }}>{tx.type.replace('_', ' ')}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>{tx.reason}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af' }}>{tx.agent_name}</p>
                  </div>
                  <div style={styles.txAmount}>
                    <p style={tx.type === 'fund_agent' ? styles.txPositive : styles.txNegative}>
                      {tx.type === 'fund_agent' ? '+' : '-'}${tx.amount}
                    </p>
                    <span style={{ ...styles.badge, ...(tx.status === 'completed' ? styles.badgeGreen : styles.badgeYellow) }}>
                      {tx.status}
                    </span>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>📊</div>
                  <div style={styles.emptyTitle}>No activity yet</div>
                  <div style={styles.emptyText}>Connect an agent and add funds to get started!</div>
                  <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setView('agents')}>+ Connect Agent</button>
                </div>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>Quick Actions</div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => setView('agents')}>+ Connect Agent</button>
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setView('transactions')}>View Transactions</button>
                <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowExportModal(true)}>📥 Export Data</button>
              </div>
            </div>
          </>
        )}

        {view === 'agents' && (
          <>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Connect New Agent</h3>
              <form onSubmit={connectAgent} style={styles.form}>
                <div><label style={styles.label}>Agent Name</label><input style={styles.input} value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="My AI Assistant" required /></div>
                <div><label style={styles.label}>OpenClaw Agent ID</label><input style={styles.input} value={newAgentId} onChange={e => setNewAgentId(e.target.value)} placeholder="agent-xxxxx" required /></div>
                <div><label style={styles.label}>Category</label><select style={styles.select} value={newAgentCategory} onChange={e => setNewAgentCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                <div><label style={styles.label}>API Key (optional)</label><input style={styles.input} type="password" value={newAgentKey} onChange={e => setNewAgentKey(e.target.value)} placeholder="sk-xxx" /></div>
                <button style={{ ...styles.btn, ...styles.btnPrimary, height: '42px' }} type="submit">Connect</button>
              </form>
            </div>

            <div style={styles.agentGrid}>
              {agents.map(agent => {
                const todaySpend = transactions.filter(t => t.agent_id === agent.id && t.type === 'agent_spend' && t.status === 'completed' && t.created_at?.startsWith(new Date().toISOString().split('T')[0])).reduce((s, t) => s + t.amount, 0)
                const spentPct = agent.daily_limit > 0 ? (todaySpend / agent.daily_limit) * 100 : 0
                return (
                  <div key={agent.id} style={styles.agent}>
                    <div style={styles.agentHeader}>
                      <span style={styles.agentName}>{agent.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ ...styles.categoryTag, ...getCategoryStyle(agent.category) }}>{getCategoryLabel(agent.category)}</span>
                        <span style={{ ...styles.status, ...(agent.status === 'connected' ? styles.statusConnected : styles.statusPaused) }}>{agent.status}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', wordBreak: 'break-all' }}>ID: {agent.agent_id}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div><p style={{ fontSize: '12px', color: '#6b7280' }}>Balance</p><p style={{ fontWeight: 'bold', fontSize: '20px' }}>${agent.balance.toFixed(2)}</p></div>
                      <div><p style={{ fontSize: '12px', color: '#6b7280' }}>Daily Limit</p><p style={{ fontWeight: 'bold' }}>${agent.daily_limit}</p></div>
                      <div><p style={{ fontSize: '12px', color: '#6b7280' }}>Tx Limit</p><p style={{ fontWeight: 'bold' }}>${agent.transaction_limit}</p></div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#6b7280' }}>Today's spending</span>
                        <span style={{ fontWeight: '500', color: getProgressColor(todaySpend, agent.daily_limit) }}>${todaySpend.toFixed(2)} / ${agent.daily_limit}</span>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${Math.min(spentPct, 100)}%`, backgroundColor: getProgressColor(todaySpend, agent.daily_limit) }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                      <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => selectAgent(agent)}>Manage & Details</button>
                      <button style={{ ...styles.btn, ...(agent.status === 'connected' ? { backgroundColor: '#fef3c7', color: '#92400e' } : { backgroundColor: '#d1fae5', color: '#065f46' }) }} onClick={() => toggleStatus(agent.id, agent.status)}>
                        {agent.status === 'connected' ? '⏸ Pause Agent' : '▶ Resume Agent'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {agents.length === 0 && (
                <div style={{ ...styles.empty, gridColumn: '1/-1' }}>
                  <div style={styles.emptyIcon}>🤖</div>
                  <div style={styles.emptyTitle}>No agents connected</div>
                  <div style={styles.emptyText}>Add your first AI agent to start managing its finances!</div>
                </div>
              )}
            </div>

            {agents.length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Fund an Agent</h3>
                <form onSubmit={fundAgent} style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <select style={styles.select} value={fundAgentId} onChange={e => setFundAgentId(e.target.value)} required>
                      <option value="">Select agent</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name} (${a.balance.toFixed(2)})</option>)}
                    </select>
                  </div>
                  <div style={{ width: '140px' }}><input style={styles.input} type="number" placeholder="Amount" value={fundAmount} onChange={e => setFundAmount(e.target.value)} required /></div>
                  <button style={{ ...styles.btn, ...styles.btnPrimary, height: '42px' }} type="submit">Fund</button>
                </form>
              </div>
            )}
          </>
        )}

        {view === 'transactions' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <span>All Transactions</span>
              <button style={{ ...styles.btn, ...styles.btnSmall, ...styles.btnOutline }} onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
            </h3>
            <div style={styles.filterRow}>
              {['all', 'income', 'spending', 'pending'].map(f => (
                <button key={f} style={{ ...styles.tabBtn, ...(txFilter === f ? styles.tabBtnActive : {}) }} onClick={() => setTxFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {filteredTx.map(tx => (
              <div key={tx.id} style={styles.txItem}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <p style={{ fontWeight: '500', textTransform: 'capitalize' }}>{tx.type.replace('_', ' ')}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>{tx.reason}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>{tx.agent_name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ ...styles.txAmount, fontSize: '16px' }}>
                    <span style={tx.type === 'fund_agent' ? styles.txPositive : styles.txNegative}>
                      {tx.type === 'fund_agent' ? '+' : '-'}${tx.amount}
                    </span>
                  </p>
                  <span style={{ ...styles.badge, ...(tx.status === 'completed' ? styles.badgeGreen : styles.badgeYellow) }}>{tx.status}</span>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{new Date(tx.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {filteredTx.length === 0 && <p style={styles.empty}>No transactions found</p>}
          </div>
        )}

        {view === 'agent-detail' && selectedAgent && (
          <>
            <button style={{ ...styles.btn, ...styles.btnSecondary, marginBottom: '16px' }} onClick={() => setView('agents')}>← Back to Agents</button>
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedAgent.name}</h2>
                  <p style={{ color: '#6b7280', fontSize: '13px', wordBreak: 'break-all' }}>{selectedAgent.agent_id}</p>
                </div>
                <span style={{ ...styles.status, padding: '8px 16px', fontSize: '14px', ...(selectedAgent.status === 'connected' ? styles.statusConnected : styles.statusPaused) }}>{selectedAgent.status}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ ...styles.stat, padding: '16px' }}>
                  <p style={styles.statLabel}>Balance</p><p style={{...styles.statValue, fontSize: '22px'}}>${selectedAgent.balance.toFixed(2)}</p>
                </div>
                <div style={{ ...styles.stat, padding: '16px' }}>
                  <p style={styles.statLabel}>Daily Limit</p><p style={{...styles.statValue, fontSize: '22px', color: '#111827'}}>${selectedAgent.daily_limit}</p>
                </div>
                <div style={{ ...styles.stat, padding: '16px' }}>
                  <p style={styles.statLabel}>Tx Limit</p><p style={{...styles.statValue, fontSize: '22px', color: '#111827'}}>${selectedAgent.transaction_limit}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setShowRulesModal(true)}>⚙️ Edit Rules</button>
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setShowCategoryModal(true)}>🏷️ Change Category</button>
                <button style={{ ...styles.btn, ...(selectedAgent.status === 'connected' ? { backgroundColor: '#fee2e2', color: '#dc2626' } : styles.btnPrimary) }} onClick={() => toggleStatus(selectedAgent.id, selectedAgent.status)}>
                  {selectedAgent.status === 'connected' ? '⏸ Pause Agent' : '▶ Resume Agent'}
                </button>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Transaction History</h3>
              {agentTransactions.map(tx => (
                <div key={tx.id} style={styles.txItem}>
                  <div><p style={{ fontWeight: '500', textTransform: 'capitalize' }}>{tx.type.replace('_', ' ')}</p><p style={{ fontSize: '12px', color: '#6b7280' }}>{tx.reason}</p></div>
                  <div><p style={{ ...styles.txAmount, textAlign: 'right', fontSize: '16px' }}><span style={tx.type === 'fund_agent' ? styles.txPositive : styles.txNegative}>{tx.type === 'fund_agent' ? '+' : '-'}${tx.amount}</span></p><span style={{ ...styles.badge, ...(tx.status === 'completed' ? styles.badgeGreen : styles.badgeYellow) }}>{tx.status}</span><p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{new Date(tx.created_at).toLocaleDateString()}</p></div>
                </div>
              ))}
              {agentTransactions.length === 0 && <p style={styles.empty}>No transactions</p>}
            </div>
          </>
        )}
      </main>

      {showRulesModal && (
        <div style={styles.modal} onClick={() => setShowRulesModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Edit Agent Rules</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Daily Spending Limit ($)</label>
              <input style={styles.input} type="number" value={rulesDaily} onChange={e => setRulesDaily(e.target.value)} min="1" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Per-Transaction Limit ($)</label>
              <input style={styles.input} type="number" value={rulesTx} onChange={e => setRulesTx(e.target.value)} min="1" />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={saveRules}>Save</button>
              <button style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }} onClick={() => setShowRulesModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div style={styles.modal} onClick={() => setShowCategoryModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Change Category</h3>
            <div style={{ marginBottom: '20px' }}>
              {CATEGORIES.map(cat => (
                <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', backgroundColor: agentCategoryEdit === cat.id ? '#f0fdf4' : 'transparent', border: agentCategoryEdit === cat.id ? '2px solid #059669' : '2px solid transparent' }}>
                  <input type="radio" name="category" value={cat.id} checked={agentCategoryEdit === cat.id} onChange={e => setAgentCategoryEdit(e.target.value)} />
                  <span style={cat.style}>{cat.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={saveCategory}>Save</button>
              <button style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }} onClick={() => setShowCategoryModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div style={styles.modal} onClick={() => setShowExportModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Export Data</h3>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>Download all your transactions as a CSV file.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }} onClick={exportCSV}>📥 Download CSV</button>
              <button style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }} onClick={() => setShowExportModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App