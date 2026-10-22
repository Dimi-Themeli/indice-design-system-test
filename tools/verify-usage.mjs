import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import { performCompilation, formatDiagnostics } from '@angular/compiler-cli';

const root = fileURLToPath(new URL('../', import.meta.url));
const consumer = path.join(root, '.angular/cache/usage-consumer');
const sources = path.join(consumer, 'examples');
await mkdir(sources, { recursive: true });
const angular = JSON.parse(await readFile(path.join(root, 'node_modules/@angular/core/package.json'), 'utf8')).version;
const manifest = JSON.parse(await readFile(path.join(root, 'projects/catalogue/public/packages/manifest.json'), 'utf8'));
await writeFile(path.join(consumer, 'package.json'), JSON.stringify({ name: 'indice-usage-consumer', private: true, type: 'module', dependencies: { '@angular/common': angular, '@angular/core': angular, '@angular/forms': angular, '@angular/compiler': angular } }, null, 2));
if (!process.env.npm_execpath) throw new Error('Run npm run delivery:check.');
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'install', ...manifest.map(archive => path.join(root, 'projects/catalogue/public/packages', archive.filename)), '--prefix', consumer, '--ignore-scripts', '--package-lock=false', '--no-audit', '--no-fund'], { cwd: root, encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || result.stdout);
console.log('Installed both downloadable archives in an isolated consumer.');
const utility = await readFile(path.join(root, 'projects/catalogue/src/app/usage-data.ts'), 'utf8');
const compiled = ts.transpileModule(utility, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { buildUsageExample } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const examples = [
  ['button', 'button', '<button indiceButton variant="delete-clear" [showLeftIcon]="false">Save `draft` $&#123;name&#125;</button>', {}],
  ['icon', 'icon-button', '<button indiceIconButton label="Open administration" variant="teal-filled" size="xx-large" caption="Admin"></button>', {}],
  ['social', 'social-button', '<button indiceSocialButton provider="google" [disabled]="true"></button>', {}],
  ['field-email', 'field', '<indice-field label="Email" type="email" [formControl]="fieldControl" [required]="true" [error]="fieldError" />', { required: true, type: 'email', disabled: true }],
  ['field-readonly', 'field', '<indice-field label="Value" [formControl]="fieldControl" [readOnly]="true" [error]="fieldError" />', { readOnly: true }],
  ['field-password', 'field', '<indice-field label="Password" type="password" [formControl]="fieldControl" [required]="true" [error]="fieldError" />', { required: true, type: 'password' }],
];
const files = [];
for (const [name, component, markup, configuration] of examples) {
  const filename = path.join(sources, `${name}.ts`);
  await writeFile(filename, buildUsageExample(component, markup, configuration));
  files.push(filename);
}
const compilation = performCompilation({ rootNames: files, options: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, experimentalDecorators: true, strict: true, skipLibCheck: true, types: [], noEmit: true, rootDir: sources, strictTemplates: true, strictInjectionParameters: true } });
const errors = compilation.diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
if (errors.length) throw new Error(formatDiagnostics(errors));
console.log(`${examples.length} complete Angular examples passed strict template compilation against the installed package archives.`);