import { createHash } from 'node:crypto';
import { copyFile, cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const output = new URL('./dist/', import.meta.url);
const appAssets = new URL('../app/public/', import.meta.url);
const index = new URL('index.html', output);

await rm(output, { recursive: true, force: true });
await cp(new URL('./public/', import.meta.url), output, { recursive: true });
await Promise.all([
  copyFile(new URL('logo-mark.svg', appAssets), new URL('alpha-mark.svg', output)),
  copyFile(new URL('denton-300.woff2', appAssets), new URL('denton-300.woff2', output)),
]);

// A returning visitor can still have assets cached from an earlier deployment.
let html = await readFile(index, 'utf8');
for (const { name } of await readdir(output, { withFileTypes: true })) {
  if (name === 'index.html' || !html.includes(`"/${name}"`)) continue;
  const bytes = await readFile(new URL(name, output));
  const version = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  html = html.replaceAll(`"/${name}"`, `"/${name}?v=${version}"`);
}
await writeFile(index, html);
