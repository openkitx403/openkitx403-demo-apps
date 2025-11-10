"""
LangChain tools with OpenKitx403 authentication
"""

from langchain.tools import BaseTool
from pydantic import Field
from typing import Optional
import json
from solders.keypair import Keypair
from openkitx403_client import OpenKit403Client

class SolanaAuthTool(BaseTool):
    """Base tool for Solana wallet authentication"""
    name: str = "solana_auth_base"
    description: str = "Base tool for authenticated API calls"
    keypair_path: str = Field(default="./keypair.json")
    api_url: str = Field(default="http://localhost:8000")
    
    def _load_keypair(self) -> Keypair:
        """Load keypair from file"""
        with open(self.keypair_path, 'r') as f:
            secret_key = json.load(f)
        # Use from_seed for solders
        return Keypair.from_seed(bytes(secret_key[:32]))
    
    def _authenticate_request(self, endpoint: str, method: str = 'GET', data: dict = None):
        """Make authenticated request"""
        keypair = self._load_keypair()
        client = OpenKit403Client(keypair)
        url = f"{self.api_url}{endpoint}"
        response = client.authenticate(url, method=method, json_data=data)
        return response.json()

class GetPortfolioTool(SolanaAuthTool):
    name: str = "get_portfolio"
    description: str = "Get wallet portfolio with balances and values"
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/portfolio")
            portfolio = data.get("items", [])
            total = data.get("total_value_usd", 0)
            
            result = f"Portfolio (Total: ${total:,.2f}):\n"
            for item in portfolio:
                result += f"- {item['asset']}: {item['amount']} (${item['value_usd']:,.2f}) [{item['change_24h']:+.1f}%]\n"
            
            return result
        except Exception as e:
            return f"Error fetching portfolio: {str(e)}"

class GetNFTsTool(SolanaAuthTool):
    name: str = "get_nfts"
    description: str = "Get NFT collection details"
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/nfts")
            nfts = data.get("nfts", [])
            total_floor = data.get("total_floor_value_sol", 0)
            
            result = f"NFTs (Floor Value: {total_floor:.1f} SOL):\n"
            for nft in nfts:
                result += f"- {nft['name']} ({nft['collection']}) Floor: {nft['floor_price']:.1f} SOL\n"
            
            return result
        except Exception as e:
            return f"Error fetching NFTs: {str(e)}"

class GetTransactionsTool(SolanaAuthTool):
    name: str = "get_transactions"
    description: str = "Get recent transaction history"
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/transactions")
            txs = data.get("transactions", [])
            
            result = "Recent Transactions:\n"
            for tx in txs:
                result += f"- {tx['type']}: {tx['amount']} SOL ({tx['status']})\n"
            
            return result
        except Exception as e:
            return f"Error fetching transactions: {str(e)}"

class GetTokenPriceTool(SolanaAuthTool):
    name: str = "get_token_price"
    description: str = "Get current token price. Input should be token symbol (SOL, BTC, ETH, etc)"
    
    def _run(self, symbol: str) -> str:
        try:
            data = self._authenticate_request(f"/api/token-price/{symbol}")
            return f"{data['symbol']}: ${data['price_usd']:,.2f} ({data['change_24h']:+.1f}% 24h)"
        except Exception as e:
            return f"Error fetching price: {str(e)}"

class AnalyzePortfolioTool(SolanaAuthTool):
    name: str = "analyze_portfolio"
    description: str = "Get AI analysis and recommendations for portfolio"
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/analyze", method='POST')
            
            result = f"Portfolio Analysis:\n"
            result += f"Risk Score: {data['risk_score']}/10\n"
            result += f"Diversification: {data['diversification']}\n\n"
            result += "Recommendations:\n"
            for rec in data['recommendations']:
                result += f"• {rec}\n"
            
            return result
        except Exception as e:
            return f"Error analyzing portfolio: {str(e)}"
