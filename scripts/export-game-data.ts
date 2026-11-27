import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGameData } from '../packages/shared/src/gameData';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'server/internal/config/game_data.json');
const expected = `${JSON.stringify(buildGameData(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const actual = readFileSync(target, 'utf8');
  if (actual !== expected) {
    console.error(`${target} is stale, run npm run export:game-data`);
    process.exit(1);
  }
  console.log(`${target} is in sync`);
} else {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, expected);
  console.log(`wrote ${target}`);
}
