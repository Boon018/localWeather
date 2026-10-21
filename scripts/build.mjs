import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const source = await readFile(resolve(root, 'index.html'), 'utf8');

if (!source.includes('alpenwetter-version') || !source.includes('v1.2.0')) {
  throw new Error('Production source does not contain the expected v1.2.0 identifier');
}

await mkdir(dist, { recursive: true });
await writeFile(resolve(dist, 'index.html'), source);
await writeFile(resolve(dist, 'standalone.html'), source);

for (const file of ['manifest.webmanifest', 'sw.js', 'icon.svg']) {
  await cp(resolve(root, file), resolve(dist, file));
}

console.log('Built dist/index.html and dist/standalone.html from root index.html');
