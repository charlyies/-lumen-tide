// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Canvas gradients, glow (shadowBlur) and layered shapes paint a bioluminescent
// deep sea: light rays from the surface, drifting bubbles, a pulsing jellyfish with
// trailing tentacles, glowing orbs, serpentine void eels and ink clouds.
import { EEL, FIELD, FONT, LIVES, PALETTE } from './config.js';
import { KIND_EEL, KIND_INK, KIND_MAGNET, KIND_ORB, KIND_SHIELD, KIND_STAR } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const LIFE_R = 11;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const comboLabel = cachedLabel('Combo x');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const orbsLabel = cachedLabel('Orbs ');
  let bgGradient = null;
  let rayGradient = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    bgGradient = null;
    rayGradient = null;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = size + (weight || '');
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`.trim());
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawBackdrop(state) {
    if (bgGradient === null) {
      bgGradient = context.createLinearGradient(0, 0, 0, FIELD.height);
      bgGradient.addColorStop(0, PALETTE.shallow);
      bgGradient.addColorStop(0.45, PALETTE.mid);
      bgGradient.addColorStop(1, PALETTE.deep);
    }
    context.fillStyle = bgGradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Light rays from the surface, slowly swaying.
    context.save();
    context.globalAlpha = 1;
    for (let i = 0; i < 5; i += 1) {
      const sway = Math.sin(state.elapsed * 0.22 + i * 1.7) * 46;
      const topX = 150 + i * 260 + sway;
      context.fillStyle = PALETTE.ray;
      context.beginPath();
      context.moveTo(topX, 0);
      context.lineTo(topX + 90, 0);
      context.lineTo(topX + 260, FIELD.height);
      context.lineTo(topX + 60, FIELD.height);
      context.closePath();
      context.fill();
    }
    context.restore();

    // Ambient bubbles and motes.
    for (const a of state.ambient) {
      context.globalAlpha = a.alpha;
      context.fillStyle = '#bfe9ff';
      context.beginPath();
      context.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    // Sandy floor glow at the bottom.
    const floor = context.createLinearGradient(0, FIELD.height - 60, 0, FIELD.height);
    floor.addColorStop(0, 'rgba(20, 90, 120, 0)');
    floor.addColorStop(1, 'rgba(24, 110, 140, 0.35)');
    context.fillStyle = floor;
    context.fillRect(0, FIELD.height - 60, FIELD.width, 60);
  }

  function drawOrb(item) {
    const glow = item.gold ? PALETTE.orbGold : PALETTE.orb;
    const pulse = 1 + Math.sin(item.t * 4 + item.phase) * 0.12;
    const r = item.radius * pulse;
    context.save();
    context.shadowColor = glow;
    context.shadowBlur = 22;
    context.fillStyle = glow;
    context.beginPath();
    context.arc(item.x, item.y, r, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255,255,255,0.85)';
    context.beginPath();
    context.arc(item.x - r * 0.25, item.y - r * 0.3, r * 0.38, 0, Math.PI * 2);
    context.fill();
    if (item.gold) {
      context.strokeStyle = 'rgba(255,255,255,0.9)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(item.x, item.y, r + 6, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  function drawEel(item) {
    const segs = item.segments;
    context.save();
    // Body: tapering dark segments with a violet rim.
    for (let s = segs.length - 1; s >= 1; s -= 1) {
      const taper = 1 - (s / segs.length) * 0.55;
      const r = EEL.headRadius * taper;
      context.fillStyle = s % 2 === 0 ? '#241640' : PALETTE.eel;
      context.beginPath();
      context.arc(segs[s].x, segs[s].y, r, 0, Math.PI * 2);
      context.fill();
    }
    // Head with glow and eyes.
    context.shadowColor = '#7b2ff7';
    context.shadowBlur = 16;
    context.fillStyle = PALETTE.eel;
    context.beginPath();
    context.arc(item.x, item.y, EEL.headRadius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    const dir = Math.sign(item.speed) || 1;
    const eyeY = item.y - 5;
    const eyeX = item.x + dir * 5;
    context.fillStyle = PALETTE.eelEye;
    context.beginPath();
    context.arc(eyeX, eyeY, 3.4, 0, Math.PI * 2);
    context.arc(eyeX, eyeY + 10, 3.4, 0, Math.PI * 2);
    context.fill();
    // Fins.
    context.fillStyle = '#3d1f66';
    context.beginPath();
    context.moveTo(item.x - dir * 4, item.y - EEL.headRadius + 2);
    context.lineTo(item.x - dir * 22, item.y - EEL.headRadius - 12);
    context.lineTo(item.x - dir * 14, item.y - 2);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawInk(item) {
    const wobble = 1 + Math.sin(item.t * 2.2 + item.phase) * 0.1;
    context.save();
    context.globalAlpha = 0.85;
    context.shadowColor = '#8b5cf6';
    context.shadowBlur = 18;
    context.fillStyle = PALETTE.ink;
    context.beginPath();
    context.arc(item.x, item.y, item.radius * wobble, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = 0.5;
    context.fillStyle = '#2a1a4a';
    context.beginPath();
    context.arc(item.x - 10, item.y - 8, item.radius * 0.55, 0, Math.PI * 2);
    context.arc(item.x + 12, item.y + 10, item.radius * 0.45, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    // Ominous eyes inside the cloud.
    context.fillStyle = '#c084fc';
    context.beginPath();
    context.arc(item.x - 8, item.y - 2, 3, 0, Math.PI * 2);
    context.arc(item.x + 8, item.y - 2, 3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawPowerup(item) {
    const colors = { [KIND_SHIELD]: PALETTE.shield, [KIND_MAGNET]: PALETTE.magnet, [KIND_STAR]: PALETTE.star };
    const color = colors[item.kind] || '#fff';
    const bob = Math.sin(item.t * 3 + item.phase) * 3;
    const y = item.y + bob;
    context.save();
    context.shadowColor = color;
    context.shadowBlur = 20;
    // Ring.
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(item.x, y, item.radius, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `bold 20px ${FONT}`;
    const glyph = item.kind === KIND_SHIELD ? '◉' : item.kind === KIND_MAGNET ? '◎' : '★';
    context.fillText(glyph, item.x, y + 1);
    context.restore();
  }

  function drawPlayer(state) {
    const p = state.player;
    const blink = p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0;
    context.save();
    if (state.shake > 0) {
      context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    // Tentacles: wavy lines trailing below the bell.
    const sway = Math.sin(p.pulse) * 6;
    const tentacles = 7;
    context.lineCap = 'round';
    for (let i = 0; i < tentacles; i += 1) {
      const spread = (i - (tentacles - 1) / 2) * 8;
      const len = 34 + ((i * 7) % 18);
      const wave = Math.sin(p.pulse * 0.9 + i * 0.9) * 7;
      context.strokeStyle = i % 2 === 0 ? PALETTE.tentacle : '#8fe8ff';
      context.globalAlpha = blink ? 0.35 : 0.85;
      context.lineWidth = 3.2;
      context.beginPath();
      context.moveTo(p.x + spread * 0.7, p.y + 12);
      context.quadraticCurveTo(
        p.x + spread + wave * 0.6, p.y + 12 + len * 0.55,
        p.x + spread * 0.9 + wave, p.y + 12 + len,
      );
      context.stroke();
    }
    context.globalAlpha = 1;
    // Bell: glowing dome with a bright core.
    const squash = 1 + Math.sin(p.pulse) * 0.06;
    context.shadowColor = PALETTE.player;
    context.shadowBlur = 30;
    const bell = context.createRadialGradient(p.x, p.y - 6, 4, p.x, p.y, p.radius * 1.15);
    bell.addColorStop(0, PALETTE.playerCore);
    bell.addColorStop(0.55, PALETTE.player);
    bell.addColorStop(1, 'rgba(79, 216, 239, 0.25)');
    context.fillStyle = bell;
    context.beginPath();
    context.ellipse(p.x, p.y, p.radius * squash, p.radius * 0.82, 0, Math.PI, 0);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    // Bell rim + inner glow spots.
    context.strokeStyle = 'rgba(232, 251, 255, 0.9)';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(p.x, p.y, p.radius * squash, p.radius * 0.82, 0, Math.PI * 0.15, Math.PI * 0.85);
    context.stroke();
    context.fillStyle = 'rgba(255,255,255,0.9)';
    context.beginPath();
    context.arc(p.x - 8, p.y - 8, 3, 0, Math.PI * 2);
    context.arc(p.x + 9, p.y - 4, 2.2, 0, Math.PI * 2);
    context.fill();
    // Eyes.
    context.fillStyle = '#06283d';
    context.beginPath();
    context.arc(p.x - 7, p.y - 2, 2.6, 0, Math.PI * 2);
    context.arc(p.x + 7, p.y - 2, 2.6, 0, Math.PI * 2);
    context.fill();
    // Shield bubble.
    if (p.shield > 0) {
      context.strokeStyle = PALETTE.shield;
      context.globalAlpha = 0.75 + Math.sin(p.pulse * 2) * 0.2;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(p.x, p.y + 4, p.radius + 16, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
    // Magnet ring.
    if (p.magnet > 0) {
      context.strokeStyle = PALETTE.magnet;
      context.globalAlpha = 0.5;
      context.lineWidth = 2;
      context.setLineDash([10, 8]);
      context.beginPath();
      context.arc(p.x, p.y + 4, p.radius + 30, p.pulse * 0.4, p.pulse * 0.4 + Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.globalAlpha = 1;
    }
    context.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawField(state) {
    drawBackdrop(state);
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_ORB) drawOrb(item);
      else if (item.kind === KIND_EEL) drawEel(item);
      else if (item.kind === KIND_INK) drawInk(item);
      else drawPowerup(item);
    }
    drawPlayer(state);
    drawParticles(state);
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 26, 18, 30, PALETTE.text, 'left', '700');
    text(levelLabel(state.level), FIELD.width / 2, 18, 30, PALETTE.text, 'center', '700');
    // Combo badge.
    if (state.combo >= 2) {
      const cx = FIELD.width / 2;
      const pulse = 1 + Math.sin(state.elapsed * 8) * 0.05;
      context.save();
      context.translate(cx, 62);
      context.scale(pulse, pulse);
      context.fillStyle = state.combo >= 4 ? '#ff9f1c' : '#ffd166';
      context.font = `700 24px ${FONT}`;
      context.textAlign = 'center';
      context.fillText(comboLabel(state.combo), 0, 0);
      context.restore();
    }
    // Lives as little jelly bells.
    const firstLife = FIELD.width - 26 - LIVES * (LIFE_R * 2 + 8) + 8;
    text('Lives', firstLife - 14, 20, 26, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      const cx = firstLife + life * (LIFE_R * 2 + 8) + LIFE_R;
      const cy = 30;
      context.fillStyle = life < state.lives ? PALETTE.player : 'rgba(120,140,160,0.35)';
      context.beginPath();
      context.arc(cx, cy, LIFE_R, Math.PI, 0);
      context.closePath();
      context.fill();
    }
    // Active power-up timers.
    let ty = 56;
    if (state.player.shield > 0) {
      text('◉ Shield ready', 26, ty, 20, PALETTE.shield, 'left', '600');
      ty += 26;
    }
    if (state.player.magnet > 0) {
      text(`◎ Magnet ${Math.ceil(state.player.magnet)}s`, 26, ty, 20, PALETTE.magnet, 'left', '600');
    }
    void best;
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.save();
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 18);
    context.fill();
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, accent || PALETTE.text, 'center', '800');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 42, 24, PALETTE.orb, 'center', '600');
    context.restore();
  }

  const TITLE_LINES = [
    'You are a Lumen Jelly, glowing in the deep dark sea.',
    'Catch the golden plankton orbs — chain them for combos up to x5.',
    'Dodge the void eels and ink clouds. Three lives. Good luck.',
    'Move with mouse, WASD or arrow keys.  Pause with P.',
    '',
  ];
  const PAUSED_LINES = ['The tide is waiting for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('LUMEN TIDE', TITLE_LINES, 'Press Space or click to dive in', PALETTE.player);
    } else if (screen === SCREEN_PAUSED) {
      drawHud(state, best);
      drawPanel('Paused', PAUSED_LINES, 'Press P or Space to keep swimming');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = `Orbs ${state.orbsCollected}   Best combo x${state.bestCombo}   Level ${state.level}`;
      OVER_LINES[2] = bestLabel(best);
      drawPanel('The light fades…', OVER_LINES, 'Press Space or click to dive again');
    } else {
      drawHud(state, best);
    }
  }

  resize();
  window.addEventListener('resize', resize);

  return { draw, resize };
}
