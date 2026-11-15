// Lumen Drift — the hand-in program for best-game-01 (Node 22, standard library only).
//
// The repository holds the game as plain static files under game/ (game/index.html plus its
// ES modules; no library, no network request) and 3 or 4 screenshots under screenshots/.
// This program copies both folders from beside itself into the output directory and writes
// /output/dossier.json, the summary the judge reads, using the vendored make.fun library.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The scorer's caps, as the kit's reference/gate.json states them: the dossier text is
// capped at 160 KiB; at most 4 screenshots of 256 KiB each; game/ holds at most 993 files
// and 48 MiB in all, with no path under it over 1000 bytes. The dossier is built from the
// copied output, so what the grader reads is exactly what this program wrote.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// Say what was handed in, so a run's log shows the entry at a glance.
console.log(`Lumen Drift handed in: dossier.json is ${dossier.length} bytes.`);
