// Everything the eye sees: the starfield, the glowing planet, the skiff and its trail, the
// spores and asteroids, the HUD, and the title / pause / win / loss screens. All drawing is
// Canvas 2D from the world state plus a clock for gentle pulsing; nothing here changes a rule.

import { ASTEROID, FIELD, PALETTE, PLANET, PULSE, SEASON, SHIP, SPORE, FONT } from './config.js';
import { COMBO } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

/** A fixed starfield, seeded once, so every frame (and every screenshot) shares the same sky. */
function makeStars() {
  let seed = 20261116;
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({ x: next() * FIELD.width, y: next() * FIELD.height, r: next() * 1.6 + 0.4, tw: next() * TAU });
  }
  return stars;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(23, 29, 56, 0.92)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawButton(ctx, x, y, w, h, label) {
  ctx.fillStyle = PALETTE.bar;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = '#06281d';
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

function drawHearts(ctx, x, y, hull) {
  for (let i = 0; i < SHIP.hull; i += 1) {
    const cx = x + i * 34;
    const full = i < hull;
    ctx.fillStyle = full ? PALETTE.danger : 'rgba(255, 89, 100, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx, y + 8);
    ctx.bezierCurveTo(cx - 11, y - 4, cx - 20, y + 8, cx, y + 18);
    ctx.bezierCurveTo(cx + 20, y + 8, cx + 11, y - 4, cx, y + 8);
    ctx.fill();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = makeStars();
  let trail = [];

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale * (window.devicePixelRatio || 1));
    canvas.height = Math.round(FIELD.height * scale * (window.devicePixelRatio || 1));
    const w = Math.round(FIELD.width * scale);
    const h = Math.round(FIELD.height * scale);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    // Centre the letterboxed field: with `inset: 0` in the stylesheet a fixed canvas
    // whose aspect is not the window's would otherwise anchor to the top-left corner
    // and leave the empty band on the bottom or right. At exactly 1280x720 this is 0, 0.
    canvas.style.left = `${Math.round((window.innerWidth - w) / 2)}px`;
    canvas.style.top = `${Math.round((window.innerHeight - h) / 2)}px`;
  }
  fit();
  window.addEventListener('resize', fit);

  function drawBackdrop(time) {
    const grad = ctx.createRadialGradient(
      PLANET.x, PLANET.y, 60, PLANET.x, PLANET.y, 700,
    );
    grad.addColorStop(0, PALETTE.deep);
    grad.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const alpha = 0.35 + 0.3 * Math.sin(time * 1.4 + star.tw);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbitRings() {
    ctx.strokeStyle = 'rgba(42, 53, 96, 0.55)';
    ctx.lineWidth = 1.5;
    for (const radius of [180, 250, 320]) {
      ctx.beginPath();
      ctx.ellipse(PLANET.x, PLANET.y, radius, radius * 0.62, -0.35, 0, TAU);
      ctx.stroke();
    }
  }

  function drawPlanet(time) {
    const glow = ctx.createRadialGradient(PLANET.x, PLANET.y, PLANET.radius * 0.6, PLANET.x, PLANET.y, PLANET.radius * 2.1);
    const pulse = 0.10 + 0.03 * Math.sin(time * 1.2);
    glow.addColorStop(0, `rgba(57, 245, 192, ${pulse + 0.12})`);
    glow.addColorStop(1, 'rgba(57, 245, 192, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(PLANET.x - 260, PLANET.y - 260, 520, 520);
    const body = ctx.createRadialGradient(
      PLANET.x - 38, PLANET.y - 42, 12, PLANET.x, PLANET.y, PLANET.radius,
    );
    body.addColorStop(0, PALETTE.planetGlow);
    body.addColorStop(0.55, PALETTE.planet);
    body.addColorStop(1, PALETTE.planetDark);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(PLANET.x, PLANET.y, PLANET.radius, 0, TAU);
    ctx.fill();
    // Seas and isles: a few soft arcs across the face.
    ctx.strokeStyle = 'rgba(14, 122, 92, 0.5)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(PLANET.x - 20, PLANET.y - 10, 62, 0.4, 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(PLANET.x + 26, PLANET.y + 30, 44, 3.4, 5.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(238, 241, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(PLANET.x, PLANET.y, PLANET.radius - 6, 0, TAU);
    ctx.stroke();
  }

  function drawSpore(spore, time) {
    const blink = spore.age > SPORE.lifetime - 3 ? (Math.sin(time * 10) > 0 ? 1 : 0.25) : 1;
    const glow = 0.55 + 0.35 * Math.sin(spore.pulse);
    ctx.globalAlpha = blink;
    const colour = spore.golden ? PALETTE.golden : PALETTE.spore;
    const halo = ctx.createRadialGradient(spore.x, spore.y, 1, spore.x, spore.y, spore.golden ? 30 : 22);
    halo.addColorStop(0, colour);
    halo.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.globalAlpha = blink * glow * 0.5;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(spore.x, spore.y, spore.golden ? 30 : 22, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = blink;
    ctx.fillStyle = spore.golden ? '#fff3c4' : '#fff8e1';
    ctx.beginPath();
    ctx.arc(spore.x, spore.y, spore.golden ? 8 : 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(spore.x, spore.y, spore.golden ? 5 : 3.5, 0, TAU);
    ctx.fill();
    if (spore.golden) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(spore.x, spore.y, 12, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawAsteroid(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);
    ctx.beginPath();
    for (let i = 0; i < rock.shape.length; i += 1) {
      const angle = (i / rock.shape.length) * TAU;
      const r = rock.radius * rock.shape[i];
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fillStyle = PALETTE.asteroid;
    ctx.fill();
    ctx.strokeStyle = PALETTE.asteroidDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(93, 83, 72, 0.7)';
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.3, -rock.radius * 0.2, rock.radius * 0.22, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rock.radius * 0.35, rock.radius * 0.3, rock.radius * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawShip(state, time) {
    const ship = state.ship;
    const blink = ship.invulnerable > 0 && Math.sin(time * 18) > 0;
    if (!blink) {
      if (ship.thrusting) {
        const back = ship.angle + Math.PI;
        const flameLen = 22 + 8 * Math.sin(time * 30);
        ctx.fillStyle = PALETTE.flame;
        ctx.beginPath();
        ctx.moveTo(ship.x + Math.cos(back) * 12, ship.y + Math.sin(back) * 12);
        ctx.lineTo(ship.x + Math.cos(back + 0.35) * (12 + flameLen), ship.y + Math.sin(back + 0.35) * (12 + flameLen));
        ctx.lineTo(ship.x + Math.cos(back - 0.35) * (12 + flameLen), ship.y + Math.sin(back - 0.35) * (12 + flameLen));
        ctx.closePath();
        ctx.fill();
      }
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.fillStyle = PALETTE.ship;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-12, -11);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.shipAccent;
      ctx.beginPath();
      ctx.arc(2, 0, 4.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBar(ctx2, x, y, w, h, fraction, colour) {
    ctx2.fillStyle = PALETTE.barTrack;
    roundRect(ctx2, x, y, w, h, h / 2);
    ctx2.fill();
    if (fraction > 0) {
      ctx2.fillStyle = colour;
      roundRect(ctx2, x, y, Math.max(h, w * Math.min(1, fraction)), h, h / 2);
      ctx2.fill();
    }
  }

  function drawHud(state) {
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('SCORE', 24, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(String(state.score), 24, 68);
    if (state.multiplier > 1) {
      ctx.fillStyle = PALETTE.spore;
      ctx.font = `700 20px ${FONT}`;
      ctx.fillText(`x${state.multiplier} COMBO`, 24, 96);
      drawBar(ctx, 24, 104, 110, 7, state.comboLeft / COMBO.window, PALETTE.spore);
    }
    // Quota, top centre.
    const quotaW = 320;
    const quotaX = (FIELD.width - quotaW) / 2;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('HARVEST', FIELD.width / 2, 34);
    drawBar(ctx, quotaX, 44, quotaW, 14, state.collected / SEASON.quota, PALETTE.bar);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 17px ${FONT}`;
    ctx.fillText(`${state.collected} / ${SEASON.quota} spores`, FIELD.width / 2, 84);
    // Timer + hull, top right.
    const seconds = Math.max(0, Math.ceil(state.seasonLeft));
    ctx.fillStyle = state.seasonLeft < 15 ? PALETTE.danger : PALETTE.text;
    ctx.font = `700 34px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, FIELD.width - 24, 68);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('SEASON', FIELD.width - 24, 34);
    drawHearts(ctx, FIELD.width - 24 - 2 * 34 - 8, 88, state.hull);
    // Energy, bottom centre.
    const eW = 220;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PULSE  [SPACE]', FIELD.width / 2, FIELD.height - 34);
    drawBar(ctx, (FIELD.width - eW) / 2, FIELD.height - 26, eW, 10,
      state.energy / PULSE.energyMax, state.energy >= PULSE.cost ? PALETTE.sporeCyan : '#5a6a94');
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(10, 13, 28, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.planetGlow;
    ctx.font = `700 84px ${FONT}`;
    ctx.fillText('LUMEN DRIFT', FIELD.width / 2, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 24px ${FONT}`;
    ctx.fillText('Ride the gravity of a living world. Gather its light before the season ends.', FIELD.width / 2, 236);
    drawPanel(ctx, FIELD.width / 2 - 330, 280, 660, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText('Steer with WASD / arrow keys, or hold the mouse toward where you want to go.', FIELD.width / 2, 322);
    ctx.fillText('Catch glowing spores — chain them fast for a combo multiplier.', FIELD.width / 2, 354);
    ctx.fillText('Dodge tumbling asteroids and the planet itself. 3 hull.', FIELD.width / 2, 386);
    ctx.fillStyle = PALETTE.sporeCyan;
    ctx.fillText('SPACE fires a pulse: shoves asteroids away, pulls spores in.', FIELD.width / 2, 418);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText(`Harvest ${SEASON.quota} spores in ${SEASON.seconds} seconds to win.  Golden spores are worth 5x.`, FIELD.width / 2, 450);
    drawButton(ctx, FIELD.width / 2 - 130, 510, 260, 56, 'LAUNCH  ▶');
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText('Press SPACE or click to launch', FIELD.width / 2, 600);
    if (best > 0) {
      ctx.fillStyle = PALETTE.spore;
      ctx.font = `700 19px ${FONT}`;
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 634);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10, 13, 28, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 340);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 22px ${FONT}`;
    ctx.fillText('Press P or SPACE to keep drifting', FIELD.width / 2, 388);
  }

  function drawResults(state, won, best) {
    ctx.fillStyle = 'rgba(10, 13, 28, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = PALETTE.planetGlow;
      ctx.font = `700 64px ${FONT}`;
      ctx.fillText('SEASON COMPLETE', FIELD.width / 2, 210);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `400 24px ${FONT}`;
      ctx.fillText('The harvest is gathered — the world glows a little brighter.', FIELD.width / 2, 256);
    } else {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `700 64px ${FONT}`;
      ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 210);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `400 24px ${FONT}`;
      ctx.fillText(state.hull <= 0
        ? 'Your skiff broke apart among the rocks.'
        : 'The season ended before the quota was met.', FIELD.width / 2, 256);
    }
    drawPanel(ctx, FIELD.width / 2 - 250, 300, 500, 168);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText(`Score  ${state.score}`, FIELD.width / 2, 360);
    ctx.font = `500 22px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Spores ${state.collected}  ·  Golden ${state.golden}  ·  Best ${Math.max(best, state.score)}`, FIELD.width / 2, 404);
    ctx.fillStyle = PALETTE.spore;
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(won ? 'Quota met — a full harvest!' : `Quota was ${SEASON.quota} spores`, FIELD.width / 2, 440);
    drawButton(ctx, FIELD.width / 2 - 130, 500, 260, 56, 'PLAY AGAIN  ↻');
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText('Press SPACE or click to play again', FIELD.width / 2, 592);
  }

  function draw(state, screen, best) {
    const time = state.time;
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawBackdrop(time);
    drawOrbitRings();
    drawPlanet(time);
    for (const spore of state.spores) drawSpore(spore, time);
    for (const rock of state.asteroids) drawAsteroid(rock);
    // A faint trail behind the skiff, from its recent positions.
    const ship = state.ship;
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      trail.push({ x: ship.x, y: ship.y });
      if (trail.length > 26) trail.shift();
    } else {
      trail = [];
    }
    ctx.strokeStyle = 'rgba(126, 240, 224, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trail.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    if (screen !== SCREEN_TITLE) drawShip(state, time);
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_WIN) drawResults(state, true, best);
    else if (screen === SCREEN_OVER) drawResults(state, false, best);
  }

  return { draw };
}
