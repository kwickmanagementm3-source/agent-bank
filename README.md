# AI Agent Bank 🏦

Financial control layer for AI agents.

## Quick Start

```bash
# Install dependencies
npm install

# Start backend (port 3001)
npm run server

# Start frontend (port 3000)
npm run client
```

## Tech Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Express.js + SQLite
- **Auth:** JWT

## Features (MVP)

- User authentication
- Connect external AI agents (manual API key)
- Internal credit wallet system
- Agent spending controls
- Transaction history
- Kill switch / pause controls

## Environment

```
DATABASE_URL=./bank.db
JWT_SECRET=your-secret-key
PORT=3001
```
