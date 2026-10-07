// src/utils/audioChime.js
const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)();
};

let audioCtx = null;

export function playSiriActivationSound() {
  try {
    if (!audioCtx) audioCtx = createAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    
    // Low tone followed by high tone (Siri wake sequence)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(440, now);        // A4
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.08);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.warn('Audio chime failed:', e);
  }
}

export function playSiriDeactivationSound() {
  try {
    if (!audioCtx) audioCtx = createAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {
    console.warn('Audio chime failed:', e);
  }
}