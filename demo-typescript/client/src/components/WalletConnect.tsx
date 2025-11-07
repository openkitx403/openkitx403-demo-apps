interface WalletConnectProps {
  onConnect: (walletType: 'phantom' | 'backpack' | 'solflare') => void;
  loading: boolean;
}

export default function WalletConnect({ onConnect, loading }: WalletConnectProps) {
  const wallets = [
    {
      type: 'phantom' as const,
      name: 'Phantom',
      description: 'Connect with Phantom wallet'
    },
    {
      type: 'backpack' as const,
      name: 'Backpack',
      description: 'Connect with Backpack wallet'
    },
    {
      type: 'solflare' as const,
      name: 'Solflare',
      description: 'Connect with Solflare wallet'
    }
  ];

  return (
    <div className="wallet-connect">
      <div className="wallet-grid">
        {wallets.map((wallet) => (
          <button
            key={wallet.type}
            onClick={() => onConnect(wallet.type)}
            disabled={loading}
            className="wallet-button"
            aria-label={wallet.description}
          >
            <span className="wallet-name">{wallet.name}</span>
            <svg className="wallet-arrow" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ))}
      </div>
      {loading && (
        <div className="wallet-status">
          <div className="spinner" />
          <span>Connecting wallet...</span>
        </div>
      )}
    </div>
  );
}

