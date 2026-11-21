// Alpha owns its native Android UI as it owns its renderer UI (test/ui-self-contained.test.mjs):
// every Capacitor plugin MainActivity registers, every component the app and listener manifests
// declare (with the shared library manifests merged in and tools:node="remove" applied) and every
// shared class Alpha's Java reaches resolves to Alpha's own sources, never to a shared elizaOS class
// that presents UI. Shared classes stay in the build for their non-UI logic (stores, parsers,
// policies, telephony providers); one is admitted here only with a reviewed reason, and only while
// Alpha neither extends nor creates it nor calls one of its presenting members.
//
// Shared UI is recognised by what it is, whatever its name: a class that is an Activity, Dialog,
// TileService, InCallService or AutofillService, or a member that builds an AlertDialog, a
// notification, a toast, RemoteViews, a chooser, a biometric prompt, a popup or views. The scan
// covers the pinned sources of every shared root the build compiles into the app (each shared
// module's source roots, the resident runtime's shared helpers and the shared speech sources) and
// the shared listener sources android/sense/build.gradle compiles. Beyond what Alpha's own files
// call, it follows what Alpha inherits: every shared superclass member Alpha does not override, and
// every super call, into the shared code those run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(file, 'utf8');
const VENDOR = 'vendor/eliza/';
const APP_ID = 'ai.alphacompute.alphaphone';
const SENSE_VENDOR = VENDOR + 'packages/app/platforms/android/sense/src/main/java';
// Alpha's copies of shared classes that keep their shared names (a package-private class the shared
// module reaches, or an installed component name) compile in place of the shared file, inside the
// shared module (android/app/product.gradle); they are Alpha's sources and the shared file is not
// compiled. test/shared-ui-overrides.test.mjs keeps each copy the pinned upstream source apart
// from Alpha's listed changes.
const OVERRIDES = JSON.parse(read('android/shared-ui-overrides.json')).overrides;
const ALPHA_SOURCES = ['android/app/src/main/java', 'android/app/src/launcher/java', 'android/sense/src/main/java',
  ...new Set(OVERRIDES.map(override => override.source))];

const walk = dir => !fs.existsSync(dir) ? [] : fs.statSync(dir).isFile() ? [dir] : fs.readdirSync(dir, {withFileTypes: true})
  .flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.(?:java|kt)$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
/**
 * Comments blanked, so documentation naming a shared class or a dialog does not count. String,
 * text-block and character literals are kept and skipped, so a literal such as a "*\/*" MIME type
 * or a URL never opens or closes a comment.
 */
