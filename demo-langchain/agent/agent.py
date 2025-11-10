#!/usr/bin/env python3
"""
OpenKitx403 AI Agent
LangChain-powered agent with wallet authentication
"""

import os
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
from dotenv import load_dotenv

load_dotenv()

# Check for API key
if not os.getenv("OPENAI_API_KEY"):
    print("ERROR: OPENAI_API_KEY not set in .env file")
    exit(1)

# Colors
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

def print_user(text):
    print(f"{Colors.OKCYAN}You: {Colors.ENDC}{text}")

def print_agent(text):
    print(f"{Colors.OKGREEN}Agent: {Colors.ENDC}{text}")

def main():
    print_header("OpenKitx403 AI Agent")
    print(f"{Colors.WARNING}Authenticating with Solana wallet...{Colors.ENDC}\n")
    
    # API URL
    api_url = os.getenv("API_URL", "http://localhost:8000")
    
    # Initialize tools
    tools = [
        GetPortfolioTool(api_url=api_url),
        GetNFTsTool(api_url=api_url),
        GetTransactionsTool(api_url=api_url),
        GetTokenPriceTool(api_url=api_url),
        AnalyzePortfolioTool(api_url=api_url)
    ]
    
    # Initialize LLM
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0.7,
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Create prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful Solana wallet assistant. You have access to tools that can:
- Get portfolio balances and values
- View NFT collections
- Check transaction history
- Look up token prices
- Analyze portfolio and provide recommendations

Always authenticate with the user's Solana wallet when using tools.
Provide clear, concise answers with relevant data.
Format numbers nicely (use commas, currency symbols).
"""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad")
    ])
    
    # Create agent
    agent = create_openai_functions_agent(llm, tools, prompt)
    
    # Memory
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )
    
    # Executor
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=True,
        handle_parsing_errors=True
    )
    
    print(f"{Colors.OKGREEN}Agent ready! Type 'quit' to exit.{Colors.ENDC}\n")
    
    # Main loop
    while True:
        try:
            user_input = input(f"{Colors.OKCYAN}You: {Colors.ENDC}")
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print(f"\n{Colors.WARNING}Goodbye!{Colors.ENDC}")
                break
            
            if not user_input.strip():
                continue
            
            # Run agent
            response = agent_executor.invoke({"input": user_input})
            print_agent(response["output"])
            print()
            
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}Interrupted. Goodbye!{Colors.ENDC}")
            break
        except Exception as e:
            print(f"{Colors.FAIL}Error: {e}{Colors.ENDC}\n")

if __name__ == "__main__":
    main()
