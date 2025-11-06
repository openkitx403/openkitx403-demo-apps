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
    console.log('📍 Resource:', resource);
    console.log('📍 Method:', method);

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
    console.log('🔍 Full WWW-Authenticate header:', authHeader);
    
    if (!authHeader) {
      throw new Error('No authentication challenge received');
    }

    // Extract challenge (nonce)
    const challengeMatch = authHeader.match(/challenge="([^"]+)"/);
    if (!challengeMatch) {
      throw new Error('Invalid authentication challenge format');
    }

    const nonce = challengeMatch[1];
    console.log('🎯 Nonce (challenge):', nonce.substring(0, 40) + '...');

    // Parse URL to get path
    const url = new URL(resource);
    const path = url.pathname;
    console.log('📂 Path:', path);

    // CRITICAL: Construct message according to OpenKitx403 spec
    // Format: nonce + method + path
    const messageToSign = `${nonce}${method}${path}`;
    console.log('📝 Message to sign:', messageToSign.substring(0, 60) + '...');
    console.log('📝 Message length:', messageToSign.length);

    // Convert to bytes for signing
    const messageBytes = new TextEncoder().encode(messageToSign);
    console.log('✍️ Requesting wallet signature...');

    // Sign with wallet
    const signed = await this.wallet.signMessage(messageBytes, 'utf8');
    console.log('✅ Message signed');
    console.log('🔑 Signature type:', typeof signed.signature);
    console.log('🔑 Signature length:', signed.signature.length);

    // Encode signature as base64
    const signatureB64 = btoa(String.fromCharCode(...signed.signature));
    console.log('🔐 Signature (base64):', signatureB64.substring(0, 40) + '...');

    // Build Authorization header
    const authValue = `Solana-Wallet address="${this.wallet.publicKey.toString()}", signature="${signatureB64}", nonce="${nonce}"`;
    console.log('📤 Authorization header:', authValue.substring(0, 120) + '...');

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
      console.error('❌ Authentication failed:', response2.status);
      console.error('❌ Error details:', errorText);
    }

    return response2;
  }
}
