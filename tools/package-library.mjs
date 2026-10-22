import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'projects/catalogue/public/packages');
await mkdir(destination, { recursive: true });
if (!process.env.npm_execpath) throw new Error('Run npm run packages:build to package the libraries.');
const packages = [];
for (const name of ['indice-tokens', 'indice-ui']) {
  const directory = path.join(root, 'dist', name);
  const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'pack', directory, '--pack-destination', destination, '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `Failed to package ${name}`);
  const [archive] = JSON.parse(result.stdout);
  const archivePath = path.join(destination, archive.filename);
  const bytes = await readFile(archivePath);
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (integrity !== archive.integrity || (await stat(archivePath)).size === 0) throw new Error(`Invalid package archive: ${name}`);
  if (name === 'indice-tokens' && !archive.files.some(file => file.path === 'tokens.css')) throw new Error('Token stylesheet missing from package');
  if (name === 'indice-ui' && !archive.files.some(file => file.path.endsWith('.d.ts'))) throw new Error('UI type declarations missing from package');
  packages.push({ name, version: manifest.version, filename: archive.filename, integrity, bytes: archive.size, peers: manifest.peerDependencies ?? {} });
}
await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(packages, null, 2) + '\n');
await writeFile(path.join(root, 'projects/catalogue/src/app/packages.generated.ts'), `export const DELIVERY_PACKAGES = ${JSON.stringify(packages, null, 2)} as const;\n`);
console.log(packages.map(archive => `${archive.filename} (${archive.bytes} bytes)`).join('\n'));