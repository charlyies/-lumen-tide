// The game's rules and state, with no drawing and no browser in it: the lumen jelly, the
// pools of orbs, void eels, ink clouds and power-ups, spawning, collisions, combos, score,
// lives and level. step() advances one fixed step and returns what happened as bit flags,
// so the caller can react without the world knowing about screens or sound. Nothing here
// allocates after createWorld returns.
import {
  AMBIENT_COUNT,
  COMBO,
  EEL,
  FIELD,
  INK,
  LEVEL,
  LIVES,
  ORB,
  PLAYER,
  POOL_SIZE,
  POWERUP,
} from './config.js';

export const KIND_ORB = 0;
export const KIND_EEL = 1;
export const KIND_INK = 2;
export const KIND_SHIELD = 3;
export const KIND_MAGNET = 4;
export const KIND_STAR = 5;

export const EVENT_HIT = 1;
export const EVENT_ORB = 2;
export const EVENT_GOLD = 4;
export const EVENT_OVER = 8;
export const EVENT_POWERUP = 16;
export const EVENT_LEVEL = 32;

function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: PLAYER.radius,
    invulnerable: 0,
    shield: 0,
    magnet: 0,
    /** Bell pulse phase, for the swimming animation. */
    pulse: 0,
    /** Facing: -1 left, 1 right (for the tentacle sway). */
    facing: 1,
    vx: 0,
    vy: 0,
  };
  // One pool for every collectible / hazard; eels keep their own segment trail.
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({
      active: false, kind: KIND_ORB, x: 0, y: 0, radius: 0, speed: 0,
      phase: 0, gold: false, segments: null, baseX: 0, t: 0, drift: 0,
    });
  }
  // Ambient bubbles and motes: pure decoration, seeded once.
  const ambient = [];
  for (let index = 0; index < AMBIENT_COUNT; index += 1) {
    ambient.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      r: 1 + random() * 3.5,
      speed: 8 + random() * 22,
      sway: random() * Math.PI * 2,
      alpha: 0.15 + random() * 0.35,
    });
  }
  // Burst particles on collection: {x, y, vx, vy, life, maxLife, color, size}.
  const particles = [];
  for (let index = 0; index < 96; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 2 });
  }
  const state = {
    player, items, ambient, particles,
    score: 0, lives: LIVES, level: 1,
    orbsCollected: 0, combo: 0, comboTimer: 0, bestCombo: 0,
    elapsed: 0, orbTimer: 0.4, eelTimer: 2.2, inkTimer: 5, powerTimer: POWERUP.interval,
    /** Screen shake on a hit, decays to zero. */
    shake: 0,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height * 0.55;
    player.invulnerable = 0;
    player.shield = 0;
    player.magnet = 0;
    player.pulse = 0;
    player.facing = 1;
    player.vx = 0;
    player.vy = 0;
    for (const item of items) item.active = false;
    for (const p of particles) p.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.orbsCollected = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.elapsed = 0;
    state.orbTimer = 0.4;
    state.eelTimer = 2.2;
    state.inkTimer = 5;
    state.powerTimer = POWERUP.interval;
    state.shake = 0;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) if (!particles[index].active) return particles[index];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const p = freeParticle();
      if (p === null) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.45 + random() * 0.35;
      p.life = p.maxLife;
      p.color = color;
      p.size = 2 + random() * 3;
    }
  }

  function spawnOrb() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_ORB;
    item.gold = random() < ORB.goldChance;
    item.radius = ORB.radius * (item.gold ? 1.25 : 1);
    item.x = 40 + random() * (FIELD.width - 80);
    item.y = -24;
    item.speed = ORB.speed + ORB.speedPerLevel * (state.level - 1) + random() * 24;
    item.phase = random() * Math.PI * 2;
    item.drift = 24 + random() * 30;
    item.t = 0;
  }

  function spawnEel() {
    const item = freeItem();
    if (item === null) return;
    const fromLeft = random() < 0.5;
    item.active = true;
    item.kind = KIND_EEL;
    item.x = fromLeft ? -60 : FIELD.width + 60;
    item.y = 90 + random() * (FIELD.height - 180);
    item.baseX = item.x;
    item.speed = (EEL.speed + EEL.speedPerLevel * (state.level - 1)) * (fromLeft ? 1 : -1);
    item.phase = random() * Math.PI * 2;
    item.t = 0;
    if (item.segments === null) {
      item.segments = [];
      for (let s = 0; s < EEL.segments; s += 1) item.segments.push({ x: item.x, y: item.y });
    }
    for (let s = 0; s < EEL.segments; s += 1) {
      item.segments[s].x = item.x - Math.sign(item.speed) * s * 16;
      item.segments[s].y = item.y;
    }
  }

  function spawnInk() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_INK;
    item.radius = INK.radius;
    item.x = 60 + random() * (FIELD.width - 120);
    item.y = -40;
    item.speed = INK.speed + INK.speedPerLevel * (state.level - 1);
    item.phase = random() * Math.PI * 2;
    item.drift = 18 + random() * 22;
    item.t = 0;
  }

  function spawnPowerup() {
    const item = freeItem();
    if (item === null) return;
    const roll = random();
    item.active = true;
    item.kind = roll < 0.4 ? KIND_SHIELD : roll < 0.75 ? KIND_MAGNET : KIND_STAR;
    item.radius = POWERUP.radius;
    item.x = 60 + random() * (FIELD.width - 120);
    item.y = -30;
    item.speed = POWERUP.speed;
    item.phase = random() * Math.PI * 2;
    item.t = 0;
  }

  function orbInterval() {
    return Math.max(ORB.minInterval, ORB.interval * ORB.intervalScale ** (state.level - 1));
  }

  function eelInterval() {
    return Math.max(EEL.minInterval, EEL.interval * EEL.intervalScale ** (state.level - 1));
  }

  function inkInterval() {
    return Math.max(INK.minInterval, INK.interval * INK.intervalScale ** (state.level - 1));
  }

  function takeHit() {
    if (player.shield > 0) {
      player.shield -= 1;
      player.invulnerable = PLAYER.invulnerable;
      burst(player.x, player.y, '#8affc1', 14, 180);
      return false;
    }
    state.lives -= 1;
    player.invulnerable = PLAYER.invulnerable;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 10;
    burst(player.x, player.y, '#ff5d73', 20, 240);
    return state.lives <= 0;
  }

  /**
   * One fixed step. `steer` is {x, y} (unit vector) or null for no steering;
   * `pointer` is {x, y} in field coordinates or null. With `harmless` set (the title
   * screen's backdrop) things drift but nothing touches the player and nothing scores.
   */
  function step(dt, steer, pointer, harmless) {
    let events = 0;
    state.elapsed += dt;
    const newLevel = Math.min(LEVEL.max, 1 + Math.floor(state.orbsCollected / LEVEL.orbsPerLevel));
    if (newLevel !== state.level) {
      state.level = newLevel;
      events |= EVENT_LEVEL;
    }

    // --- player movement ---
    player.pulse += dt * 6;
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.magnet > 0) player.magnet = Math.max(0, player.magnet - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    let vx = 0;
    let vy = 0;
    if (steer !== null) {
      vx = steer.x * PLAYER.speed;
      vy = steer.y * PLAYER.speed;
    } else if (pointer !== null) {
      const dx = pointer.x - player.x;
      const dy = pointer.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        const chase = Math.min(1, dist / 90) * PLAYER.mouseChase;
        vx = (dx / dist) * PLAYER.speed * Math.min(1, chase / PLAYER.mouseChase + 0.35);
        vy = (dy / dist) * PLAYER.speed * Math.min(1, chase / PLAYER.mouseChase + 0.35);
        // Ease: the closer the pointer, the slower the jelly.
        const ease = Math.min(1, dist / 120);
        vx *= 0.35 + 0.65 * ease;
        vy *= 0.35 + 0.65 * ease;
      }
    }
    player.vx = vx;
    player.vy = vy;
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + vx * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + vy * dt));
    if (vx > 12) player.facing = 1;
    else if (vx < -12) player.facing = -1;

    // --- spawning ---
    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      spawnOrb();
      state.orbTimer += orbInterval();
    }
    state.eelTimer -= dt;
    if (state.eelTimer <= 0) {
      spawnEel();
      state.eelTimer += eelInterval();
    }
    state.inkTimer -= dt;
    if (state.inkTimer <= 0) {
      spawnInk();
      state.inkTimer += inkInterval();
    }
    state.powerTimer -= dt;
    if (state.powerTimer <= 0) {
      spawnPowerup();
      state.powerTimer += POWERUP.interval;
    }

    // --- ambient drift ---
    for (const a of ambient) {
      a.y -= a.speed * dt;
      a.sway += dt;
      a.x += Math.sin(a.sway * 0.8) * 6 * dt;
      if (a.y < -6) {
        a.y = FIELD.height + 6;
        a.x = random() * FIELD.width;
      }
    }

    // --- particles ---
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    // --- items ---
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.t += dt;
      if (item.kind === KIND_ORB) {
        // Magnet pulls orbs toward the player.
        if (player.magnet > 0 && !harmless) {
          const dx = player.x - item.x;
          const dy = player.y - item.y;
          const d = Math.hypot(dx, dy);
          if (d < 320 && d > 1) {
            item.x += (dx / d) * 340 * dt;
            item.y += (dy / d) * 340 * dt;
          }
        }
        item.y += item.speed * dt;
        item.x += Math.sin(item.t * 2 + item.phase) * item.drift * dt;
        if (item.y - item.radius > FIELD.height) {
          item.active = false;
          continue;
        }
        if (harmless) continue;
        if (circleHit(item.x, item.y, item.radius, player.x, player.y, player.radius * 0.9)) {
          item.active = false;
          state.orbsCollected += 1;
          state.combo = Math.min(COMBO.max, state.combo + 1);
          state.comboTimer = COMBO.window;
          if (state.combo > state.bestCombo) state.bestCombo = state.combo;
          const gained = (item.gold ? ORB.goldPoints : ORB.points) * state.combo;
          state.score += gained;
          burst(item.x, item.y, item.gold ? '#ff9f1c' : '#ffd166', item.gold ? 18 : 10, 200);
          events |= item.gold ? EVENT_GOLD : EVENT_ORB;
        }
      } else if (item.kind === KIND_EEL) {
        const prevX = item.x;
        item.x += item.speed * dt;
        item.y += Math.sin(item.t * EEL.swayFreq + item.phase) * EEL.sway * dt;
        // Trail the segments behind the head.
        const segs = item.segments;
        segs[0].x = prevX;
        segs[0].y = item.y;
        for (let s = 1; s < segs.length; s += 1) {
          segs[s].x += (segs[s - 1].x - segs[s].x) * 0.5;
          segs[s].y += (segs[s - 1].y - segs[s].y) * 0.5;
        }
        if (item.x < -140 || item.x > FIELD.width + 140) {
          item.active = false;
          continue;
        }
        if (harmless || player.invulnerable > 0) continue;
        if (circleHit(item.x, item.y, EEL.headRadius, player.x, player.y, player.radius * 0.85)) {
          item.active = false;
          events |= EVENT_HIT;
          if (takeHit()) {
            events |= EVENT_OVER;
            break;
          }
        }
      } else if (item.kind === KIND_INK) {
        item.y += item.speed * dt;
        item.x += Math.sin(item.t * 1.4 + item.phase) * item.drift * dt;
        if (item.y - item.radius > FIELD.height) {
          item.active = false;
          continue;
        }
        if (harmless || player.invulnerable > 0) continue;
        if (circleHit(item.x, item.y, item.radius * 0.85, player.x, player.y, player.radius * 0.85)) {
          item.active = false;
          events |= EVENT_HIT;
          if (takeHit()) {
            events |= EVENT_OVER;
            break;
          }
        }
      } else {
        // Power-ups drift down and bob.
        item.y += item.speed * dt;
        item.x += Math.sin(item.t * 2 + item.phase) * 20 * dt;
        if (item.y - item.radius > FIELD.height) {
          item.active = false;
          continue;
        }
        if (harmless) continue;
        if (circleHit(item.x, item.y, item.radius, player.x, player.y, player.radius)) {
          item.active = false;
          if (item.kind === KIND_SHIELD) {
            player.shield = POWERUP.shieldHits;
            burst(item.x, item.y, '#8affc1', 14, 190);
          } else if (item.kind === KIND_MAGNET) {
            player.magnet = POWERUP.magnetSeconds;
            burst(item.x, item.y, '#c084fc', 14, 190);
          } else {
            // Starburst: clear every eel and ink cloud on screen.
            for (const other of items) {
              if (other.active && (other.kind === KIND_EEL || other.kind === KIND_INK)) {
                burst(other.x, other.y, '#ffe66d', 8, 160);
                other.active = false;
              }
            }
            state.score += 25;
            burst(item.x, item.y, '#ffe66d', 22, 260);
          }
          events |= EVENT_POWERUP;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
