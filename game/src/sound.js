// Synthesised sound, no audio files: a tiny WebAudio helper. Every effect is a short
// oscillator blip with an envelope, so the game ships no network request and no asset.
// The context is created lazily on the first user gesture (browsers block audio before it).
let ctx = null;
let muted = false;

function audio() {
  if (ctx === null) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function blip(freqFrom, freqTo, duration, type, volume, delay) {
  if (muted) return;
  const ac = audio();
  if (ac === null) return;
  const t0 = ac.currentTime + (delay || 0);
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freqFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sfx = {
  /** Call once from a user gesture so later sounds are allowed. */
  unlock() {
    audio();
  },
  orb(combo) {
    const base = 520 + Math.min(combo, 5) * 60;
    blip(base, base * 1.5, 0.14, 'sine', 0.16);
    blip(base * 2, base * 2.4, 0.1, 'triangle', 0.06, 0.02);
  },
  gold() {
    blip(660, 990, 0.16, 'sine', 0.18);
    blip(990, 1320, 0.2, 'triangle', 0.12, 0.07);
    blip(1320, 1760, 0.22, 'sine', 0.08, 0.14);
  },
  hit() {
    blip(220, 60, 0.28, 'sawtooth', 0.2);
    blip(110, 40, 0.32, 'square', 0.1, 0.02);
  },
  powerup() {
    blip(440, 880, 0.18, 'triangle', 0.16);
    blip(880, 1320, 0.18, 'sine', 0.1, 0.08);
  },
  level() {
    blip(523, 523, 0.12, 'triangle', 0.14);
    blip(659, 659, 0.12, 'triangle', 0.14, 0.1);
    blip(784, 784, 0.2, 'triangle', 0.16, 0.2);
  },
  over() {
    blip(392, 392, 0.22, 'triangle', 0.15);
    blip(330, 330, 0.22, 'triangle', 0.15, 0.18);
    blip(262, 196, 0.5, 'triangle', 0.16, 0.36);
  },
  start() {
    blip(262, 523, 0.2, 'sine', 0.14);
    blip(523, 784, 0.22, 'sine', 0.12, 0.1);
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() {
    return muted;
  },
};
