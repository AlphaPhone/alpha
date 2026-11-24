#!/usr/bin/env node
/**
 * Prepare the source-bound native inputs, then fail before the long runtime preparation,
 * web sync and Gradle when the pinned checkout or on-device voice outputs are unavailable.
 * The normal build produces the native inputs automatically; only release signing needs
 * human-supplied custody. Input readiness does not establish device qualification.
 *
 *   node scripts/android-build-preflight.ts
 *   node scripts/android-build-preflight.ts --report     (pnpm android:build:inputs)
 *
 * android:build:local runs it first and build-android.ts runs it again for a plain
 * `pnpm android:build`. Everything the chain produces is verified where it is used: staging,
 * the Gradle verify tasks and verify-apks.
 * `--report` lists every input of the build with its state and whether a
 * script or a person supplies it. It reads files only, builds nothing and always exits 0.
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VOICE_ASSET_ROOT, VOICE_HOST_MANIFEST, verifyVoiceHost} from './voice-host.ts';
import {BUILD_TOOLCHAIN, QUALIFIED_HOST, embeddingHostState, stagedLibraries} from './build-embedding-host.ts';
import {readNativeBuildReceipt} from './native-build-inputs.ts';
import {readUpstreamPin} from './upstream-pin.ts';

export {VOICE_ASSET_ROOT, VOICE_HOST_MANIFEST};
export const GRADLE_VERIFICATION = 'android/gradle/verification-metadata.xml';
const FULL_CHAIN = 'pnpm android:build:local';
const VOICE_GUIDE = 'README.md';
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

type VoiceHostVerifier = (root: string) => {qualified: boolean};
interface PinOptions {
  notes?: string[];
}
interface VoiceOptions {
  voiceHost?: VoiceHostVerifier;
}
interface InputReportOptions {
  env?: NodeJS.ProcessEnv;
  voiceHost?: VoiceHostVerifier;
  workerDirectory?: string;
}
interface InputReportRow {
  input: string;
  state: 'ready' | 'missing';
  suppliedBy: 'person' | 'script';
  detail: string;
  action: string | null;
}

function readHead(directory: string) {
  try {
    return execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  } catch {
    return null;
  }
}

const git = (directory: string, args: string[]) => execFileSync('git', ['-C', directory, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});

type ReleaseLock = {branch?: string; commit?: string; alphaReleaseLine?: 'vibestack'};

function releaseLock(root: string, ref: string): ReleaseLock | null {
  try {
    return JSON.parse(git(root, ['show', `${ref}:upstream.lock.json`]));
  } catch {
    return null;
  }
}

function isVibestackRelease(lock: ReleaseLock | null) {
  return lock?.alphaReleaseLine === 'vibestack' || lock?.branch === 'vibestack';
}

/** Verify the SDK pin against the protected Alpha release line that owns its SDK history. */
export function releasePinStatus(root: string, pin: string) {
  const mainRef = 'refs/remotes/origin/main';
  const main = releaseLock(root, mainRef);
  const vibestack = isVibestackRelease(readUpstreamPin(root));
  const ref = vibestack && !isVibestackRelease(main)
    ? 'refs/remotes/origin/vibestack'
    : mainRef;
  const baseline = ref === mainRef ? main : releaseLock(root, ref);
  const releasePin = baseline?.commit;
  if (!releasePin || !/^[a-f0-9]{40}$/.test(releasePin) || (vibestack && !isVibestackRelease(baseline))) {
    return {state: vibestack ? 'baselineMissing' : 'unavailable', releasePin: null, ref};
  }
  if (releasePin === pin) return {state: 'equal', releasePin, ref};
  const upstream = path.join(root, 'vendor/eliza');
  try { git(upstream, ['cat-file', '-e', `${releasePin}^{commit}`]); } catch { return {state: 'unknown', releasePin, ref}; }
  try {
    git(upstream, ['merge-base', '--is-ancestor', releasePin, pin]);
    return {state: 'descendant', releasePin, ref};
  } catch {
    let shallow = false;
    try { shallow = git(upstream, ['rev-parse', '--is-shallow-repository']).trim() === 'true'; } catch { /* treat as complete */ }
    return {state: shallow ? 'shallow' : 'older', releasePin, ref};
  }
}

