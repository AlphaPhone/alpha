/** Android installation identity is build configuration, never a renderer feature switch. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const RETAINED_ANDROID_APP_ID = 'ai.elizaresearch.alphaphone';
export const HOST_DESCRIPTOR = 'android/consumer-host.json';
type AppConfig = typeof import('../app.config.json');
type HostDescriptor = typeof import('../android/consumer-host.json');

/** One effective identity for Capacitor, generated Java, APK inspection and producer records. */
export function androidIdentity(root = ROOT, applicationId = process.env.ALPHA_ANDROID_APPLICATION_ID): AppConfig {
 const config: AppConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
 const selected = applicationId?.trim() || config.appId;
 if (selected === config.appId) return config;
 const descriptor = JSON.parse(fs.readFileSync(path.join(root, 'android/consumer-host.json'), 'utf8'));
 const installed = descriptor.installedIdentities?.find((value: {appId?: string}) => value.appId === selected);
 if (!installed || !/^https:\/\//.test(installed.updateManifestUrl))
  throw new Error('Android application identity is not a supported installed identity');
 return {...config, appId: selected, updateManifestUrl: installed.updateManifestUrl};
}

/** Project only the complete qualified package token, not brand names or feature code. */
export function projectAndroidPackage(source: string, from: string, to: string): string {
 if (from === to) return source;
 const token = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 return source.replace(new RegExp(`(?<![A-Za-z0-9_$])${token}(?![A-Za-z0-9_$])`, 'g'), () => to);
}

/** The existing host descriptor with its installed socket identities selected together. */
export function readHostDescriptor(root = ROOT): HostDescriptor {
 const descriptor: HostDescriptor = JSON.parse(fs.readFileSync(path.join(root, HOST_DESCRIPTOR), 'utf8'));
 if (descriptor?.schema !== 1 || descriptor.profile?.schema !== 1 || !descriptor.residentHost)
  throw new Error(`${HOST_DESCRIPTOR}: unsupported host descriptor`);
 const source: AppConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
 const identity = androidIdentity(root);
 for (const key of ['agent', 'inference', 'secureStore'] as const)
  descriptor.residentHost.sockets[key] = projectAndroidPackage(descriptor.residentHost.sockets[key], source.appId, identity.appId);
 return descriptor;
}

/**
 * An authenticated generated source view of this same launcher, for retained installations.
 * Original files and the canonical default are untouched. The package token owns Java classes,
 * manifest names and receipt callbacks together; projecting only applicationId would orphan them.
 */
export function stageAndroidIdentity(root = ROOT, identity = androidIdentity(root), existingOnly = false) {
 root = path.resolve(root);
 const canonical: AppConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
 if (identity.appId === canonical.appId) return null;
 if (androidIdentity(root, identity.appId).appId !== identity.appId) throw new Error('Invalid Android identity');
 const inputs: Record<string, string> = {}, files: Array<{name: string; bytes: Buffer}> = [];
 const app = path.join(root, 'android/app');
 const visit = (directory: string) => {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
   const file = path.join(directory, entry.name);
   if (entry.isSymbolicLink()) throw new Error('Android identity source must not contain symlinks');
   if (entry.isDirectory()) { if (!['build', 'assets', 'jniLibs'].includes(entry.name)) visit(file); }
   else if (entry.isFile() && (entry.name.endsWith('.java') || entry.name.endsWith('.pro') || entry.name === 'AndroidManifest.xml')) {
    const name = path.relative(root, file).split(path.sep).join('/'), bytes = fs.readFileSync(file);
    inputs[name] = createHash('sha256').update(bytes).digest('hex');
    const projectedName = name.replaceAll(canonical.appId.replaceAll('.', '/'), identity.appId.replaceAll('.', '/'));
    files.push({name: projectedName, bytes: Buffer.from(projectAndroidPackage(bytes.toString('utf8'), canonical.appId, identity.appId))});
   } else if (entry.isFile() && entry.name.endsWith('.xml') && entry.name !== 'config.xml') {
    const source = fs.readFileSync(file, 'utf8');
    if (projectAndroidPackage(source, canonical.appId, identity.appId) !== source)
     throw new Error(`Android identity resource needs an explicit projection: ${path.relative(root, file)}`);
   }
  }
 };
 visit(app);
 const binding = {schema: 1, sourceApplicationId: canonical.appId, applicationId: identity.appId, updateManifestUrl: identity.updateManifestUrl,
  projectorSHA256: createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'), inputs};
 const digest = createHash('sha256').update(JSON.stringify(binding)).digest('hex');
 const relative = `.eliza/android-identity/${digest}`, output = path.join(root, relative);
 const outputs = Object.fromEntries(files.map(file => [file.name, createHash('sha256').update(file.bytes).digest('hex')]));
 const receipt = {...binding, outputs};
 for (let parent = output; parent !== path.resolve(root); parent = path.dirname(parent))
  if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink()) throw new Error('Android identity output must not contain symlinks');
 if (fs.existsSync(output)) {
  const actual: string[] = [];
  const inventory = (directory: string) => {
   for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Generated Android identity source changed');
    if (entry.isDirectory()) inventory(file);
    else actual.push(path.relative(output, file).split(path.sep).join('/'));
   }
  };
  inventory(output);
  if (JSON.stringify(actual.sort()) !== JSON.stringify([...files.map(file => file.name), 'identity.json'].sort()))
   throw new Error('Generated Android identity file inventory changed');
  if (fs.readFileSync(path.join(output, 'identity.json'), 'utf8') !== JSON.stringify(receipt, null, 2) + '\n')
   throw new Error('Generated Android identity receipt changed');
  for (const file of files)
   if (!fs.readFileSync(path.join(output, file.name)).equals(file.bytes)) throw new Error('Generated Android identity source changed');
 } else {
  if (existingOnly) throw new Error('Generated Android identity is stale; run bun scripts/android-host.ts');
  fs.mkdirSync(path.dirname(output), {recursive: true});
  const temporary = fs.mkdtempSync(path.join(path.dirname(output), 'stage-'));
  try {
   for (const file of files) {
    const target = path.join(temporary, file.name); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, file.bytes);
   }
   fs.writeFileSync(path.join(temporary, 'identity.json'), JSON.stringify(receipt, null, 2) + '\n');
   fs.renameSync(temporary, output);
  } finally { fs.rmSync(temporary, {recursive: true, force: true}); }
 }
 return {root: output, relative, receipt};
}

/** Refuse changed inputs or a different selected package before Gradle configures any build. */
export function verifyAndroidIdentity(root = ROOT) {
 root = path.resolve(root);
 const identity = androidIdentity(root);
 const profile = JSON.parse(fs.readFileSync(path.join(root, 'android/.eliza-consumer-profile.json'), 'utf8'));
 if (profile.identity.appId !== identity.appId) throw new Error('Generated Android identity differs from the selected package; run bun scripts/android-host.ts');
 const asset = profile.assetFiles.find((file: {name: string}) => file.name === 'android-identity.json');
 const expected = stageAndroidIdentity(root, identity, true);
 if (expected ? !asset || fs.realpathSync(asset.source) !== fs.realpathSync(path.join(expected.root, 'identity.json')) : asset)
  throw new Error('Generated Android identity binding changed; run bun scripts/android-host.ts');
 return identity.appId;
}
