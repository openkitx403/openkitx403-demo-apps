// This is a demo frontend - in production, you'd connect to a real agent API
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const examplePrompts = document.querySelectorAll('.example-prompt');

// Mock responses for demo
const mockResponses = {
    'portfolio': `Portfolio Summary:
Total Value: $17,800.00

Holdings:
- SOL: 125.5 ($12,550.00) [+2.5% 24h]
- USDC: 5000.0 ($5,000.00) [+0.0% 24h]
- BONK: 1000000.0 ($250.00) [-5.2% 24h]`,
    
    'nfts': `NFT Collection Summary:
Total NFTs: 3
Total Floor Value: 210.9 SOL

Collections: Okay Bears, DeGods

NFTs:
- Okay Bear #1234 (Okay Bears) Floor: 45.2 SOL
- Okay Bear #5678 (Okay Bears) Floor: 45.2 SOL
- DeGod #789 (DeGods) Floor: 120.5 SOL`,
    
    'transactions': `Recent Transactions:

- SEND: 2.5 SOL
  Status: confirmed
  Signature: 5x0KJh...

- RECEIVE: 5.0 SOL
  Status: confirmed
  Signature: 5x1KJh...

- SWAP: 1.2 SOL
  Status: confirmed
  Signature: 5x2KJh...`,
    
    'price': `SOL Price:
Current: $100.50
24h Change: +2.5%`,
    
    'analyze': `Portfolio Analysis:

Risk Score: 6.5/10 (Medium)
Diversification: Good

Recommendations:
- Consider rebalancing - SOL allocation is high (71%)
- BONK showing high volatility, monitor closely
- Stable allocation in USDC provides good buffer

Highlights:
- Portfolio up 15% this month
- Strong exposure to Solana ecosystem
- 3 NFT collections with total floor value 210 SOL`
};

// Add message to chat
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'agent-message';
    
    if (isUser) {
        messageDiv.innerHTML = `
            <div class="user-avatar">👤</div>
            <div class="message-content">
                <p class="message-text">${text}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="agent-avatar">🤖</div>
            <div class="message-content">
                <p class="message-text">${text}</p>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Get mock response
function getMockResponse(prompt) {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('portfolio') && !lower.includes('analyze')) {
        return mockResponses.portfolio;
    }
    if (lower.includes('nft')) {
        return mockResponses.nfts;
    }
    if (lower.includes('transaction') || lower.includes('activity')) {
        return mockResponses.transactions;
    }
    if (lower.includes('price') || lower.includes('sol')) {
        return mockResponses.price;
    }
    if (lower.includes('analyz')) {
        return mockResponses.analyze;
    }
    
    return "I can help you with portfolio info, NFTs, transactions, prices, and analysis. What would you like to know?";
}

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, true);
    chatInput.value = '';
    
    // Show typing indicator
    typingIndicator.style.display = 'flex';
    sendButton.disabled = true;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Hide typing indicator
    typingIndicator.style.display = 'none';
    sendButton.disabled = false;
    
    // Add agent response
    const response = getMockResponse(message);
    addMessage(response, false);
    
    chatInput.focus();
});

// Handle example prompts
examplePrompts.forEach(button => {
    button.addEventListener('click', () => {
        chatInput.value = button.dataset.prompt;
        chatForm.dispatchEvent(new Event('submit'));
    });
});

// Focus input on load
chatInput.focus();