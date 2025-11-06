# OpenKitx403 Python Demo - Trading Bot

Automated trading bot with real-time dashboard.

## Features

- 🤖 Autonomous Python bot with wallet authentication
- 📊 Real-time WebSocket dashboard
- 💹 Live market price updates
- 📈 Activity feed with trade history
- 🔐 Solana keypair-based authentication

## Quick Start

### 1. Setup Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Setup Bot
```bash
# Generate keypair
solana-keygen new --outfile bot/keypair.json

# Install dependencies
cd bot
pip install -r requirements.txt
```

### 3. Run Bot
```bash
python bot.py
```

### 4. Open Dashboard

Visit `http://localhost:8000/` and watch the bot trade in real-time!

## How It Works

1. Bot authenticates with FastAPI server using Solana keypair
2. Bot fetches market prices (mock data)
3. Bot executes trades based on simple strategy
4. Dashboard shows real-time activity via WebSocket
5. All trades are authenticated with OpenKitx403

## Deployment

### Backend (Railway/Render)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Serve static files)
Deploy the `frontend/` folder to any static host.