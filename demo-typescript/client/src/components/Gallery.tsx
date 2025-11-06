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
      <div className="gallery-loading">
        <div className="spinner"></div>
        <p>Loading your exclusive NFTs...</p>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="gallery-empty">
        <p>No NFTs found</p>
        <button onClick={onRefresh} className="btn-refresh">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="gallery">
      <div className="gallery-header">
        <h3>Your Exclusive NFT Collection</h3>
        <button onClick={onRefresh} className="btn-refresh" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
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
