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
        try:
            with open(self.keypair_path, 'r') as f:
                secret_key = json.load(f)
            
            # Handle both array and object formats
            if isinstance(secret_key, list):
                # Array format: [1, 2, 3, ...]
                secret_bytes = bytes(secret_key[:64])  # Full 64 bytes
            elif isinstance(secret_key, dict):
                # Object format: {"secretKey": [1, 2, 3, ...]}
                secret_bytes = bytes(secret_key.get("secretKey", secret_key)[:64])
            else:
                raise ValueError("Invalid keypair format")
            
            # Create keypair from full secret key bytes
            return Keypair.from_bytes(secret_bytes)
        except Exception as e:
            raise Exception(f"Failed to load keypair from {self.keypair_path}: {e}")
    
    def _authenticate_request(self, endpoint: str, method: str = 'GET', data: dict = None):
        """Make authenticated request"""
        try:
            keypair = self._load_keypair()
            client = OpenKit403Client(keypair)
            url = f"{self.api_url}{endpoint}"
            response = client.authenticate(url, method=method, json_data=data)
            
            if response.status_code != 200:
                raise Exception(f"API returned {response.status_code}: {response.text}")
            
            return response.json()
        except Exception as e:
            raise Exception(f"Authentication request failed: {e}")


class GetPortfolioTool(SolanaAuthTool):
    name: str = "get_portfolio"
    description: str = """Get the user's Solana wallet portfolio including:
- Total portfolio value in USD
- Token holdings (SOL, USDC, other SPL tokens)
- Individual token amounts and USD values
- 24-hour price changes for each token

Use this when the user asks about:
- Portfolio balance
- Token holdings
- Total value
- 'What do I own?'
"""
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/portfolio")
            
            wallet = data.get("wallet", "Unknown")
            total = data.get("total_value_usd", 0)
            items = data.get("items", [])
            
            result = f"Portfolio Summary\n"
            result += f"Wallet: {wallet}\n"
            result += f"Total Value: ${total:,.2f}\n\n"
            result += "Holdings:\n"
            
            for item in items:
                asset = item.get('asset', 'Unknown')
                amount = item.get('amount', 0)
                value = item.get('value_usd', 0)
                change = item.get('change_24h', 0)
                change_sign = '+' if change >= 0 else ''
                
                result += f"  • {asset}: {amount:,.2f} tokens (${value:,.2f}) [{change_sign}{change:.1f}% 24h]\n"
            
            return result
        except Exception as e:
            return f"Error fetching portfolio: {str(e)}"
    
    async def _arun(self, query: str = "") -> str:
        return self._run(query)


class GetNFTsTool(SolanaAuthTool):
    name: str = "get_nfts"
    description: str = """Get the user's NFT collection including:
- Total number of NFTs owned
- Collection names and floor values
- Individual NFT details with floor prices
- Total floor value in SOL

Use this when the user asks about:
- NFTs they own
- NFT collections
- Floor prices
- Digital collectibles
"""
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/nfts")
            
            wallet = data.get("wallet", "Unknown")
            total_nfts = data.get("total_nfts", 0)
            total_floor = data.get("total_floor_value_sol", 0)
            collections = data.get("collections", [])
            nfts = data.get("nfts", [])
            
            result = f"NFT Collection Summary\n"
            result += f"Wallet: {wallet}\n"
            result += f"Total NFTs: {total_nfts}\n"
            result += f"Total Floor Value: {total_floor:.1f} SOL\n"
            result += f"Collections: {', '.join(collections)}\n\n"
            result += "NFTs:\n"
            
            for nft in nfts:
                name = nft.get('name', 'Unknown')
                collection = nft.get('collection', 'Unknown')
                floor = nft.get('floor_price', 0)
                
                result += f"  • {name}\n"
                result += f"    Collection: {collection}\n"
                result += f"    Floor Price: {floor:.1f} SOL\n\n"
            
            return result
        except Exception as e:
            return f"Error fetching NFTs: {str(e)}"
    
    async def _arun(self, query: str = "") -> str:
        return self._run(query)


