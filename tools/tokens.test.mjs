import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { flattenTokens } from './generate-tokens.mjs';

const source = JSON.parse(await readFile(new URL('../tokens/primitive.json', import.meta.url), 'utf8'));
const tokens = flattenTokens(source);

test('obsolete palette is removed and every remaining primitive is exported', () => {
  assert.equal(source['Primitive/Indice'].colours.main['-'], undefined);
  const count = node => '$value' in node ? 1 : Object.entries(node).filter(([key]) => !key.startsWith('$')).reduce((total, [, child]) => total + count(child), 0);
  assert.equal(tokens.length, count(source['Primitive/Indice']));
  assert.equal(new Set(tokens.map(token => token.variable)).size, tokens.length);
});

test('CSS conversion preserves alpha colours and converts dimensions and weights', () => {
  const value = name => tokens.find(token => token.name === name)?.cssValue;
  assert.equal(value('colours.main.primary.opacity.10'), '#e5861a1a');
  assert.equal(value('space.8'), '8px');
  assert.equal(value('fonts.weight.semibold'), '600');
  assert.equal(value('fonts.family.manrope'), '"Manrope"');
  assert.equal(value('border.radius.full'), '10000000000px');
});