/**
 * OpenKitx403 AI Agent Frontend
 * Real implementation with wallet authentication - FIXED
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

    // Sign with wallet - FIXED
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sign message with Phantom wallet - FIXED
 */
async function signMessage(message) {
  try {
    // Encode message to Uint8Array
    const encodedMessage = new TextEncoder().encode(message);
    
    // ✅ Use correct Phantom signMessage method
    const { signature } = await window.solana.signMessage(encodedMessage, 'utf8');
    
    // ✅ signature is a Uint8Array, base58-encode it
    return base58Encode(signature);
  } catch (error) {
    console.error('Sign message error:', error);
    throw new Error(`Failed to sign message: ${error.message}`);
  }
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
 * Base58 encode - IMPROVED IMPLEMENTATION
 */
function base58Encode(bytes) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  // Handle empty input
  if (bytes.length === 0) return '';
  
  // Count leading zeros
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }
  
  // Convert bytes to BigInt
  let num = 0n;
  for (let i = 0; i < bytes.length; i++) {
    num = num * 256n + BigInt(bytes[i]);
  }
  
  // Convert to base58
  let encoded = '';
  while (num > 0n) {
    const remainder = num % 58n;
    num = num / 58n;
    encoded = ALPHABET[Number(remainder)] + encoded;
  }
  
  // Add leading '1's for leading zeros
  return '1'.repeat(zeros) + encoded;
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
    console.error('Process query error:', error);
    addMessage(`Error: ${error.message}\n\nPlease try again or reconnect your wallet.`);
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
    addMessage('Welcome! Connect your wallet to get started.\n\nTry asking: "Show me my portfolio"');
  }

  console.log('[App] Ready');
});

