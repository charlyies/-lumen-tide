// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by an autopilot that chases the
// nearest orb while steering clear of eels and ink, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, KIND_EEL, KIND_INK, KIND_ORB } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Score a candidate move: orbs pull, hazards push away. */
function scoreMove(state, dx, dy) {
  const p = state.player;
  const nx = Math.min(FIELD.width - p.radius, Math.max(p.radius, p.x + dx));
  const ny = Math.min(FIELD.height - p.radius, Math.max(p.radius, p.y + dy));
  let score = 0;
  for (const item of state.items) {
    if (!item.active) continue;
    const d = Math.hypot(item.x - nx, item.y - ny);
    if (item.kind === KIND_ORB) {
      score += Math.max(0, 420 - d) * (item.gold ? 2 : 1);
    } else if (item.kind === KIND_EEL || item.kind === KIND_INK) {
      const danger = item.kind === KIND_EEL ? 150 : 110;
      if (d < danger) score -= (danger - d) * 14;
    } else {
      score += Math.max(0, 300 - d) * 0.6;
    }
  }
  // Prefer the middle band vertically (where the action is) and staying in bounds.
  score -= Math.abs(ny - FIELD.height * 0.55) * 0.12;
  return score;
}

function autopilot(state, stepSize) {
  const candidates = [];
  for (let a = 0; a < 8; a += 1) {
    const angle = (a / 8) * Math.PI * 2;
    candidates.push({ x: Math.cos(angle) * stepSize, y: Math.sin(angle) * stepSize });
  }
  candidates.push({ x: 0, y: 0 });
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scoreMove(state, c.x, c.y);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  const len = Math.hypot(best.x, best.y);
  if (len < 0.001) return null;
  return { x: best.x / len, y: best.y / len };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, null, null, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  // The end scene's pilot is clumsy: it only looks one step ahead and ignores hazards,
  // so it is caught out once the eels speed up, as a hurried player is.
  const clumsy = name === 'end';
  for (let index = 0; index < limit / STEP; index += 1) {
    const steer = clumsy
      ? (() => {
          // Chase the nearest orb blindly.
          let nearest = null;
          let nd = Infinity;
          for (const item of world.state.items) {
            if (!item.active || item.kind !== KIND_ORB) continue;
            const d = Math.hypot(item.x - world.state.player.x, item.y - world.state.player.y);
            if (d < nd) {
              nd = d;
              nearest = item;
            }
          }
          if (nearest === null) return null;
          const dx = nearest.x - world.state.player.x;
          const dy = nearest.y - world.state.player.y;
          const len = Math.hypot(dx, dy) || 1;
          return { x: dx / len, y: dy / len };
        })()
      : autopilot(world.state, 30);
    if (world.step(STEP, steer, null, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
