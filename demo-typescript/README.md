# OpenKitx403 TypeScript Demo - NFT Gallery App

Live demo showing wallet authentication with NFT-gated content.

## Features

- 🎨 Beautiful NFT gallery interface
- 🔐 Wallet authentication (Phantom, Backpack, Solflare)
- ⚡ Real-time authentication flow
- 🎯 Protected API endpoints
- 📱 Responsive design

## Quick Start

### 1. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Run the Demo
```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start client
cd client
npm run dev
```

### 3. Open in Browser

Visit `http://localhost:5173` and connect your wallet!

## Deployment

### Server (Railway/Render)
```bash
cd server
npm run build
npm start
```

### Client (Vercel/Netlify)
```bash
cd client
npm run build
# Deploy the dist/ folder
```

## How It Works

1. User clicks "Connect Wallet"
2. Wallet prompts for signature
3. Client authenticates with server
4. Server verifies signature
5. Protected NFT content is displayed

Perfect demo of HTTP 403 wallet authentication!
