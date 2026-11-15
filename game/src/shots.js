// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives the same frame. The
// play scene's pilot steers for spores, keeps clear of rocks and pulses when one closes in;
// the end scene's pilot chases spores and ignores everything else, so it is caught out, as a
// hurried player is.

import { PLANET, SEASON, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** Where the pilot wants to go: the nearest spore, with danger pushed away from it. */
function steer(state, careful) {
  const ship = state.ship;
  const pdx = ship.x - PLANET.x;
  const pdy = ship.y - PLANET.y;
  const pDist = Math.hypot(pdx, pdy) || 1;
  const outX = pdx / pDist;
  const outY = pdy / pDist;

  if (careful) {
    // Emergency: close to the planet and still falling toward it — stop chasing spores
    // and thrust straight out, with a touch of tangential drift to keep the orbit going.
    const radialSpeed = ship.vx * outX + ship.vy * outY;
    if (pDist < 250 && radialSpeed < 40) {
      const tangentSign = Math.sign(ship.vx * -outY + ship.vy * outX) || 1;
      const x = outX + -outY * 0.45 * tangentSign;
      const y = outY + outX * 0.45 * tangentSign;
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length, pulse: false };
    }
  }

  let spore = null;
  let bestDist = Infinity;
  for (const candidate of state.spores) {
    const dx = candidate.x - ship.x;
    const dy = candidate.y - ship.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      spore = candidate;
    }
  }
  let x = 0;
  let y = 0;
  if (spore) {
    x = spore.x - ship.x;
    y = spore.y - ship.y;
  } else {
    // Nothing to chase: hold a gentle orbit around the planet.
    x = -(ship.y - PLANET.y);
    y = ship.x - PLANET.x;
  }
  const length = Math.hypot(x, y) || 1;
  x /= length;
  y /= length;
  if (!careful) return { x, y, pulse: false };

  // Keep clear of the planet's surface: the closer it gets, the harder the push away.
  if (pDist < 280) {
    const push = (280 - pDist) / 45;
    x += outX * push;
    y += outY * push;
  }
  // Shove away from any rock that is closing in.
  let pulse = false;
  for (const rock of state.asteroids) {
    const dx = ship.x - rock.x;
    const dy = ship.y - rock.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 190) {
      const push = (190 - dist) / 90;
      x += (dx / dist) * push;
      y += (dy / dist) * push;
      if (dist < 150) pulse = true;
    }
  }
  const steerLength = Math.hypot(x, y) || 1;
  return { x: x / steerLength, y: y / steerLength, pulse };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, null, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const careful = name === 'play';
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const steerResult = steer(world.state, careful);
    const events = world.step(
      SAMPLE,
      { x: steerResult.x, y: steerResult.y },
      steerResult.pulse,
      false,
    );
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  if (name === 'end' && !world.state.over) {
    // The careless pilot survived the whole limit: run the season out so the frame is a
    // results screen either way.
    world.state.seasonLeft = 0.001;
    world.step(SAMPLE, null, false, false);
  }
  const over = world.state.over;
  const screen = !over ? SCREEN_PLAY : world.state.won ? SCREEN_WIN : SCREEN_OVER;
  return { screen, best: world.state.score };
}
