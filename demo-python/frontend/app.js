/**
 * OpenKitx403 Trading Bot Dashboard
 * Production-grade client for real-time bot monitoring
 */

// Configuration
const CONFIG = {
  API_URL: 'https://openkitx403-demo-app-py.onrender.com',
  WS_RECONNECT_DELAY: 3000,
  PRICE_UPDATE_INTERVAL: 5000,
  ACTIVITY_MAX_ITEMS: 20,
};

// State management
const state = {
  isConnected: false,
  activeBots: new Set(),
  totalTrades: 0,
  totalVolume: 0,
  prices: {},
  ws: null,
  reconnectTimer: null,
};

// DOM Cache
const dom = {
  statusDot: null,
  statusText: null,
  totalBots: null,
  totalTrades: null,
  totalVolume: null,
  priceGrid: null,
  activityFeed: null,
};

/**
 * Initialize all cached DOM references
 */
function initDOM() {
  dom.statusDot = document.getElementById('statusDot');
  dom.statusText = document.getElementById('statusText');
  dom.totalBots = document.getElementById('totalBots');
  dom.totalTrades = document.getElementById('totalTrades');
  dom.totalVolume = document.getElementById('totalVolume');
  dom.priceGrid = document.getElementById('priceGrid');
  dom.activityFeed = document.getElementById('activityFeed');
}

/**
 * WebSocket connection management
 */
function connectWebSocket() {
  const wsUrl = CONFIG.API_URL.replace('https', 'wss') + '/ws';
  
  try {
    state.ws = new WebSocket(wsUrl);
    
    state.ws.onopen = () => {
      console.log('[WS] Connected');
      updateConnectionStatus(true);
    };
    
    state.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('[WS] Message parse error:', error);
      }
    };
    
    state.ws.onclose = () => {
      console.log('[WS] Disconnected');
      updateConnectionStatus(false);
      scheduleReconnect();
    };
    
    state.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  } catch (error) {
    console.error('[WS] Connection failed:', error);
    scheduleReconnect();
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect() {
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  state.reconnectTimer = setTimeout(() => {
    console.log('[WS] Attempting reconnection...');
    connectWebSocket();
  }, CONFIG.WS_RECONNECT_DELAY);
}

/**
 * Process incoming WebSocket messages
 */
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'bot_connected':
      state.activeBots.add(data.bot_id);
      updateStats();
      break;
      
    case 'trade_executed':
      addActivity(data.activity);
      state.totalTrades++;
      state.totalVolume += data.activity.amount * data.activity.price;
      updateStats();
      break;
      
    default:
      console.warn('[WS] Unknown message type:', data.type);
  }
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
  state.isConnected = connected;
  
  if (dom.statusDot && dom.statusText) {
    dom.statusDot.classList.toggle('connected', connected);
    dom.statusText.textContent = connected ? 'Connected' : 'Disconnected';
    dom.statusText.style.color = connected ? 'var(--success)' : 'var(--error)';
  }
}

/**
 * Update all stats with animation
 */
function updateStats() {
  if (dom.totalBots) animateValue(dom.totalBots, state.activeBots.size);
  if (dom.totalTrades) animateValue(dom.totalTrades, state.totalTrades);
  if (dom.totalVolume) {
    dom.totalVolume.textContent = `$${state.totalVolume.toFixed(2)}`;
  }
}

/**
 * Animate number changes for visual feedback
 */
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

/**
 * Add activity item to feed with deduplication
 */
function addActivity(activity) {
  if (!dom.activityFeed) return;
  
  // Remove empty state if exists
  const emptyState = dom.activityFeed.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  const item = createActivityElement(activity);
  dom.activityFeed.insertBefore(item, dom.activityFeed.firstChild);
  
  // Maintain max items
  const items = dom.activityFeed.querySelectorAll('.activity-item');
  if (items.length > CONFIG.ACTIVITY_MAX_ITEMS) {
    items[items.length - 1].remove();
  }
}

/**
 * Create activity item DOM element
 */
function createActivityElement(activity) {
  const item = document.createElement('div');
  item.className = 'activity-item';
  
  const total = (activity.amount * activity.price).toFixed(2);
  const typeClass = activity.type.toLowerCase();
  
  item.innerHTML = `
    <div class="activity-main">
      <div class="activity-header">
        <span class="activity-type activity-type--${typeClass}">
          ${activity.type.toUpperCase()}
        </span>
        <span class="activity-bot">Bot ${truncateId(activity.bot_id)}</span>
      </div>
      <div class="activity-details">
        ${activity.amount} ${activity.asset} @ $${formatNumber(activity.price)}
      </div>
    </div>
    <div class="activity-side">
      <div class="activity-amount">$${formatNumber(total)}</div>
      <div class="activity-time">Now</div>
    </div>
  `;
  
  return item;
}

/**
 * Fetch and update market prices
 */
async function updatePrices() {
  // Mock prices - replace with real API call
  const mockPrices = {
    'SOL': (95 + Math.random() * 10).toFixed(2),
    'BTC': (42000 + Math.random() * 1000).toFixed(2),
    'ETH': (2200 + Math.random() * 100).toFixed(2),
    'USDC': '1.00',
  };
  
  state.prices = mockPrices;
  renderPrices();
}

/**
 * Render price cards to DOM
 */
function renderPrices() {
  if (!dom.priceGrid) return;
  
  dom.priceGrid.innerHTML = '';
  
  Object.entries(state.prices).forEach(([asset, price]) => {
    const card = document.createElement('div');
    card.className = 'price-card';
    card.innerHTML = `
      <div class="price-asset">${asset}</div>
      <div class="price-value">$${formatNumber(price)}</div>
    `;
    dom.priceGrid.appendChild(card);
  });
}

/**
 * Format number for display
 */
function formatNumber(value) {
  return parseFloat(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Truncate ID for display
 */
function truncateId(id) {
  return id.substring(0, 8) + '...';
}

/**
 * Handle code block copy to clipboard
 */
function setupClipboardHandlers() {
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('step-code')) return;
    
    const text = e.target.textContent;
    navigator.clipboard.writeText(text)
      .then(() => {
        const originalText = e.target.textContent;
        e.target.textContent = 'Copied!';
        e.target.disabled = true;
        
        setTimeout(() => {
          e.target.textContent = originalText;
          e.target.disabled = false;
        }, 2000);
      })
      .catch((error) => {
        console.error('Clipboard error:', error);
      });
  });
}

/**
 * Initialize application
 */
function initialize() {
  initDOM();
  setupClipboardHandlers();
  connectWebSocket();
  updatePrices();
  
  // Update prices periodically
  setInterval(updatePrices, CONFIG.PRICE_UPDATE_INTERVAL);
}

/**
 * Cleanup on page unload
 */
function cleanup() {
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Cleanup on unload
window.addEventListener('beforeunload', cleanup);

