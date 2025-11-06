#!/usr/bin/env python3
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

# Colors for terminal
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
    print(f"{Colors.OKGREEN}Agent: {Colors.ENDC}{text}\n")

def print_thinking():
    print(f"{Colors.WARNING}🤔 Thinking...{Colors.ENDC}")

def create_agent():
    """Create the LangChain agent with Solana tools"""
    
    # Initialize LLM
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0,
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Create tools
    tools = [
        GetPortfolioTool(),
        GetNFTsTool(),
        GetTransactionsTool(),
        GetTokenPriceTool(),
        AnalyzePortfolioTool()
    ]
    
    # Create prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful Solana wallet assistant AI agent. 
You have access to tools that can authenticate with the user's Solana wallet and fetch data.

Your capabilities:
- Check portfolio balances and values
- View NFT collections
- See recent transactions
- Get token prices
- Analyze portfolio and provide recommendations

When the user asks about their wallet, use the appropriate tools to fetch real data.
Be conversational, helpful, and explain what you're doing.
Always provide clear, formatted responses with the data you retrieve.

Important: You can only access data for the wallet that's authenticated via the keypair.
All API calls are cryptographically authenticated using OpenKitx403 protocol."""),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    # Create agent
    agent = create_openai_functions_agent(llm, tools, prompt)
    
    # Create executor
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,
        max_iterations=3,
        handle_parsing_errors=True
    )
    
    return agent_executor

def show_examples():
    """Show example prompts"""
    examples = [
        "Show me my portfolio",
        "What NFTs do I own?",
        "What's the current price of SOL?",
        "Show my recent transactions",
        "Analyze my portfolio and give recommendations",
        "How many Okay Bears do I have?",
    ]
    
    print(f"{Colors.OKCYAN}Example prompts:{Colors.ENDC}")
    for i, example in enumerate(examples, 1):
        print(f"  {i}. {example}")
    print()

def main():
    """Main chat loop"""
    print_header("🤖 SOLANA AI AGENT - LangChain Demo")
    
    print(f"{Colors.OKGREEN}Welcome! I'm your Solana wallet AI assistant.{Colors.ENDC}")
    print(f"{Colors.OKGREEN}I can help you check your portfolio, NFTs, and more.{Colors.ENDC}\n")
    
    show_examples()
    
    print(f"{Colors.WARNING}Note: Make sure the API server is running on localhost:8000{Colors.ENDC}")
    print(f"{Colors.WARNING}Type 'exit' or 'quit' to stop, 'examples' to see prompts again{Colors.ENDC}\n")
    
    # Create agent
    try:
        agent = create_agent()
    except Exception as e:
        print(f"{Colors.FAIL}Error creating agent: {e}{Colors.ENDC}")
        print(f"{Colors.WARNING}Make sure OPENAI_API_KEY is set in .env file{Colors.ENDC}")
        return
    
    # Chat loop
    while True:
        try:
            # Get user input
            user_input = input(f"{Colors.OKCYAN}You: {Colors.ENDC}")
            
            if user_input.lower() in ['exit', 'quit']:
                print(f"\n{Colors.OKGREEN}Goodbye! 👋{Colors.ENDC}\n")
                break
            
            if user_input.lower() == 'examples':
                show_examples()
                continue
            
            if not user_input.strip():
                continue
            
            # Process with agent
            print_thinking()
            result = agent.invoke({"input": user_input})
            
            # Display response
            print_agent(result['output'])
            
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}Interrupted by user{Colors.ENDC}")
            break
        except Exception as e:
            print(f"{Colors.FAIL}Error: {e}{Colors.ENDC}\n")

if __name__ == "__main__":
    main()