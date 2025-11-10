"""
OpenKitx403 AI Agent API
FastAPI backend with wallet authentication
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openkitx403 import (
    OpenKit403Middleware,
    require_openkitx403_user,
    OpenKit403User
)
from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="OpenKitx403 AI Agent API",
    description="Authenticated AI agent endpoints with Solana wallet authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
# In production, replace "*" with your actual frontend domain
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["WWW-Authenticate"]
)

# OpenKit403 Middleware Configuration
API_URL = os.getenv("API_URL", "https://openkitx403-demo-apps.onrender.com")
ISSUER = os.getenv("ISSUER", "ai-agent-api")

app.add_middleware(
    OpenKit403Middleware,
    audience=API_URL,
    issuer=ISSUER,
    ttl_seconds=60,
    clock_skew_seconds=120,
    bind_method_path=False,  # Set to True for stricter security
    excluded_paths=["/", "/health", "/docs", "/redoc", "/openapi.json"]
)

# Response Models
class PortfolioItem(BaseModel):
    asset: str
    amount: float
    value_usd: float
    change_24h: float


class PortfolioResponse(BaseModel):
    wallet: str
    total_value_usd: float
    items: List[PortfolioItem]


class NFT(BaseModel):
    mint: str
    name: str
    collection: str
    image: str
    floor_price: float


class NFTResponse(BaseModel):
    wallet: str
    total_nfts: int
    total_floor_value_sol: float
    collections: List[str]
    nfts: List[NFT]


class Transaction(BaseModel):
    signature: str
    type: str
    amount: float
    status: str
    timestamp: str


class TransactionResponse(BaseModel):
    wallet: str
    transactions: List[Transaction]


class TokenPriceResponse(BaseModel):
    symbol: str
    price_usd: float
    change_24h: float


class AnalysisResponse(BaseModel):
    wallet: str
    risk_score: float
    diversification: str
    recommendations: List[str]
    highlights: List[str]


# Public Routes
@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "service": "OpenKitx403 AI Agent API",
        "status": "healthy",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "api_url": API_URL,
        "issuer": ISSUER
    }


# Protected Routes (require wallet authentication)

@app.get("/api/portfolio", response_model=PortfolioResponse)
def get_portfolio(user: OpenKit403User = Depends(require_openkitx403_user)):
    """
    Get user portfolio with token balances and values
    Requires wallet authentication via OpenKitx403
    """
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


@app.get("/api/nfts", response_model=NFTResponse)
def get_nfts(user: OpenKit403User = Depends(require_openkitx403_user)):
    """
    Get user NFT collection
    Requires wallet authentication via OpenKitx403
    """
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
                "image": "https://arweave.net/example1.png",
                "floor_price": 45.2
            },
            {
                "mint": "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "name": "Okay Bear #5678",
                "collection": "Okay Bears",
                "image": "https://arweave.net/example2.png",
                "floor_price": 45.2
            },
            {
                "mint": "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "name": "DeGod #789",
                "collection": "DeGods",
                "image": "https://arweave.net/example3.png",
                "floor_price": 120.5
            }
        ]
    }


@app.get("/api/transactions", response_model=TransactionResponse)
def get_transactions(user: OpenKit403User = Depends(require_openkitx403_user)):
    """
    Get recent transaction history
    Requires wallet authentication via OpenKitx403
    """
    return {
        "wallet": str(user.address),
        "transactions": [
            {
                "signature": "5x0KJh2W9rYN7YvPQK5XqK3V1cNxBXq7N6ZxV4zB3S7ABCDEFG",
                "type": "SEND",
                "amount": 2.5,
                "status": "confirmed",
                "timestamp": "2025-11-08T12:30:00Z"
            },
            {
                "signature": "5x1KJh2W9rYN7YvPQK5XqK3V1cNxBXq7N6ZxV4zB3S7HIJKLMN",
                "type": "RECEIVE",
                "amount": 5.0,
                "status": "confirmed",
                "timestamp": "2025-11-08T10:15:00Z"
            },
            {
                "signature": "5x2KJh2W9rYN7YvPQK5XqK3V1cNxBXq7N6ZxV4zB3S7OPQRSTU",
                "type": "SWAP",
                "amount": 1.2,
                "status": "confirmed",
                "timestamp": "2025-11-07T18:45:00Z"
            }
        ]
    }


@app.get("/api/token-price/{symbol}", response_model=TokenPriceResponse)
def get_token_price(
    symbol: str,
    user: OpenKit403User = Depends(require_openkitx403_user)
):
    """
    Get current token price and 24h change
    Requires wallet authentication via OpenKitx403
    """
    # Mock price data
    prices = {
        "SOL": {"price_usd": 100.50, "change_24h": 2.5},
        "BTC": {"price_usd": 42500.00, "change_24h": 1.2},
        "ETH": {"price_usd": 2250.00, "change_24h": -0.5},
        "USDC": {"price_usd": 1.00, "change_24h": 0.0},
        "BONK": {"price_usd": 0.00025, "change_24h": -5.2}
    }
    
    symbol_upper = symbol.upper()
    token_data = prices.get(symbol_upper)
    
    if not token_data:
        raise HTTPException(
            status_code=404,
            detail=f"Price data not available for {symbol_upper}"
        )
    
    return {
        "symbol": symbol_upper,
        "price_usd": token_data["price_usd"],
        "change_24h": token_data["change_24h"]
    }


@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze_portfolio(user: OpenKit403User = Depends(require_openkitx403_user)):
    """
    Get AI-powered portfolio analysis and recommendations
    Requires wallet authentication via OpenKitx403
    """
    return {
        "wallet": str(user.address),
        "risk_score": 6.5,
        "diversification": "Good",
        "recommendations": [
            "Consider rebalancing - SOL allocation is high (71%)",
            "BONK showing high volatility, monitor closely",
            "Stable allocation in USDC provides good buffer (28%)",
            "Consider taking profits on SOL given recent gains"
        ],
        "highlights": [
            "Portfolio up 15% this month",
            "Strong exposure to Solana ecosystem",
            "3 NFT collections with total floor value 210.9 SOL",
            "Healthy stablecoin position for market volatility"
        ]
    }


# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return {
        "error": "internal_server_error",
        "detail": str(exc)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
