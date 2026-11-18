import {checkCloudDeployment} from './scripts/cloud-deployment.ts';
import {CLOUD_DEPLOYMENT_IS_CANDIDATE} from './scripts/cloud-deployment-policy.ts';
import {browserCloudDevBridge} from './scripts/browser-cloud-dev-bridge.ts';
import {localOcrAssets} from './scripts/local-ocr-assets.ts';
import { browserPdfAssets } from './scripts/browser-pdf-assets.ts';
import { browserFullReload } from './scripts/browser-full-reload.ts';
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { localAgentDevBridge } from './scripts/local-agent-dev-bridge.ts';

// One switch, upstream name (vendor/eliza/packages/app/scripts/dev-ui.ts): "1" opts
// test-only mocks, fixtures and developer surfaces into a build. Anything else is off.
// Only this single key is exposed; envPrefix stays VITE_ so ELIZA_* secrets never reach the bundle.
checkCloudDeployment(fileURLToPath(new URL('.', import.meta.url)));
const flagOn = process.env.ELIZA_DEV_ALLOW_TEST_MOCKS === '1';
const appConfig = JSON.parse(readFileSync(fileURLToPath(new URL('./app.config.json', import.meta.url)), 'utf8')) as { version?: unknown };
const appVersion = process.env.ELIZAOS_VERSION_NAME?.trim() || (typeof appConfig.version === 'string' ? appConfig.version : '0.0.0');
const prototypeDirectory = fileURLToPath(new URL('./apps/app/src/prototype/', import.meta.url));
const fixturesModule = path.join(prototypeDirectory, 'fixtures.js');
const emptyFixturesModule = path.join(prototypeDirectory, 'fixtures.empty.js');

// Developer and mock modules that main.tsx, the connection UI and the password manager import behind the flag.
// Flag-off builds resolve them to inert stubs with the same export names, so neither the
// modules nor an orphan chunk ship. Their call sites are constant-folded away and never run.
const disabledModuleSource: Record<string, string> = {
  './browser/device-controls': 'export const BrowserDeviceControls = null;',
  './browser/simulated-apps': 'export const captureSimulatedApps = () => undefined; export const installSimulatedApps = () => {};',
  // Only imported dynamically, after a constant-false guard, so an empty module suffices.
  './runtime/mock-admission': 'export {};',
  './mock-admission': 'export {};',
  // Development password vault, statically imported by passwords/password-manager.ts.
  './dev-vault': 'export const createDevelopmentVault = () => { throw new Error("unavailable"); };',
};
const disabledModulePrefix = '\0alpha-disabled-';
const srcDirectory = fileURLToPath(new URL('./apps/app/src/', import.meta.url));

/** Production CSP. Dev serve stays relaxed for HMR and the local agent bridge. */
export function productionContentSecurityPolicy(testMocks: boolean): string {
  // data: and blob: only resolve bytes already in the renderer (saved photos, captures).
  const connect = ["'self'", 'data:', 'blob:', 'https:', ...(testMocks ? ['http://10.0.2.2:*', 'http://127.0.0.1:*', 'http://localhost:*'] : [])];
  return [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    `connect-src ${connect.join(' ')}`,
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "frame-src 'self' blob: data: https:",
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join('; ');
}

/** Build-only CSP meta, build-flag record and fixture swap for flag-off builds. */
function productionSurface(): Plugin[] {
  return [
    {
      name: 'alpha-test-mock-fixtures',
      enforce: 'pre',
      async resolveId(source, importer, options) {
        if (flagOn || !/(^|\/)fixtures(\.js)?$/.test(source)) return null;
        const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
        if (!resolved || resolved.external) return null;
        const id = resolved.id.split('?')[0];
        // Tolerates a tree where the fixture module has not been extracted yet.
        if (path.resolve(id) !== fixturesModule || !existsSync(emptyFixturesModule)) return null;
        return emptyFixturesModule;
      },
    },
    {
      name: 'alpha-test-mock-modules',
      enforce: 'pre',
      resolveId(source, importer) {
        if (flagOn || !importer || !Object.hasOwn(disabledModuleSource, source)) return null;
        const owner = path.relative(srcDirectory, importer.split('?')[0]).split(path.sep).join('/');
        if (owner !== 'main.tsx' && owner !== 'runtime/connection-ui.tsx' && owner !== 'passwords/password-manager.ts') return null;
        // The virtual id carries an index, not the source name, so no chunk is named after it.
        return disabledModulePrefix + Object.keys(disabledModuleSource).indexOf(source);
      },
      load(id) { return id.startsWith(disabledModulePrefix) ? Object.values(disabledModuleSource)[Number(id.slice(disabledModulePrefix.length))] ?? null : null; },
    },
    {
      name: 'alpha-production-csp',
      apply: 'build',
      transformIndexHtml: {
        order: 'pre',
        handler: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: productionContentSecurityPolicy(flagOn) }, injectTo: 'head-prepend' }],
      },
    },
    {
      name: 'alpha-build-flags',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'build-flags.json', source: JSON.stringify({ testMocks: flagOn, ...(CLOUD_DEPLOYMENT_IS_CANDIDATE ? { candidateCloud: true } : {}) }) + '\n' });
      },
    },
  ];
}

