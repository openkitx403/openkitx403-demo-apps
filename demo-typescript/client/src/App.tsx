import { useState, useEffect } from 'react';
import { OpenKit403Client } from '@openkitx403/client';
import WalletConnect from './components/WalletConnect';
import Gallery from './components/Gallery';
import ErrorAlert from './components/ErrorAlert';
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

      if (data && Array.isArray(data.nfts)) {
        setNfts(data.nfts);
      } else if (Array.isArray(data)) {
        setNfts(data);
      } else {
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
              <h1 className="logo-text">OpenKitx403</h1>
              <span className="badge">DEMO</span>
            </div>
            {connected && walletAddress && (
              <div className="wallet-info">
                <span className="wallet-address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <button 
                  onClick={handleDisconnect} 
                  className="btn btn-secondary"
                  aria-label="Disconnect wallet"
                >
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
            <h2 className="hero-title">NFT-Gated Gallery</h2>
            <p className="hero-subtitle">
              Connect your Solana wallet to authenticate and view exclusive content.
              Demonstrates HTTP 403 challenge-response authentication.
            </p>
          </div>

          {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

          {!connected ? (
            <WalletConnect onConnect={handleConnect} loading={loading} />
          ) : (
            <Gallery nfts={nfts} loading={loading} onRefresh={fetchNFTs} />
          )}

          <div className="features">
            <div className="feature-item">
              <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cryptographic proof of ownership</span>
            </div>
            <div className="feature-item">
              <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No passwords or private keys</span>
            </div>
            <div className="feature-item">
              <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>HTTP-native authentication flow</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <p className="footer-text">
              Powered by <strong>OpenKitx403</strong>
            </p>
            <div className="footer-links">
              <a 
                href="https://github.com/openkitx403/openkitx403" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-link"
              >
                GitHub
              </a>
              <a 
                href="https://openkitx403.github.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-link"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

