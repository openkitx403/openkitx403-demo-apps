from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from openkitx403 import (
    OpenKit403Middleware,
    require_openkitx403_user,
    OpenKit403User
)
from datetime import datetime
from typing import List
import json
import os


app = FastAPI(
    title="OpenKitx403 Trading Bot API",
    description="Autonomous trading bot with wallet authentication",
    version="1.0.0"
)


# Environment configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",")
API_AUDIENCE = os.getenv("API_AUDIENCE", "http://localhost:8000")


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["WWW-Authenticate"]
)


# OpenKit403 middleware
app.add_middleware(
    OpenKit403Middleware,
    audience=API_AUDIENCE,
    issuer="trading-bot-api",
    ttl_seconds=60,
    bind_method_path=False,
    excluded_paths=["/", "/health", "/ws", "/index.html", "/app.js", "/style.css"]
)


# In-memory storage
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
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


# Serve static files
@app.get("/")
async def read_root():
    return FileResponse("frontend/index.html")


@app.get("/app.js")
async def read_js():
    return FileResponse("frontend/app.js", media_type="application/javascript")


@app.get("/style.css")
async def read_css():
    return FileResponse("frontend/style.css", media_type="text/css")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "active_bots": len(connected_bots),
        "total_trades": len(bot_activities)
    }


# WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "active_bots": len(connected_bots),
            "total_trades": len(bot_activities)
        }))
        
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Protected endpoints
@app.get("/api/bot/register")
async def register_bot(user: OpenKit403User = Depends(require_openkitx403_user)):
    bot_id = user.address[:8]
    connected_bots[bot_id] = {
        "address": user.address,
        "connected_at": datetime.utcnow().isoformat(),
        "status": "active"
    }
    
    await manager.broadcast(json.dumps({
        "type": "bot_connected",
        "bot_id": bot_id,
        "address": user.address,
        "timestamp": datetime.utcnow().isoformat()
    }))
    
    return {
        "success": True,
        "bot_id": bot_id,
        "address": user.address,
        "message": "Bot registered successfully"
    }


@app.get("/api/market/prices")
async def get_market_prices(user: OpenKit403User = Depends(require_openkitx403_user)):
    import random
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
    if len(bot_activities) > 100:
        bot_activities.pop()
    
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
    bot_id = user.address[:8]
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
    return {
        "activities": bot_activities[:50],
        "count": len(bot_activities)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"\n🚀 Starting OpenKitx403 Trading Bot API")
    print(f"📊 Dashboard: http://localhost:{port}")
    print(f"🔐 Audience: {API_AUDIENCE}\n")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

