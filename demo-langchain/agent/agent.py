#!/usr/bin/env python3
"""
OpenKitx403 AI Agent
LangChain-powered agent with wallet authentication
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Check for required API keys
if not os.getenv("OPENAI_API_KEY"):
    print("ERROR: OPENAI_API_KEY not set in .env file")
    sys.exit(1)

if not os.path.exists("./keypair.json"):
    print("ERROR: keypair.json not found. Create a Solana keypair first.")
    sys.exit(1)

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from tools import (
    GetPortfolioTool,
    GetNFTsTool,
    GetTransactionsTool,
    GetTokenPriceTool,
    AnalyzePortfolioTool
)


# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")


def print_agent(text):
    print(f"{Colors.OKGREEN}Agent: {Colors.ENDC}{text}")


def main():
    print_header("OpenKitx403 AI Agent")
    print(f"{Colors.WARNING}Initializing with Solana wallet authentication...{Colors.ENDC}\n")
    
    # API URL from environment
    api_url = os.getenv("API_URL", "http://localhost:8000")
    keypair_path = os.getenv("KEYPAIR_PATH", "./keypair.json")
    
    print(f"{Colors.OKBLUE}API URL: {api_url}{Colors.ENDC}")
    print(f"{Colors.OKBLUE}Keypair: {keypair_path}{Colors.ENDC}\n")
    
    # Initialize tools with configuration
    try:
        tools = [
            GetPortfolioTool(api_url=api_url, keypair_path=keypair_path),
            GetNFTsTool(api_url=api_url, keypair_path=keypair_path),
            GetTransactionsTool(api_url=api_url, keypair_path=keypair_path),
            GetTokenPriceTool(api_url=api_url, keypair_path=keypair_path),
            AnalyzePortfolioTool(api_url=api_url, keypair_path=keypair_path)
        ]
    except Exception as e:
        print(f"{Colors.FAIL}Failed to initialize tools: {e}{Colors.ENDC}")
        sys.exit(1)
    
    # Initialize LLM
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0.7,
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Create prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful Solana wallet assistant authenticated via OpenKitx403. You have access to tools that can:

- Get portfolio balances and token values
- View NFT collections and floor prices  
- Check recent transaction history
- Look up current token prices
- Analyze portfolio and provide investment recommendations

Always use the appropriate tool for each request. Provide clear, well-formatted answers with relevant data.
Format numbers with commas and currency symbols for readability.

When users ask questions:
- Use get_portfolio for balance and holdings questions
- Use get_nfts for NFT-related queries
- Use get_transactions for activity history
- Use get_token_price for price lookups
- Use analyze_portfolio for insights and recommendations
"""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad")
    ])
    
    # Create agent
    agent = create_openai_functions_agent(llm, tools, prompt)
    
    # Memory for conversation history
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )
    
    # Executor
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=False,  # Set to True for debugging
        handle_parsing_errors=True,
        max_iterations=5,
        early_stopping_method="generate"
    )
    
    print(f"{Colors.OKGREEN}✓ Agent ready! Type 'quit' to exit.{Colors.ENDC}")
    print(f"{Colors.OKBLUE}Try: 'Show me my portfolio' or 'What NFTs do I own?'{Colors.ENDC}\n")
    
    # Main interaction loop
    while True:
        try:
            user_input = input(f"{Colors.OKCYAN}You: {Colors.ENDC}")
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print(f"\n{Colors.WARNING}Goodbye!{Colors.ENDC}")
                break
            
            if not user_input.strip():
                continue
            
            # Run agent with error handling
            try:
                response = agent_executor.invoke({"input": user_input})
                print_agent(response["output"])
                print()
            except Exception as e:
                print(f"{Colors.FAIL}Agent error: {e}{Colors.ENDC}\n")
            
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}Interrupted. Goodbye!{Colors.ENDC}")
            break
        except EOFError:
            print(f"\n{Colors.WARNING}Goodbye!{Colors.ENDC}")
            break


if __name__ == "__main__":
    main()