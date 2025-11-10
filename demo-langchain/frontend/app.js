/**
 * OpenKitx403 AI Agent Frontend
 * Clean demo interface with mock responses
 */

const API_URL = 'https://openkitx403-ai-agent-backend.onrender.com';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const examplePrompts = document.querySelectorAll('.example-prompt');

// Mock responses for demo
const MOCK_RESPONSES = {
  portfolio: `Portfolio Summary:
Total Value: $17,800.00

Holdings:
- SOL: 125.5 ($12,550.00) [+2.5% 24h]
- USDC: 5000.0 ($5,000.00) [+0.0% 24h]
- BONK: 1000000.0 ($250.00) [-5.2% 24h]`,

  nfts: `NFT Collection Summary:
Total NFTs: 3
Total Floor Value: 210.9 SOL

Collections: Okay Bears, DeGods

NFTs:
- Okay Bear #1234 (Okay Bears) Floor: 45.2 SOL
- Okay Bear #5678 (Okay Bears) Floor: 45.2 SOL
- DeGod #789 (DeGods) Floor: 120.5 SOL`,

  transactions: `Recent Transactions:

- SEND: 2.5 SOL
  Status: confirmed
  Signature: 5x0KJh...

- RECEIVE: 5.0 SOL
  Status: confirmed
  Signature: 5x1KJh...

- SWAP: 1.2 SOL
  Status: confirmed
  Signature: 5x2KJh...`,

  price: `SOL Price:
Current: $100.50
24h Change: +2.5%`,

  analyze: `Portfolio Analysis:

Risk Score: 6.5/10 (Medium)
Diversification: Good

Recommendations:
• Consider rebalancing - SOL allocation is high (71%)
• BONK showing high volatility, monitor closely
• Stable allocation in USDC provides good buffer

Highlights:
• Portfolio up 15% this month
• Strong exposure to Solana ecosystem
• 3 NFT collections with total floor value 210 SOL`,
};

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
 * Get mock response based on query
 */
function getMockResponse(query) {
  const q = query.toLowerCase();
  
  if (q.includes('portfolio') || q.includes('holdings') || q.includes('balance')) {
    return MOCK_RESPONSES.portfolio;
  }
  if (q.includes('nft') || q.includes('collectible')) {
    return MOCK_RESPONSES.nfts;
  }
  if (q.includes('transaction') || q.includes('history') || q.includes('activity')) {
    return MOCK_RESPONSES.transactions;
  }
  if (q.includes('price') || q.includes('sol') || q.includes('btc') || q.includes('eth')) {
    return MOCK_RESPONSES.price;
  }
  if (q.includes('analyze') || q.includes('recommendation') || q.includes('suggest')) {
    return MOCK_RESPONSES.analyze;
  }
  
  return `I can help you with:
• Portfolio overview and balances
• NFT collection details
• Transaction history
• Token prices
• Portfolio analysis

Try asking: "Show me my portfolio" or "What NFTs do I own?"`;
}

/**
 * Process user query
 */
async function processQuery(query) {
  // Add user message
  addMessage(query, true);
  
  // Show typing
  showTyping();
  sendButton.disabled = true;
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  // Get response
  const response = getMockResponse(query);
  
  // Hide typing and show response
  hideTyping();
  addMessage(response);
  sendButton.disabled = false;
  chatInput.focus();
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
  console.log('[App] Ready');
});
