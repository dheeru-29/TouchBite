const API_URL = import.meta.env.VITE_AI_API_URL || (
  import.meta.env.DEV
    ? 'http://localhost:5000/api/ai'
    : 'https://touchbite.onrender.com/api/ai'
);
let sessionId = null;

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'TouchBite AI is unavailable right now.');
  }

  return payload.data;
}

export const aiApi = {
  chat: async (transcript, cartItems = []) => {
    const data = await request('/chat', {
      method: 'POST',
      body: JSON.stringify({ transcript, cartItems, sessionId }),
    });

    if (data.sessionId) sessionId = data.sessionId;
    return data;
  },
  resetSession: () => { sessionId = null; },
};
