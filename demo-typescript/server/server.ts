import express, { Request, Response } from 'express';
import cors from 'cors';
import { createOpenKit403, inMemoryLRU } from '@openkitx403/server';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'https://openkitx403-demo-apps.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['WWW-Authenticate']
}));

app.use(express.json());

const openkit = createOpenKit403({
  issuer: 'nft-gallery-demo',
  audience: process.env.AUDIENCE || 'https://openkitx403-nft-gallery-api.onrender.com',
  ttlSeconds: 60,
  bindMethodPath: false,
  replayStore: inMemoryLRU(),
  clockSkewSeconds: 120
});

interface OpenKitRequest extends Request {
  openkitx403User?: {
    address: string;
    [key: string]: any;
  };
}

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'OpenKitx403 NFT Gallery Demo API',
    status: 'running',
    endpoints: {
      nfts: '/api/nfts (protected)'
    }
  });
});

const protectedRouter = express.Router();
protectedRouter.use(openkit.middleware());

protectedRouter.get('/nfts', (req: OpenKitRequest, res: Response) => {
  const user = req.openkitx403User;

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
  console.log(`📱 CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🔐 Using @openkitx403/server@0.1.3`);
});

