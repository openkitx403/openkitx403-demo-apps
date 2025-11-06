from langchain.tools import BaseTool
from pydantic import Field
from typing import Optional
import json
from solana.keypair import Keypair
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
        return Keypair.from_secret_key(bytes(secret_key))
    
    def _authenticate_request(self, endpoint: str, method: str = 'GET', data: dict = None):
        """Make authenticated request"""
        keypair = self._load_keypair()
        client = OpenKit403Client(keypair)
        
        url = f"{self.api_url}{endpoint}"
        response = client.authenticate(url, method=method, json_data=data)
        
        return response.json()

class GetPortfolioTool(SolanaAuthTool):
    """Tool to get user's portfolio"""
    
    name: str = "get_portfolio"
    description: str = """
    Get the user's Solana portfolio including all token balances and their USD values.
    Use this when the user asks about their portfolio, holdings, or wallet balance.
    No input required.
    Returns: Portfolio data with assets, amounts, and values.
    """
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/portfolio")
            
            portfolio_summary = f"Portfolio Summary:\n"
            portfolio_summary += f"Total Value: ${data['total_value_usd']:,.2f}\n\n"
            portfolio_summary += "Holdings:\n"
            
            for item in data['portfolio']:
                portfolio_summary += f"- {item['asset']}: {item['amount']} (${item['value_usd']:,.2f}) "
                portfolio_summary += f"[{item['change_24h']:+.1f}% 24h]\n"
            
            return portfolio_summary
        except Exception as e:
            return f"Error fetching portfolio: {str(e)}"
    
    async def _arun(self, query: str = "") -> str:
        return self._run(query)

class GetNFTsTool(SolanaAuthTool):
    """Tool to get user's NFT collection"""
    
    name: str = "get_nfts"
    description: str = """
    Get the user's NFT collection including all NFTs they own.
    Use this when the user asks about their NFTs, collectibles, or specific collections.
    Input: Optional collection name (e.g., "Okay Bears") or leave empty for all NFTs.
    Returns: NFT data with names, collections, and floor prices.
    """
    
    def _run(self, collection: str = "") -> str:
        try:
            if collection:
                endpoint = f"/api/nfts/{collection}"
            else:
                endpoint = "/api/nfts"
            
            data = self._authenticate_request(endpoint)
            
            nft_summary = f"NFT Collection Summary:\n"
            nft_summary += f"Total NFTs: {data['total_nfts']}\n"
            nft_summary += f"Total Floor Value: {data['total_floor_value']} SOL\n\n"
            
            if 'collections' in data:
                nft_summary += f"Collections: {', '.join(data['collections'])}\n\n"
            
            nft_summary += "NFTs:\n"
            for nft in data['nfts'][:5]:  # Show first 5
                nft_summary += f"- {nft['name']} ({nft['collection']}) "
                nft_summary += f"Floor: {nft['floor_price']} SOL\n"
            
            if len(data['nfts']) > 5:
                nft_summary += f"... and {len(data['nfts']) - 5} more\n"
            
            return nft_summary
        except Exception as e:
            return f"Error fetching NFTs: {str(e)}"
    
    async def _arun(self, collection: str = "") -> str:
        return self._run(collection)

class GetTransactionsTool(SolanaAuthTool):
    """Tool to get recent transactions"""
    
    name: str = "get_transactions"
    description: str = """
    Get the user's recent transaction history.
    Use this when the user asks about recent activity, transactions, or transfers.
    Input: Optional number of transactions (default 10).
    Returns: List of recent transactions with amounts and types.
    """
    
    def _run(self, limit: str = "10") -> str:
        try:
            endpoint = f"/api/transactions?limit={limit}"
            data = self._authenticate_request(endpoint)
            
            tx_summary = f"Recent Transactions:\n\n"
            
            for tx in data['transactions']:
                tx_summary += f"- {tx['type'].upper()}: {tx['amount']} SOL\n"
                tx_summary += f"  Status: {tx['status']}\n"
                tx_summary += f"  Signature: {tx['signature'][:20]}...\n\n"
            
            return tx_summary
        except Exception as e:
            return f"Error fetching transactions: {str(e)}"
    
    async def _arun(self, limit: str = "10") -> str:
        return self._run(limit)

class GetTokenPriceTool(SolanaAuthTool):
    """Tool to get token price"""
    
    name: str = "get_token_price"
    description: str = """
    Get the current price of a token.
    Use this when the user asks about token prices or market values.
    Input: Token symbol (e.g., "SOL", "BTC", "ETH").
    Returns: Current price and 24h change.
    """
    
    def _run(self, token: str) -> str:
        try:
            endpoint = f"/api/market/price/{token}"
            data = self._authenticate_request(endpoint)
            
            price_info = f"{data['token']} Price:\n"
            price_info += f"Current: ${data['price']:,.2f}\n"
            price_info += f"24h Change: {data['change_24h']:+.2f}%\n"
            
            return price_info
        except Exception as e:
            return f"Error fetching price: {str(e)}"
    
    async def _arun(self, token: str) -> str:
        return self._run(token)

class AnalyzePortfolioTool(SolanaAuthTool):
    """Tool to analyze portfolio"""
    
    name: str = "analyze_portfolio"
    description: str = """
    Get AI-powered analysis of the user's portfolio.
    Use this when the user asks for analysis, recommendations, or insights about their holdings.
    No input required.
    Returns: Detailed portfolio analysis with recommendations.
    """
    
    def _run(self, query: str = "") -> str:
        try:
            data = self._authenticate_request("/api/analyze", method='POST')
            
            analysis = data['analysis']
            
            result = f"Portfolio Analysis:\n\n"
            result += f"Risk Score: {analysis['risk_score']}/10 ({analysis['risk_level']})\n"
            result += f"Diversification: {analysis['diversification']}\n\n"
            
            result += "Recommendations:\n"
            for rec in analysis['recommendations']:
                result += f"• {rec}\n"
            
            result += "\nHighlights:\n"
            for highlight in analysis['highlights']:
                result += f"• {highlight}\n"
            
            return result
        except Exception as e:
            return f"Error analyzing portfolio: {str(e)}"
    
    async def _arun(self, query: str = "") -> str:
        return self._run(query)