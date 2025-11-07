/**
 * OpenKitx403 Trading Bot Dashboard
 * Production-grade client for real-time bot monitoring
 * Optimized for clean, minimal UI
 */

// ====== Configuration ======
const CONFIG = {
  API_URL: 'https://openkitx403-demo-app-py.onrender.com',
  WS_RECONNECT_DELAY: 3000,
  PRICE_UPDATE_INTERVAL: 5000,
  ACTIVITY_MAX_ITEMS: 15,
  ANIMATION_DURATION: 300,
};

// ====== State Management ======
const state = {
  isConnected: false,
  activeBots: new Set(),
  totalTrades: 0,
  totalVolume: 0,
  prices: {},
  ws: null,
  reconnectTimer: null,
  priceUpdateTimer: null,
};

// ====== DOM Cache ======
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
 * Initialize DOM references on page load
 */
function initDOM() {
  dom.statusDot = document.getElementById('statusDot');
  dom.statusText = document.getElementById('statusText');
  dom.totalBots = document.getElementById('totalBots');
  dom.totalTrades = document.getElementById('totalTrades');
  dom.totalVolume = document.getElementById('totalVolume');
  dom.priceGrid = document.getElementById('priceGrid');
  dom.activityFeed = document.getElementById('activityFeed');

  if (!dom.statusDot || !dom.priceGrid || !dom.activityFeed) {
    console.error('[Init] Missing required DOM elements');
  }
}

/**
 * Connect to WebSocket for real-time updates
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
        console.error('[WS] Failed to parse message:', error);
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
 * Schedule WebSocket reconnection
 */
function scheduleReconnect() {
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);

  state.reconnectTimer = setTimeout(() => {
    console.log('[WS] Reconnecting...');
    connectWebSocket();
  }, CONFIG.WS_RECONNECT_DELAY);
}

/**
 * Process incoming WebSocket messages
 * @param {Object} data - Message data
 */
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'bot_connected':
      if (data.bot_id) {
        state.activeBots.add(data.bot_id);
        updateStats();
        console.log(`[Bot] Connected: ${data.bot_id}`);
      }
      break;

    case 'trade_executed':
      if (data.activity) {
        addActivity(data.activity);
        state.totalTrades++;
        state.totalVolume += data.activity.amount * data.activity.price;
        updateStats();
        console.log(`[Trade] Executed: ${data.activity.type} ${data.activity.amount} ${data.activity.asset}`);
      }
      break;

    default:
      console.warn('[WS] Unknown message type:', data.type);
  }
}

/**
 * Update connection status indicator
 * @param {boolean} connected - Connection status
 */
function updateConnectionStatus(connected) {
  state.isConnected = connected;

  if (dom.statusDot) {
    dom.statusDot.classList.toggle('connected', connected);
  }

  if (dom.statusText) {
    dom.statusText.textContent = connected ? 'Connected' : 'Connecting';
  }
}

/**
 * Update all dashboard statistics
 */
function updateStats() {
  if (dom.totalBots) {
    animateValue(dom.totalBots, state.activeBots.size);
  }

  if (dom.totalTrades) {
    animateValue(dom.totalTrades, state.totalTrades);
  }

  if (dom.totalVolume) {
    dom.totalVolume.textContent = `$${formatCurrency(state.totalVolume)}`;
  }
}

/**
 * Animate number transitions for visual feedback
 * @param {HTMLElement} element - Target element
 * @param {number} target - Target value
 */
function animateValue(element, target) {
  const current = parseInt(element.textContent) || 0;
  if (current === target) return;

  const diff = target - current;
  const steps = 20;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    const value = Math.floor(current + (diff * step) / steps);
    element.textContent = value;

    if (step === steps) {
      clearInterval(timer);
      element.textContent = target;
    }
  }, CONFIG.ANIMATION_DURATION / steps);
}

/**
 * Add activity item to feed with animations
 * @param {Object} activity - Activity data
 */
function addActivity(activity) {
  if (!dom.activityFeed) return;

  // Remove empty state
  const emptyState = dom.activityFeed.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const item = createActivityElement(activity);
  dom.activityFeed.insertBefore(item, dom.activityFeed.firstChild);

  // Maintain max items
  const items = dom.activityFeed.querySelectorAll('.activity-row');
  if (items.length > CONFIG.ACTIVITY_MAX_ITEMS) {
    items[items.length - 1].remove();
  }
}

/**
 * Create activity item DOM element
 * @param {Object} activity - Activity data
 * @returns {HTMLElement} Activity item element
 */
