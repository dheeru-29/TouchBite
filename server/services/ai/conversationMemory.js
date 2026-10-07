import { randomUUID } from 'node:crypto';

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map();

function cleanupExpiredSessions(now = Date.now()) {
  for (const [sessionId, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) sessions.delete(sessionId);
  }
}

function cleanText(value) {
  return String(value || '').trim().slice(0, MAX_MESSAGE_LENGTH);
}

export function getOrCreateSession(sessionId) {
  cleanupExpiredSessions();
  const existing = typeof sessionId === 'string' ? sessions.get(sessionId) : null;
  if (existing) {
    existing.updatedAt = Date.now();
    return { sessionId, messages: existing.messages };
  }
  const id = randomUUID();
  const session = { messages: [], updatedAt: Date.now() };
  sessions.set(id, session);
  return { sessionId: id, messages: session.messages };
}

export function addConversationTurn(sessionId, { user, assistant }) {
  const session = sessions.get(sessionId);
  if (!session) return;
  const userText = cleanText(user);
  const assistantText = cleanText(assistant);
  if (userText) session.messages.push({ role: 'user', content: userText });
  if (assistantText) session.messages.push({ role: 'assistant', content: assistantText });
  session.messages = session.messages.slice(-MAX_MESSAGES);
  session.updatedAt = Date.now();
}

export function formatConversationContext(messages = []) {
  return messages
    .slice(-MAX_MESSAGES)
    .map((message) => `${message.role === 'assistant' ? 'TouchBite' : 'User'}: ${message.content}`)
    .join('\n');
}

export function clearConversationSession(sessionId) {
  if (typeof sessionId === 'string') sessions.delete(sessionId);
}

export const conversationMemoryConfig = {
  maxMessages: MAX_MESSAGES,
  ttlMs: SESSION_TTL_MS,
};