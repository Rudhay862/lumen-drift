// Keyboard and mouse, read as one input. Arrow keys / WASD thrust the skiff; holding the
// mouse (or a finger) thrusts toward the pointer; Space (or right click) fires the pulse.
// Enter / Space / click also confirm on the title and results screens; P pauses.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_PULSE = 4;

const THRUST_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

export function createInput(canvas) {
  const keys = new Set();
  let queued = 0;
  let pointerDown = false;
  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = false;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  function onKeyDown(event) {
    if (THRUST_KEYS.has(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') queued |= ACTION_CONFIRM;
    if (event.code === 'Space') queued |= ACTION_PULSE;
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    const point = canvasPoint(event);
    pointerX = point.x;
    pointerY = point.y;
    pointerActive = true;
    if (event.button === 2) {
      queued |= ACTION_PULSE;
      return;
    }
    pointerDown = true;
    queued |= ACTION_CONFIRM;
  }

  function onPointerMove(event) {
    const point = canvasPoint(event);
    pointerX = point.x;
    pointerY = point.y;
  }

  function onPointerUp(event) {
    if (event.button !== 2) pointerDown = false;
    if (event.buttons === 0) pointerActive = false;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function onBlur() {
    keys.clear();
    pointerDown = false;
    pointerActive = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  /** The thrust direction this frame as a unit vector (or null when coasting). */
  function thrustVector(shipX, shipY) {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    if (x === 0 && y === 0 && pointerDown && pointerActive) {
      const dx = pointerX - shipX;
      const dy = pointerY - shipY;
      const length = Math.hypot(dx, dy);
      if (length > 24) {
        x = dx / length;
        y = dy / length;
      }
    }
    if (x === 0 && y === 0) return null;
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  function takeActions() {
    const actions = queued;
    queued = 0;
    return actions;
  }

  return { thrustVector, takeActions };
}