function createActivityElement(activity) {
  const item = document.createElement('div');
  item.className = 'activity-row';

  const total = (activity.amount * activity.price).toFixed(2);
  const typeClass = activity.type.toLowerCase();

  item.innerHTML = `
    <div class="activity-header">
      <span class="activity-badge activity-badge--${typeClass}">
        ${activity.type.toUpperCase()}
      </span>
      <span class="activity-bot">Bot ${truncateId(activity.bot_id)}</span>
    </div>
    <div class="activity-detail">
      ${activity.amount} ${activity.asset} @ $${formatCurrency(activity.price)}
    </div>
    <div class="activity-value">$${formatCurrency(total)}</div>
  `;

  return item;
}

/**
 * Fetch and update market prices
 */
async function updatePrices() {
  try {
    // Mock prices - replace with real API call if needed
    const mockPrices = {
      SOL: (95 + Math.random() * 10).toFixed(2),
      BTC: (42000 + Math.random() * 1000).toFixed(2),
      ETH: (2200 + Math.random() * 100).toFixed(2),
      USDC: '1.00',
    };

    state.prices = mockPrices;
    renderPrices();
  } catch (error) {
    console.error('[Prices] Update failed:', error);
  }
}

/**
 * Render prices to DOM
 */
function renderPrices() {
  if (!dom.priceGrid) return;

  dom.priceGrid.innerHTML = '';

  Object.entries(state.prices).forEach(([asset, price]) => {
    const item = document.createElement('div');
    item.className = 'price-item';
    item.innerHTML = `
      <div class="price-asset">${asset}</div>
      <div class="price-value">$${formatCurrency(price)}</div>
    `;
    dom.priceGrid.appendChild(item);
  });
}

/**
 * Format number as currency
 * @param {number|string} value - Value to format
 * @returns {string} Formatted currency
 */
function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';

  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Truncate ID for display
 * @param {string} id - ID to truncate
 * @returns {string} Truncated ID
 */
function truncateId(id) {
  if (!id) return 'unknown';
  return id.substring(0, 6) + '...';
}

/**
 * Handle code block copy to clipboard
 */
function setupClipboardHandlers() {
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('step-code')) return;

    const text = e.target.textContent;
    const originalText = text;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        e.target.textContent = 'Copied!';
        e.target.style.opacity = '0.7';

        setTimeout(() => {
          e.target.textContent = originalText;
          e.target.style.opacity = '1';
        }, 1500);
      })
      .catch((error) => {
        console.error('[Clipboard] Failed:', error);
        e.target.textContent = 'Failed to copy';

        setTimeout(() => {
          e.target.textContent = originalText;
        }, 1000);
      });
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      const focused = document.activeElement;
      if (focused && focused.classList.contains('step-code')) {
        e.preventDefault();
        focused.click();
      }
    }
  });
}

/**
 * Initialize price update interval
 */
function startPriceUpdates() {
  if (state.priceUpdateTimer) clearInterval(state.priceUpdateTimer);

  state.priceUpdateTimer = setInterval(updatePrices, CONFIG.PRICE_UPDATE_INTERVAL);
}

/**
 * Stop price update interval
 */
function stopPriceUpdates() {
  if (state.priceUpdateTimer) {
    clearInterval(state.priceUpdateTimer);
    state.priceUpdateTimer = null;
  }
}

/**
 * Initialize application
 */
function initialize() {
  console.log('[App] Initializing...');

  initDOM();
  setupClipboardHandlers();
  connectWebSocket();
  updatePrices();
  startPriceUpdates();

  console.log('[App] Ready');
}

/**
 * Cleanup on page unload
 */
function cleanup() {
  console.log('[App] Cleaning up...');

  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }

  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  stopPriceUpdates();
}

/**
 * Handle page visibility changes
 */
function handleVisibilityChange() {
  if (document.hidden) {
    console.log('[App] Page hidden');
    stopPriceUpdates();
  } else {
    console.log('[App] Page visible');
    startPriceUpdates();
    updatePrices();
  }
}

// ====== Lifecycle Hooks ======

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Cleanup on unload
window.addEventListener('beforeunload', cleanup);

// Handle visibility changes
document.addEventListener('visibilitychange', handleVisibilityChange);

// Handle errors
window.addEventListener('error', (event) => {
  console.error('[Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Rejection]', event.reason);
});

// ====== Debugging (development only) ======
if (process.env.NODE_ENV !== 'production') {
  window.debugState = () => ({
    connected: state.isConnected,
    bots: Array.from(state.activeBots),
    trades: state.totalTrades,
    volume: state.totalVolume,
  });

  window.debugReset = () => {
    state.totalTrades = 0;
    state.totalVolume = 0;
    state.activeBots.clear();
    updateStats();
    console.log('[Debug] State reset');
  };

  console.log('[Debug] Use window.debugState() and window.debugReset()');
}

