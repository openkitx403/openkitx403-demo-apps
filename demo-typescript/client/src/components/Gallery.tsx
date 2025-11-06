import NFTCard from './NFTCard';

interface GalleryProps {
  address: string;
  nfts: any[];
  onDisconnect: () => void;
}

export default function Gallery({ address, nfts, onDisconnect }: GalleryProps) {
  return (
    <div className="gallery-section">
      <div className="gallery-header">
        <div className="wallet-info">
          <div className="wallet-address">
            <div className="status-dot"></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                CONNECTED WALLET
              </div>
              <div className="wallet-text">
                {address.slice(0, 4)}...{address.slice(-4)}
              </div>
            </div>
          </div>
          <button className="disconnect-button" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </div>

      <h2 className="gallery-title">🎨 Exclusive NFT Collection</h2>
      <p className="gallery-subtitle">
        These NFTs are only visible to authenticated wallet holders
      </p>

      <div className="nft-grid" style={{ marginTop: '2rem' }}>
        {nfts.map((nft) => (
          <NFTCard key={nft.id} nft={nft} />
        ))}
      </div>
    </div>
  );
}