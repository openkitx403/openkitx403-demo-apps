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
      console.log('✅ No authentication required, returning response');
      return response1;
    }

    // Parse WWW-Authenticate header
    const authHeader = response1.headers.get('WWW-Authenticate') || response1.headers.get('www-authenticate');
    console.log('🔍 WWW-Authenticate header:', authHeader);
    
    if (!authHeader) {
      throw new Error('No authentication challenge received from server');
    }

    // Extract challenge from header
    // Format: OpenKitx403 realm="...", version="1", challenge="base64challenge"
    const challengeMatch = authHeader.match(/challenge="([^"]+)"/);
    if (!challengeMatch) {
      console.error('❌ Could not parse challenge from:', authHeader);
      throw new Error('Invalid authentication challenge format');
    }

    const challengeB64 = challengeMatch[1];
    console.log('🎯 Challenge (base64):', challengeB64.substring(0, 20) + '...');

    // Create message to sign
    const message = new TextEncoder().encode(challengeB64);
    console.log('✍️ Requesting wallet signature...');

    // Sign with wallet
    const signed = await this.wallet.signMessage(message, 'utf8');
    console.log('✅ Message signed');

    // Encode signature as base64
    const signatureB64 = btoa(String.fromCharCode(...signed.signature));
    console.log('🔐 Signature (base64):', signatureB64.substring(0, 20) + '...');

    // Build Authorization header
    const authValue = `Solana-Wallet address="${this.wallet.publicKey.toString()}", signature="${signatureB64}", nonce="${challengeB64}"`;
    console.log('📤 Retrying with Authorization header...');

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
      console.error('❌ Authentication failed:', response2.status);
    }

    return response2;
  }
}
