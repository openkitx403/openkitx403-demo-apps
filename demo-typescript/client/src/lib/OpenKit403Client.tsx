import { OpenKit403Client as OfficialClient, AuthOptions, AuthResult } from '@openkitx403/client';

export class OpenKit403Client {
  private client: OfficialClient;
  private walletType: 'phantom' | 'backpack' | 'solflare' | null = null;
  private walletInstance: any = null;

  constructor() {
    this.client = new OfficialClient();
  }

  async connect(type: 'phantom' | 'backpack' | 'solflare') {
    this.walletType = type;
    
    try {
      await this.client.connect(type);
      
      const wallets: any = {
        phantom: (window as any).phantom?.solana,
        backpack: (window as any).backpack,
        solflare: (window as any).solflare
      };
      
      this.walletInstance = wallets[type];
    } catch (err) {
      console.error('Connection failed:', err);
      throw err;
    }
  }

  getAddress(): string {
    if (this.walletInstance?.publicKey) {
      return this.walletInstance.publicKey.toString();
    }
    return '';
  }

  disconnect() {
    if (this.walletInstance?.disconnect) {
      this.walletInstance.disconnect();
    }
    this.walletType = null;
    this.walletInstance = null;
  }

  async authenticate({ resource, method = 'GET' }: AuthOptions): Promise<Response> {
    try {
      const result = await this.client.authenticate({
        resource,
        method,
        wallet: this.walletType || undefined
      });

      if (!result.ok) {
        throw new Error(result.error || 'Authentication failed');
      }

      return result.response!;
    } catch (err) {
      console.error('Authentication error:', err);
      throw err;
    }
  }
}

