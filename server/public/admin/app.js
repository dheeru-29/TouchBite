const API_BASE = '/api';
const TOKEN_KEY = 'touchbite_admin_token';

const el = (id) => document.getElementById(id);
const loginView = el('login-view');
const dashboardView = el('dashboard-view');
const loginForm = el('login-form');
const loginError = el('login-error');
const orderList = el('order-list');
const emptyState = el('empty-state');
const connectionDot = el('connection-dot');
const connectionLabel = el('connection-label');
const adminEmailLabel = el('admin-email');
const template = el('order-card-template');

let currentFilter = '';
let socket = null;
let refreshTimer = null;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function showLogin(message) {
  clearToken();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  clearInterval(refreshTimer);
  dashboardView.hidden = true;
  loginView.hidden = false;
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }
}

async function showDashboard() {
  try {
    const admin = await api('/auth/me');
    loginView.hidden = true;
    dashboardView.hidden = false;
    adminEmailLabel.textContent = admin.email;
    loginError.hidden = true;
    connectRealtime();
    await loadOrders();
    refreshTimer = setInterval(loadOrders, 30000); // self-heals from any missed socket events
  } catch (error) {
    showLogin(error.status === 401 ? '' : 'Could not reach the server.');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector('button');
  submitButton.disabled = true;
  loginError.hidden = true;
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: el('email').value, password: el('password').value }),
    });
    setToken(data.token);
    await showDashboard();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
});

el('logout').addEventListener('click', () => showLogin());

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.status;
    loadOrders();
  });
});

function connectRealtime() {
  const token = getToken();
  socket = io('/admin', { auth: { token } });

  socket.on('connect', () => {
    connectionDot.classList.add('live');
    connectionLabel.textContent = 'Live';
  });
  socket.on('disconnect', () => {
    connectionDot.classList.remove('live');
    connectionLabel.textContent = 'Reconnecting…';
  });
  socket.on('connect_error', () => {
    connectionDot.classList.remove('live');
    connectionLabel.textContent = 'Offline';
  });

  socket.on('order:new', (order) => {
    if (matchesFilter(order)) {
      renderOrder(order, { prepend: true, flash: true });
      refreshEmptyState();
    }
  });

  socket.on('order:updated', (order) => {
    const existingCard = orderList.querySelector(`[data-order-id="${order._id}"]`);
    if (!matchesFilter(order)) {
      existingCard?.remove();
    } else if (existingCard) {
      const card = buildCard(order);
      existingCard.replaceWith(card);
      card.classList.add('flash');
    } else {
      renderOrder(order, { prepend: true, flash: true });
    }
    refreshEmptyState();
  });
}

function matchesFilter(order) {
  if (!currentFilter) return order.orderStatus !== 'completed';
  return order.orderStatus === currentFilter;
}

async function loadOrders() {
  try {
    const query = currentFilter ? `status=${currentFilter}` : 'active=true';
    const orders = await api(`/orders?${query}`);
    orderList.innerHTML = '';
    orders.forEach((order) => renderOrder(order));
    refreshEmptyState();
  } catch (error) {
    if (error.status === 401) showLogin('Session expired, please sign in again.');
  }
}

function refreshEmptyState() {
  emptyState.hidden = orderList.children.length > 0;
}

const NEXT_STATUS = { received: 'preparing', preparing: 'ready', ready: 'completed' };
const NEXT_LABEL = { received: 'Start preparing', preparing: 'Mark ready', ready: 'Complete order' };

function buildCard(order) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.orderId = order._id;

  node.querySelector('.order-number').textContent = order.orderNumber;

  const pill = node.querySelector('.order-status-pill');
  pill.textContent = order.orderStatus;
  pill.className = `order-status-pill status-${order.orderStatus}`;

  const itemsList = node.querySelector('.order-items');
  order.items.forEach((item) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = item.productName;
    const qty = document.createElement('b');
    qty.textContent = `× ${item.quantity}`;
    li.append(name, qty);
    itemsList.appendChild(li);
  });

  node.querySelector('.order-type').textContent = order.orderType;
  node.querySelector('.order-total').textContent = `₹${order.total}`;
  node.querySelector('.order-time').textContent = new Date(order.createdAt).toLocaleTimeString();
  node.querySelector('.order-time').dateTime = order.createdAt;

  const actions = node.querySelector('.order-actions');
  const nextStatus = NEXT_STATUS[order.orderStatus];
  if (nextStatus) {
    const button = document.createElement('button');
    button.className = order.orderStatus === 'ready' ? 'primary' : '';
    button.textContent = NEXT_LABEL[order.orderStatus];
    button.addEventListener('click', () => updateStatus(order._id, nextStatus, button));
    actions.appendChild(button);
  } else {
    const done = document.createElement('button');
    done.textContent = 'Completed';
    done.disabled = true;
    actions.appendChild(done);
  }

  return node;
}

function renderOrder(order, { prepend = false, flash = false } = {}) {
  const card = buildCard(order);
  if (flash) card.classList.add('flash');
  if (prepend) orderList.prepend(card);
  else orderList.appendChild(card);
}

async function updateStatus(orderId, status, button) {
  button.disabled = true;
  try {
    await api(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    // The socket 'order:updated' broadcast (which this same request triggers
    // server-side) will re-render the card — including on any *other* open
    // dashboard tab/device — so we don't optimistically patch the DOM here.
  } catch (error) {
    button.disabled = false;
    if (error.status === 401) showLogin('Session expired, please sign in again.');
  }
}

// Boot.
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
