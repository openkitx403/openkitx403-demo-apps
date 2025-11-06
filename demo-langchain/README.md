# OpenKitx403 LangChain AI Agent Demo

AI agent powered by LangChain that authenticates with Solana wallets.

## Features

- 🤖 GPT-4 powered conversational agent
- 🔐 Wallet authentication with OpenKitx403
- 🛠️ Custom LangChain tools for Solana operations
- 💬 Beautiful chat interface
- 📊 Real portfolio, NFT, and transaction data

## Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key
- Solana keypair

### 1. Setup Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Setup Agent
```bash
cd agent

# Install dependencies
pip install -r requirements.txt

# Generate keypair
solana-keygen new --outfile keypair.json

# Add OpenAI API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Run Agent
```bash
python agent.py
```

### 4. Open Frontend

Open `frontend/index.html` in your browser for the chat interface!

## Example Prompts

- "Show me my portfolio"
- "What NFTs do I own?"
- "What's the current price of SOL?"
- "Show my recent transactions"
- "Analyze my portfolio and give recommendations"
- "How many Okay Bears do I have?"

## How It Works

1. User asks a question in chat
2. LangChain agent analyzes the question
3. Agent selects appropriate tools
4. Tools authenticate with API using Solana keypair
5. API returns data after verifying signature
6. Agent formats and returns answer

## Architecture
```
User Input → LangChain Agent → Custom Tools → OpenKit403 Auth → FastAPI → Response
```

## Deployment

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Agent
Run as a service or container with environment variables set.

### Frontend
Deploy static files to Vercel, Netlify, or any static host.

## Tools Available

- **GetPortfolioTool**: Fetch wallet balances
- **GetNFTsTool**: View NFT collection
- **GetTransactionsTool**: Recent transactions
- **GetTokenPriceTool**: Token prices
- **AnalyzePortfolioTool**: AI portfolio analysis

All tools use OpenKitx403 for authentication!