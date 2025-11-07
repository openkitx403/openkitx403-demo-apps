import NFTCard from './NFTCard';

interface NFT {
  id: number;
  name: string;
  image: string;
  description: string;
  rarity: string;
  collection: string;
}

interface GalleryProps {
  nfts: NFT[];
  loading: boolean;
  onRefresh: () => void;
}

export default function Gallery({ nfts, loading, onRefresh }: GalleryProps) {
  if (loading) {
    return (
      <div className="gallery-state">
        <div className="spinner" />
        <p className="state-text">Loading NFTs...</p>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="gallery-state">
        <svg className="state-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
        <p className="state-text">No NFTs found</p>
        <button onClick={onRefresh} className="btn btn-primary">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="gallery">
      <div className="gallery-header">
        <h3 className="gallery-title">Your Collection</h3>
        <button 
          onClick={onRefresh} 
          className="btn btn-secondary" 
          disabled={loading}
          aria-label="Refresh NFTs"
        >
          <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Refresh
        </button>
      </div>
      <div className="nft-grid">
        {nfts.map((nft) => (
          <NFTCard key={nft.id} nft={nft} />
        ))}
      </div>
    </div>
  );
}

