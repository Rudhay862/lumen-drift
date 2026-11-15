// Lumen Drift — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size. One season lasts SEASON_SECONDS; gather QUOTA spores before it ends.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The glowing world at the centre of the field; its gravity bends every flight path. */
export const PLANET = { x: 640, y: 360, radius: 108, gravity: 3000000, minRadius: 130 };

export const SHIP = {
  radius: 14,
  thrust: 430,
  maxSpeed: 430,
  drag: 0.12,
  hull: 3,
  invulnerable: 1.6,
  spawnX: 640,
  spawnY: 132,
  spawnSpeed: 175,
};

export const SPORE = {
  radius: 9,
  points: 10,
  goldenPoints: 50,
  goldenChance: 0.12,
  spawnInterval: 1.05,
  maxAlive: 9,
  lifetime: 14,
  minOrbit: 165,
  maxOrbit: 330,
};

export const ASTEROID = {
  minRadius: 15,
  maxRadius: 30,
  spawnIntervalStart: 3.4,
  spawnIntervalEnd: 1.35,
  maxAlive: 14,
  speedMin: 55,
  speedMax: 150,
  speedPerSeason: 55,
};

export const PULSE = {
  cost: 30,
  radius: 250,
  pullRadius: 150,
  push: 560,
  energyMax: 100,
  energyRegen: 13,
};

export const SEASON = { seconds: 90, quota: 24 };

/** Pickups inside this window keep the chain alive; every third link raises the multiplier. */
export const COMBO = { window: 3.0, perStep: 3, maxMultiplier: 5 };

export const PALETTE = {
  backdrop: '#0a0d1c',
  deep: '#12172e',
  star: '#cdd6ff',
  planet: '#2fd6a3',
  planetDark: '#0e7a5c',
  planetGlow: '#39f5c0',
  ring: '#2a3560',
  spore: '#ffd166',
  sporeCyan: '#7ef0e0',
  golden: '#ffb703',
  asteroid: '#9a8d7d',
  asteroidDark: '#5d5348',
  ship: '#f4f1de',
  shipAccent: '#ff7a59',
  flame: '#ffb703',
  text: '#eef1ff',
  muted: '#9aa3c7',
  danger: '#ff5964',
  panel: '#171d38',
  panelEdge: '#2c3766',
  bar: '#2fd6a3',
  barTrack: '#232a4a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';
