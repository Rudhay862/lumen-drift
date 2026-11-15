// The world: one skiff, one glowing planet, drifting spores and tumbling asteroids. Pure
// simulation — no DOM, no sound — so it can be stepped headlessly and replayed from a seed.
// The skiff flies under the planet's gravity; thrust steers it. Spores are the harvest: gather
// SEASON.quota before the season timer runs out to win. Asteroids and the planet itself cost
// hull on contact. A pulse shoves asteroids away and drags nearby spores in, at energy cost.

import {
  ASTEROID, COMBO, FIELD, PLANET, PULSE, SEASON, SHIP, SPORE, STEP,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_GOLDEN = 2;
export const EVENT_HIT = 4;
export const EVENT_PULSE = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;

const TAU = Math.PI * 2;

function makeShip() {
  return {
    x: SHIP.spawnX, y: SHIP.spawnY,
    vx: SHIP.spawnSpeed, vy: 0,
    angle: 0, thrusting: false, invulnerable: 0,
  };
}

function orbitVelocity(random, radius) {
  // A near-circular orbit speed at this radius, with a little wobble so spores drift.
  const speed = Math.sqrt(PLANET.gravity / radius) * random.range(0.85, 1.1);
  return speed;
}

function spawnSpore(random, state) {
  const golden = random.next() < SPORE.goldenChance;
  const radius = golden
    ? random.range(SPORE.minOrbit, SPORE.minOrbit + 90)
    : random.range(SPORE.minOrbit, SPORE.maxOrbit);
  const angle = random.next() * TAU;
  const x = PLANET.x + Math.cos(angle) * radius;
  const y = PLANET.y + Math.sin(angle) * radius;
  const speed = orbitVelocity(random, radius);
  // Tangential velocity: perpendicular to the radius, either way round.
  const dir = random.next() < 0.5 ? 1 : -1;
  state.spores.push({
    x, y,
    vx: -Math.sin(angle) * speed * dir,
    vy: Math.cos(angle) * speed * dir,
    golden,
    age: 0,
    pulse: random.next() * TAU,
  });
}

function spawnAsteroid(random, state) {
  // Enter from a field edge, aimed roughly at the planet, with a sideways offset.
  const side = Math.floor(random.next() * 4);
  const along = random.range(0.1, 0.9);
  let x;
  let y;
  if (side === 0) { x = along * FIELD.width; y = -40; }
  else if (side === 1) { x = FIELD.width + 40; y = along * FIELD.height; }
  else if (side === 2) { x = along * FIELD.width; y = FIELD.height + 40; }
  else { x = -40; y = along * FIELD.height; }
  const aimX = PLANET.x + random.range(-260, 260);
  const aimY = PLANET.y + random.range(-200, 200);
  const dx = aimX - x;
  const dy = aimY - y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = random.range(ASTEROID.speedMin, ASTEROID.speedMax)
    + ASTEROID.speedPerSeason * (state.time / SEASON.seconds);
  const radius = random.range(ASTEROID.minRadius, ASTEROID.maxRadius);
  const corners = 7 + Math.floor(random.next() * 4);
  const shape = [];
  for (let i = 0; i < corners; i += 1) shape.push(random.range(0.72, 1.18));
  state.asteroids.push({
    x, y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    radius, angle: random.next() * TAU,
    spin: random.range(-1.2, 1.2),
    shape,
  });
}

function burst(state, x, y, colour, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.random.next() * TAU;
    const v = state.random.next() * speed;
    state.particles.push({
      x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
      age: 0, life: state.random.range(0.35, 0.7), colour, size: state.random.range(2, 4.5),
    });
  }
}

