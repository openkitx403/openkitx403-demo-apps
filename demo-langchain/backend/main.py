from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from openkitx403 import (
    OpenKit403Middleware,
    require_openkitx403_user,
    OpenKit403User
)
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import random

app = FastAPI(title="AI Agent API")

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
    issuer="ai-agent-api",
    ttl_seconds=60,
    bind_method_path=True,
    excluded_paths=["/", "/health", "/docs", "/openapi.json"]
)

# Models
class NFT(BaseModel):
    mint: str
    name: str
    collection: str
    image: str
    floor_price: float

class PortfolioItem(BaseModel):
    asset: str
    amount: float
    value_usd: float
    change_24h: float

class Transaction(BaseModel):
    signature: str
    type: str
    amount: float
    timestamp: str
    status: str

# Mock data storage
nft_collections = {
    "Okay Bears": [
        {"mint": "Bear1x...", "name": "Okay Bear #1234", "collection": "Okay Bears", 
         "image": "https://placehold.co/400x400/9945ff/ffffff?text=Bear+1234", "floor_price": 45.2},
        {"mint": "Bear2x...", "name": "Okay Bear #5678", "collection": "Okay Bears",
         "image": "https://placehold.co/400x400/00d4ff/ffffff?text=Bear+5678", "floor_price": 45.2},
    ],
    "DeGods": [
        {"mint": "God1x...", "name": "DeGod #789", "collection": "DeGods",
         "image": "https://placehold.co/400x400/14F195/000000?text=DeGod+789", "floor_price": 120.5},
    ]
}

# Public endpoints
@app.get("/")
async def root():
    return {
        "name": "AI Agent API",
        "version": "1.0.0",
        "status": "running",
        "features": ["portfolio", "nfts", "transactions", "market_data"]
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Protected endpoints
@app.get("/api/portfolio")
async def get_portfolio(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get user's portfolio"""
    portfolio = [
        {"asset": "SOL", "amount": 125.5, "value_usd": 12550.0, "change_24h": 2.5},
        {"asset": "USDC", "amount": 5000.0, "value_usd": 5000.0, "change_24h": 0.0},
        {"asset": "BONK", "amount": 1000000.0, "value_usd": 250.0, "change_24h": -5.2},
    ]
    
    total_value = sum(item["value_usd"] for item in portfolio)
    
    return {
        "wallet": user.address,
        "portfolio": portfolio,
        "total_value_usd": total_value,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/nfts")
async def get_nfts(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get user's NFT collection"""
    all_nfts = []
    for collection_nfts in nft_collections.values():
        all_nfts.extend(collection_nfts)
    
    total_floor_value = sum(nft["floor_price"] for nft in all_nfts)
    
    return {
        "wallet": user.address,
        "nfts": all_nfts,
        "total_nfts": len(all_nfts),
        "total_floor_value": total_floor_value,
        "collections": list(nft_collections.keys())
    }

@app.get("/api/nfts/{collection}")
async def get_nfts_by_collection(
    collection: str,
    user: OpenKit403User = Depends(require_openkitx403_user)
):
    """Get NFTs from specific collection"""
    nfts = nft_collections.get(collection, [])
    
    return {
        "wallet": user.address,
        "collection": collection,
        "nfts": nfts,
        "count": len(nfts)
    }

@app.get("/api/transactions")
async def get_transactions(
    limit: int = 10,
    user: OpenKit403User = Depends(require_openkitx403_user)
):
    """Get recent transactions"""
    tx_types = ["send", "receive", "swap", "stake"]
    transactions = []
    
    for i in range(min(limit, 5)):
        transactions.append({
            "signature": f"5x{i}KJh..." + "x" * 40,
            "type": random.choice(tx_types),
            "amount": round(random.uniform(0.1, 10.0), 2),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "confirmed"
        })
    
    return {
        "wallet": user.address,
        "transactions": transactions,
        "count": len(transactions)
    }

@app.get("/api/market/price/{token}")
async def get_token_price(
    token: str,
    user: OpenKit403User = Depends(require_openkitx403_user)
):
    """Get current token price"""
    prices = {
        "SOL": 100.0 + random.uniform(-5, 5),
        "BTC": 43000.0 + random.uniform(-500, 500),
        "ETH": 2250.0 + random.uniform(-50, 50),
        "USDC": 1.0
    }
    
    price = prices.get(token.upper(), 0.0)
    
    return {
        "token": token.upper(),
        "price": round(price, 2),
        "change_24h": round(random.uniform(-10, 10), 2),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/analyze")
async def analyze_portfolio(
    user: OpenKit403User = Depends(require_openkitx403_user)
):
    """AI analysis of portfolio"""
    return {
        "wallet": user.address,
        "analysis": {
            "risk_score": 6.5,
            "risk_level": "Medium",
            "diversification": "Good",
            "recommendations": [
                "Consider rebalancing - SOL allocation is high (71%)",
                "BONK showing high volatility, monitor closely",
                "Stable allocation in USDC provides good buffer"
            ],
            "highlights": [
                "Portfolio up 15% this month",
                "Strong exposure to Solana ecosystem",
                "3 NFT collections with total floor value 210 SOL"
            ]
        },
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
