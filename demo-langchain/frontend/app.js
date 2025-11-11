/**
 * OpenKitx403 AI Agent Frontend
 * Complete version with full debugging
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

function showTyping() {
  typingIndicator.classList.remove('hidden');
  scrollToBottom();
}

function hideTyping() {
  typingIndicator.classList.add('hidden');
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

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

    console.log('[Wallet] Connected:', walletPublicKey);
    addMessage(`✅ Connected: ${walletPublicKey.slice(0, 8)}...${walletPublicKey.slice(-8)}`);
    return true;
  } catch (error) {
    console.error('[Wallet] Connection error:', error);
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

    console.log('[Auth] Challenge:', challenge);

    // Build signing string
    const signingString = buildSigningString(challenge);
    console.log('[Auth] Signing string:', signingString);

    // DEBUG: Verify public key
    console.log('=== PUBLIC KEY DEBUG ===');
    console.log('Wallet public key:', walletPublicKey);
    console.log('Public key length:', walletPublicKey.length);
    
    try {
      const testDecode = base58Decode(walletPublicKey);
      console.log('Decoded public key length:', testDecode.length);
      console.log('Decoded public key bytes:', Array.from(testDecode));
    } catch (e) {
      console.error('Failed to decode public key:', e);
    }
    console.log('=== END PUBLIC KEY DEBUG ===');

    // Sign with wallet
    const signature = await signMessage(signingString);
    console.log('[Auth] Signature:', signature.substring(0, 20) + '...');

    // Build authorization header
    const nonce = generateNonce();
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const pathname = new URL(url).pathname;
    const bind = `${method}:${pathname}`;

    const authHeader = `OpenKitx403 addr="${walletPublicKey}", sig="${signature}", challenge="${challengeB64}", ts="${ts}", nonce="${nonce}", bind="${bind}"`;

    console.log('[Auth] Authorization header built');
    console.log('[Auth] Retrying with auth...');

    // Step 3: Retry with authorization
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: body ? JSON.stringify(body) : null
    });

    console.log('[Auth] Response status:', response.status);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.detail || `API error: ${response.status} ${response.statusText}`;
    console.error('[Auth] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Sign message with Phantom wallet - WITH FULL DEBUG
 */