/** A problem prevents the build. Legacy clones without a main ref receive a note. */
export function releasePinProblem(root: string, pin: string, {notes = []}: PinOptions = {}) {
  const status = releasePinStatus(root, pin);
  const branch = status.ref.replace('refs/remotes/origin/', '');
  switch (status.state) {
    case 'baselineMissing':
      return `The upstream pin ${pin} requires a reviewed SDK baseline on origin/${branch}. Run: git fetch origin ${branch}.`;
    case 'unavailable':
      notes.push(`No origin/main ref in this clone, so the upstream pin ${pin} was not compared with main's (git fetch origin main to check it).`);
      return null;
    case 'older':
      return `upstream.lock.json pins ${pin}, which is older than or diverged from the pin ${status.releasePin} on ${status.ref}; an APK from it can reject state written by the newer agent on a device. Run: git fetch origin && git rebase origin/${branch} (or merge it), then git submodule update --init vendor/eliza.`;
    case 'shallow':
      return `vendor/eliza is a shallow clone, so it cannot show that the pin ${pin} descends from the pin ${status.releasePin} on ${status.ref}. Run: git -C vendor/eliza fetch --unshallow origin.`;
    case 'unknown':
      return `The upstream pin ${status.releasePin} on ${status.ref} is not in vendor/eliza, so the pin ${pin} cannot be shown to descend from it. Run: git -C vendor/eliza fetch origin.`;
    default:
      return null;
  }
}

/** The preflight: the pinned checkout and the on-device voice outputs. */
export function checkoutProblems(root: string, {voiceHost = verifyVoiceHost, notes = []}: VoiceOptions & PinOptions = {}) {
  const problems: string[] = [];
  const pin = readUpstreamPin(root).commit;
  const head = readHead(path.join(root, 'vendor/eliza'));
  if (head !== pin)
    problems.push(`vendor/eliza is ${head ? `at ${head}` : 'not checked out'}; upstream.lock.json pins ${pin}. Run: git submodule update --init vendor/eliza`);
  else {
    const older = releasePinProblem(root, pin, {notes});
    if (older) problems.push(older);
  }
  problems.push(...voiceHostProblems(root, {voiceHost}));
  return problems;
}

/**
 * The on-device voice outputs (libelizainference with the shared paradee-voice library: Paradee TTS,
 * misaki G2P, the ASR slot pair, Silero VAD) in .eliza/paradee-voice/native. Every build packages
 * them. Staged outputs must match
 * android/voice-host/qualified-voice-host.json byte for byte (Gradle :app:verifyVoiceHost).
 */
export function voiceHostProblems(root: string, options: VoiceOptions = {}): string[] {
  return assessVoiceHost(root, options).problems;
}

function assessVoiceHost(root: string, {voiceHost = verifyVoiceHost}: VoiceOptions) {
  try {
    return {status: voiceHost(root), problems: []};
  } catch (error) {
    return {status: null, problems: [`The on-device voice outputs in ${VOICE_ASSET_ROOT} are not admitted by ${VOICE_HOST_MANIFEST} (${message(error)}; Gradle :app:verifyVoiceHost rejects the build). ${FULL_CHAIN} produces them automatically from pinned public source and model inputs; run pnpm agent:build-embedding-host to prepare the native cache.`]};
  }
}

export function formatProblems(problems: readonly string[]) {
  return `Android build prerequisites are missing:\n${problems.map(problem => `  - ${problem}`).join('\n')}`;
}

