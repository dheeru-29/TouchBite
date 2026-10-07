export function isSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';
}

export function stop() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speak(text, { onStart, onEnd } = {}) {
  if (!isSupported() || typeof text !== 'string' || !text.trim()) return false;

  try {
    stop();
    const utterance = new window.SpeechSynthesisUtterance(text.trim());
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find((voice) => voice.lang.includes('en')) || voices[0];
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn('[TTS] Speech synthesis unavailable:', error.message || error);
    return false;
  }
}