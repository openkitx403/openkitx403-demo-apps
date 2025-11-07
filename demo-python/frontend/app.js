const API_URL = 'https://openkitx403-demo-app-py.onrender.com';
const WS_URL = API_URL.replace('https', 'wss');

let ws = null;
let reconnectTimer = null;
let activeBots = new Set();
let totalTrades = 0;
let totalVolume = 0;
let prices = {};

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
        reconnectTimer = setTimeout(() => {
            connectWebSocket();
        }, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'bot_connected':
            activeBots.add(data.bot_id);
            updateStats();
            break;

        case 'trade_executed':
            addActivity(data.activity);
            totalTrades++;
            totalVolume += data.activity.amount * data.activity.price;
            updateStats();
            break;
    }
}

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

function updateStats() {
    const botsEl = document.getElementById('totalBots');
    const tradesEl = document.getElementById('totalTrades');
    const volumeEl = document.getElementById('totalVolume');

    // Animate number changes
    animateValue(botsEl, activeBots.size);
    animateValue(tradesEl, totalTrades);
    volumeEl.textContent = `$${totalVolume.toFixed(2)}`;
}

function animateValue(element, target) {
    const current = parseInt(element.textContent) || 0;
    if (current === target) return;

    const diff = target - current;
    const steps = 20;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        const value = Math.floor(current + (diff * step / steps));
        element.textContent = value;

        if (step === steps) {
            clearInterval(timer);
            element.textContent = target;
        }
    }, 30);
}

function addActivity(activity) {
    const feed = document.getElementById('activityFeed');

    const emptyState = feed.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const item = document.createElement('div');
    item.className = 'activity-item';

    const total = (activity.amount * activity.price).toFixed(2);

    item.innerHTML = `
        <div class="activity-main">
            <div class="activity-header">
                <span class="activity-type ${activity.type}">${activity.type.toUpperCase()}</span>
                <span class="activity-bot">Bot: ${activity.bot_id}</span>
            </div>
            <div class="activity-details">
                ${activity.amount} ${activity.asset} @ $${parseFloat(activity.price).toLocaleString()}
            </div>
        </div>
        <div class="activity-side">
            <div class="activity-amount">$${parseFloat(total).toLocaleString()}</div>
            <div class="activity-time">Now</div>
        </div>
    `;

    feed.insertBefore(item, feed.firstChild);

    const items = feed.querySelectorAll('.activity-item');
    if (items.length > 20) {
        items[items.length - 1].remove();
    }
}

async function updatePrices() {
    const mockPrices = {
        'SOL': (95 + Math.random() * 10).toFixed(2),
        'BTC': (42000 + Math.random() * 1000).toFixed(2),
        'ETH': (2200 + Math.random() * 100).toFixed(2),
        'USDC': '1.00'
    };

    prices = mockPrices;
    renderPrices();
}

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

// Copy code to clipboard
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('step-code')) {
        const text = e.target.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.textContent;
            e.target.textContent = 'Copied!';
            setTimeout(() => {
                e.target.textContent = originalText;
            }, 2000);
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updatePrices();
    setInterval(updatePrices, 5000);
});

window.addEventListener('beforeunload', () => {
    if (ws) ws.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
});

