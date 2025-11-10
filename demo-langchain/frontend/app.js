/**
 * OpenKitx403 AI Agent Frontend
 * Real implementation with wallet authentication
 */

const API_URL = 'https://openkitx403-demo-apps.onrender.com';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const examplePrompts = document.querySelectorAll('.example-prompt');

// Wallet state
let walletPublicKey = null;

/**
 * Add message to chat
 */
function addMessage(text, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = isUser ? 'user-message' : 'agent-message';

  if (isUser) {
    messageDiv.innerHTML = `
      <div class="user-avatar">U</div>
      <div class="message-content">${escapeHtml(text)}</div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="agent-avatar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="message-content">${escapeHtml(text)}</div>
    `;
  }

  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Show typing indicator
 */
function showTyping() {
  typingIndicator.classList.remove('hidden');
  scrollToBottom();
}

/**
 * Hide typing indicator
 */
function hideTyping() {
  typingIndicator.classList.add('hidden');
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Connect to Phantom wallet
 */
async function connectWallet() {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      addMessage('Please install Phantom wallet extension to use this app.\n\nVisit: https://phantom.app');
      return false;
    }

    const response = await window.solana.connect();
    walletPublicKey = response.publicKey.toString();
    
    addMessage(`Connected to wallet: ${walletPublicKey.slice(0, 8)}...${walletPublicKey.slice(-8)}`);
    return true;
  } catch (error) {
    addMessage(`Failed to connect wallet: ${error.message}`);
    return false;
  }
}

/**
 * Make authenticated API request with OpenKitx403
 */
async function authenticatedRequest(endpoint, method = 'GET', body = null) {
  if (!walletPublicKey) {
    throw new Error('Wallet not connected');
  }

  const url = `${API_URL}${endpoint}`;
  
  // Step 1: Initial request (will get 403 challenge)
  let response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });

  // Step 2: If 403, handle authentication challenge
  if (response.status === 403) {
    const wwwAuth = response.headers.get('WWW-Authenticate');
    
    if (!wwwAuth || !wwwAuth.startsWith('OpenKitx403')) {
      throw new Error('Invalid authentication challenge');
    }

    // Extract challenge
    const challengeMatch = wwwAuth.match(/challenge="([^"]+)"/);
    if (!challengeMatch) {
      throw new Error('No challenge in response');
    }

    const challengeB64 = challengeMatch[1];
    
    // Decode challenge
    const challengeJson = base64UrlDecode(challengeB64);
    const challenge = JSON.parse(challengeJson);

    // Build signing string
    const signingString = buildSigningString(challenge);
    
    // Sign with wallet
    const signature = await signMessage(signingString);
    
    // Build authorization header
    const nonce = generateNonce();
    const ts = new Date().toISOString().replace(/\.\d{3}/, '');
    const bind = `${method}:${new URL(url).pathname}`;
    
    const authHeader = `OpenKitx403 addr="${walletPublicKey}", sig="${signature}", challenge="${challengeB64}", ts="${ts}", nonce="${nonce}", bind="${bind}"`;

    // Step 3: Retry with authorization
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: body ? JSON.stringify(body) : null
    });
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sign message with Phantom wallet
 */
async function signMessage(message) {
  const encodedMessage = new TextEncoder().encode(message);
  const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
  return base58Encode(signedMessage.signature);
}

/**
 * Build signing string for OpenKitx403
 */
function buildSigningString(challenge) {
  const payload = JSON.stringify(challenge, Object.keys(challenge).sort());
  
  return [
    'OpenKitx403 Challenge',
    '',
    `domain: ${challenge.aud}`,
    `server: ${challenge.serverId}`,
    `nonce: ${challenge.nonce}`,
    `ts: ${challenge.ts}`,
    `method: ${challenge.method}`,
    `path: ${challenge.path}`,
    '',
    `payload: ${payload}`
  ].join('\n');
}

/**
 * Generate random nonce
 */
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base58Encode(bytes);
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);
  return atob(base64);
}

/**
 * Base58 encode (simple implementation)
 */
function base58Encode(bytes) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let encoded = '';
  let num = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  
  while (num > 0n) {
    const remainder = num % 58n;
    num = num / 58n;
    encoded = ALPHABET[Number(remainder)] + encoded;
  }
  
  // Handle leading zeros
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    encoded = '1' + encoded;
  }
  
  return encoded;
}

/**
 * Process query and get real API response
 */
