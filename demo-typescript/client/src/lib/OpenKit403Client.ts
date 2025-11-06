import bs58 from 'bs58';

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
      throw new Error(`${type} wallet not found`);
    }

    await this.wallet.connect();
  }

  getAddress(): string {
    return this.wallet?.publicKey?.toString() || '';
  }

  disconnect() {
    this.wallet?.disconnect?.();
    this.wallet = null;
  }

  // Decode base64url (matching npm package)
  private base64urlDecode(str: string): string {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padding);
    return atob(padded);
  }

  // Build signing string (matching npm package exactly)
  private buildSigningString(challenge: any): string {
    const lines = [
      'OpenKitx403 Challenge',
      '',
      `domain: ${challenge.aud}`,
      `server: ${challenge.serverId}`,
      `nonce: ${challenge.nonce}`,
      `ts: ${challenge.ts}`,
      `method: ${challenge.method}`,
      `path: ${challenge.path}`,
      '',
      `payload: ${JSON.stringify(challenge, Object.keys(challenge).sort())}`
    ];
    
    return lines.join('\n');
  }

  // Generate nonce
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async authenticate({ resource, method = 'GET' }: { resource: string; method?: string }) {
    if (!this.wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('🔐 Starting authentication...');

    // First request
    const res1 = await fetch(resource, { method });

    if (res1.status !== 403) {
      return res1;
    }

    // Get WWW-Authenticate header
    const authHeader = res1.headers.get('WWW-Authenticate');
    if (!authHeader || !authHeader.startsWith('OpenKitx403')) {
      throw new Error('No OpenKitx403 challenge found');
    }

    console.log('✅ Got challenge header');

    // Extract challenge from header
    const challengeMatch = authHeader.match(/challenge="([^"]+)"/);
    if (!challengeMatch) {
      throw new Error('No challenge in header');
    }

    const challengeEncoded = challengeMatch[1];
    console.log('📦 Challenge (encoded):', challengeEncoded.substring(0, 30) + '...');

    // Decode challenge (base64url -> JSON)
    let challenge;
    try {
      const challengeJson = this.base64urlDecode(challengeEncoded);
      challenge = JSON.parse(challengeJson);
      console.log('✅ Challenge decoded:', challenge);
    } catch (err) {
      console.error('❌ Failed to decode challenge:', err);
      throw new Error('Invalid challenge format');
    }

    // Build the signing string (CRITICAL - must match server exactly)
    const signingString = this.buildSigningString(challenge);
    console.log('📝 Signing string:', signingString.substring(0, 100) + '...');

    // Convert to bytes
    const messageBytes = new TextEncoder().encode(signingString);
    console.log('✍️ Requesting signature...');

    // Sign with wallet
    let signed;
    try {
      signed = await this.wallet.signMessage(messageBytes);
      console.log('✅ Signed successfully');
    } catch (err) {
      console.error('❌ Signing failed:', err);
      throw new Error('Failed to sign message');
    }

    // Encode signature as bs58 (NOT base64!)
    const signatureBS58 = bs58.encode(signed.signature);
    console.log('🔐 Signature (bs58):', signatureBS58.substring(0, 30) + '...');

    // Parse URL
    const url = new URL(resource);
    
    // Generate client nonce and timestamp
    const clientNonce = this.generateNonce();
    const clientTs = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const bind = `${method}:${url.pathname}`;

    // Build Authorization header (matching npm package format)
    const authValue = `OpenKitx403 addr="${this.wallet.publicKey}", sig="${signatureBS58}", challenge="${challengeEncoded}", ts="${clientTs}", nonce="${clientNonce}", bind="${bind}"`;
    console.log('📤 Authorization:', authValue.substring(0, 100) + '...');

    // Retry with auth
    console.log('🔄 Retrying request...');
    const res2 = await fetch(resource, {
      method,
      headers: {
        'Authorization': authValue
      }
    });

    console.log('📡 Response status:', res2.status);

    if (res2.ok) {
      console.log('🎉 Success!');
    } else {
      const errorText = await res2.text();
      console.error('❌ Failed:', errorText);
    }

    return res2;
  }
}
