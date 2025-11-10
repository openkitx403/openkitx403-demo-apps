"""
OpenKitx403 AI Agent API
FastAPI backend with wallet authentication
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from openkitx403 import (
    OpenKit403Middleware,
    require_openkitx403_user,
    OpenKit403User
)
from datetime import datetime
from typing import List
from pydantic import BaseModel
import random
import os

app = FastAPI(
    title="OpenKitx403 AI Agent API",
    description="Authenticated AI agent endpoints",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenKit403 Middleware
API_URL = os.getenv("API_URL", "http://localhost:8000")
app.add_middleware(
    OpenKit403Middleware,
    audience=API_URL,
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
    status: str
    timestamp: datetime

class TokenPrice(BaseModel):
    symbol: str
    price_usd: float
    change_24h: float

# Routes
@app.get("/")
def read_root():
    return {
        "service": "OpenKitx403 AI Agent API",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/portfolio")
def get_portfolio(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get user portfolio (authenticated)"""
    return {
        "wallet": str(user.address),
        "total_value_usd": 17800.00,
        "items": [
            {
                "asset": "SOL",
                "amount": 125.5,
                "value_usd": 12550.00,
                "change_24h": 2.5
            },
            {
                "asset": "USDC",
                "amount": 5000.0,
                "value_usd": 5000.00,
                "change_24h": 0.0
            },
            {
                "asset": "BONK",
                "amount": 1000000.0,
                "value_usd": 250.00,
                "change_24h": -5.2
            }
        ]
    }

@app.get("/api/nfts")
def get_nfts(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get user NFTs (authenticated)"""
    return {
        "wallet": str(user.address),
        "total_nfts": 3,
        "total_floor_value_sol": 210.9,
        "collections": ["Okay Bears", "DeGods"],
        "nfts": [
            {
                "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "name": "Okay Bear #1234",
                "collection": "Okay Bears",
                "image": "https://example.com/okb1.png",
                "floor_price": 45.2
            },
            {
                "mint": "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "name": "Okay Bear #5678",
                "collection": "Okay Bears",
                "image": "https://example.com/okb2.png",
                "floor_price": 45.2
            },
            {
                "mint": "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "name": "DeGod #789",
                "collection": "DeGods",
                "image": "https://example.com/dg1.png",
                "floor_price": 120.5
            }
        ]
    }

@app.get("/api/transactions")
def get_transactions(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Get recent transactions (authenticated)"""
    return {
        "wallet": str(user.address),
        "transactions": [
            {
                "signature": "5x0KJh2W9rYN7YvPQK5XqK3V1cNxBXq7N6ZxV4zB3S7",
                "type": "SEND",
                "amount": 2.5,
                "status": "confirmed",
                "timestamp": "2025-11-08T12:30:00Z"
            },
            {
                "signature": "5x1KJh2W9rYN7YvPQK5XqK3V1cNxBXq7N6ZxV4zB3S7",
                "type": "RECEIVE",
                "amount": 5.0,
                "status": "confirmed",
                "timestamp": "2025-11-08T10:15:00Z"
            },
            {
                "signature": "5x2KJh2W9rYN7YvPQK5XqK3V1cNxBXq7N6ZxV4zB3S7",
                "type": "SWAP",
                "amount": 1.2,
                "status": "confirmed",
                "timestamp": "2025-11-07T18:45:00Z"
            }
        ]
    }

@app.get("/api/token-price/{symbol}")
def get_token_price(
    symbol: str,
    user: OpenKit403User = Depends(require_openkitx403_user)
):
    """Get token price (authenticated)"""
    prices = {
        "SOL": {"price_usd": 100.50, "change_24h": 2.5},
        "BTC": {"price_usd": 42500.00, "change_24h": 1.2},
        "ETH": {"price_usd": 2250.00, "change_24h": -0.5},
        "USDC": {"price_usd": 1.00, "change_24h": 0.0}
    }
    
    token_data = prices.get(symbol.upper(), prices["SOL"])
    
    return {
        "symbol": symbol.upper(),
        "price_usd": token_data["price_usd"],
        "change_24h": token_data["change_24h"]
    }

@app.post("/api/analyze")
def analyze_portfolio(user: OpenKit403User = Depends(require_openkitx403_user)):
    """Analyze portfolio (authenticated)"""
    return {
        "wallet": str(user.address),
        "risk_score": 6.5,
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
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
