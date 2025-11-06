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

    console.log('🔐 Starting authentication flow...');

    // First request - expect 403 with challenge
    const response1 = await fetch(resource, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 First response status:', response1.status);

    if (response1.status !== 403) {
      console.log('✅ No authentication required');
      return response1;
    }

    // Parse WWW-Authenticate header
    const authHeader = response1.headers.get('WWW-Authenticate') || response1.headers.get('www-authenticate');
    console.log('🔍 WWW-Authenticate header:', authHeader);
    
    if (!authHeader) {
      throw new Error('No authentication challenge received');
    }

    // Extract challenge
    const challengeMatch = authHeader.match(/challenge="([^"]+)"/);
    if (!challengeMatch) {
      throw new Error('Invalid authentication challenge format');
    }

    const challengeB64 = challengeMatch[1];
    console.log('🎯 Challenge (base64):', challengeB64.substring(0, 30) + '...');

    // CRITICAL FIX: Decode the base64 challenge to bytes before signing
    const challengeBytes = Uint8Array.from(atob(challengeB64), c => c.charCodeAt(0));
    console.log('📝 Challenge bytes length:', challengeBytes.length);
    console.log('✍️ Requesting wallet signature...');

    // Sign the decoded bytes (NOT the base64 string)
    const signed = await this.wallet.signMessage(challengeBytes);
    console.log('✅ Message signed');

    // Encode signature as base64
    const signatureB64 = btoa(String.fromCharCode(...signed.signature));
    console.log('🔐 Signature (base64):', signatureB64.substring(0, 30) + '...');

    // Build Authorization header - using the format expected by @openkitx403/server
    const authValue = `Solana-Wallet address="${this.wallet.publicKey.toString()}", signature="${signatureB64}", nonce="${challengeB64}"`;
    console.log('📤 Authorization:', authValue.substring(0, 100) + '...');

    // Retry with Authorization header
    const response2 = await fetch(resource, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authValue,
      },
    });

    console.log('📡 Second response status:', response2.status);

    if (response2.ok) {
      console.log('🎉 Authentication successful!');
    } else {
      const errorText = await response2.text();
      console.error('❌ Authentication failed:', response2.status, errorText);
    }

    return response2;
  }
}
