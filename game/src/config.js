// LUMEN TIDE — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 30,
  speed: 460,
  invulnerable: 1.6,
  /** Mouse-follow steering: how fast the jelly chases the pointer. */
  mouseChase: 9,
  /** Seconds between lumen-trail motes shed while swimming. */
  trailInterval: 0.055,
};

export const LIVES = 3;

/** Combo: collecting orbs within this many seconds of each other raises the multiplier. */
export const COMBO = { window: 2.5, max: 5 };

export const ORB = {
  radius: 13,
  /** Drift speed of a fresh orb (it bobs and slowly sinks). */
  speed: 46,
  speedPerLevel: 4,
  interval: 0.68,
  intervalScale: 0.92,
  minInterval: 0.3,
  /** Base points; multiplied by the combo. */
  points: 10,
  /** Golden orbs are rare and worth much more. */
  goldChance: 0.1,
  goldPoints: 50,
  /** Pink prism orbs sit between the two: uncommon, worth 25. */
  pinkChance: 0.13,
  pinkPoints: 25,
};

export const EEL = {
  /** Body length in segments; the head is what collides. */
  segments: 7,
  headRadius: 15,
  speed: 165,
  speedPerLevel: 16,
  interval: 2.6,
  intervalScale: 0.9,
  minInterval: 1.1,
  /** Sine-wave swimming amplitude and frequency. */
  sway: 70,
  swayFreq: 1.6,
};

export const INK = {
  radius: 30,
  speed: 55,
  speedPerLevel: 5,
  interval: 4.5,
  intervalScale: 0.92,
  minInterval: 2.2,
};

/** Dart eels: small, fast, straight hunters that appear from level 2. Unlike the
 *  sine-swimming void eels they cross the field in a near-straight line, so the
 *  player has to watch the horizon, not just the waves. */
export const DART = {
  segments: 4,
  headRadius: 11,
  speed: 320,
  speedPerLevel: 22,
  /** Seconds between dart spawns once they unlock. */
  interval: 6.5,
  intervalScale: 0.93,
  minInterval: 3.4,
  /** First level at which darts appear. */
  unlockLevel: 2,
};

/** Power-ups: shield, magnet, starburst. */
export const POWERUP = {
  radius: 16,
  speed: 60,
  /** Seconds between power-up spawns. */
  interval: 11,
  magnetSeconds: 8,
  shieldHits: 1,
};

export const LEVEL = { orbsPerLevel: 15, max: 12 };

/** How many entities can exist at once; pools are allocated once, at boot. */
export const POOL_SIZE = 128;
/** Ambient bubbles and drifting motes for the backdrop. */
export const AMBIENT_COUNT = 96;
/** Burst particles on collection, plus the jelly's lumen trail. */
export const PARTICLE_COUNT = 168;
/** Floating score popups ("+20", "GOLD +250", "LEVEL 3"). */
export const POPUP_COUNT = 24;

export const PALETTE = {
  backdrop: '#04101f',
  deep: '#071d33',
  mid: '#0a2a47',
  shallow: '#0e3a5c',
  ray: 'rgba(64, 180, 220, 0.06)',
  player: '#7ef0ff',
  playerCore: '#e8fbff',
  tentacle: '#4fd8ef',
  orb: '#ffd166',
  orbGold: '#ff9f1c',
  orbPink: '#ff6fb5',
  dart: '#ff2e63',
  dartGlow: '#ff7a9e',
  eel: '#1a1030',
  eelEye: '#ff4d6d',
  ink: '#3b2a5e',
  shield: '#8affc1',
  magnet: '#c084fc',
  star: '#ffe66d',
  panel: 'rgba(6, 24, 44, 0.92)',
  panelEdge: '#1d5a80',
  text: '#eaf6ff',
  muted: '#8fb8cc',
  danger: '#ff5d73',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-tide.best';
