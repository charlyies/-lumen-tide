// The deep-sea scenery: everything behind the play, no rules in it. A layered
// gradient, wide swaying light rays from the surface, drifting bubbles and golden
// motes, faint giant jellyfish silhouettes far below, and a rocky seabed with
// glowing anemones along the bottom. Drawn from the world's seeded ambient array
// and the clock alone, so the same seed always paints the same sea.
import { FIELD, PALETTE } from './config.js';

/** Distant jellyfish silhouettes: fixed lanes, drifting slowly on the clock. */
const FAR_JELLIES = [
  { lane: 0.18, size: 64, speed: 0.021, phase: 0.4 },
  { lane: 0.35, size: 72, speed: 0.017, phase: 1.3 },
  { lane: 0.52, size: 88, speed: 0.014, phase: 2.1 },
  { lane: 0.68, size: 58, speed: 0.025, phase: 3.2 },
  { lane: 0.84, size: 56, speed: 0.027, phase: 4.4 },
];

/** Seabed rocks: fixed x positions and heights, drawn as dark humps. */
const ROCKS = [
  { x: 0.02, w: 0.16, h: 46 }, { x: 0.16, w: 0.11, h: 30 }, { x: 0.3, w: 0.14, h: 52 },
  { x: 0.47, w: 0.1, h: 26 }, { x: 0.6, w: 0.17, h: 44 }, { x: 0.76, w: 0.12, h: 32 },
  { x: 0.88, w: 0.13, h: 50 },
];

/** Glowing anemones on the rocks: fixed positions, pulsing with the clock. */
const ANEMONES = [
  { x: 0.07, c: '#ff6fb5' }, { x: 0.23, c: '#7ef0ff' }, { x: 0.36, c: '#ffd166' },
  { x: 0.55, c: '#8affc1' }, { x: 0.69, c: '#c084fc' }, { x: 0.83, c: '#ff6fb5' },
  { x: 0.95, c: '#7ef0ff' },
];

export function drawScenery(context, state) {
  const { elapsed } = state;

  // Water column: bright near the surface, deep dark at the bottom.
  const bg = context.createLinearGradient(0, 0, 0, FIELD.height);
  bg.addColorStop(0, PALETTE.shallow);
  bg.addColorStop(0.45, PALETTE.mid);
  bg.addColorStop(1, PALETTE.deep);
  context.fillStyle = bg;
  context.fillRect(0, 0, FIELD.width, FIELD.height);

  // Wide light rays from the surface, slowly swaying.
  context.save();
  for (let i = 0; i < 8; i += 1) {
    const sway = Math.sin(elapsed * 0.22 + i * 1.7) * 46;
    const topX = 60 + i * 170 + sway;
    context.fillStyle = i % 2 === 0 ? 'rgba(64, 180, 220, 0.09)' : 'rgba(120, 220, 255, 0.05)';
    context.beginPath();
    context.moveTo(topX, 0);
    context.lineTo(topX + 110, 0);
    context.lineTo(topX + 300, FIELD.height);
    context.lineTo(topX + 70, FIELD.height);
    context.closePath();
    context.fill();
  }
  context.restore();

  // Soft glow where the sun hits the surface.
  const topGlow = context.createLinearGradient(0, 0, 0, 120);
  topGlow.addColorStop(0, 'rgba(140, 220, 255, 0.16)');
  topGlow.addColorStop(1, 'rgba(140, 220, 255, 0)');
  context.fillStyle = topGlow;
  context.fillRect(0, 0, FIELD.width, 120);

  // Distant giant jellyfish, barely there, drifting across the deep.
  for (const far of FAR_JELLIES) {
    const span = FIELD.width + 400;
    const x = ((far.lane * FIELD.width + elapsed * 12 * far.speed * 60) % span) - 200;
    const y = FIELD.height * 0.42 + Math.sin(elapsed * 0.3 + far.phase) * 26;
    context.save();
    context.globalAlpha = 0.1;
    context.fillStyle = '#9be8ff';
    context.beginPath();
    context.ellipse(x, y, far.size, far.size * 0.7, 0, Math.PI, 0);
    context.closePath();
    context.fill();
    context.globalAlpha = 0.07;
    for (let t = 0; t < 5; t += 1) {
      const spread = (t - 2) * far.size * 0.22;
      context.strokeStyle = '#9be8ff';
      context.lineWidth = far.size * 0.06;
      context.beginPath();
      context.moveTo(x + spread * 0.7, y + 8);
      context.quadraticCurveTo(x + spread, y + far.size * 0.7, x + spread * 0.9, y + far.size * 1.15);
      context.stroke();
    }
    context.restore();
  }

  // Ambient bubbles and golden motes, drifting up.
  for (const a of state.ambient) {
    context.globalAlpha = a.alpha;
    context.fillStyle = a.r > 2.6 ? '#ffe9a8' : '#bfe9ff';
    context.beginPath();
    context.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  // Rocky seabed with glowing anemones and dim coral fans.
  context.fillStyle = '#03101f';
  for (const rock of ROCKS) {
    const x = rock.x * FIELD.width;
    const w = rock.w * FIELD.width;
    context.beginPath();
    context.moveTo(x, FIELD.height);
    context.quadraticCurveTo(x + w * 0.5, FIELD.height - rock.h * 2.1, x + w, FIELD.height);
    context.closePath();
    context.fill();
  }
  // Coral fans: thin branching strokes rising from the rocks, barely lit.
  context.save();
  context.strokeStyle = 'rgba(124, 58, 237, 0.4)';
  context.lineWidth = 3;
  context.lineCap = 'round';
  for (const coral of [
    { x: 0.12, h: 34 }, { x: 0.31, h: 44 }, { x: 0.52, h: 30 },
    { x: 0.71, h: 40 }, { x: 0.9, h: 36 },
  ]) {
    const x = coral.x * FIELD.width;
    const y = FIELD.height - 4;
    const sway = Math.sin(elapsed * 0.7 + coral.x * 30) * 4;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + sway, y - coral.h * 0.6, x + sway * 1.6, y - coral.h);
    context.moveTo(x, y - coral.h * 0.4);
    context.quadraticCurveTo(x - 10 + sway, y - coral.h * 0.75, x - 14 + sway, y - coral.h * 0.95);
    context.moveTo(x, y - coral.h * 0.4);
    context.quadraticCurveTo(x + 10 + sway, y - coral.h * 0.7, x + 15 + sway, y - coral.h * 0.9);
    context.stroke();
  }
  context.restore();
  for (const anemone of ANEMONES) {
    const x = anemone.x * FIELD.width;
    const y = FIELD.height - 8;
    const pulse = 0.6 + Math.sin(elapsed * 2 + anemone.x * 40) * 0.4;
    context.save();
    context.globalAlpha = 0.55 + pulse * 0.35;
    context.shadowColor = anemone.c;
    context.shadowBlur = 12;
    context.fillStyle = anemone.c;
    context.beginPath();
    context.arc(x, y, 4.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Sandy floor glow at the bottom.
  const floor = context.createLinearGradient(0, FIELD.height - 60, 0, FIELD.height);
  floor.addColorStop(0, 'rgba(20, 90, 120, 0)');
  floor.addColorStop(1, 'rgba(24, 110, 140, 0.35)');
  context.fillStyle = floor;
  context.fillRect(0, FIELD.height - 60, FIELD.width, 60);
}
