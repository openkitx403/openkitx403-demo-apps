interface NFTCardProps {
  nft: {
    id: number;
    name: string;
    image: string;
    description: string;
    rarity: string;
    collection: string;
  };
}

export default function NFTCard({ nft }: NFTCardProps) {
  return (
    <div className="nft-card">
      <img src={nft.image} alt={nft.name} className="nft-image" />
      <div className="nft-content">
        <h3 className="nft-name">{nft.name}</h3>
        <p className="nft-description">{nft.description}</p>
        <div className="nft-meta">
          <div className="nft-trait">
            <span className="nft-trait-label">Rarity</span>
            <span className="nft-trait-value">{nft.rarity}</span>
          </div>
          <div className="nft-trait">
            <span className="nft-trait-label">Collection</span>
            <span className="nft-trait-value">{nft.collection}</span>
          </div>
        </div>
      </div>
    </div>
  );
}