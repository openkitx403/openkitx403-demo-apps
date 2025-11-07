#!/usr/bin/env python3
import json
import time
import random
import os
from datetime import datetime
from solana.keypair import Keypair
from openkitx403_client import OpenKit403Client


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
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_info(text):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")


def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def load_keypair(filepath: str = './keypair.json') -> Keypair:
    try:
        with open(filepath, 'r') as f:
            secret_key = json.load(f)
        return Keypair.from_secret_key(bytes(secret_key))
    except FileNotFoundError:
        print_error(f"Keypair file not found: {filepath}")
        print_info("Generate a keypair with: solana-keygen new --outfile keypair.json")
        exit(1)


class TradingBot:
    def __init__(self, keypair: Keypair, api_url: str = None):
        self.keypair = keypair
        self.api_url = api_url or os.getenv("API_URL", "http://localhost:8000")
        self.client = OpenKit403Client(keypair)
        self.bot_id = None
        self.running = True
        
    def register(self):
        print_info("Registering bot...")
        response = self.client.authenticate(
            f"{self.api_url}/api/bot/register",
            method='GET'
        )
        data = response.json()
        self.bot_id = data['bot_id']
        print_success(f"Bot registered: {self.bot_id}")
        print_info(f"Wallet: {data['address']}")
        
    def get_prices(self):
        response = self.client.authenticate(
            f"{self.api_url}/api/market/prices",
            method='GET'
        )
        return response.json()
    
    def execute_trade(self, trade_type: str, asset: str, amount: float, price: float):
        trade_data = {
            "type": trade_type,
            "asset": asset,
            "amount": amount,
            "price": price
        }
        
        response = self.client.authenticate(
            f"{self.api_url}/api/trade/execute",
            method='POST',
            json_data=trade_data
        )
        return response.json()
    
    def get_status(self):
        response = self.client.authenticate(
            f"{self.api_url}/api/bot/status",
            method='GET'
        )
        return response.json()
    
    def trading_strategy(self, prices: dict):
        assets = ["SOL", "BTC", "ETH"]
        asset = random.choice(assets)
        price = prices["prices"][asset]
        
        if random.random() > 0.5:
            trade_type = "buy"
            amount = round(random.uniform(0.1, 2.0), 2)
            print_info(f"Strategy: BUY {amount} {asset} @ ${price}")
        else:
            trade_type = "sell"
            amount = round(random.uniform(0.1, 1.5), 2)
            print_info(f"Strategy: SELL {amount} {asset} @ ${price}")
        
        return trade_type, asset, amount, price
    
    def run(self):
        print_header("🤖 SOLANA TRADING BOT")
        
        try:
            self.register()
            print()
            
            cycle = 0
            while self.running:
                cycle += 1
                print_header(f"CYCLE #{cycle} - {datetime.now().strftime('%H:%M:%S')}")
                
                print_info("Fetching market prices...")
                prices_data = self.get_prices()
                print_success("Market data received")
                for asset, price in prices_data["prices"].items():
                    print(f"  {asset}: ${price:,.2f}")
                print()
                
                print_info("Analyzing market...")
                time.sleep(1)
                trade_type, asset, amount, price = self.trading_strategy(prices_data)
                
                print_info("Executing trade...")
                trade_result = self.execute_trade(trade_type, asset, amount, price)
                
                if trade_result["success"]:
                    print_success(f"Trade executed! ID: {trade_result['trade_id']}")
                    print(f"  Type: {trade_type.upper()}")
                    print(f"  Asset: {asset}")
                    print(f"  Amount: {amount}")
                    print(f"  Price: ${price:,.2f}")
                    print(f"  Total: ${amount * price:,.2f}")
                print()
                
                print_info("Checking bot status...")
                status = self.get_status()
                print_success("Status retrieved")
                print(f"  Total Trades: {status['stats']['total_trades']}")
                print(f"  Total Volume: ${status['stats']['total_volume']:,.2f}")
                print()
                
                wait_time = random.randint(10, 20)
                print_info(f"Waiting {wait_time} seconds before next cycle...")
                time.sleep(wait_time)
                
        except KeyboardInterrupt:
            print(f"\n{Colors.WARNING}Bot stopped by user{Colors.ENDC}")
        except Exception as e:
            print_error(f"Error: {e}")
        finally:
            print_header("BOT SHUTDOWN")
            print_success("Bot stopped successfully")


def main():
    keypair = load_keypair()
    bot = TradingBot(keypair)
    bot.run()


if __name__ == "__main__":
    main()

