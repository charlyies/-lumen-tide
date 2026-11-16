// Keyboard and pointer input. Held keys give a steering vector; the pointer steers by
// position (the jelly chases it). One-shot presses (start or restart, pause) are queued as
// bit flags and taken once by the loop, so a press between two frames is never lost and
// never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  const keys = { up: false, down: false, left: false, right: false };
  let actions = 0;
  /** Pointer position in CSS pixels relative to the canvas, or null when never moved. */
  let pointer = null;
  let pointerActive = false;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) keys.up = true;
    else if (DOWN.has(event.code)) keys.down = true;
    else if (LEFT.has(event.code)) keys.left = true;
    else if (RIGHT.has(event.code)) keys.right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) keys.up = false;
    else if (DOWN.has(event.code)) keys.down = false;
    else if (LEFT.has(event.code)) keys.left = false;
    else if (RIGHT.has(event.code)) keys.right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.up = keys.down = keys.left = keys.right = false;
    pointerActive = false;
  });
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerActive = true;
  });
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerActive = true;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerleave', () => {
    pointerActive = false;
  });

  return {
    /** Normalised steering vector from held keys, or null when no key is held. */
    keysVector() {
      const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** Pointer position in CSS pixels, or null when the pointer is not over the game. */
    pointer() {
      return pointerActive ? pointer : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
