import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const copies = [
  ['src/renderer', 'dist/renderer'],
  ['assets', 'dist/assets'],
];

for (const [from, to] of copies) {
  const src = join(root, from);
  if (!existsSync(src)) continue;
  mkdirSync(dirname(join(root, to)), { recursive: true });
  cpSync(src, join(root, to), { recursive: true });
  console.log(`copied ${from} -> ${to}`);
}
