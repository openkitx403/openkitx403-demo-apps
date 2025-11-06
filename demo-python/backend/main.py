from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from openkitx403 import (
    OpenKit403Middleware,
    require_openkitx403_user,
    OpenKit403User
)
from datetime import datetime
from typing import List
import json
import asyncio
import random

app = FastAPI(title="Solana Trading Bot API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenKit403 middleware
app.add_middleware(
    OpenKit403Middleware,
    audience="http://localhost:8000",
    issuer="trading-bot-api",
    ttl_seconds=60,
    bind_method_path=True,
    excluded_paths=["/", "/health", "/ws"]
)

# In-memory storage for demo
bot_activities: List[dict] = []
connected_bots: dict = {}

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Public endpoints
@app.get("/")
async def root():
    return {
        "name": "OpenKitx403 Trading Bot API",
        "version": "1.0.0",
        "status": "running",
        "demo": "python-bot"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# WebSocket for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Protected endpoints
@app.get("/api/bot/register")
async def register_bot(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Register a bot with its wallet address"""
    bot_id = user.address[:8]
    connected_bots[bot_id] = {
        "address": user.address,
        "connected_at": datetime.utcnow().isoformat(),
        "status": "active"
    }
    
    await manager.broadcast(json.dumps({
        "type": "bot_connected",
        "bot_id": bot_id,
        "address": user.address
    }))
    
    return {
        "success": True,
        "bot_id": bot_id,
        "address": user.address,
        "message": "Bot registered successfully"
    }

@app.get("/api/market/prices")
async def get_market_prices(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get current market prices (mock data)"""
    prices = {
        "SOL": round(random.uniform(95, 105), 2),
        "BTC": round(random.uniform(42000, 43000), 2),
        "ETH": round(random.uniform(2200, 2300), 2),
        "USDC": 1.00
    }
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "prices": prices,
        "bot": user.address[:8]
    }

@app.post("/api/trade/execute")
async def execute_trade(
    trade_data: dict,
    user: OpenKit403User = Depends(require_openkitx403_user)
):
    """Execute a trade (mock)"""
    activity = {
        "id": len(bot_activities) + 1,
        "bot_id": user.address[:8],
        "type": trade_data.get("type", "buy"),
        "asset": trade_data.get("asset", "SOL"),
        "amount": trade_data.get("amount", 1),
        "price": trade_data.get("price", 100),
        "timestamp": datetime.utcnow().isoformat(),
        "status": "executed"
    }
    
    bot_activities.insert(0, activity)
    if len(bot_activities) > 50:
        bot_activities.pop()
    
    # Broadcast to all connected clients
    await manager.broadcast(json.dumps({
        "type": "trade_executed",
        "activity": activity
    }))
    
    return {
        "success": True,
        "trade_id": activity["id"],
        "activity": activity
    }

@app.get("/api/bot/status")
async def bot_status(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get bot status and stats"""
    bot_id = user.address[:8]
    
    # Calculate stats from activities
    bot_trades = [a for a in bot_activities if a.get("bot_id") == bot_id]
    total_trades = len(bot_trades)
    total_volume = sum(a.get("amount", 0) * a.get("price", 0) for a in bot_trades)
    
    return {
        "bot_id": bot_id,
        "address": user.address,
        "status": "active",
        "stats": {
            "total_trades": total_trades,
            "total_volume": round(total_volume, 2),
            "uptime": "active",
            "last_trade": bot_trades[0]["timestamp"] if bot_trades else None
        }
    }

@app.get("/api/activities")
async def get_activities(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get recent trading activities"""
    return {
        "activities": bot_activities[:20],
        "count": len(bot_activities)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)