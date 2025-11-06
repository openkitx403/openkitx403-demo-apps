interface WalletConnectProps {
  onConnect: (walletType: 'phantom' | 'backpack' | 'solflare') => void;
  loading: boolean;
}

export default function WalletConnect({ onConnect, loading }: WalletConnectProps) {
  const wallets = [
    {
      type: 'phantom' as const,
      name: 'Phantom',
      icon: '👻',
      color: '#AB9FF2'
    },
    {
      type: 'backpack' as const,
      name: 'Backpack',
      icon: '🎒',
      color: '#E84142'
    },
    {
      type: 'solflare' as const,
      name: 'Solflare',
      icon: '🌞',
      color: '#FFA500'
    }
  ];

  return (
    <div className="wallet-connect">
      <div className="wallet-buttons">
        {wallets.map((wallet) => (
          <button
            key={wallet.type}
            onClick={() => onConnect(wallet.type)}
            disabled={loading}
            className="btn-wallet"
            style={{ '--wallet-color': wallet.color } as any}
          >
            <span className="wallet-icon">{wallet.icon}</span>
            <span className="wallet-name">
              {loading ? 'Connecting...' : `Connect ${wallet.name}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