async function processQuery(query) {
  addMessage(query, true);
  showTyping();
  sendButton.disabled = true;

  try {
    // Check wallet connection
    if (!walletPublicKey) {
      const connected = await connectWallet();
      if (!connected) {
        hideTyping();
        sendButton.disabled = false;
        return;
      }
    }

    // Determine which endpoint to call based on query
    const q = query.toLowerCase();
    let data;

    if (q.includes('portfolio') || q.includes('balance') || q.includes('holdings')) {
      data = await authenticatedRequest('/api/portfolio');
      addMessage(formatPortfolio(data));
    } 
    else if (q.includes('nft') || q.includes('collectible')) {
      data = await authenticatedRequest('/api/nfts');
      addMessage(formatNFTs(data));
    }
    else if (q.includes('transaction') || q.includes('history') || q.includes('activity')) {
      data = await authenticatedRequest('/api/transactions');
      addMessage(formatTransactions(data));
    }
    else if (q.includes('price')) {
      const symbol = q.match(/\b(sol|btc|eth|usdc|bonk)\b/i)?.[1] || 'SOL';
      data = await authenticatedRequest(`/api/token-price/${symbol}`);
      addMessage(formatPrice(data));
    }
    else if (q.includes('analyze') || q.includes('recommendation')) {
      data = await authenticatedRequest('/api/analyze', 'POST');
      addMessage(formatAnalysis(data));
    }
    else {
      addMessage('I can help you with:\n• Portfolio overview\n• NFT collections\n• Transaction history\n• Token prices\n• Portfolio analysis\n\nTry: "Show me my portfolio"');
    }

  } catch (error) {
    addMessage(`Error: ${error.message}\n\nPlease check:\n• Wallet is connected\n• Backend is running\n• CORS is configured`);
  } finally {
    hideTyping();
    sendButton.disabled = false;
    chatInput.focus();
  }
}

/**
 * Format portfolio response
 */
function formatPortfolio(data) {
  let result = `Portfolio Summary\n`;
  result += `Total Value: $${data.total_value_usd.toLocaleString()}\n\n`;
  result += `Holdings:\n`;
  
  data.items.forEach(item => {
    const change = item.change_24h >= 0 ? `+${item.change_24h}` : item.change_24h;
    result += `• ${item.asset}: ${item.amount.toLocaleString()} ($${item.value_usd.toLocaleString()}) [${change}% 24h]\n`;
  });
  
  return result;
}

/**
 * Format NFTs response
 */
function formatNFTs(data) {
  let result = `NFT Collection\n`;
  result += `Total NFTs: ${data.total_nfts}\n`;
  result += `Floor Value: ${data.total_floor_value_sol} SOL\n\n`;
  
  data.nfts.forEach(nft => {
    result += `• ${nft.name}\n`;
    result += `  Collection: ${nft.collection}\n`;
    result += `  Floor: ${nft.floor_price} SOL\n\n`;
  });
  
  return result;
}

/**
 * Format transactions response
 */
function formatTransactions(data) {
  let result = `Recent Transactions\n\n`;
  
  data.transactions.forEach(tx => {
    result += `• ${tx.type}: ${tx.amount} SOL\n`;
    result += `  Status: ${tx.status}\n`;
    result += `  ${tx.timestamp}\n\n`;
  });
  
  return result;
}

/**
 * Format price response
 */
function formatPrice(data) {
  const change = data.change_24h >= 0 ? `+${data.change_24h}` : data.change_24h;
  return `${data.symbol}\nPrice: $${data.price_usd.toLocaleString()}\n24h Change: ${change}%`;
}

/**
 * Format analysis response
 */
function formatAnalysis(data) {
  let result = `Portfolio Analysis\n\n`;
  result += `Risk Score: ${data.risk_score}/10\n`;
  result += `Diversification: ${data.diversification}\n\n`;
  
  if (data.highlights.length > 0) {
    result += `Highlights:\n`;
    data.highlights.forEach(h => result += `• ${h}\n`);
    result += `\n`;
  }
  
  if (data.recommendations.length > 0) {
    result += `Recommendations:\n`;
    data.recommendations.forEach(r => result += `• ${r}\n`);
  }
  
  return result;
}

/**
 * Handle form submission
 */
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const query = chatInput.value.trim();
  if (!query) return;
  
  chatInput.value = '';
  await processQuery(query);
});

/**
 * Handle example prompts
 */
examplePrompts.forEach(button => {
  button.addEventListener('click', async () => {
    const prompt = button.dataset.prompt;
    chatInput.value = prompt;
    await processQuery(prompt);
  });
});

/**
 * Initialize
 */
document.addEventListener('DOMContentLoaded', () => {
  chatInput.focus();
  
  // Check if Phantom is installed
  if (!window.solana || !window.solana.isPhantom) {
    addMessage('⚠️ Phantom wallet not detected!\n\nPlease install Phantom wallet to use this app:\nhttps://phantom.app\n\nRefresh the page after installing.');
  } else {
    addMessage('Welcome! Click "Connect Wallet" or start asking questions.');
  }
  
  console.log('[App] Ready');
});
