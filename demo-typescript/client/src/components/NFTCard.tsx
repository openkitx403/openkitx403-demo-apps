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
  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      'Legendary': '#FFD700',
      'Epic': '#9945FF',
      'Rare': '#14F195',
      'Uncommon': '#00D4FF',
      'Common': '#808080'
    };
    return colors[rarity] || '#808080';
  };

  return (
    <div className="nft-card">
      <div className="nft-image-container">
        <img 
          src={nft.image} 
          alt={nft.name}
          className="nft-image"
        />
        <div 
          className="nft-rarity"
          style={{ backgroundColor: getRarityColor(nft.rarity) }}
        >
          {nft.rarity}
        </div>
      </div>
      <div className="nft-content">
        <h4 className="nft-name">{nft.name}</h4>
        <p className="nft-collection">{nft.collection}</p>
        <p className="nft-description">{nft.description}</p>
      </div>
    </div>
  );
}
