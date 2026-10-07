const WAKE_WORD_PATTERN = /\bhello\b|\b(?:hey|okay|ok)\s+(?:touch\s*(?:bite|byte|by|light)|siri)\b/i;
const WAKE_ONLY_ALIAS_PATTERN = /^hello\s+(?:that's|thats)\s+right$/i;

export function detectWakeWord(transcript) {
  return WAKE_WORD_PATTERN.test(String(transcript || '').trim());
}

export function extractCommandAfterWakeWord(transcript) {
  const text = String(transcript || '').trim();
  if (WAKE_ONLY_ALIAS_PATTERN.test(text)) return '';
  return text.replace(WAKE_WORD_PATTERN, '').replace(/^[,;:\s]+/, '').trim();
}