interface NFT {
  id: number;
  name: string;
  image: string;
  description: string;
  rarity: string;
  collection: string;
}

interface NFTCardProps {
  nft: NFT;
}

export default function NFTCard({ nft }: NFTCardProps) {
  return (
    <div className="nft-card">
      <div className="nft-image-wrapper">
        <img 
          src={nft.image} 
          alt={nft.name}
          className="nft-image"
          loading="lazy"
        />
        <div className="nft-rarity">{nft.rarity}</div>
      </div>
      <div className="nft-body">
        <h4 className="nft-title">{nft.name}</h4>
        <p className="nft-collection">{nft.collection}</p>
        <p className="nft-description">{nft.description}</p>
      </div>
    </div>
  );
}