export default defineConfig({
  root: "apps/app",
  // Worktrees may share node_modules; one preview must not replace another preview's optimized modules.
  cacheDir: fileURLToPath(new URL(`./test-results/vite-cache/${flagOn ? "mocks" : "production"}/`, import.meta.url)),
  plugins: [productionSurface(), localOcrAssets(), browserPdfAssets(), browserFullReload(), react(), localAgentDevBridge(), browserCloudDevBridge()],
  define: {
    'import.meta.env.VITE_ELIZA_DEV_ALLOW_TEST_MOCKS': JSON.stringify(flagOn ? '1' : ''),
    // The local agent's product connection sheet: only bun run dev (scripts/dev-local.ts) passes '0'.
    // Unset (dev:ui and its browser lanes) or '1' keeps the development sheet.
    'import.meta.env.VITE_ALPHA_PRIVATE_LOCAL_PREVIEW': JSON.stringify(flagOn && process.env.VITE_LOCAL_AGENT === '1' && process.env.ALPHA_DEV_CONNECTION_TOOLS === '0' ? '1' : ''),
    __APP_VERSION__: JSON.stringify(appVersion),
    'import.meta.env.VITE_ALPHA_DEV_CARTESIA':JSON.stringify(flagOn&&process.env.ALPHA_DEV_CARTESIA==='1'?'1':''),
  },
  // Module workers (the MapLibre worker). The web build has no speech worker or in-browser
  // inference runtime: local speech runs on the local agent's native libelizainference.
  worker: { format: 'es' },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      "@elizaos/capacitor-system/sense": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-native-system/src/sense-bridge.ts", import.meta.url)),
      "@elizaos/capacitor-system/reset": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-native-system/src/reset.ts", import.meta.url)),
      "@elizaos/capacitor-system/settings": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-native-system/src/settings.ts", import.meta.url)),
      "@elizaos/contracts/browser-request-grounding": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/browser-request-grounding.ts", import.meta.url)),
      "@elizaos/contracts/phone-dial": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/phone-dial.ts", import.meta.url)),
      "@elizaos/contracts/telephony-actions": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/telephony-actions.ts", import.meta.url)),
      "@elizaos/contracts/device-action-execution": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/device-action-execution.ts", import.meta.url)),
      "@elizaos/contracts/client-turn-observation": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/client-turn-observation.ts", import.meta.url)),
      "@elizaos/capacitor-system/launcher": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-native-system/src/client/launcher.ts",import.meta.url)),
      "@elizaos/host/voice/ui-context": fileURLToPath(new URL("./.eliza/client-features/packages/host/src/voice/ui-context.ts",import.meta.url)),
      // Upstream plugin-notes types its fetch with the UI transport; Alpha owns that UI module.
      "@elizaos/ui/api/transport": fileURLToPath(new URL("./apps/app/src/ui/api/transport.ts",import.meta.url)),
      "@elizaos/core/read-memo": fileURLToPath(new URL("./.eliza/client-features/packages/core/src/read-memo.ts",import.meta.url)),
      "@elizaos/core/logging": fileURLToPath(new URL("./.eliza/client-features/packages/core/src/logging.ts",import.meta.url)),
      "@elizaos/core/view-interaction": fileURLToPath(new URL("./.eliza/client-features/packages/core/src/view-interaction.ts",import.meta.url)),
      "@elizaos/core/protocol": fileURLToPath(new URL("./.eliza/client-features/alpha-voice-core-protocol.ts",import.meta.url)),
      "@elizaos/voice/turn": fileURLToPath(new URL("./.eliza/client-features/packages/voice/src/turn.ts",import.meta.url)),
      "@elizaos/core/speech": fileURLToPath(new URL("./.eliza/client-features/packages/core/src/speech.ts",import.meta.url)),
      "@elizaos/cloud-sdk/subscription-entitlement": fileURLToPath(new URL("./.eliza/client-features/packages/cloud/sdk/src/subscription-entitlement.ts",import.meta.url)),
      "@elizaos/contracts/deletion-window": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/deletion-window.ts",import.meta.url)),
      "@elizaos/contracts/sms-send": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/sms-send.ts",import.meta.url)),
      "@elizaos/contracts/native-notes-query": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/native-notes-query.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/cloud-provider": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/cloud-provider.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/contracts": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/contracts.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/device-navigation": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/device-navigation.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/guidance": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/guidance.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/location": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/location.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/navigation-fix": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/navigation-fix.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/route-distance": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/route-distance.ts",import.meta.url)),
      "@elizaos/plugin-maps/client/saved-places": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-maps/src/client/saved-places.ts",import.meta.url)),
      "@elizaos/plugin-files/browser/storage-model": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-files/src/browser/storage-model.ts",import.meta.url)),
      "@elizaos/plugin-files/browser/files-agent-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-files/src/browser/files-agent-contract.ts",import.meta.url)),
      "@elizaos/plugin-notes/types": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-notes/src/types.ts",import.meta.url)),
      "@elizaos/plugin-notes/note-authored": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-notes/src/note-authored.ts",import.meta.url)),
      "@elizaos/plugin-notes/note-format": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-notes/src/note-format.ts",import.meta.url)),
      "@elizaos/plugin-notes/client/notes-api": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-notes/src/client/notes-api.ts",import.meta.url)),
      "@elizaos/plugin-notes/client/note-origin": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-notes/src/client/note-origin.ts",import.meta.url)),
      "@elizaos/plugin-notes/client/note-schedule-draft": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-notes/src/client/note-schedule-draft.ts",import.meta.url)),
      "@elizaos/plugin-calendar/client/availability-review": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-calendar/src/client/availability-review.ts",import.meta.url)),
      "@elizaos/plugin-calendar/linked-sync": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-calendar/src/linked-sync/index.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/attachments": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/attachments.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/background-notices": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/background-notices.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/digest": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/digest.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/failures": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/failures.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/grants": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/grants.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/mailbox-list": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/mailbox-list.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/operation-journal": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/operation-journal.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/read-state": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/read-state.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/retained-draft": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/retained-draft.ts",import.meta.url)),
      "@elizaos/plugin-inbox/mailbox/types": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-inbox/src/mailbox/types.ts",import.meta.url)),
      "@elizaos/plugin-workflow/client/hosted-digests": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-workflow/src/client/hosted-digests.ts",import.meta.url)),
      "@elizaos/plugin-workflow/services/hosted-digest-policy": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-workflow/src/services/hosted-digest-policy.ts",import.meta.url)),
      "@elizaos/capacitor-camera/host-ports": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-native-camera/src/host-ports.ts",import.meta.url)),
      "@elizaos/capacitor-camera/scan-document": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-native-camera/src/scan-document.ts",import.meta.url)),
      "@elizaos/core/events": fileURLToPath(new URL("./.eliza/client-features/packages/core/src/events.ts",import.meta.url)),
      "@elizaos/contracts/native-telephony": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/native-telephony.ts",import.meta.url)),
      "@elizaos/contracts/phone-workflow": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/phone-workflow.ts",import.meta.url)),
      "@elizaos/contracts/workflow-client": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/workflow-client.ts",import.meta.url)),
      "@elizaos/contracts/workflow-scope": fileURLToPath(new URL("./.eliza/client-features/packages/contracts/src/workflow-scope.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/browser-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/browser-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/camera-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/camera-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/client-coordinator": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/clock-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/files-browser-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/files-browser-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/maps-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/maps-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/notes-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/notes-organize-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/notes-query-result": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-query-result.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/photo-library-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/photo-library-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/photos-view-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/photos-view-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/reminder-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/reminder-create-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-create-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/reminder-journal": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-journal.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/telephony-actions-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/telephony-actions-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-actions/workflow-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/workflow-contract.ts",import.meta.url)),
      "@elizaos/contracts": fileURLToPath(new URL("./.eliza/client-features/client-contracts.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-calendar-contract": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/calendar-contract.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-clock-review": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-handoff.ts",import.meta.url)),
      "@elizaos/plugin-assistant/device-foreground-review": fileURLToPath(new URL("./.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/foreground-review-contract.ts",import.meta.url)),
    },
  },
  build: { outDir: "../../web-dist", emptyOutDir: true, sourcemap: false },
  server: { fs: { allow: [
    fileURLToPath(new URL('./apps/app', import.meta.url)),
    // Prepared upstream modules, by real path when a worktree shares this prepared tree.
    realpathSync(fileURLToPath(new URL('./.eliza/client-features', import.meta.url))),
    // Vite resolves shared dependencies and the pinned password client to their real paths.
    realpathSync(fileURLToPath(new URL('./node_modules', import.meta.url))),
    realpathSync(fileURLToPath(new URL('./vendor/eliza/plugins/plugin-native-passwords/src', import.meta.url))),
  ] } },
});
