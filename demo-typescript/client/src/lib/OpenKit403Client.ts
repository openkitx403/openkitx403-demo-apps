export class OpenKit403Client {
  private wallet: any = null;
  private walletType: string | null = null;

  async connect(type: 'phantom' | 'backpack' | 'solflare') {
    this.walletType = type;
    
    const wallets: any = {
      phantom: (window as any).phantom?.solana,
      backpack: (window as any).backpack,
      solflare: (window as any).solflare
    };

    this.wallet = wallets[type];
    
    if (!this.wallet) {
      throw new Error(`${type} wallet not found. Please install the ${type} browser extension.`);
    }

    await this.wallet.connect();
  }

  getAddress(): string {
    if (!this.wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }
    return this.wallet.publicKey.toString();
  }

  disconnect() {
    if (this.wallet?.disconnect) {
      this.wallet.disconnect();
    }
    this.wallet = null;
    this.walletType = null;
  }

  async authenticate({ resource, method = 'GET' }: { resource: string; method?: string }) {
    if (!this.wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // First request - expect 403 with challenge
    const response1 = await fetch(resource, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response1.status !== 403) {
      return response1;
    }

    // Parse WWW-Authenticate header
    const authHeader = response1.headers.get('WWW-Authenticate');
    if (!authHeader) {
      throw new Error('No authentication challenge received');
    }

    // Extract challenge: Solana-Wallet challenge="..."
    const challengeMatch = authHeader.match(/challenge="([^"]+)"/);
    if (!challengeMatch) {
      throw new Error('Invalid authentication challenge');
    }

    const challengeB64 = challengeMatch[1];
    
    // Decode and sign the challenge
    const challengeBytes = Uint8Array.from(atob(challengeB64), c => c.charCodeAt(0));
    const signed = await this.wallet.signMessage(challengeBytes, 'utf8');

    // Encode signature as base64
    const signatureB64 = btoa(String.fromCharCode(...signed.signature));

    // Retry with Authorization header
    const response2 = await fetch(resource, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Solana-Wallet address="${this.wallet.publicKey.toString()}", signature="${signatureB64}", nonce="${challengeB64}"`,
      },
    });

    return response2;
  }
}