export function createWorld(random) {
  const state = {
    random,
    time: 0,
    seasonLeft: SEASON.seconds,
    score: 0,
    collected: 0,
    golden: 0,
    hull: SHIP.hull,
    energy: PULSE.energyMax,
    combo: 0,
    comboLeft: 0,
    multiplier: 1,
    ship: makeShip(),
    spores: [],
    asteroids: [],
    particles: [],
    sporeTimer: 0.4,
    asteroidTimer: 2.2,
    over: false,
    won: false,
  };

  function reset() {
    state.time = 0;
    state.seasonLeft = SEASON.seconds;
    state.score = 0;
    state.collected = 0;
    state.golden = 0;
    state.hull = SHIP.hull;
    state.energy = PULSE.energyMax;
    state.combo = 0;
    state.comboLeft = 0;
    state.multiplier = 1;
    state.ship = makeShip();
    state.spores = [];
    state.asteroids = [];
    state.particles = [];
    state.sporeTimer = 0.4;
    state.asteroidTimer = 3.5;
    state.over = false;
    state.won = false;
    for (let i = 0; i < 4; i += 1) spawnSpore(random, state);
  }

  function applyGravity(body, dt) {
    const dx = PLANET.x - body.x;
    const dy = PLANET.y - body.y;
    const distSq = Math.max(dx * dx + dy * dy, PLANET.minRadius * PLANET.minRadius);
    const dist = Math.sqrt(distSq);
    const pull = PLANET.gravity / distSq;
    body.vx += (dx / dist) * pull * dt;
    body.vy += (dy / dist) * pull * dt;
  }

  function firePulse() {
    if (state.energy < PULSE.cost) return 0;
    state.energy -= PULSE.cost;
    const ship = state.ship;
    for (const rock of state.asteroids) {
      const dx = rock.x - ship.x;
      const dy = rock.y - ship.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < PULSE.radius + rock.radius) {
        const strength = PULSE.push * (1 - dist / (PULSE.radius + rock.radius));
        rock.vx += (dx / dist) * strength;
        rock.vy += (dy / dist) * strength;
      }
    }
    for (const spore of state.spores) {
      const dx = ship.x - spore.x;
      const dy = ship.y - spore.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < PULSE.pullRadius) {
        const strength = 320 * (1 - dist / PULSE.pullRadius);
        spore.vx += (dx / dist) * strength;
        spore.vy += (dy / dist) * strength;
      }
    }
    burst(state, ship.x, ship.y, '#7ef0e0', 26, 320);
    return EVENT_PULSE;
  }

  function hurtShip(events, fromX, fromY) {
    const ship = state.ship;
    if (ship.invulnerable > 0 || state.over) return events;
    state.hull -= 1;
    ship.invulnerable = SHIP.invulnerable;
    const dx = ship.x - fromX;
    const dy = ship.y - fromY;
    const dist = Math.hypot(dx, dy) || 1;
    ship.vx += (dx / dist) * 260;
    ship.vy += (dy / dist) * 260;
    burst(state, ship.x, ship.y, '#ff5964', 22, 300);
    events |= EVENT_HIT;
    if (state.hull <= 0) {
      state.over = true;
      state.won = false;
      burst(state, ship.x, ship.y, '#f4f1de', 40, 420);
      events |= EVENT_OVER;
    }
    return events;
  }

  function collectSpore(spore, events) {
    state.collected += 1;
    if (spore.golden) state.golden += 1;
    state.combo += 1;
    state.comboLeft = COMBO.window;
    state.multiplier = Math.min(1 + Math.floor(state.combo / COMBO.perStep), COMBO.maxMultiplier);
    const points = (spore.golden ? SPORE.goldenPoints : SPORE.points) * state.multiplier;
    state.score += points;
    burst(state, spore.x, spore.y, spore.golden ? '#ffb703' : '#ffd166', spore.golden ? 22 : 12, 240);
    events |= spore.golden ? EVENT_GOLDEN : EVENT_PICKUP;
    if (state.collected >= SEASON.quota) {
      state.over = true;
      state.won = true;
      events |= EVENT_WIN;
    }
    return events;
  }

  /**
   * Advance the world one fixed step. `thrust` is a unit vector or null; `pulse` fires the
   * shockwave. `attract` (title-screen drift) keeps the demo scene alive without scoring.
   * Returns a bitmask of EVENT_* values.
   */
  function step(dt, thrust, pulse, attract = false) {
    if (state.over) return 0;
    let events = 0;
    state.time += dt;
    if (!attract) state.seasonLeft = Math.max(0, state.seasonLeft - dt);
    const ship = state.ship;

    if (pulse) events |= firePulse();

    // --- the skiff ---
    applyGravity(ship, dt);
    if (thrust) {
      ship.vx += thrust.x * SHIP.thrust * dt;
      ship.vy += thrust.y * SHIP.thrust * dt;
      ship.angle = Math.atan2(thrust.y, thrust.x);
      ship.thrusting = true;
    } else {
      ship.thrusting = false;
    }
    ship.vx *= 1 - SHIP.drag * dt;
    ship.vy *= 1 - SHIP.drag * dt;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > SHIP.maxSpeed) {
      ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
      ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    // The field's edge is a soft wall: slide along it, never leave.
    if (ship.x < SHIP.radius) { ship.x = SHIP.radius; ship.vx = Math.abs(ship.vx) * 0.4; }
    if (ship.x > FIELD.width - SHIP.radius) { ship.x = FIELD.width - SHIP.radius; ship.vx = -Math.abs(ship.vx) * 0.4; }
    if (ship.y < SHIP.radius) { ship.y = SHIP.radius; ship.vy = Math.abs(ship.vy) * 0.4; }
    if (ship.y > FIELD.height - SHIP.radius) { ship.y = FIELD.height - SHIP.radius; ship.vy = -Math.abs(ship.vy) * 0.4; }
    if (ship.invulnerable > 0) ship.invulnerable -= dt;

    // --- spawning ---
    state.sporeTimer -= dt;
    if (state.sporeTimer <= 0 && state.spores.length < SPORE.maxAlive) {
      spawnSpore(random, state);
      state.sporeTimer = SPORE.spawnInterval * random.range(0.75, 1.25);
    }
    state.asteroidTimer -= dt;
    const progress = Math.min(1, state.time / SEASON.seconds);
    if (state.asteroidTimer <= 0 && state.asteroids.length < ASTEROID.maxAlive) {
      spawnAsteroid(random, state);
      const interval = ASTEROID.spawnIntervalStart
        + (ASTEROID.spawnIntervalEnd - ASTEROID.spawnIntervalStart) * progress;
      state.asteroidTimer = interval * random.range(0.8, 1.2);
    }

    // --- spores drift, age out, and get collected ---
    for (let i = state.spores.length - 1; i >= 0; i -= 1) {
      const spore = state.spores[i];
      applyGravity(spore, dt);
      spore.x += spore.vx * dt;
      spore.y += spore.vy * dt;
      spore.age += dt;
      spore.pulse += dt * 3;
      if (spore.age > SPORE.lifetime) {
        state.spores.splice(i, 1);
        continue;
      }
      const dx = spore.x - ship.x;
      const dy = spore.y - ship.y;
      const reach = SPORE.radius + SHIP.radius + 6;
      if (!attract && dx * dx + dy * dy < reach * reach) {
        state.spores.splice(i, 1);
        events = collectSpore(spore, events);
        if (events & EVENT_WIN) return events;
      }
    }

    // --- asteroids tumble on, and anything that hits the skiff hurts ---
    for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
      const rock = state.asteroids[i];
      applyGravity(rock, dt * 0.35);
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.angle += rock.spin * dt;
      const dxPlanet = rock.x - PLANET.x;
      const dyPlanet = rock.y - PLANET.y;
      if (dxPlanet * dxPlanet + dyPlanet * dyPlanet < (PLANET.radius + rock.radius * 0.5) ** 2) {
        burst(state, rock.x, rock.y, '#9a8d7d', 10, 180);
        state.asteroids.splice(i, 1);
        continue;
      }
      if (rock.x < -90 || rock.x > FIELD.width + 90 || rock.y < -90 || rock.y > FIELD.height + 90) {
        state.asteroids.splice(i, 1);
        continue;
      }
      const dx = rock.x - ship.x;
      const dy = rock.y - ship.y;
      const reach = rock.radius * 0.85 + SHIP.radius;
      if (!attract && dx * dx + dy * dy < reach * reach) {
        state.asteroids.splice(i, 1);
        events = hurtShip(events, rock.x, rock.y);
        if (events & EVENT_OVER) return events;
      }
    }

    // --- the planet itself is a hazard, not a landing pad ---
    const pdx = ship.x - PLANET.x;
    const pdy = ship.y - PLANET.y;
    const pDist = Math.hypot(pdx, pdy) || 1;
    if (!attract && pDist < PLANET.radius + SHIP.radius) {
      ship.x = PLANET.x + (pdx / pDist) * (PLANET.radius + SHIP.radius);
      ship.y = PLANET.y + (pdy / pDist) * (PLANET.radius + SHIP.radius);
      events = hurtShip(events, PLANET.x, PLANET.y);
      if (events & EVENT_OVER) return events;
    }

    // --- combo, energy, particles ---
    if (state.comboLeft > 0) {
      state.comboLeft -= dt;
      if (state.comboLeft <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }
    state.energy = Math.min(PULSE.energyMax, state.energy + PULSE.energyRegen * dt);
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life) state.particles.splice(i, 1);
    }

    // --- the season ends (never while the title screen is drifting) ---
    if (!attract && state.seasonLeft <= 0 && !state.over) {
      state.over = true;
      state.won = state.collected >= SEASON.quota;
      events |= state.won ? EVENT_WIN : EVENT_OVER;
    }
    return events;
  }

  reset();

  return { state, reset, step };
}

// Re-exported so a headless test can step the world without a browser.
export { STEP };
