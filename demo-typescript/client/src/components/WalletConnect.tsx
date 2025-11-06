interface WalletConnectProps {
  onConnect: (walletType: 'phantom' | 'backpack' | 'solflare') => void;
  loading: boolean;
}

export default function WalletConnect({ onConnect, loading }: WalletConnectProps) {
  const wallets = [
    { id: 'phantom' as const, name: 'Phantom', icon: '👻' },
    { id: 'backpack' as const, name: 'Backpack', icon: '🎒' },
    { id: 'solflare' as const, name: 'Solflare', icon: '☀️' },
  ];

  return (
    <div className="connect-section">
      <h1 className="connect-title">
        NFT-Gated Gallery
      </h1>
      <p className="connect-description">
        Connect your Solana wallet to view exclusive NFT content.
        This demo shows wallet authentication in action.
      </p>

      <div className="wallet-buttons">
        {wallets.map((wallet) => (
          <button
            key={wallet.id}
            className="wallet-button"
            onClick={() => onConnect(wallet.id)}
            disabled={loading}
          >
            <span className="wallet-icon">{wallet.icon}</span>
            {loading ? 'Connecting...' : `Connect ${wallet.name}`}
          </button>
        ))}
      </div>

      <div className="feature-list">
        <div className="feature-item">
          <span className="check-icon">✓</span>
          <span>No passwords or secrets required</span>
        </div>
        <div className="feature-item">
          <span className="check-icon">✓</span>
          <span>Cryptographic proof of ownership</span>
        </div>
        <div className="feature-item">
          <span className="check-icon">✓</span>
          <span>HTTP 403 challenge-response flow</span>
        </div>
        <div className="feature-item">
          <span className="check-icon">✓</span>
          <span>Works with any Solana wallet</span>
        </div>
      </div>
    </div>
  );
}