async function signMessage(message) {
  try {
    console.log('=== SIGN MESSAGE DEBUG ===');
    console.log('Message to sign (first 100 chars):', message.substring(0, 100));
    console.log('Message length:', message.length);
    console.log('Wallet public key:', walletPublicKey);
    
    const encodedMessage = new TextEncoder().encode(message);
    console.log('Encoded message length:', encodedMessage.length);
    console.log('Encoded message (first 20 bytes):', Array.from(encodedMessage.slice(0, 20)));
    
    // Sign with Phantom
    console.log('Calling Phantom signMessage...');
    const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
    console.log('Phantom returned:', signedMessage);
    
    // Extract signature
    const signature = signedMessage.signature;
    console.log('Signature type:', typeof signature);
    console.log('Signature constructor:', signature.constructor.name);
    console.log('Signature length:', signature.length);
    console.log('Signature bytes (first 20):', Array.from(signature.slice(0, 20)));
    console.log('Signature bytes (last 20):', Array.from(signature.slice(-20)));
    
    // Encode to base58
    const signatureB58 = base58Encode(signature);
    console.log('Signature base58:', signatureB58);
    console.log('Signature base58 length:', signatureB58.length);
    console.log('=== END SIGN DEBUG ===');
    
    return signatureB58;
  } catch (error) {
    console.error('[Sign] Error:', error);
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Build signing string - MATCHES Python json.dumps() EXACTLY
 */
function buildSigningString(challenge) {
  // Sort keys alphabetically like Python's sort_keys=True
  const sortedKeys = Object.keys(challenge).sort();
  const sortedChallenge = {};
  sortedKeys.forEach(key => {
    sortedChallenge[key] = challenge[key];
  });
  
  // ✅ CRITICAL FIX: Format JSON like Python's json.dumps(sort_keys=True)
  // Python adds space after : and ,
  const payload = formatJsonLikePython(sortedChallenge);
  
  console.log('=== SIGNING STRING DEBUG ===');
  console.log('Payload:', payload);
  console.log('Payload length:', payload.length, '(should be 495)');
  
  const lines = [
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
  ];
  
  const signingString = lines.join('\n');
  
  console.log('Signing string length:', signingString.length, '(should be 495)');
  
  return signingString;
}

/**
 * Format JSON like Python's json.dumps()
 * Python adds space after : and , by default
 */
function formatJsonLikePython(obj) {
  function formatValue(value) {
    if (value === null) {
      return 'null';
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else if (typeof value === 'number') {
      return String(value);
    } else if (typeof value === 'string') {
      return JSON.stringify(value);
    } else if (Array.isArray(value)) {
      const items = value.map(formatValue);
      return '[' + items.join(', ') + ']';
    } else if (typeof value === 'object') {
      const keys = Object.keys(value).sort();
      const pairs = keys.map(key => {
        return JSON.stringify(key) + ': ' + formatValue(value[key]);
      });
      return '{' + pairs.join(', ') + '}';
    }
    return String(value);
  }
  
  return formatValue(obj);
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
 * Base58 encode
 */
function base58Encode(bytes) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
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
 * Base58 decode - for testing
 */
function base58Decode(str) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`);
    num = num * 58n + BigInt(index);
  }
  
  // Convert to bytes
  const bytes = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }
  
  // Count leading '1's (they represent leading zero bytes)
  let zeros = 0;
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    zeros++;
  }
  
  // Add leading zeros
  while (zeros > 0) {
    bytes.unshift(0);
    zeros--;
  }
  
  return new Uint8Array(bytes);
}

/**
 * Process query and get real API response
 */
async function processQuery(query) {
  addMessage(query, true);
  showTyping();
  sendButton.disabled = true;

  try {
    if (!walletPublicKey) {
      const connected = await connectWallet();
      if (!connected) {
        hideTyping();
        sendButton.disabled = false;
        return;
      }
    }

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
    console.error('[Process] Error:', error);
    addMessage(`Error: ${error.message}\n\nPlease try reconnecting your wallet.`);
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
  let result = `💼 Portfolio Summary\n`;
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
  let result = `🖼️ NFT Collection\n`;
  result += `Total NFTs: ${data.total_nfts}\n`;
  result += `Floor Value: ${data.total_floor_value_sol} SOL\n\n`;
  data.nfts.forEach(nft => {
    result += `• ${nft.name}\n  Collection: ${nft.collection}\n  Floor: ${nft.floor_price} SOL\n\n`;
  });
  return result;
}

/**
 * Format transactions response
 */
function formatTransactions(data) {
  let result = `📝 Recent Transactions\n\n`;
  data.transactions.forEach(tx => {
    result += `• ${tx.type}: ${tx.amount} SOL\n  Status: ${tx.status}\n  ${tx.timestamp}\n\n`;
  });
  return result;
}

/**
 * Format price response
 */
function formatPrice(data) {
  const change = data.change_24h >= 0 ? `+${data.change_24h}` : data.change_24h;
  return `💰 ${data.symbol}\nPrice: $${data.price_usd.toLocaleString()}\n24h Change: ${change}%`;
}

/**
 * Format analysis response
 */
function formatAnalysis(data) {
  let result = `📊 Portfolio Analysis\n\n`;
  result += `Risk Score: ${data.risk_score}/10\n`;
  result += `Diversification: ${data.diversification}\n\n`;
  if (data.highlights.length > 0) {
    result += `✨ Highlights:\n`;
    data.highlights.forEach(h => result += `• ${h}\n`);
    result += `\n`;
  }
  if (data.recommendations.length > 0) {
    result += `💡 Recommendations:\n`;
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

  if (!window.solana || !window.solana.isPhantom) {
    addMessage('⚠️ Phantom wallet not detected!\n\nInstall: https://phantom.app\n\nRefresh after installing.');
  } else {
    addMessage('👋 Welcome! Connect your wallet to get started.\n\nTry: "Show me my portfolio"');
  }

  console.log('[App] OpenKitx403 AI Agent Ready with Full Debug Logging');
});

