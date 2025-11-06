import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import { createOpenKit403, inMemoryLRU } from '@openkitx403/server';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json());

const openkit = createOpenKit403({
  issuer: 'nft-gallery-demo',
  audience: 'http://localhost:3000',
  ttlSeconds: 60,
  bindMethodPath: true,
  replayStore: inMemoryLRU()
});

// Extend Express Request type to include openkitx403User
interface OpenKitRequest extends Request {
  openkitx403User?: {
    address: string;
    [key: string]: any;
  };
}

// Public endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'OpenKitx403 NFT Gallery Demo API',
    status: 'running',
    endpoints: {
      nfts: '/api/nfts (protected)'
    }
  });
});

// Protected NFT gallery endpoint
const protectedRouter: Router = express.Router();
protectedRouter.use(openkit.middleware());

protectedRouter.get('/nfts', (req: OpenKitRequest, res: Response) => {
  const user = req.openkitx403User;

  // Mock NFT data
  const nfts = [
    {
      id: 1,
      name: 'Cosmic Cat #42',
      image: 'https://placehold.co/400x400/9945ff/ffffff?text=Cosmic+Cat+42',
      description: 'A rare cosmic cat from the depths of space',
      rarity: 'Legendary',
      collection: 'Cosmic Cats'
    },
    {
      id: 2,
      name: 'Digital Dragon #7',
      image: 'https://placehold.co/400x400/00d4ff/ffffff?text=Digital+Dragon+7',
      description: 'Ancient dragon living in the blockchain',
      rarity: 'Epic',
      collection: 'Digital Dragons'
    },
    {
      id: 3,
      name: 'Cyber Punk #123',
      image: 'https://placehold.co/400x400/14F195/000000?text=Cyber+Punk+123',
      description: 'Punk from the neon future',
      rarity: 'Rare',
      collection: 'Cyber Punks'
    },
    {
      id: 4,
      name: 'Moon Monkey #88',
      image: 'https://placehold.co/400x400/ff7b72/ffffff?text=Moon+Monkey+88',
      description: 'Astronaut monkey exploring the moon',
      rarity: 'Uncommon',
      collection: 'Moon Monkeys'
    },
    {
      id: 5,
      name: 'Abstract Art #5',
      image: 'https://placehold.co/400x400/ffa657/000000?text=Abstract+5',
      description: 'Pure digital abstract expression',
      rarity: 'Rare',
      collection: 'Abstract Series'
    },
    {
      id: 6,
      name: 'Pixel Wizard #99',
      image: 'https://placehold.co/400x400/d2a8ff/000000?text=Pixel+Wizard+99',
      description: 'Legendary wizard from the pixel realm',
      rarity: 'Legendary',
      collection: 'Pixel Wizards'
    }
  ];

  res.json({
    wallet: user?.address,
    nfts,
    count: nfts.length,
    message: 'Successfully authenticated!'
  });
});

app.use('/api', protectedRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
