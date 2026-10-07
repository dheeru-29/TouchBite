import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addConversationTurn,
  clearConversationSession,
  formatConversationContext,
  getOrCreateSession,
} from './conversationMemory.js';

test('conversation memory keeps sessions isolated and returns a stable session id', () => {
  const first = getOrCreateSession();
  const same = getOrCreateSession(first.sessionId);
  const second = getOrCreateSession();

  assert.equal(same.sessionId, first.sessionId);
  assert.notEqual(second.sessionId, first.sessionId);

  addConversationTurn(first.sessionId, { user: 'Show me burgers', assistant: 'Here are burgers.' });
  assert.match(formatConversationContext(same.messages), /Show me burgers/);
  assert.doesNotMatch(formatConversationContext(getOrCreateSession(second.sessionId).messages), /Show me burgers/);

  clearConversationSession(first.sessionId);
  assert.notEqual(getOrCreateSession(first.sessionId).sessionId, first.sessionId);
});

test('conversation memory trims old turns and message length', () => {
  const session = getOrCreateSession();
  for (let index = 0; index < 10; index += 1) {
    addConversationTurn(session.sessionId, { user: `user-${index}-${'x'.repeat(2000)}`, assistant: `assistant-${index}` });
  }

  const context = formatConversationContext(getOrCreateSession(session.sessionId).messages);
  assert.doesNotMatch(context, /user-0-/);
  assert.match(context, /user-9-/);
  assert.ok(context.length < 16000);
});

test('conversation memory retains at most 12 messages and caps message content at 1200 characters', () => {
  const session = getOrCreateSession();
  for (let index = 0; index < 8; index += 1) {
    addConversationTurn(session.sessionId, { user: `turn-${index}-${'x'.repeat(2000)}`, assistant: `reply-${index}` });
  }

  const context = formatConversationContext(getOrCreateSession(session.sessionId).messages);
  assert.doesNotMatch(context, /turn-0-/);
  assert.match(context, /turn-7-/);
  assert.match(context, /reply-7/);
  assert.ok(context.length <= 12 * 1200 + 500);
});

test('expired sessions do not provide stale context', () => {
  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;
  try {
    const session = getOrCreateSession();
    addConversationTurn(session.sessionId, { user: 'stale burger request', assistant: 'stale answer' });
    now += 30 * 60 * 1000 + 1;
    const replacement = getOrCreateSession(session.sessionId);
    assert.notEqual(replacement.sessionId, session.sessionId);
    assert.equal(formatConversationContext(replacement.messages), '');
  } finally {
    Date.now = originalNow;
  }
});