class GetTransactionsTool(SolanaAuthTool):
    name: str = "get_transactions"
    description: str = """Get recent transaction history including:
- Transaction type (SEND, RECEIVE, SWAP, etc.)
- Transaction amounts
- Transaction status
- Transaction signatures
- Timestamps

Use this when the user asks about:
- Recent transactions
- Activity history
- Sent/received tokens
- Transaction details
"""
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/transactions")
            
            wallet = data.get("wallet", "Unknown")
            transactions = data.get("transactions", [])
            
            result = f"Recent Transaction History\n"
            result += f"Wallet: {wallet}\n\n"
            
            if not transactions:
                result += "No recent transactions found.\n"
                return result
            
            for tx in transactions:
                tx_type = tx.get('type', 'Unknown')
                amount = tx.get('amount', 0)
                status = tx.get('status', 'Unknown')
                signature = tx.get('signature', 'Unknown')
                timestamp = tx.get('timestamp', 'Unknown')
                
                result += f"  • {tx_type}: {amount:.2f} SOL\n"
                result += f"    Status: {status}\n"
                result += f"    Time: {timestamp}\n"
                result += f"    Signature: {signature[:16]}...\n\n"
            
            return result
        except Exception as e:
            return f"Error fetching transactions: {str(e)}"
    
    async def _arun(self, query: str = "") -> str:
        return self._run(query)


class GetTokenPriceTool(SolanaAuthTool):
    name: str = "get_token_price"
    description: str = """Get current token price and 24-hour change for any cryptocurrency.
Supports: SOL, BTC, ETH, USDC, and other major tokens.

Input should be the token symbol (e.g., 'SOL', 'BTC', 'ETH').

Use this when the user asks about:
- Current token prices
- Price of SOL, BTC, ETH, etc.
- 24-hour price changes
"""
    
    def _run(self, symbol: str) -> str:
        try:
            symbol = symbol.strip().upper()
            data = self._authenticate_request(f"/api/token-price/{symbol}")
            
            token_symbol = data.get('symbol', symbol)
            price = data.get('price_usd', 0)
            change = data.get('change_24h', 0)
            change_sign = '+' if change >= 0 else ''
            
            result = f"{token_symbol} Price\n"
            result += f"Current: ${price:,.2f}\n"
            result += f"24h Change: {change_sign}{change:.2f}%\n"
            
            return result
        except Exception as e:
            return f"Error fetching price for {symbol}: {str(e)}"
    
    async def _arun(self, symbol: str) -> str:
        return self._run(symbol)


class AnalyzePortfolioTool(SolanaAuthTool):
    name: str = "analyze_portfolio"
    description: str = """Get AI-powered portfolio analysis including:
- Risk score (0-10 scale)
- Diversification assessment
- Investment recommendations
- Portfolio highlights
- Rebalancing suggestions

Use this when the user asks about:
- Portfolio analysis
- Investment advice
- Risk assessment
- Recommendations
- 'Should I rebalance?'
"""
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/analyze", method='POST')
            
            wallet = data.get("wallet", "Unknown")
            risk_score = data.get("risk_score", 0)
            diversification = data.get("diversification", "Unknown")
            recommendations = data.get("recommendations", [])
            highlights = data.get("highlights", [])
            
            result = f"Portfolio Analysis\n"
            result += f"Wallet: {wallet}\n\n"
            result += f"Risk Score: {risk_score:.1f}/10\n"
            result += f"Diversification: {diversification}\n\n"
            
            if highlights:
                result += "Highlights:\n"
                for highlight in highlights:
                    result += f"  • {highlight}\n"
                result += "\n"
            
            if recommendations:
                result += "Recommendations:\n"
                for rec in recommendations:
                    result += f"  • {rec}\n"
            
            return result
        except Exception as e:
            return f"Error analyzing portfolio: {str(e)}"
    
    async def _arun(self, query: str = "") -> str:
        return self._run(query)


# Export all tools
__all__ = [
    'SolanaAuthTool',
    'GetPortfolioTool',
    'GetNFTsTool',
    'GetTransactionsTool',
    'GetTokenPriceTool',
    'AnalyzePortfolioTool'
]