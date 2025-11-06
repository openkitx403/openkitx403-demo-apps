import { useState, useEffect } from 'react';
import { OpenKit403Client } from '@openkitx403/client';
import WalletConnect from './components/WalletConnect';
import Gallery from './components/Gallery';

function App() {
  const [client] = useState(() => new OpenKit403Client());
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [nfts, setNfts] = useState<any[]>([]);

  const connectWallet = async (walletType: 'phantom' | 'backpack' | 'solflare') => {
    setLoading(true);
    setError(undefined);

    try {
      await client.connect(walletType);
      
      const result = await client.authenticate({
        resource: 'http://localhost:3000/api/nfts',
        method: 'GET'
      });

      if (result.ok) {
        setIsConnected(true);
        setAddress(result.address);
        const data = await result.response?.json();
        setNfts(data.nfts || []);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(undefined);
    setNfts([]);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-text">OpenKitx403</span>
            <span className="demo-badge">DEMO</span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'JetBrains Mono, monospace' }}>
            NFT-Gated Gallery
          </span>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="error">
            ❌ {error}
          </div>
        )}

        {!isConnected ? (
          <WalletConnect
            onConnect={connectWallet}
            loading={loading}
          />
        ) : (
          <Gallery
            address={address!}
            nfts={nfts}
            onDisconnect={disconnect}
          />
        )}
      </main>

      <footer className="footer">
        <p className="footer-text">
          Powered by{' '}
          <a href="https://github.com/openkitx403" className="footer-link" target="_blank" rel="noopener">
            OpenKitx403
          </a>
          {' · '}
          HTTP-native wallet authentication for Solana
        </p>
      </footer>
    </div>
  );
}

export default App;