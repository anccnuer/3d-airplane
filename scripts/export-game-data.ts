import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGameData } from '../packages/shared/src/gameData';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'server/internal/config/game_data.json');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(buildGameData(), null, 2)}\n`);

console.log(`wrote ${target}`);
