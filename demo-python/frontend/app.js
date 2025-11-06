const API_URL = 'https://openkitx403-demo-app-py.onrender.com';
const WS_URL = API_URL.replace('https', 'wss');

// WebSocket connection
let ws = null;
let reconnectTimer = null;

// State
let activeBots = new Set();
let totalTrades = 0;
let totalVolume = 0;
let prices = {};

// Connect to WebSocket
function connectWebSocket() {
    ws = new WebSocket(`${WS_URL}/ws`);

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateStatus(true);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateStatus(false);
        
        // Reconnect after 3 seconds
        reconnectTimer = setTimeout(() => {
            connectWebSocket();
        }, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'bot_connected':
            activeBots.add(data.bot_id);
            updateStats();
            addNotification(`Bot ${data.bot_id} connected`);
            break;
            
        case 'trade_executed':
            addActivity(data.activity);
            totalTrades++;
            totalVolume += data.activity.amount * data.activity.price;
            updateStats();
            break;
    }
}

// Update connection status
function updateStatus(connected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    if (connected) {
        dot.classList.add('connected');
        text.textContent = 'Connected';
        text.style.color = 'var(--success)';
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Disconnected';
        text.style.color = 'var(--error)';
    }
}

// Update stats
function updateStats() {
    document.getElementById('totalBots').textContent = activeBots.size;
    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('totalVolume').textContent = `$${totalVolume.toFixed(2)}`;
}

// Add activity to feed
function addActivity(activity) {
    const feed = document.getElementById('activityFeed');
    
    // Remove empty state
    const emptyState = feed.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Create activity item
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const timeAgo = 'Just now';
    const total = (activity.amount * activity.price).toFixed(2);
    
    item.innerHTML = `
        <div class="activity-main">
            <div class="activity-header">
                <span class="activity-type ${activity.type}">${activity.type}</span>
                <span class="activity-bot">Bot: ${activity.bot_id}</span>
            </div>
            <div class="activity-details">
                ${activity.amount} ${activity.asset} @ $${activity.price}
            </div>
        </div>
        <div class="activity-side">
            <div class="activity-amount">$${total}</div>
            <div class="activity-time">${timeAgo}</div>
        </div>
    `;
    
    // Add to top of feed
    feed.insertBefore(item, feed.firstChild);
    
    // Keep only last 20 items
    const items = feed.querySelectorAll('.activity-item');
    if (items.length > 20) {
        items[items.length - 1].remove();
    }
}

// Fetch and update prices
async function updatePrices() {
    // Mock prices for demo
    const mockPrices = {
        'SOL': (95 + Math.random() * 10).toFixed(2),
        'BTC': (42000 + Math.random() * 1000).toFixed(2),
        'ETH': (2200 + Math.random() * 100).toFixed(2),
        'USDC': '1.00'
    };
    
    prices = mockPrices;
    renderPrices();
}

// Render prices
function renderPrices() {
    const grid = document.getElementById('priceGrid');
    grid.innerHTML = '';
    
    Object.entries(prices).forEach(([asset, price]) => {
        const card = document.createElement('div');
        card.className = 'price-card';
        card.innerHTML = `
            <div class="price-asset">${asset}</div>
            <div class="price-value">$${parseFloat(price).toLocaleString()}</div>
        `;
        grid.appendChild(card);
    });
}

// Add notification
function addNotification(message) {
    console.log('📢', message);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updatePrices();
    
    // Update prices every 5 seconds
    setInterval(updatePrices, 5000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (ws) {
        ws.close();
    }
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }
});
