import { useState, useEffect } from 'react';
import { OpenKit403Client } from '@openkitx403/client';
import WalletConnect from './components/WalletConnect';
import Gallery from './components/Gallery';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface NFT {
  id: number;
  name: string;
  image: string;
  description: string;
  rarity: string;
  collection: string;
}

function App() {
  const [client, setClient] = useState<OpenKit403Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const openKitClient = new OpenKit403Client();
    setClient(openKitClient);
  }, []);

  const handleConnect = async (walletType: 'phantom' | 'backpack' | 'solflare') => {
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      await client.connect(walletType);
      const address = client.getAddress();
      setWalletAddress(address);
      setConnected(true);

      await fetchNFTs();
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (client) {
      client.disconnect();
    }
    setConnected(false);
    setWalletAddress(null);
    setNfts([]);
    setError(null);
  };

  const fetchNFTs = async () => {
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      const response = await client.authenticate({
        resource: `${API_URL}/api/nfts`,
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch NFTs: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('NFT Response:', data);

      if (data && Array.isArray(data.nfts)) {
        setNfts(data.nfts);
        console.log(`Loaded ${data.nfts.length} NFTs`);
      } else if (Array.isArray(data)) {
        setNfts(data);
        console.log(`Loaded ${data.length} NFTs`);
      } else {
        console.warn('Unexpected response format:', data);
        setNfts([]);
        setError('Could not parse NFT data');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to authenticate and fetch NFTs');
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <h1>OpenKitx403</h1>
              <span className="beta-badge">DEMO</span>
            </div>
            {connected && walletAddress && (
              <div className="wallet-info">
                <span className="wallet-address">
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </span>
                <button onClick={handleDisconnect} className="btn-disconnect">
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="hero">
            <h2 className="title">NFT-Gated Gallery</h2>
            <p className="subtitle">
              Connect your Solana wallet to view exclusive NFT content.
              This demo shows wallet authentication in action.
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">✗</span>
              {error}
            </div>
          )}

          {!connected ? (
            <WalletConnect
              onConnect={handleConnect}
              loading={loading}
            />
          ) : (
            <Gallery
              nfts={nfts}
              loading={loading}
              onRefresh={fetchNFTs}
            />
          )}

          <div className="features">
            <div className="feature">
              <span className="feature-icon">✓</span>
              <span>No passwords or secrets required</span>
            </div>
            <div className="feature">
              <span className="feature-icon">✓</span>
              <span>Cryptographic proof of ownership</span>
            </div>
            <div className="feature">
              <span className="feature-icon">✓</span>
              <span>HTTP 403 challenge-response flow</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>
            Powered by <strong>OpenKitx403</strong> - HTTP-native wallet authentication
          </p>
          <div className="footer-links">
            <a href="https://github.com/openkitx403/openkitx403" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://openkitx403.github.io" target="_blank" rel="noopener noreferrer">
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