const SIGNING_ENV = ['ELIZAOS_KEYSTORE_PATH', 'ELIZAOS_KEYSTORE_PASSWORD', 'ELIZAOS_KEY_ALIAS', 'ELIZAOS_KEY_PASSWORD'];
const readJson = (root: string, rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

/**
 * Every input of the build (`pnpm android:build:local`), in the order the chain needs it. `suppliedBy` is 'script' when a committed command produces the
 * input from pinned source and 'person' when no script may. `preparedSource` is null while the
 * pinned checkout is absent (its location cannot be resolved then).
 */
export function strictBuildInputs(root: string, preparedSource: string | null, {env = process.env, voiceHost = verifyVoiceHost, workerDirectory}: InputReportOptions = {}) {
  const rows: InputReportRow[] = [];
  const add = (input: string, ok: boolean, suppliedBy: InputReportRow["suppliedBy"], detail: string, action: string) => rows.push({input, state: ok ? 'ready' : 'missing', suppliedBy, detail, action: ok ? null : action});
  const pin = readUpstreamPin(root).commit;
  const head = readHead(path.join(root, 'vendor/eliza'));
  // The checkout must match the lock and retain the reviewed SDK baseline for its release line.
  const notes: string[] = [];
  const older = head === pin ? releasePinProblem(root, pin, {notes}) : null;
  add('pinned upstream checkout', head === pin && !older, 'script',
    [`vendor/eliza ${head ? `at ${head}` : 'not checked out'}; pin ${pin}`, ...(older ? [older] : notes)].join('; '),
    older ? 'Apply the Git command above, then git submodule update --init vendor/eliza' : 'git submodule update --init vendor/eliza');

  // Every build packages on-device speech and the embedding host.
  {
    const {status: voiceStatus, problems: voice} = assessVoiceHost(root, {voiceHost});
    add('on-device voice outputs', voice.length === 0, 'script',
      voice.length ? voice[0] : `staged outputs match ${VOICE_HOST_MANIFEST}`,
      'pnpm agent:build-embedding-host (downloads pinned public sources, builds and caches voice and embedding inputs)');

  }

  {
    let host;
    try{host=readNativeBuildReceipt(root)?.embedding;}catch{/* A stale generated receipt is a missing input, not a broken report. */}
    host??=readJson(root,QUALIFIED_HOST);
    const toolchain = readJson(root, BUILD_TOOLCHAIN);
    const libraries = stagedLibraries(root, host);
    const hostState = embeddingHostState(host, toolchain, libraries);
    add('embedding host libraries', hostState.ready, hostState.suppliedBy,
      hostState.ready ? `reviewed bytes staged in android/app/src/main/jniLibs/${host.abi}` : libraries.filter(row => row.state !== 'staged').map(row => `${row.name} ${row.state === 'missing' ? 'missing' : 'is not the reviewed bytes'}`).join(', '),
      'pnpm agent:build-embedding-host');
  }

  {
    const worker = path.join(root, '.eliza/workflow-worker');
    const built = fs.existsSync(path.join(worker, 'manifest.json')) && fs.existsSync(path.join(worker, 'workflow-worker.json'));
    add('workflow worker artifact', built, 'script', built ? '.eliza/workflow-worker' : '.eliza/workflow-worker is not built', 'pnpm agent:build-workflow-worker');
  }
  const prepared = preparedSource !== null && fs.existsSync(preparedSource);
  add('resident agent bundle', prepared, 'script', preparedSource ? path.relative(root, preparedSource) : '.eliza/agent-bundle is not built', 'pnpm agent:bundle');
  const staged = path.join(root, 'android/app/src/main/assets/agent/alpha-source.json');
  let current = false;
  try { current = prepared && JSON.parse(fs.readFileSync(staged, 'utf8')).base === pin; } catch { current = false; }
  add('staged resident runtime payload', current, 'script', !fs.existsSync(staged) ? 'android/app/src/main/assets/agent is not staged' : current ? 'staged from the pinned source' : 'staged from a different pin', 'pnpm agent:stage-android');
  {
    const host = readJson(root, QUALIFIED_HOST), model = path.join(root, host.model.path);
    add('embedding model', fs.existsSync(model), 'script', host.model.path, 'pnpm agent:stage-android (it stages the pinned model with the payload)');
  }
  add('Gradle dependency verification metadata', fs.existsSync(path.join(root, GRADLE_VERIFICATION)), 'script', GRADLE_VERIFICATION, 'pnpm android:deps:write-verification (then review the diff)');

  const signer = readJson(root, 'android/release-signer.json').signerSha256;
  const missingSigning = SIGNING_ENV.filter(name => {
    const value = env[name];
    return typeof value !== 'string' || !value.trim();
  });
  add('release signer', signer !== 'unset' && missingSigning.length === 0, 'person',
    [signer === 'unset' ? 'android/release-signer.json says unset' : `android/release-signer.json names ${signer}`, missingSigning.length ? `not set in this environment: ${missingSigning.join(', ')}` : 'signing variables are set'].join('; '),
    'Needs a person: Alpha Compute controls signing and Shaw owns release/support/rollback (#400). After the offline key ceremony, node scripts/enroll-release-keys.ts records the certificate digest in android/release-signer.json; then the release operator either supplies ELIZAOS_KEYSTORE_PATH, ELIZAOS_KEYSTORE_PASSWORD, ELIZAOS_KEY_ALIAS and ELIZAOS_KEY_PASSWORD to the build or signs the unsigned releases afterwards with node scripts/sign-release-apks.ts (ceremony key files or a PKCS#11 token; H-10). Without either the build still completes and records unsigned, non-distributable releases.');
  return rows;
}

export function formatReport(rows: readonly InputReportRow[]) {
  const lines = rows.map(row => `${row.state === 'ready' ? '[ready]  ' : row.suppliedBy === 'person' ? '[PERSON] ' : '[script] '}${row.input}: ${row.detail}${row.action ? `\n          -> ${row.action}` : ''}`);
  const open = rows.filter(row => row.state !== 'ready');
  const person = open.filter(row => row.suppliedBy === 'person'), script = open.filter(row => row.suppliedBy === 'script');
  lines.push('', open.length === 0 ? 'Every build input is present. This is an input check, not a build or a distributable APK.'
    : `${script.length} input(s) a script can produce: ${script.map(row => row.input).join(', ') || 'none'}.\n${person.length} input(s) only a person can supply: ${person.map(row => row.input).join(', ') || 'none'}.`);
  if (person.some(row => row.input === 'release signer')) lines.push('An unset release signer does not stop the build: verify-apks records its releases distributable:false and names them.');
  if (open.some(row => row.input === 'on-device voice outputs')) lines.push('Missing or changed voice outputs stop Gradle :app:verifyVoiceHost.');
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  for (const arg of args)
    if (arg !== '--report') throw new Error(`Unknown option ${arg}`);
  const root = path.resolve(import.meta.dirname, '..');
  if (args.includes('--report')) {
    // The source guard imports the pinned checkout; without it the prepared path is unknown.
    const bundle = path.join(root, '.eliza/agent-bundle');
    const prepared: string | null = fs.existsSync(bundle) ? bundle : null, workerDirectory: string | undefined = undefined;
    console.log(formatReport(strictBuildInputs(root, prepared, {workerDirectory})));
    return;
  }
  const notes: string[] = [];
  const pin=readUpstreamPin(root).commit;
  // Refuse an old or unknown source pin before acquiring or compiling its native inputs.
  if(readHead(path.join(root,'vendor/eliza'))===pin&&!releasePinProblem(root,pin)) {
    const {preparePortableNativeInputs}=await import('./build-embedding-host.ts');
    await preparePortableNativeInputs(root);
  }
  const problems = checkoutProblems(root,{notes});
  for (const note of notes) console.error(`Note: ${note}`);
  if (problems.length) {
    console.error(formatProblems(problems));
    process.exit(2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