function code(text) {
  let out = '';
  for (let at = 0; at < text.length;) {
    const rest = text.startsWith.bind(text);
    if (rest('//', at) || rest('/*', at)) {
      const end = rest('//', at) ? (text.indexOf('\n', at) < 0 ? text.length : text.indexOf('\n', at)) : (text.indexOf('*/', at + 2) < 0 ? text.length : text.indexOf('*/', at + 2) + 2);
      out += text.slice(at, end).replace(/[^\n]/g, ' ');
      at = end;
    } else if (rest('"""', at)) {
      const close = text.indexOf('"""', at + 3);
      const end = close < 0 ? text.length : close + 3;
      out += text.slice(at, end);
      at = end;
    } else if (text[at] === '"' || text[at] === "'") {
      let end = at + 1;
      while (end < text.length && text[end] !== text[at] && text[end] !== '\n') end += text[end] === '\\' ? 2 : 1;
      out += text.slice(at, end + 1);
      at = end + 1;
    } else out += text[at++];
  }
  return out;
}
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const host = JSON.parse(read('android/consumer-host.json')).profile;
const sharedModules = host.modules.filter(module => ['upstream', 'patchedNative'].includes(module.source.root));
// Every shared Java and Kotlin root the build compiles: each shared module's src/main/java and the
// extra roots its build.gradle adds (for example plugin-native-notifications' src/capacitor/java,
// which holds the NotificationsHostPlugin Alpha extends), the shared roots the app adds, the
// shared listener sources, and the shared speech sources android/local-speech and
// android/sense-speech compile through the speech consumer.gradle (which holds the
// LocalSpeechBridgePlugin Alpha extends).
const SPEECH_VENDOR = VENDOR + 'plugins/plugin-local-inference/native/android';
const extraRoots = dir => !fs.existsSync(dir + '/build.gradle') ? [] : [...code(read(dir + '/build.gradle'))
  .matchAll(/java\.srcDirs?\s*(?:\+=|=|\()\s*\[?\s*'([^']+)'/g)].map(match => dir + '/' + match[1]);
const SHARED_SOURCES = [...new Set([
  ...sharedModules.flatMap(module => [VENDOR + module.source.path + '/src/main/java', ...extraRoots(VENDOR + module.source.path)]),
  ...(host.sourceSets?.main?.java ?? []).filter(entry => ['upstream', 'patchedNative'].includes(entry.root)).map(entry => VENDOR + entry.path),
  SENSE_VENDOR,
  ...[...code(read(SPEECH_VENDOR + '/consumer.gradle')).matchAll(/new File\(paradeeSource, '([^']+\/java)'\)/g)].map(match => SPEECH_VENDOR + '/' + match[1]),
  // Shared helpers the resident runtime staging compiles beside it in their own packages.
  ...JSON.parse(read('android/consumer-host.json')).residentHost.helpers.map(helper => VENDOR + helper),
])];
/** One source class: its package, simple name and comment-free text. */
function classes(dirs) {
  const index = new Map();
  for (const file of dirs.flatMap(walk)) {
    const text = code(read(file));
    const pkg = /^\s*package\s+([\w.]+)/m.exec(text)?.[1];
    if (!pkg) continue;
    const simple = path.basename(file).replace(/\.(?:java|kt)$/, '');
    index.set(`${pkg}.${simple}`, {file, pkg, simple, text});
  }
  return index;
}
const shared = classes(SHARED_SOURCES);
const alpha = classes(ALPHA_SOURCES);
for (const override of OVERRIDES) {
  assert.ok(shared.has(override.class) && alpha.has(override.class), `${override.class} is shared and has Alpha's copy`);
  shared.delete(override.class);
}

const UI_BASE = /\bclass\s+(\w+)(?:<[^>{]*>)?\s+extends\s+(?:android\.app\.)?(?:Activity|AppCompatActivity|ComponentActivity|FragmentActivity|BridgeActivity|Dialog|DialogFragment|TileService|InCallService|AutofillService)\b|\bclass\s+(\w+)[^{\n]*:\s*(?:Activity|AppCompatActivity|ComponentActivity|Dialog|TileService)\(\)/;
const UI_CALL = /AlertDialog\.Builder|Notification(?:Compat)?\.Builder|Toast\.makeText|setContentView\(|\bRemoteViews\(|Intent\.createChooser\(|BiometricPrompt\.Builder|PopupWindow\(|new (?:TextView|Button|EditText|LinearLayout|ScrollView)\(/g;
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'try', 'catch', 'synchronized', 'else', 'do', 'return', 'new', 'finally', 'super', 'this']);
const DECLARATION = /^[ \t]*(?:(?:public|private|protected|static|final|synchronized|abstract|default|override|internal|suspend|@\w+(?:\([^)]*\))?)\s+)*(?:fun\s+(?:<[^>]+>\s*)?(\w+)\s*\(|(?:<[^>]+>\s+)?[\w<>\[\],.? ]+?\s+(\w+)\s*\([^;{]*\)\s*(?:throws [\w., ]+)?\s*\{|(\w+)\s*\([^;{]*\)\s*\{)/gm;

/** How a shared class presents UI: '<class>' for a UI component class, else the presenting members. */
/** A source's method and constructor declarations, in order (computed once: the pattern is slow). */
const declarationsOf = source => source.declarations ??= [...source.text.matchAll(DECLARATION)]
  .map(match => ({at: match.index, name: match[1] ?? match[2] ?? match[3]}))
  .filter(declaration => !KEYWORDS.has(declaration.name));
function presentation(source) {
  const {text} = source, found = new Set();
  if (UI_BASE.test(text)) found.add('<class>');
  const declarations = declarationsOf(source);
  for (const match of text.matchAll(UI_CALL)) {
    const owner = declarations.filter(declaration => declaration.at < match.index).pop();
    found.add(owner ? owner.name : '<class>');
  }
  return [...found].sort();
}
const sharedUi = new Map([...shared].map(([name, source]) => [name, presentation(source)]).filter(([, members]) => members.length));

/** The shared or Alpha classes a source names: by import, by its own package, or fully qualified. */
function referenced(source, index) {
  const out = new Set();
  const imports = [...source.text.matchAll(/^\s*import\s+([\w.]+?)(\.\*)?\s*;/gm)];
  const body = source.text.replace(/^\s*(?:package|import)\s+[^;\n]+;?/gm, '');
  const words = new Set(body.match(/\b\w+\b/g));
  for (const [name, target] of index) {
    if (name === `${source.pkg}.${source.simple}` || !words.has(target.simple)) continue;
    const word = new RegExp(`\\b${escape(target.simple)}\\b`);
    if (new RegExp(`\\b${escape(name)}\\b`).test(body)) out.add(name);
    else if (word.test(body) && (target.pkg === source.pkg || imports.some(([, imported, wildcard]) => wildcard ? imported === target.pkg : imported === name))) out.add(name);
  }
  return out;
}
/** A class's direct superclass, resolved against Alpha's and the shared sources, imports and java.lang. */
function superclass(source) {
  const match = new RegExp(`\\bclass\\s+${escape(source.simple)}(?:<[^>{]*>)?\\s+extends\\s+([\\w.]+)`).exec(source.text)
    ?? new RegExp(`\\bclass\\s+${escape(source.simple)}\\b[^{\\n]*?\\)?\\s*:\\s*([\\w.]+)\\s*\\(`).exec(source.text);
  if (!match) return null;
  const named = match[1];
  if (named.includes('.')) return named;
  const imported = new RegExp(`^\\s*import\\s+([\\w.]+\\.${escape(named)})\\s*;?\\s*$`, 'm').exec(source.text)?.[1];
  if (imported) return imported;
  const local = `${source.pkg}.${named}`;
  if (alpha.has(local) || shared.has(local)) return local;
  for (const [, wildcard] of source.text.matchAll(/^\s*import\s+([\w.]+)\.\*\s*;?\s*$/gm))
    if (alpha.has(`${wildcard}.${named}`) || shared.has(`${wildcard}.${named}`) || PLATFORM.test(`${wildcard}.`)) return `${wildcard}.${named}`;
  return JAVA_LANG.has(named) ? `java.lang.${named}` : named;
}
const PLATFORM = /^(?:android|androidx|java|javax|kotlin|com\.getcapacitor)\./;
const JAVA_LANG = new Set(['Object', 'Exception', 'RuntimeException', 'IllegalStateException', 'IllegalArgumentException', 'SecurityException', 'Thread', 'Error']);
/** Every superclass up to the first one neither Alpha nor the shared modules define. */
const ancestry = new Map();
function ancestors(name) {
  if (ancestry.has(name)) return ancestry.get(name);
  const chain = [];
  ancestry.set(name, chain);
  for (let current = alpha.get(name) ?? shared.get(name); current;) {
    const parent = superclass(current);
    if (!parent) break;
    chain.push(parent);
    current = alpha.get(parent) ?? shared.get(parent);
  }
  return chain;
}

/** A source's members: each declaration's name and its text up to the next declaration. */
function members(source) {
  if (source.members) return source.members;
  const declarations = declarationsOf(source);
  source.members = new Map();
  declarations.forEach((declaration, index) => {
    const body = source.text.slice(declaration.at, declarations[index + 1]?.at ?? source.text.length);
    source.members.set(declaration.name, (source.members.get(declaration.name) ?? '') + body);
  });
  return source.members;
}
/**
 * The shared presenting members Alpha runs through what it inherits: starting from every member of a
 * shared superclass that the Alpha class does not override, and from every super.m(...) it calls,
 * follow calls into the same class chain, into a shared class named as `Class.member(` and, for a
 * call on another receiver, into that member of any shared class the caller names (an
 * over-approximation, so a pin advance that routes an inherited path into UI cannot go unseen).
 */
function inheritedUi(name) {
  const sharedChain = ancestors(name).filter(ancestor => shared.has(ancestor));
  if (!sharedChain.length) return new Map();
  const own = new Set([name, ...ancestors(name)].filter(current => alpha.has(current)).flatMap(current => [...members(alpha.get(current)).keys()]));
  const roots = [];
  for (const ancestor of sharedChain) for (const member of members(shared.get(ancestor)).keys()) if (!own.has(member)) roots.push([ancestor, member]);
  for (const [, member] of alpha.get(name).text.matchAll(/\bsuper\s*\.\s*(\w+)\s*\(/g))
    for (const ancestor of sharedChain) if (members(shared.get(ancestor)).has(member)) { roots.push([ancestor, member]); break; }
  const seen = new Set(), found = new Map();
  for (const queue = roots.map(([owner, member]) => [owner, member, `${owner.split('.').pop()}.${member}`]); queue.length;) {
    const [owner, member, via] = queue.shift(), key = `${owner}#${member}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (sharedUi.get(owner)?.includes(member)) { found.set(`${owner}.${member}`, via); continue; }
    const source = shared.get(owner), body = members(source).get(member) ?? '';
    source.named ??= new Map([...referenced(source, shared)].map(target => [shared.get(target).simple, target]));
    const named = source.named;
    const chain = [owner, ...ancestors(owner)].filter(ancestor => shared.has(ancestor));
    for (const [, receiver, called] of body.matchAll(/(?:\b(\w+)\s*\.\s*|(?<![\w.]))(\w+)\s*\(/g)) {
      if (KEYWORDS.has(called)) continue;
      const targets = receiver && named.has(receiver) ? [named.get(receiver)]
        : !receiver || receiver === 'this' || receiver === 'super' ? chain : [...named.values(), ...chain];
      for (const target of targets) if (members(shared.get(target)).has(called)) queue.push([target, called, `${via} > ${shared.get(target).simple}.${called}`]);
    }
  }
  return found;
}

// Shared classes Alpha reaches that present UI somewhere. Each keeps exactly the presenting members
// the scan finds (so a pin advance that adds one fails here), and Alpha must not extend or create
// the class nor call one of those members on it.
const REVIEWED_SHARED_UI = new Map([
  ['ai.eliza.plugins.calendar.CalendarPlugin', {ui: ['executeAgent', 'executeNext', 'remove'], reason: 'NativeDeletionCoordinator calls only the static deleteReviewedExact, which re-reads revisions and deletes without UI; the deletion and agent reviews are Alpha\'s (CalendarProviderPlugin)'}],
  ['ai.eliza.plugins.media.DocumentFolderTree', {ui: ['shareMany'], reason: 'AlphaFilesPlugin calls only forget() (dropping the retired folder grant) and the static result(); Files sharing is Alpha\'s (AlphaFilesPlugin.storageShare, with an untitled system chooser)'}],
  ['ai.eliza.plugins.media.SelectedDocuments', {ui: ['shareUri'], reason: 'the selected-document registry and grants; sharing is Alpha\'s (AlphaShareSheet)'}],
  ['ai.eliza.plugins.messages.MmsStore', {ui: ['notifyIncoming'], reason: 'the MMS store, read marks and notice cancellation; incoming notices are Alpha\'s (AlphaMessageNotices) with the same tag, id and receipt extra'}],
  ['ai.eliza.plugins.messages.TelephonyPlugin', {reached: true, ui: ['reviewMmsOnMain', 'reviewSmsOnMain'], reason: 'reached only through the shared MmsStore, which reads its constants; Alpha registers AlphaTelephonyPlugin over AlphaTelephonyBase and never this plugin'}],
  ['ai.eliza.plugins.passwords.PasswordEditor', {reached: true, ui: ['PasswordEditor', 'askSameLogin', 'dispatchTouchEvent', 'field'], reason: 'reached only through the shared vault custody (PasswordVaultAccess), which would close a shared editor on lock; Alpha opens only its own PasswordEditor and never the shared one'}],
  ['ai.eliza.plugins.passwords.PasswordFillActivity', {ui: ['<class>'], reason: 'named by Alpha\'s ElizaPasswordAutofillService only as the component its one-shot fill token opens; the merged manifest removes the shared screen and declares this name as an alias of Alpha\'s PasswordFillActivity'}],
  ['ai.eliza.plugins.passwords.PasswordSaveActivity', {ui: ['<class>', 'write'], reason: 'named by Alpha\'s ElizaPasswordAutofillService only as the component its one-shot save token opens; the merged manifest removes the shared screen and declares this name as an alias of Alpha\'s PasswordSaveActivity'}],
  ['ai.eliza.plugins.passwords.PasswordUnlock', {reached: true, ui: ['prompt'], reason: 'reached only through the shared PasswordFillActivity above, which is never declared; Alpha\'s screens unlock through its own PasswordUnlock'}],
  ['ai.eliza.plugins.passwords.PasswordSheet', {reached: true, ui: ['PasswordSheet', 'button', 'text'], reason: 'reached only through the shared PasswordEditor above; Alpha\'s screens use its own PasswordSheet'}],
  ['ai.eliza.plugins.passwords.SecretSurfaces', {reached: true, ui: ['reveal'], reason: 'reached only through the shared vault custody, which would close a shared reveal on lock; Alpha reveals passwords and provider keys through its own SecretSurfaces'}],
  ['ai.eliza.plugins.notifications.HostNoticePoster', {ui: ['approval', 'redacted', 'step'], reason: 'AlphaNotificationsPlugin passes the shared NotificationsHostPlugin its CONFIG identities only; workflow notices are posted by Alpha\'s WorkflowNoticePoster through its own delivery()'}],
  ['ai.eliza.plugins.system.SystemLauncherApps', {ui: ['chooseLaunchIntent'], reason: 'AlphaSystemPlugin reads its installed-app validation and refusal codes; its only chooser is the untitled system one the inherited openDefaultApp opens (REVIEWED_INHERITED)'}],
]);
// Shared classes registered as Capacitor plugins: no UI of their own.
const SHARED_PLUGINS = new Map([
  ['ai.eliza.plugins.camera.CameraPlugin', 'a native camera preview with no text of its own (system permission prompts and shutter feedback only); the renderer draws the Camera screen'],
  ['ai.eliza.plugins.location.LocationPlugin', 'location fixes and system permission prompts; no screen'],
  ['ai.eliza.plugins.system.SensePlugin', 'the listener client bridge: status, pause and turn off through the listener\'s control provider; the listener\'s own UI is Alpha\'s (android/sense)'],
]);
// Shared component names a manifest declares. None presents UI; an alias must open Alpha's screen.
const SHARED_COMPONENTS = new Map([
  ['ai.eliza.plugins.passwords.ElizaPasswordAutofillService', 'the installed Autofill provider name (Android keeps the selected provider by it and a service has no alias); the class is Alpha\'s copy (android/shared-ui-overrides.json), and its fill and save tokens open Alpha\'s screens through the two aliases below'],
  ['ai.eliza.plugins.passwords.PasswordFillActivity', 'alias of Alpha\'s PasswordFillActivity: the name the shared Autofill service\'s one-shot fill token opens'],
  ['ai.eliza.plugins.passwords.PasswordSaveActivity', 'alias of Alpha\'s PasswordSaveActivity: the name the shared Autofill service\'s one-shot save token opens'],
  ['ai.eliza.plugins.messages.MmsFileProvider', 'the MMS PDU file provider; no UI'],
  ['ai.eliza.plugins.filesystem.browser.ReadOnlyStorageFileProvider', 'the Files read-only storage provider; no UI'],
]);
// Alpha-named components whose class is staged from upstream at build time rather than committed.
const STAGED_COMPONENTS = new Map([
  [`${APP_ID}.ElizaAgentService`, 'the resident runtime service, staged with counted rewrites: its notification text, channel names and icons are Alpha\'s resources (alpha-system-entry.xml) and it offers no Stop or Restart action'],
]);
test('the comment stripper keeps string, text-block and character literals', () => {
  const sample = 'String type = "*/*"; // a // comment\nnew AlertDialog.Builder(c); /* a "quoted" */ char q = \'"\';\nString b = """\n  /* kept */\n""";\nString url = "https://example.test/a";';
  const stripped = code(sample);
  assert.equal(stripped.length, sample.length, 'offsets are kept');
  assert.match(stripped, /"\*\/\*"; +\nnew AlertDialog\.Builder\(c\);/, 'a "*/*" literal opens no comment');
  assert.match(stripped, /char q = '"';/);
  assert.match(stripped, /\/\* kept \*\//, 'text blocks are kept');
  assert.match(stripped, /"https:\/\/example\.test\/a"/, 'a URL is not a comment');
  assert.doesNotMatch(stripped, /comment|quoted/);
  assert.deepEqual(presentation({text: code('class T {\n  void share() {\n    String t = "*/*";\n    Intent.createChooser(send, "Share");\n  }\n}')}), ['share']);
});

test('the scan recognises the shared native UI Alpha forked', () => {
  assert.ok(shared.size > 200 && alpha.size > 150, 'shared and Alpha sources were read');
  for (const [name, member] of [
    ['ai.eliza.auth.cloud.CloudSignInPlugin', null], ['ai.eliza.plugins.passwords.PasswordFillActivity', '<class>'],
    ['ai.eliza.plugins.system.AssistantEntryTile', '<class>'], ['ai.eliza.plugins.system.reset.DataResetRecoveryActivity', '<class>'],
    ['ai.eliza.plugins.browsersurface.BrowserTabHostPlugin', null], ['ai.eliza.plugins.media.IsolatedPdfViewerActivity', '<class>'],
    ['ai.eliza.plugins.media.PermittedMediaReview', null], ['ai.eliza.plugins.phone.TelecomCallActivity', '<class>'],
    ['ai.eliza.plugins.messages.SmsComposeActivity', '<class>'], ['ai.eliza.plugins.notifications.MailNoticePoster', 'post'],
    ['ai.eliza.sense.ConsentActivity', '<class>'], ['ai.eliza.sense.ListenerTileService', '<class>'], ['ai.eliza.sense.ListenerNotifications', null],
  ]) {
    assert.ok(sharedUi.has(name), `${name} is recognised as shared UI`);
    if (member) assert.ok(sharedUi.get(name).includes(member), `${name}: ${member}`);
  }
});

test('the scan reads every shared root the build compiles, and every Alpha superclass resolves', () => {
  assert.deepEqual(SHARED_SOURCES.filter(dir => !fs.existsSync(dir)), [], 'every shared root exists at the pin');
  for (const name of ['ai.eliza.plugins.notifications.NotificationsHostPlugin', 'ai.eliza.voice.LocalSpeechBridgePlugin', 'ai.eliza.plugins.agent.runtime.NativeProviderAdmission'])
    assert.ok(shared.has(name), `${name} is scanned`);
  // A superclass chain stops only at a platform or Capacitor class, or at a scanned shared class
  // with no superclass of its own, so nothing Alpha inherits goes unread.
  const unresolved = [];
  for (const name of alpha.keys()) {
    const chain = ancestors(name), last = chain.at(-1);
    if (last && !PLATFORM.test(last) && !shared.has(last) && !alpha.has(last)) unresolved.push(`${name} extends ${chain.join(' < ')}`);
  }
  assert.deepEqual(unresolved, []);
});

test('every registered Capacitor plugin is Alpha\'s, or a shared plugin with no UI', () => {
  const main = alpha.get(`${APP_ID}.MainActivity`);
  const registered = [...main.text.matchAll(/registerPlugin\(\s*([\w.]+)\.class\s*\)/g)].map(match => match[1])
    .map(name => alpha.has(`${APP_ID}.${name.split('.')[0]}`) ? `${APP_ID}.${name.split('.')[0]}` : name.includes('.') ? name : `${APP_ID}.${name}`);
  assert.ok(registered.length > 30, 'MainActivity registers its plugins');
  const offences = [];
  for (const name of registered) {
    if (alpha.has(name)) {
      for (const ancestor of ancestors(name)) if (sharedUi.has(ancestor)) offences.push(`${name} extends shared UI ${ancestor}`);
    } else if (!SHARED_PLUGINS.has(name)) offences.push(`${name} is a shared plugin without a reviewed reason`);
    else if (sharedUi.has(name)) offences.push(`${name} presents UI: ${sharedUi.get(name).join(', ')}`);
  }
  assert.deepEqual(offences, []);
  assert.deepEqual([...SHARED_PLUGINS.keys()].filter(name => !registered.includes(name)), [], 'a shared plugin no longer registered leaves the list');
});

/** The application components one manifest declares, with tools:node="remove" entries apart. */
function components(file, placeholders = {}) {
  const text = read(file).replace(/<!--[\s\S]*?-->/g, '').replace(/\$\{(\w+)\}/g, (all, name) => placeholders[name] ?? all);
  const application = /<application\b[\s\S]*?<\/application>/.exec(text)?.[0] ?? '';
  return [...application.matchAll(/<(activity-alias|activity|service|receiver|provider)\b([^>]*?)\/?>/g)].map(([, tag, attributes]) => {
    const attribute = key => new RegExp(`\\b${key}="([^"]+)"`).exec(attributes)?.[1];
    return {tag, name: attribute('android:name'), target: attribute('android:targetActivity'), removed: attribute('tools:node') === 'remove', file};
  });
}
const qualified = (name, pkg) => name.startsWith('.') ? pkg + name : name.includes('.') ? name : `${pkg}.${name}`;

test('every merged app manifest component resolves to Alpha\'s class, never to shared UI', () => {
  const declared = [
    ...components('android/app/src/main/AndroidManifest.xml'), ...components('android/app/src/launcher/AndroidManifest.xml'),
    ...sharedModules.filter(module => module.appDependency !== false)
      .map(module => VENDOR + module.source.path + '/src/main/AndroidManifest.xml').filter(file => fs.existsSync(file)).flatMap(file => components(file)),
  ].map(component => ({...component, name: qualified(component.name, APP_ID), target: component.target && qualified(component.target, APP_ID)}));
  const removed = new Set(declared.filter(component => component.removed).map(component => `${component.tag} ${component.name}`));
  const merged = declared.filter(component => !component.removed && !removed.has(`${component.tag} ${component.name}`));
  assert.ok(merged.length > 30, 'the merged components were listed');
  const offences = [];
  for (const component of merged) {
    const name = component.tag === 'activity-alias' ? component.target : component.name;
    if (component.tag === 'activity-alias' && !alpha.has(name)) offences.push(`${component.name} aliases ${name}, not an Alpha screen`);
    if (!name.startsWith(APP_ID + '.') && !SHARED_COMPONENTS.has(component.name)) offences.push(`${component.name} is a shared component without a reviewed reason`);
    const reviewed = SHARED_COMPONENTS.get(component.name)?.ui;
    if (sharedUi.has(name) && (component.tag === 'activity-alias' || JSON.stringify(reviewed) !== JSON.stringify(sharedUi.get(name))))
      offences.push(`${component.name} is shared UI: ${sharedUi.get(name).join(', ')}`);
    if (name.startsWith(APP_ID + '.') && !alpha.has(name) && !STAGED_COMPONENTS.has(name)) offences.push(`${name} has no Alpha source`);
    for (const ancestor of alpha.has(name) ? ancestors(name) : [])
      if (sharedUi.has(ancestor)) offences.push(`${name} extends shared UI ${ancestor}: ${sharedUi.get(ancestor).join(', ')}`);
  }
  assert.deepEqual(offences, []);
  const names = new Set(merged.map(component => component.name));
  assert.deepEqual([...SHARED_COMPONENTS.keys(), ...STAGED_COMPONENTS.keys()].filter(name => !names.has(name)), [],
    'a reviewed component that is no longer declared leaves its list');
  // Every shared screen a library manifest declares is removed; the shared names kept are aliases.
  for (const component of declared.filter(component => component.file.startsWith(VENDOR) && component.tag === 'activity'))
    assert.ok(removed.has(`activity ${component.name}`), `${component.name} is removed from the merged manifest`);
});

test('the listener APK declares only Alpha\'s components and compiles only the shared listener policies', () => {
  const identity = JSON.parse(read('android/aosp/pixel10a-composition.json')).sense;
  const listed = components('android/sense/src/main/AndroidManifest.xml', {senseComponentPackage: identity.componentPackage});
  const application = /<application\b[^>]*android:name="\$\{senseComponentPackage\}\.(\w+)"/.exec(read('android/sense/src/main/AndroidManifest.xml'))?.[1];
  const names = [...listed.map(component => component.name), `${identity.componentPackage}.${application}`];
  assert.ok(names.length >= 7, 'the listener components were listed');
  for (const name of names) assert.ok(alpha.has(name), `${name} is Alpha's listener source`);
  // android/sense/build.gradle uses Alpha's manifest and resources and leaves every shared listener
  // class but the pure policies out of the compile.
  const gradle = code(read('android/sense/build.gradle'));
  assert.match(gradle, /manifest\.srcFile file\('src\/main\/AndroidManifest\.xml'\)/);
  assert.match(gradle, /res\.srcDirs = \[file\('src\/main\/res'\)\]/);
  const excluded = new Set([.../java\.filter\.exclude\(\[([\s\S]*?)\]/.exec(gradle)?.[1].matchAll(/'(\w+)'/g) ?? []].map(match => match[1]));
  const POLICIES = ['CrashLoopBreaker', 'IndicatorLease', 'ListenerPolicy', 'SpeechGate', 'WakePhrase'];
  const sense = [...shared.values()].filter(source => source.file.startsWith(SENSE_VENDOR)).map(source => source.simple);
  assert.deepEqual(sense.filter(name => !POLICIES.includes(name) && !excluded.has(name)), [], 'every shared listener class but the policies is left out');
  assert.deepEqual(POLICIES.filter(name => sharedUi.has(`ai.eliza.sense.${name}`)), [], 'the shared policies present no UI');
  assert.deepEqual([...excluded].filter(name => !sense.includes(name)), [], 'an exclusion names a shared listener class');
});

/** Shared classes Alpha names directly, and every shared class those reach in turn. */
const direct = new Map();
for (const source of alpha.values()) for (const name of referenced(source, shared)) direct.set(name, [...direct.get(name) ?? [], source.file]);
const reached = new Map([...direct.keys()].map(name => [name, null]));
for (const queue = [...direct.keys()]; queue.length;) {
  const name = queue.shift();
  for (const next of referenced(shared.get(name), shared)) if (!reached.has(next)) { reached.set(next, name); queue.push(next); }
}

test('Alpha\'s native code reaches no shared UI beyond the reviewed non-UI uses', () => {
  assert.ok(direct.size > 50 && reached.size > direct.size, 'Alpha\'s shared references were traced');
  const offences = [];
  for (const [name, via] of reached) {
    if (!sharedUi.has(name)) continue;
    const review = REVIEWED_SHARED_UI.get(name);
    if (!review) { offences.push(`${name} (${sharedUi.get(name).join(', ')}) is reached ${via ? 'through ' + via : 'directly by ' + direct.get(name).join(', ')}`); continue; }
    assert.deepEqual(sharedUi.get(name), review.ui, `${name}: the reviewed presenting members are exactly the ones the scan finds`);
    assert.equal(Boolean(review.reached), !direct.has(name), `${name}: ${review.reached ? 'reached only through shared code' : 'named by Alpha'}`);
    const simple = shared.get(name).simple;
    for (const file of direct.get(name) ?? []) {
      const text = code(read(file));
      if (new RegExp(`\\bextends\\s+(?:[\\w.]+\\.)?${escape(simple)}\\b`).test(text)) offences.push(`${file} extends ${name}`);
      // A file that creates an instance must not call a presenting member on anything; any other
      // file must not call one on the class.
      const creates = new RegExp(`\\bnew\\s+(?:[\\w.]+\\.)?${escape(simple)}\\s*\\(`).test(text);
      if (creates && review.ui.includes('<class>')) offences.push(`${file} creates ${name}`);
      for (const member of review.ui.filter(member => member !== '<class>' && member !== simple))
        if (new RegExp(`${creates ? '\\.' : `\\b${escape(simple)}\\s*\\.`}\\s*${escape(member)}\\s*\\(|::\\s*${escape(member)}\\b`).test(text)) offences.push(`${file} calls ${name}.${member}`);
    }
  }
  assert.deepEqual(offences, []);
  assert.deepEqual([...REVIEWED_SHARED_UI.keys()].filter(name => !(reached.has(name) && sharedUi.has(name))), [], 'a reviewed shared class Alpha no longer reaches leaves the list');
  for (const [name, review] of [...REVIEWED_SHARED_UI, ...SHARED_PLUGINS, ...SHARED_COMPONENTS, ...STAGED_COMPONENTS])
    assert.ok((typeof review === 'string' ? review : review.reason).length > 30, `${name} has a reviewed reason`);
});

test('APK verification refuses a shared component name outside the reviewed identifiers', async () => {
  const {distributionProblems, SHARED_COMPONENTS: APK_SHARED} = await import('../scripts/apk.ts');
  assert.deepEqual(Object.keys(APK_SHARED).sort(), [...SHARED_COMPONENTS.keys()].sort(), 'the APK check and the source check admit the same shared names');
  const assess = extra => distributionProblems({xml: `E: manifest
  A: package="${APP_ID}"
  E: application
    A: android:allowBackup=(type 0x12)0x0
    A: android:usesCleartextTraffic=(type 0x12)0x0
    A: android:networkSecurityConfig=@0x7f010001
${extra}`, badging: `package: name='${APP_ID}' versionCode='15' versionName='15'`, names: ['assets/public/licenses/third-party-notices.json']}, {mode: 'release'}).problems;
  const element = (tag, name, more = '') => `    E: ${tag}\n      A: android:name="${name}"\n${more}`;
  const alias = (name, target) => element('activity-alias', name, `      A: android:targetActivity="${target}"\n`);
  assert.deepEqual(assess(element('activity', '.PasswordFillActivity') + alias('ai.eliza.plugins.passwords.PasswordFillActivity', `${APP_ID}.PasswordFillActivity`)), []);
  assert.match(assess(element('activity', 'ai.eliza.plugins.passwords.PasswordFillActivity')).join(), /Shared activity ai\.eliza\.plugins\.passwords\.PasswordFillActivity is declared/);
  assert.match(assess(alias('ai.eliza.plugins.passwords.PasswordSaveActivity', 'ai.eliza.plugins.passwords.SharedSave')).join(), /must open Alpha's screen/);
  assert.match(assess(element('activity', 'ai.eliza.plugins.messages.SmsComposeActivity')).join(), /Shared activity ai\.eliza\.plugins\.messages\.SmsComposeActivity/);
  assert.match(assess(element('service', 'ai.eliza.plugins.system.AssistantEntryTile')).join(), /Shared service/);
});

// Shared presenting members Alpha runs through what it inherits (inheritedUi), each with the Alpha
// code that keeps it from showing shared UI pinned, so a change on either side fails here.
const REVIEWED_INHERITED = new Map([
  ['ai.alphacompute.alphaphone.AlphaMmsResultReceiver ai.eliza.plugins.messages.MmsStore.notifyIncoming', {
    pinned: /if \(intent == null \|\| !config\.mmsDownloadedAction\.equals\(intent\.getAction\(\)\)\) \{ super\.onReceive\(context, intent\); return; \}/,
    reason: 'the shared onReceive posts the shared notice only for a finished download, and Alpha\'s onReceive takes every download first and posts through AlphaMessageNotices; the shared receiver keeps only the response results and "Mark as read"'}],
  ['ai.alphacompute.alphaphone.AlphaNotificationsPlugin ai.eliza.plugins.notifications.HostNoticePoster.step', {
    pinned: /@Override protected NoticeDelivery delivery\(\)\{NoticeRoutes routes=routes\(\);return new NoticeDelivery\(deliveryConfig\(\),noticeStorage\(\),new WorkflowNoticePoster\(/,
    reason: 'an over-approximation through the shared worker\'s Handler post(Runnable); the shared poster is built only by poster(), which only the shared delivery() calls, and Alpha\'s delivery() posts through its own WorkflowNoticePoster'}],
  ['ai.alphacompute.alphaphone.AlphaSystemPlugin ai.eliza.plugins.system.SystemLauncherApps.chooseLaunchIntent', {
    pinned: /class AlphaSystemPlugin extends ai\.eliza\.plugins\.system\.SystemPlugin/,
    reason: 'the inherited openDefaultApp (final in Kotlin) opens the dial handler and, only when several apps can dial, an untitled system chooser (Intent.createChooser with a null title): the chooser and its wording are Android\'s, and the refusals are the shared plugin\'s non-UI results'}],
]);

test('Alpha inherits no shared UI path beyond the reviewed ones', () => {
  const found = new Map();
  for (const name of alpha.keys()) for (const [member, via] of inheritedUi(name)) found.set(`${name} ${member}`, via);
  assert.deepEqual([...found.keys()].filter(key => !REVIEWED_INHERITED.has(key)).map(key => `${key} via ${found.get(key)}`), [], 'an inherited shared UI path is reviewed');
  assert.deepEqual([...REVIEWED_INHERITED.keys()].filter(key => !found.has(key)), [], 'a reviewed inherited path Alpha no longer runs leaves the list');
  for (const [key, {pinned, reason}] of REVIEWED_INHERITED) {
    assert.match(alpha.get(key.split(' ')[0]).text, pinned, `${key}: the Alpha code the review relies on is unchanged`);
    assert.ok(reason.length > 30, `${key} has a reviewed reason`);
  }
  // The walk follows inherited plugin methods into another shared class.
  assert.match(found.get('ai.alphacompute.alphaphone.AlphaSystemPlugin ai.eliza.plugins.system.SystemLauncherApps.chooseLaunchIntent'), /SystemPlugin\.openDefaultApp > SystemLauncherApps\.defaultLaunchIntent/);
});


// Shared entry points whose safety depends on Alpha's own UI around them. The split-package bridges
// (AlphaTelephonyAccess, AlphaPasswordAdmission) make package-private shared members public, and the
// shared vault custody's lock and destroy close only the shared surfaces Alpha no longer opens, so
// each is called only from the Alpha file that owns the surrounding review or close.
const GUARDED_CALLS = [
  {call: /\bAlphaTelephonyAccess\s*\.\s*(?:dispatch|dispatchMms|decide|decideMms)\s*\(/, owners: ['AlphaTelephonyBase.java', 'AlphaSmsComposeActivity.java'],
    why: 'a journaled send or decision runs only behind Alpha\'s owner-confirmed native review'},
  {call: /(?<!\bPasswordVaultGate\s*)\.\s*(?:lockAndClose|destroyVault)\s*\(/, owners: ['PasswordVaultGate.java'],
    why: 'PasswordVaultGate.lockAndClose and destroyVault also close Alpha\'s editor and revealed secret'},
  {call: /\bPasswordVaultAccess\s*\.\s*setAdmission\s*\(/, owners: ['PasswordVaultGate.java'], why: 'PasswordVaultGate.setAdmission is the one writer of the vault admission rule'},
  {call: /\bAlphaPasswordAdmission\s*\.\s*admitted\s*\(/, owners: ['PasswordVaultGate.java'], why: 'Alpha\'s screens ask PasswordVaultGate.admitted'},
];
// Alpha sources that sit in a shared package to reach its package-private members.
const SPLIT_PACKAGE_SOURCES = new Map([
  ['ai.eliza.plugins.messages.AlphaTelephonyAccess', 'the reviewed SMS/MMS journal, dispatch, MMS file and read-marker glue'],
  ['ai.eliza.plugins.passwords.AlphaPasswordAdmission', 'the shared vault admission rule, read so Autofill and Alpha\'s screens share one rule'],
  ...OVERRIDES.map(override => [override.class, `Alpha's copy under the shared name: ${override.reason}`]),
]);

test('shared entry points behind Alpha\'s reviews and closes are called only by their owners', () => {
  const offences = [];
  for (const source of alpha.values()) {
    const file = path.basename(source.file);
    for (const {call, owners, why} of GUARDED_CALLS)
      if (call.test(source.text) && !owners.includes(file)) offences.push(`${source.file} calls ${call.source}: ${why}`);
  }
  assert.deepEqual(offences, []);
  for (const {call, owners} of GUARDED_CALLS)
    assert.ok([...alpha.values()].some(source => owners.includes(path.basename(source.file)) && call.test(source.text)), `${call.source} is still called by its owner`);
  for (const [sample, guarded] of [['AlphaTelephonyAccess.dispatch(ctx', true], ['AlphaTelephonyAccess . decideMms (j', true], ['PasswordVaultAccess.get(this).destroyVault()', true],
    ['access.lockAndClose();', true], ['PasswordVaultGate.lockAndClose(access);', false], ['PasswordVaultAccess.setAdmission(rule)', true], ['AlphaTelephonyAccess.manager(ctx, 1)', false]])
    assert.equal(GUARDED_CALLS.some(({call}) => call.test(sample)), guarded, sample);
  const vaultGate = alpha.get(`${APP_ID}.PasswordVaultGate`).text;
  assert.match(vaultGate, /static void lockAndClose\(PasswordVaultAccess access\) \{\s*try \{ access\.lockAndClose\(\); \} finally \{ closeSurfaces\(\); \}/);
  assert.match(vaultGate, /static void destroyVault\(PasswordVaultAccess access\) throws Exception \{\s*try \{ access\.destroyVault\(\); \} finally \{ closeSurfaces\(\); \}/);
  assert.match(vaultGate, /static boolean admitted\(Context context\) \{ return AlphaPasswordAdmission\.admitted\(context\); \}/, 'Alpha asks the shared rule, so there is one');
  const split = [...alpha.values()].filter(source => source.pkg.startsWith('ai.eliza.')).map(source => `${source.pkg}.${source.simple}`).sort();
  assert.deepEqual(split, [...SPLIT_PACKAGE_SOURCES.keys()].sort(), 'an Alpha source in a shared package is reviewed');
});
