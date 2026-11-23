import { copyFile, cp, rm } from 'node:fs/promises';

const output = new URL('./dist/', import.meta.url);
const appAssets = new URL('../app/public/', import.meta.url);

await rm(output, { recursive: true, force: true });
await cp(new URL('./public/', import.meta.url), output, { recursive: true });
await Promise.all([
  copyFile(new URL('logo-mark.svg', appAssets), new URL('alpha-mark.svg', output)),
  copyFile(new URL('denton-300.woff2', appAssets), new URL('denton-300.woff2', output)),
]);
