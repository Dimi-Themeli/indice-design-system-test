import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = path.join(root, 'tokens/primitive.json');
const weights = { Light: 300, Regular: 400, Medium: 500, Semibold: 600, Bold: 700, ExtraBold: 800 };

export function flattenTokens(source) {
  const collection = source['Primitive/Indice'];
  if (!collection) throw new Error('Missing Primitive/Indice collection');
  const tokens = [];
  function visit(node, segments) {
    if ('$value' in node) {
      const value = node.$value;
      if (node.$type === 'color' && !/^#[\da-f]{6}([\da-f]{2})?$/i.test(value)) {
        throw new Error(`Invalid colour: ${segments.join('.')}`);
      }
      let cssValue = String(value);
      if (node.$type === 'number') cssValue = `${value}px`;
      if (segments[0] === 'fonts' && segments[1] === 'weight') {
        if (!(value in weights)) throw new Error(`Unknown font weight: ${value}`);
        cssValue = String(weights[value]);
      }
      if (segments[0] === 'fonts' && segments[1] === 'family') cssValue = `"${value}"`;
      tokens.push({ name: segments.join('.'), variable: `--indice-${segments.join('-')}`, category: segments[0], group: segments.slice(0, -1).join('.'), label: segments.at(-1), value, cssValue, type: node.$type });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      if (child && typeof child === 'object') visit(child, [...segments, key]);
    }
  }
  visit(collection, []);
  if (new Set(tokens.map(token => token.variable)).size !== tokens.length) throw new Error('Duplicate CSS names');
  return tokens;
}

async function generate() {
  const importPath = process.argv.find(argument => argument.startsWith('--import='))?.slice(9);
  if (importPath) {
    const imported = JSON.parse(await readFile(importPath, 'utf8'));
    delete imported['Primitive/Indice'].colours.main['-'];
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, JSON.stringify(imported, null, 2) + '\n');
  }
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const tokens = flattenTokens(source);
  const target = path.join(root, 'projects/indice-tokens/src');
  const css = `:root {\n${tokens.map(token => `  ${token.variable}: ${token.cssValue};`).join('\n')}\n}\n`;
  const typescript = `export interface DesignToken {\n  name: string;\n  variable: string;\n  category: string;\n  group: string;\n  label: string;\n  value: string | number;\n  cssValue: string;\n  type: string;\n}\n\nexport const TOKENS: readonly DesignToken[] = ${JSON.stringify(tokens, null, 2)};\n`;
  const outputs = [[path.join(target, 'tokens.css'), css], [path.join(target, 'lib/tokens.generated.ts'), typescript]];
  for (const [destination, content] of outputs) {
    if (process.argv.includes('--check')) {
      if (await readFile(destination, 'utf8') !== content) throw new Error(`Stale generated file: ${destination}`);
    } else {
      await writeFile(destination, content);
    }
  }
  console.log(`${tokens.length} tokens ${process.argv.includes('--check') ? 'verified' : 'generated'}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generate();