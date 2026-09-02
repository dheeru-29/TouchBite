// Same lightweight Web Audio tone-synthesis approach as McTouchKiosk — no
// audio assets to load, just oscillators + gain envelopes. Kept as its own
// module so the gesture engine itself stays pure/testable (no side effects,
// no browser APIs) and only the hook that actually drives real hardware
// triggers sound.

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function tone(freq, duration, type = 'sine', volume = 0.12, delay = 0) {
  if (!audioCtx) return;
  const play = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  };
  if (delay) setTimeout(play, delay);
  else play();
}

export const SFX = {
  swipe: () => {
    tone(600, 0.08, 'sine', 0.08);
    tone(800, 0.06, 'sine', 0.06, 40);
  },
  select: () => {
    tone(520, 0.1, 'sine', 0.1);
    tone(780, 0.15, 'sine', 0.12, 80);
  },
  deselect: () => {
    tone(600, 0.08, 'sine', 0.08);
    tone(400, 0.12, 'sine', 0.08, 60);
  },
  addToCart: () => {
    tone(523, 0.08, 'sine', 0.1);
    tone(659, 0.08, 'sine', 0.1, 80);
    tone(784, 0.15, 'sine', 0.12, 160);
  },
  qty: () => tone(880, 0.06, 'triangle', 0.08),
  confirm: () => {
    [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.18, 'sine', 0.1, i * 100));
  },
  viewChange: () => {
    tone(440, 0.08, 'sine', 0.06);
    tone(660, 0.12, 'sine', 0.08, 60);
  },
  pay: () => {
    [660, 880, 1100, 1320].forEach((freq, i) => tone(freq, 0.16, 'sine', 0.11, i * 90));
  },
};

const INTENT_SOUND = {
  BROWSE_PREV: 'swipe',
  BROWSE_NEXT: 'swipe',
  CATEGORY_PREV: 'swipe',
  CATEGORY_NEXT: 'swipe',
  PAYMENT_PREV: 'swipe',
  PAYMENT_NEXT: 'swipe',
  SELECT_ITEM: 'select',
  DESELECT_ITEM: 'deselect',
  TOGGLE_QTY_MODE: 'viewChange',
  TOGGLE_CATEGORY_MENU: 'viewChange',
  QTY_UP: 'qty',
  QTY_DOWN: 'qty',
  DROP_TO_CART: 'addToCart',
  GO_BACK: 'viewChange',
  CONFIRM: 'confirm',
};

export function playIntentSound(intent, { isPayment = false } = {}) {
  if (intent === 'CONFIRM' && isPayment) {
    SFX.pay();
    return;
  }
  const key = INTENT_SOUND[intent];
  if (key && SFX[key]) SFX[key]();
}
