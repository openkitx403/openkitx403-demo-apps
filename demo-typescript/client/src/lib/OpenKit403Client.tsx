import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export type WalletProvider = 'phantom' | 'backpack' | 'solflare';

export interface AuthOptions {
  resource: string;
  method?: string;
  headers?: Record<string, string>;
  wallet?: WalletProvider;
  body?: any;
}

export interface AuthResult {
  ok: boolean;
  address?: string;
  challenge?: string;
  response?: Response;
  error?: string;
}

export interface Challenge {
  v: number;
  alg: string;
  nonce: string;
  ts: string;
  aud: string;
  method: string;
  path: string;
  uaBind: boolean;
  originBind: boolean;
  serverId: string;
  exp: string;
  ext?: Record<string, unknown>;
}

interface SolanaWallet {
  publicKey?: PublicKey;
  signMessage?(message: Uint8Array, display?: string): Promise<{ signature: Uint8Array }>;
  connect?(): Promise<{ publicKey: PublicKey }>;
  isConnected?: boolean;
}

// Browser-safe utility functions
function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  return atob(padded);
}

function buildSigningString(challenge: Challenge): string {
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

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function parseWWWAuthenticate(header: string): { challenge: string } | null {
  const match = header.match(/challenge="([^"]+)"/);
  return match ? { challenge: match[1] } : null;
}

export class OpenKit403Client {
  private wallet?: WalletProvider;
  private walletInstance?: SolanaWallet;

  constructor(opts?: { wallet?: WalletProvider }) {
    this.wallet = opts?.wallet;
  }

  async connect(wallet?: WalletProvider): Promise<void> {
    const provider = wallet || this.wallet;
    if (!provider) {
      throw new Error('No wallet provider specified');
    }

    if (typeof window === 'undefined') {
      throw new Error('Wallet connection only available in browser');
    }

    let walletObj: SolanaWallet | undefined;
    switch (provider) {
      case 'phantom':
        walletObj = (window as any).phantom?.solana || (window as any).solana;
        break;
      case 'backpack':
        walletObj = (window as any).backpack;
        break;
      case 'solflare':
        walletObj = (window as any).solflare;
        break;
      default:
        throw new Error(`Unknown wallet provider: ${provider}`);
    }

    if (!walletObj) {
      throw new Error(`${provider} wallet not found. Please install it.`);
    }

    if (!walletObj.isConnected && walletObj.connect) {
      await walletObj.connect();
    }

    this.walletInstance = walletObj;
    this.wallet = provider;
  }

  private async signChallenge(challengeB64: string): Promise<{ signature: string; address: string }> {
    if (!this.walletInstance) {
      throw new Error('Wallet not connected. Call connect() first.');
    }

    if (!this.walletInstance.publicKey) {
      throw new Error('Wallet public key not available');
    }

    const challengeJson = base64urlDecode(challengeB64);
    const challenge: Challenge = JSON.parse(challengeJson);
    const signingString = buildSigningString(challenge);
    const message = new TextEncoder().encode(signingString);

    if (!this.walletInstance.signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    const { signature } = await this.walletInstance.signMessage(message, 'utf8');
    return {
      signature: bs58.encode(signature),
      address: this.walletInstance.publicKey.toBase58()
    };
  }

  async authenticate(options: AuthOptions): Promise<AuthResult> {
    const method = options.method || 'GET';
    const headers = { ...options.headers };

    console.log('🔐 Starting authentication...');

    // Make initial request to get challenge
    const response1 = await fetch(options.resource, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    console.log(`GET ${options.resource} ${response1.status}`);

    // If not 403 or no challenge, return as-is
    if (response1.status !== 403) {
      return {
        ok: response1.ok,
        response: response1,
        error: response1.ok ? undefined : `HTTP ${response1.status}`
      };
    }

    console.log('✅ Got challenge header');

    const wwwAuth = response1.headers.get('WWW-Authenticate');
    if (!wwwAuth || !wwwAuth.startsWith('OpenKitx403')) {
      return {
        ok: false,
        response: response1,
        error: 'No OpenKitx403 challenge found'
      };
    }

    const parsed = parseWWWAuthenticate(wwwAuth);
    if (!parsed) {
      return {
        ok: false,
        error: 'Failed to parse challenge'
      };
    }

    console.log('✅ Challenge decoded');

    // Connect wallet if needed
    if (!this.walletInstance) {
      try {
        await this.connect(options.wallet);
      } catch (err: any) {
        return {
          ok: false,
          error: `Wallet connection failed: ${err.message}`
        };
      }
    }

    console.log('📝 Built signing string');

    // Sign challenge
    let signed;
    try {
      console.log('✍️ Requesting signature...');
      signed = await this.signChallenge(parsed.challenge);
      console.log('✅ Signed');
    } catch (err: any) {
      return {
        ok: false,
        error: `Signature failed: ${err.message}`
      };
    }

    console.log('🔐 Signature encoded (bs58)');

    // CRITICAL FIX: Use challenge's method and path for bind parameter
    const challengeJson = base64urlDecode(parsed.challenge);
    const challenge: Challenge = JSON.parse(challengeJson);

    const nonce = generateNonce();
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    
    // Use challenge's method and path directly, NOT the URL path
    // This ensures bind matches what the server expects from Express router
    const bind = `${challenge.method}:${challenge.path}`;

    const authHeader = `OpenKitx403 addr="${signed.address}", sig="${signed.signature}", challenge="${parsed.challenge}", ts="${ts}", nonce="${nonce}", bind="${bind}"`;

    console.log('🔄 Retrying with auth...');
    
    // Retry request with authorization
    const response2 = await fetch(options.resource, {
      method,
      headers: {
        ...headers,
        'Authorization': authHeader
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    console.log(`GET ${options.resource} ${response2.status}`);

    if (response2.ok) {
      console.log('🎉 SUCCESS!');
    } else {
      const errorText = await response2.text();
      console.error('❌ Failed:', errorText);
    }

    return {
      ok: response2.ok,
      address: signed.address,
      challenge: parsed.challenge,
      response: response2,
      error: response2.ok ? undefined : `Authentication failed: HTTP ${response2.status}`
    };
  }

  getAddress(): string {
    return this.walletInstance?.publicKey?.toBase58() || '';
  }

  disconnect(): void {
    if (this.walletInstance && (this.walletInstance as any).disconnect) {
      (this.walletInstance as any).disconnect();
    }
    this.walletInstance = undefined;
  }
}

export async function detectWallets(): Promise<WalletProvider[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  const wallets: WalletProvider[] = [];
  if ((window as any).phantom?.solana || (window as any).solana) wallets.push('phantom');
  if ((window as any).backpack) wallets.push('backpack');
  if ((window as any).solflare) wallets.push('solflare');
  return wallets;
}

