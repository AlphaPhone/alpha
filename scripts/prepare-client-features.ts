import { randomUUID } from 'node:crypto';
import { upstreamNativeSource } from './upstream-native-source.ts';
import { sha256 as hash } from './sha256.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const errorCode = (error: unknown) =>
  error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : '';

type SourceInventory = Record<string, string>;
interface PrepareOptions {
  root?: string;
  projectVoice?: boolean;
  check?: boolean;
  log?: (line: string) => void;
}
function regularPath(filename: string, directory = false) {
  try {
    const stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink() || !(directory ? stat.isDirectory() : stat.isFile())) throw Error('Nonregular client feature path: ' + filename);
    return stat;
  } catch (error) { if (errorCode(error) === 'ENOENT') return false; throw error; }
}
function inventory(directory: string) {
  const files: SourceInventory = {};
  function visit(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw Error('Symlink in client feature source: ' + file);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files[path.relative(directory, file)] = hash(fs.readFileSync(file));
      else throw Error('Nonregular client feature source: ' + file);
    }
  }
  visit(directory);
  return files;
}
function matches(actual: SourceInventory, expected: SourceInventory) {
  return JSON.stringify(Object.keys(actual).sort()) === JSON.stringify(Object.keys(expected).sort()) &&
    Object.entries(expected).every(([file, digest]) => actual[file] === digest);
}
// Alpha owns its renderer UI in apps/app/src/ui; no packages/ui source or plugin component is
// copied from upstream. Only framework-free contracts, protocol and client logic remain shared.
export const CLIENT_FEATURE_PATHS = [
  'packages/app/src/runtime/managed-google-agent',
  'packages/core/src/utils/type-guards.ts',
  'packages/cloud/sdk/native-host/subscription-grant.mjs',
  'packages/cloud/sdk/native-host/subscription-grant.d.mts',
  'packages/contracts/src/browser-address-input.ts',
  'packages/contracts/src/browser-request-grounding.ts',
  // Generated IANA TLD data imported by browser-request-grounding; this leaf has no imports.
  'packages/contracts/src/iana-tlds.ts',
  // Import-free leaf of browser-request-grounding.
  'packages/contracts/src/strip-trailing-punctuation.ts',
  'packages/contracts/src/phone-dial.ts',
  'packages/contracts/src/device-action-execution.ts',
  'packages/contracts/src/client-turn-observation.ts',
  'packages/contracts/src/contracts/remote-agent-pairing.ts',
  'packages/contracts/src/notice-routes.ts',
  'packages/contracts/src/deletion-window.ts',
  'packages/contracts/src/phone-workflow.ts',
  'packages/contracts/src/workflow-client.ts',
  'packages/contracts/src/workflow-device.ts',
  'packages/contracts/src/workflow-approval-poster.ts',
  'packages/contracts/src/workflow-intents.ts',
  'packages/contracts/src/workflow-scope.ts',

  'packages/core/src/chat-upload-limits.ts',
  'plugins/plugin-native-system/src/client/launcher.ts',
  'plugins/plugin-native-system/src/sense.ts',
  'plugins/plugin-native-system/src/sense-bridge.ts',
  'plugins/plugin-native-system/src/sense-web.ts',
  'plugins/plugin-native-system/src/reset.ts',
  'plugins/plugin-native-system/src/crash-log.ts',
  'plugins/plugin-native-system/src/settings.ts',
  'plugins/plugin-native-system/src/definitions.ts',
  // Files storage, archive, attachment and scan-document logic. The Files screen adapter and the
  // scan poster rules are Alpha's (apps/app/src/ui/files, apps/app/src/ui/documents).
  'plugins/plugin-files/src/browser/attachment.ts',
  'plugins/plugin-files/src/browser/file-archive.ts',
  'plugins/plugin-files/src/browser/files.ts',
  'plugins/plugin-files/src/browser/files-agent-contract.ts',
  'plugins/plugin-files/src/browser/storage-model.ts',
  'plugins/plugin-files/src/browser/storage-volume.ts',
  'plugins/plugin-files/src/documents/local-ocr.ts',
  'plugins/plugin-files/src/documents/scan-correction.ts',
  'plugins/plugin-files/src/documents/scan-draft.ts',
  'plugins/plugin-files/src/documents/scan-edges.ts',
  'plugins/plugin-files/src/documents/scan-links.ts',
  'plugins/plugin-files/src/documents/scan-pdf.ts',
  'plugins/plugin-files/src/documents/scan-text-layer.ts',
  'plugins/plugin-files/src/documents/source-links.ts',
  "plugins/plugin-browser/src/native-client-command.ts",
  'plugins/plugin-native-browser-surface/src/address-input.ts',
  'plugins/plugin-native-browser-surface/src/browsing-session.ts',
  'plugins/plugin-native-browser-surface/src/page-reading.ts',
  'plugins/plugin-native-browser-surface/src/page-source.ts',
  'plugins/plugin-native-browser-surface/src/tab-host.ts',
  'packages/core/src/schema-types.ts',
  'packages/core/src/types/json.ts',
  'packages/core/src/types/system-notice.ts',
  'packages/core/src/types/schema.ts',
  'packages/core/src/types/surface-manifest.ts',
  'packages/core/src/types/view-capability.ts',
  'packages/core/src/types/view-kind.ts',
  'plugins/plugin-calendar/src/meetings/auto-join-types.ts',
  'packages/core/src/types/permissions.ts',
  'packages/contracts/src/lifeops/gmail.ts',
  'packages/contracts/src/lifeops/policy.ts',
  'packages/contracts/src/lifeops/telemetry.ts',
  'packages/contracts/src/lifeops/inbox.ts',
  'packages/contracts/src/lifeops/connectors.ts',
  'packages/contracts/src/lifeops/workflows.ts',
  'packages/contracts/src/lifeops/scheduling.ts',
  'packages/contracts/src/lifeops/reminders.ts',
  'packages/contracts/src/lifeops/events.ts',
  'packages/contracts/src/lifeops/health.ts',
  'packages/contracts/src/lifeops-connector-degradation.ts',
  'packages/contracts/src/lifeops/goals.ts',

  'packages/contracts/src/calendar.ts',
  'packages/core/src/types/effects.ts',
  'plugins/plugin-assistant/src/services/device-actions/foreground-review-contract.ts',
  'plugins/plugin-calendar/src/api/calendar-api.ts',
  'plugins/plugin-calendar/src/client/named-read.ts',
  'plugins/plugin-calendar/src/client/availability-review.ts',
  'plugins/plugin-calendar/src/internal/time.ts',
  'plugins/plugin-calendar/src/service/managed-calendar-host.ts',
  'plugins/plugin-assistant/src/utils/html-entities.ts',
  'plugins/plugin-notes/src/capabilities.ts',
  'plugins/plugin-notes/src/client/notes-api.ts',
  'plugins/plugin-notes/src/note-authored.ts',
  'plugins/plugin-notes/src/note-folders.ts',
  'plugins/plugin-notes/src/note-format.ts',
  'plugins/plugin-notes/src/note-id.ts',
  'plugins/plugin-notes/src/types.ts',

  'packages/contracts/src/calendar-linked-sync.ts',
  'packages/core/src/logging.ts',
  'packages/core/src/read-memo.ts',
  'packages/core/src/runtime/single-flight-memo.ts',
  'packages/core/src/view-interaction.ts',
  'packages/core/src/security/log-redaction.ts',
  'packages/core/src/chat-upload-limits.ts',
  'packages/host/src/voice/ui-context.ts',

  'packages/voice/src/turn.ts',
  'packages/voice/src/browser-capture',
  'packages/voice/src/respond-gate.ts',
  'packages/voice/src/voice-assistant-session.ts',
  'packages/voice/src/live-voice-session.ts',
  'packages/voice/src/native-live-voice.ts',
  'packages/voice/src/native-cloud-speech.ts',
  'packages/voice/src/cloud-speech-chunks.ts',
  'packages/voice/src/native-speech-request.ts',
  'packages/voice/src/voice-turn-routes.ts',
  'packages/voice/src/voice-turn-timing.ts',
  'packages/voice/src/realtime-voice-timing.ts',
  'packages/voice/src/voice-endpoint-chain.ts',
  'packages/voice/src/voice-eot.ts',
  'packages/voice/src/random-id.ts',
  'packages/core/src/speech.ts',
  'packages/core/src/utils/string-boundaries.ts',
  'packages/core/src/spoken-text.ts',
  'packages/core/src/utils/reasoning-tags.ts',
  'packages/core/src/utils/stage-directions.ts',
  'packages/core/src/errors.ts',
  'packages/core/src/utils/errors.ts',
  'plugins/plugin-workflow/src/client/hosted-digests.ts',
  'plugins/plugin-workflow/src/services/hosted-digest-policy.ts',
  'packages/core/src/events.ts',
  'packages/core/src/i18n/language.ts',
  'packages/core/src/views/view-interact-protocol.ts',
  'packages/core/src/views/view-action-handoff.ts',
  'packages/contracts/src/native-notes-query.ts',
  'packages/contracts/src/device-reviews.ts',
  'plugins/plugin-assistant/src/services/device-actions/contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/browser-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/phone-dial-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts',
  'plugins/plugin-assistant/src/services/device-actions/files-browser-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/maps-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/workflow-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/camera-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/camera-request.ts',
  'plugins/plugin-assistant/src/services/device-actions/photo-library-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/photos-view-contract.ts',
  'plugins/plugin-native-camera/src/definitions.ts',
  'plugins/plugin-native-camera/src/host-ports.ts',
  'plugins/plugin-native-camera/src/session.ts',
  'plugins/plugin-native-camera/src/scan-document.ts',
  'plugins/plugin-assistant/src/services/device-actions/notes-query-result.ts',
  'packages/contracts/src/sms-send.ts',
  'plugins/plugin-assistant/src/services/device-actions/sms-contract.ts',
  'packages/contracts/src/mms-send.ts',
  'packages/contracts/src/native-telephony.ts',
  'packages/contracts/src/telephony-actions.ts',
  'packages/contracts/src/spoken-phone-number.ts',
  'plugins/plugin-assistant/src/services/device-actions/telephony-actions-contract.ts',
  'packages/contracts/src/native-address-book.ts',
  'plugins/plugin-assistant/src/services/device-actions/clock-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/clock-handoff.ts',
  'plugins/plugin-assistant/src/services/device-actions/clock-handoff-history.ts',
  'plugins/plugin-assistant/src/services/device-actions/clock-review-executor.ts',
  'plugins/plugin-assistant/src/services/device-actions/reminder-journal.ts',
  'plugins/plugin-native-reminders/src/android-definitions.ts',
  'plugins/plugin-native-reminders/src/occurrence.ts',
  'plugins/plugin-assistant/src/services/device-actions/calendar-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/notes-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/reminder-create-contract.ts',
  'plugins/plugin-assistant/src/services/device-actions/reminder-contract.ts',
  // Mailbox protocol, journals and data. The drafts and review controllers, Use in email and the
  // preview are Alpha's (apps/app/src/ui/mailbox).
  'plugins/plugin-inbox/src/mailbox/attachments.ts',
  'plugins/plugin-inbox/src/mailbox/background-notices.ts',
  'plugins/plugin-inbox/src/mailbox/digest.ts',
  'plugins/plugin-inbox/src/mailbox/failures.ts',
  'plugins/plugin-inbox/src/mailbox/grants.ts',
  'plugins/plugin-inbox/src/mailbox/links.ts',
  'plugins/plugin-inbox/src/mailbox/mail-context.ts',
  'plugins/plugin-inbox/src/mailbox/mailbox-list.ts',
  'plugins/plugin-inbox/src/mailbox/managed-gmail-client.ts',
  'plugins/plugin-inbox/src/mailbox/operation-journal.ts',
  'plugins/plugin-inbox/src/mailbox/read-ahead.ts',
  'plugins/plugin-inbox/src/mailbox/read-state.ts',
  'plugins/plugin-inbox/src/mailbox/retained-draft.ts',
  'plugins/plugin-inbox/src/mailbox/types.ts',
  'plugins/plugin-calendar/src/linked-sync',
  // Maps routing, location, navigation and provider logic. The Maps screen, its renderer, map
  // layout and sharing are Alpha's (apps/app/src/ui/maps, apps/app/src/maps).
  'plugins/plugin-maps/src/client/agent-context.ts',
  'plugins/plugin-maps/src/client/agent-navigation.ts',
  'plugins/plugin-maps/src/client/approved-read.ts',
  'plugins/plugin-maps/src/client/background-navigation.ts',
  'plugins/plugin-maps/src/client/cloud-provider.ts',
  'plugins/plugin-maps/src/client/cloud-session.ts',
  'plugins/plugin-maps/src/client/contracts.ts',
  'plugins/plugin-maps/src/client/device-navigation.ts',
  'plugins/plugin-maps/src/client/guidance.ts',
  'plugins/plugin-maps/src/client/location.ts',
  'plugins/plugin-maps/src/client/native-location.ts',
  'plugins/plugin-maps/src/client/navigation-fix.ts',
  'plugins/plugin-maps/src/client/navigation-relay.ts',
  'plugins/plugin-maps/src/client/navigation-voice.ts',
  'plugins/plugin-maps/src/client/regional-provider.ts',
  'plugins/plugin-maps/src/client/route-distance.ts',
  'plugins/plugin-maps/src/client/runtime.ts',
  'plugins/plugin-maps/src/client/saved-places.ts',
  'plugins/plugin-maps/src/client/selection-handle.ts',
  'plugins/plugin-maps/src/client/state.ts',
  'plugins/plugin-maps/test/navigation-client.test.mjs',
  // Notes client stores, trash, recording and query logic. The Notes controller, editor and
  // snapshot state are Alpha's (apps/app/src/ui/notes).
  'plugins/plugin-notes/src/client/note-dates.ts',
  'plugins/plugin-notes/src/client/note-deleted-origins.ts',
  'plugins/plugin-notes/src/client/note-documents.ts',
  'plugins/plugin-notes/src/client/note-origin.ts',
  'plugins/plugin-notes/src/client/note-schedule-draft.ts',
  'plugins/plugin-notes/src/client/note-share-text.ts',
  'plugins/plugin-notes/src/client/notes-api.ts',
  'plugins/plugin-notes/src/client/notes-audio-store.ts',
  'plugins/plugin-notes/src/client/notes-contract.ts',
  'plugins/plugin-notes/src/client/notes-document-store.ts',
  'plugins/plugin-notes/src/client/notes-draft.ts',
  'plugins/plugin-notes/src/client/notes-query.ts',
  'plugins/plugin-notes/src/client/notes-recording-deletion.ts',
  'plugins/plugin-notes/src/client/notes-recording-effects.ts',
  'plugins/plugin-notes/src/client/notes-recording-summary.ts',
  'plugins/plugin-notes/src/client/notes-secure-store.ts',
  'plugins/plugin-notes/src/client/notes-store.ts',
  'plugins/plugin-notes/src/client/notes-trash-actions.ts',
  'plugins/plugin-notes/src/client/notes-trash-maintenance.ts',
  'plugins/plugin-notes/src/client/notes-trash-policy.ts',
  'plugins/plugin-notes/src/client/notes-trash-schedule.ts',
  'plugins/plugin-notes/src/client/notes-trash-store.ts',
  'packages/cloud/sdk/src/subscription-entitlement.ts',
  'packages/auth/src/auth/native-cloud-sign-in.ts',
  // Credential-bound account billing reader and its snapshot types (AP-03/#410).
  'packages/cloud/sdk/src/cloud-account-billing.ts',
  'packages/cloud/sdk/src/account-billing-snapshot.ts',
  // Framework-free resident Cloud binding controller (AP-04/P-22).
  'packages/auth/src/auth/cloud-resident-binding.ts',
];
/** Copy authenticated upstream source outside the immutable vendor checkout. With check, only
 * confirm the prepared copy is current and throw instead of rebuilding it. */
export function prepareClientFeatures({ root = projectRoot, projectVoice = true, check = false }: PrepareOptions = {}) {
  const upstream = upstreamNativeSource(root);
  const source = new Map(upstream.readAll(CLIENT_FEATURE_PATHS).flatMap(files => [...files]));
  const sourceFiles = Object.fromEntries([...source].map(([name, file]) => [name, file.sha256]));
  if(projectVoice){
  // Upstream publishes every renderer type as a leaf entry (@elizaos/core/schema-types,
  // plugin-calendar auto-join-types); copied files stay byte-exact.
  // Only two re-export maps remain: they select upstream leaves for bare package specifiers
  // and carry no declarations of their own.
  const project = (name: string, text: string) => source.set(name, {bytes:Buffer.from(text),mode:'100644',sha256:hash(text)});
  project('client-contracts.ts', 'export * from "./packages/contracts/src/calendar";\nexport * from "./packages/contracts/src/calendar-linked-sync";\nexport * from "./packages/contracts/src/device-reviews";\nexport * from "./packages/contracts/src/workflow-device";\nexport type { PhoneRelativeCalendarRange } from "./packages/contracts/src/phone-workflow";\n');
  const text = (name: string) => {
    const file = source.get(name);
    if (!file) throw Error('Missing client feature projection input: ' + name);
    return file.bytes.toString('utf8');
  };
  // The native compatibility entry re-exports the shared parser by package name.
  // Plain Node consumers need that one import resolved within the copied graph.
  {
    const name = 'plugins/plugin-native-browser-surface/src/address-input.ts';
    const before = 'from "@elizaos/contracts/browser-address-input";';
    const content = text(name);
    if (content.split(before).length !== 2) throw Error('Review changed browser address re-export: ' + name);
    project(name, content.replace(before, 'from "../../../packages/contracts/src/browser-address-input.ts";'));
  }
  // The shared history parser is a client-only entry. Resolve its one value
  // import within the copied source graph for plain Node consumers.
  {
    const name = 'plugins/plugin-browser/src/native-client-command.ts';
    const before = 'import { readClientTurnObservation } from "@elizaos/contracts/client-turn-observation";';
    const content = text(name);
    if (content.split(before).length !== 2 || (content.match(/^import /gm) ?? []).length !== 1)
      throw Error('Review changed browser history imports: ' + name);
    project(name, content.replace(before, 'import { readClientTurnObservation } from "../../../packages/contracts/src/client-turn-observation.ts";'));
  }
  // Upstream voice sessions import the shared random-id helper by its emitted .js name. Plain
  // Node (tests and scripts that strip types) cannot map that to the copied .ts source, so the
  // one reviewed value import is pointed at the .ts file; type-only .js imports are erased.
  for (const name of ['packages/voice/src/voice-assistant-session.ts', 'packages/voice/src/live-voice-session.ts']) {
    const before = 'import { randomId } from "./random-id.js";';
    const content = text(name);
    if (content.split(before).length !== 2) throw Error('Review changed voice random-id import: ' + name);
    project(name, content.replace(before, 'import { randomId } from "./random-id.ts";'));
  }
  // The shared account billing reader imports the entitlement helpers by their emitted .js name.
  // Plain Node (tests and scripts that strip types) cannot map that to the copied .ts source, so
  // the one reviewed value import is pointed at the .ts file; its type-only .js import is erased.
  {
    const name = 'packages/cloud/sdk/src/cloud-account-billing.ts', before = '} from "./subscription-entitlement.js";';
    const content = text(name);
    if (content.split(before).length !== 2) throw Error('Review changed account billing import: ' + name);
    project(name, content.replace(before, '} from "./subscription-entitlement.ts";'));
  }

  // The shared native live transport imports the live session's values by their emitted .js name
  // (and only types from turn timing, which type stripping erases); point that one import at .ts.
  {
    const name = 'packages/voice/src/native-live-voice.ts', before = '} from "./live-voice-session.js";';
    const content = text(name);
    if (content.split(before).length !== 2 || /^import (?!type )[^;]*from "\.\/(?!live-voice-session\.js")/m.test(content)) throw Error('Review changed native live voice imports: ' + name);
    project(name, content.replace(before, '} from "./live-voice-session.ts";'));
  }

  // The shared linked-sync modules import @elizaos/contracts by package name. Alpha has no
  // such package: the renderer resolves it through a Vite/tsc alias, but Node consumers
  // (the Vite config bundle, backend hosts and node tests reach calendarSyncHttp through
  // cloud-protocol) cannot. Every symbol they import is in calendar-linked-sync, so point
  // exactly that one import at the projected contract file.
  for (const file of ['google-sync-port.ts', 'sync-controller.ts', 'linked-store.ts']) {
    const name = 'plugins/plugin-calendar/src/linked-sync/' + file;
    const content = text(name), specifier = /\} from "@elizaos\/contracts";/g;
    if ((content.match(specifier) || []).length !== 1 || /["']@elizaos\/contracts\//.test(content))
      throw Error('Review changed linked-sync contracts import: ' + name);
    project(name, content.replace(specifier, '} from "../../../../packages/contracts/src/calendar-linked-sync.ts";'));
  }

  // The shared device-action coordinator module also holds upstream's review screen: the
  // DeviceActionCoordinator class with its context notices, review text and receipt summaries.
  // Alpha owns that presentation (apps/app/src/ui/device-actions/client-coordinator.ts), so the
  // staged copy keeps only the queue protocol: wire, journal and port types, operation validation,
  // action scopes, device statuses, DeviceActionNotStarted, committed-change publication and the
  // journal context. Without the screen it no longer imports the review date formatter.
  {
    const name = 'plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts';
    const content = text(name);
    const cut = (from: string, to: string) => {
      const start = content.indexOf(from), end = to ? content.indexOf(to, start) : content.length;
      if (start < 0 || end < 0 || content.split(from).length !== 2 || (to && content.split(to).length !== 2)) throw Error('Review changed device-action coordinator layout: ' + name);
      return [start, end];
    };
    const formatter = 'import { formatDeviceRecordDateTime } from "./device-record-presentation.ts";\n';
    const [screen] = cut('// ── Screen binding', 'export const CAMERA_CONTEXT_NOTICE = ');
    const [notStarted, notice] = cut('/**\n * Thrown by a device executor that refused before it started any effect', '/** A pending proposal that does not fit the current screen.');
    const [publication, coordinator] = cut('// ── Committed-change publication', 'type ExecutionResult = ');
    if (!(screen < notStarted && notice < publication) || content.split(formatter).length !== 2) throw Error('Review changed device-action coordinator layout: ' + name);
    const kept = content.slice(0, screen).replace(formatter, '') + content.slice(notStarted, notice) + '\n' + content.slice(publication, coordinator).trimEnd() + '\n';
    if (/\bformatDeviceRecordDateTime\b|\bclass DeviceActionCoordinator\b|\bContextNotice\b|\bdescribeForegroundReview\b/.test(kept)) throw Error('Review changed device-action coordinator layout: ' + name);
    // Drop the import bindings only the screen used, keeping upstream's import formatting.
    const statement = /^import (type )?\{([^}]*)\} from "([^"]+)";\n/gm;
    const body = kept.replace(statement, '');
    if (/^import /m.test(body)) throw Error('Review changed device-action coordinator imports: ' + name);
    project(name, kept.replace(statement, (_all, type = '', names: string, from: string) => {
      const used = names.split(',').map(entry => entry.trim()).filter(entry => entry && new RegExp('\\b' + entry.split(/\s+/).pop() + '\\b').test(body));
      if (!used.length) return '';
      const single = `import ${type}{ ${used.join(', ')} } from "${from}";`;
      return (single.length <= 80 ? single : `import ${type}{\n${used.map(entry => `  ${entry},\n`).join('')}} from "${from}";`) + '\n';
    }));
  }

  // Upstream's browser Notes document port builds a hidden file input and a download link and
  // words its results for the owner. Alpha owns that (runtime/browser-note-documents.ts with the
  // file picker in browser/file-picker.ts, wording in apps/app/src/ui/notes), so the staged copy
  // keeps only the result shapes, limits, file name and the import and PDF checks.
  {
    const name = 'plugins/plugin-notes/src/client/note-documents.ts';
    const content = text(name), from = '\nexport interface BrowserNoteDocumentsOptions {';
    if (content.split(from).length !== 2 || content.indexOf(from) < content.indexOf('export function noteImportText('))
      throw Error('Review changed Notes document layout: ' + name);
    const header = ' * (for example Android\'s document picker); {@link createBrowserNoteDocuments} is the browser\n * implementation: a local file input for import and a download for export. Nothing is uploaded,\n * and an export is only "requested": the browser does not confirm where the bytes landed.\n';
    if (content.split(header).length !== 2) throw Error('Review changed Notes document layout: ' + name);
    const kept = content.slice(0, content.indexOf(from)).replace(header, ' * (for example Android\'s document picker, or a browser file input and download).\n');
    if (/document\.|createElement|createBrowserNoteDocuments/.test(kept)) throw Error('Review changed Notes document layout: ' + name);
    project(name, kept);
  }
  // Upstream's browser Files backend downloads an archive or a selected file through a hidden
  // link. Alpha supplies that download (browser/download.ts) as one more host option, like the
  // file picker and the document viewer it already supplies.
  {
    const name = 'plugins/plugin-files/src/browser/files.ts';
    let content = text(name);
    const replace = (before: string, after: string) => {
      if (content.split(before).length !== 2) throw Error('Review changed Files download layout: ' + name);
      content = content.replace(before, after);
    };
    replace('  inputFiles(\n    signal: AbortSignal,\n    options?: { photos?: boolean; directory?: boolean },\n  ): Promise<File[]>;\n}',
      '  inputFiles(\n    signal: AbortSignal,\n    options?: { photos?: boolean; directory?: boolean },\n  ): Promise<File[]>;\n  download(url: string, name: string): void;\n}');
    replace('    const file = await this.archiveMany(input.items),\n      url = URL.createObjectURL(file),\n      link = document.createElement("a");\n    link.href = url;\n    link.download = this.options.archiveName;\n    document.body.append(link);\n    link.click();\n    link.remove();\n',
      '    const file = await this.archiveMany(input.items),\n      url = URL.createObjectURL(file);\n    this.options.download(url, this.options.archiveName);\n');
    replace('    const row = await this.selected(input.selectionId),\n      link = document.createElement("a");\n    const url = this.urls.get(input.selectionId);\n    if (!url) throw Error("Select this file again.");\n    link.href = url;\n    link.download = row.name;\n    document.body.append(link);\n    link.click();\n    link.remove();\n',
      '    const row = await this.selected(input.selectionId);\n    const url = this.urls.get(input.selectionId);\n    if (!url) throw Error("Select this file again.");\n    this.options.download(url, row.name);\n');
    if (/createElement\("a"\)/.test(content)) throw Error('Review changed Files download layout: ' + name);
    project(name, content);
  }

  // Upstream's Sense module also holds the invocation controller, which decides from the
  // document (hidden, an open dialog) and window events when a native voice origin may open the
  // microphone. That focus and modal policy over Alpha's markup is Alpha's
  // (apps/app/src/ui/voice/sense-invocation.ts); the staged copy keeps the plugin interface, the
  // parsers, the start rule, the voice entry policy and the bridge timeout.
  {
    const name = 'plugins/plugin-native-system/src/sense.ts';
    const content = text(name);
    const marks = ['export const SENSE_MODAL_SELECTOR =', 'export interface SenseInvocationHost {', '/** The native session key is an in-memory digest', 'export const SENSE_BRIDGE_TIMEOUT_MS = 10_000;\n',
      'function serializeInvocation<T>(', '/** Voice entry is an application policy, never permission to capture. */', '/** Bind before consuming. Cold-start, changed-owner and stale async results cannot open the mic. */'];
    const at = marks.map(mark => content.split(mark).length === 2 ? content.indexOf(mark) : -1);
    if (at.some((index, i) => index < 0 || (i && index < at[i - 1]))) throw Error('Review changed Sense controller layout: ' + name);
    const kept = content.slice(0, at[0]) + content.slice(at[1], at[2]) + content.slice(at[3], at[4]).trimEnd() + '\n\n' + content.slice(at[5], at[6]).trimEnd() + '\n';
    if (/\bdocument\.|\bwindow\.|SENSE_MODAL_SELECTOR|createSenseInvocationController|invocationOperation/.test(kept)) throw Error('Review changed Sense controller layout: ' + name);
    project(name, kept);
  }

  project('alpha-voice-core-protocol.ts','export {ElizaError} from "./packages/core/src/errors";\nexport {redactTrailingArgs} from "./packages/core/src/security/log-redaction";\nexport {parseViewInteractionClientId, AGENT_SURFACE_CAPABILITY_IDS} from "./packages/core/src/views/view-interact-protocol";\nexport {findViewActionHandoff, type ViewActionHandoff} from "./packages/core/src/views/view-action-handoff";\nexport type {PermissionState} from "./packages/core/src/types/permissions";\nexport * from "./packages/core/src/chat-upload-limits";\n');
  }
  const files = Object.fromEntries([...source].map(([name, file]) => [name, file.sha256]));
  const provenance = {
    baseCommit: upstream.pin, sourceFiles, projectionVersion:projectVoice?18:0, files,
  };
  const parent = path.join(root, '.eliza'), destination = path.join(parent, 'client-features');
  regularPath(parent, true);
  const stamp = path.join(destination, '.source.json');
  // A peer can replace the directory during readback. Only a stable directory without a stamp
  // is unrecognized; a vanished or replaced directory needs another authenticated read.
  const current = () => {
    try {
      const observed = regularPath(destination, true);
      if (!observed) return false;
      const sameDirectory = () => {
        const latest = regularPath(destination, true);
        return latest && latest.dev === observed.dev && latest.ino === observed.ino;
      };
      if (!regularPath(stamp)) {
        if (!sameDirectory()) return false;
        throw Error('Refusing to replace an unrecognized client feature directory.');
      }
      const previous = JSON.parse(fs.readFileSync(stamp, 'utf8'));
      const actual = inventory(destination); delete actual['.source.json'];
      return sameDirectory() && previous.baseCommit === upstream.pin && previous.projectionVersion === provenance.projectionVersion &&
        JSON.stringify(Object.keys(previous).sort()) === JSON.stringify(Object.keys(provenance).sort()) &&
        matches(previous.sourceFiles || {}, sourceFiles) && matches(previous.files || {}, files) && matches(actual, files);
    } catch (error) { if (errorCode(error) === 'ENOENT') return false; throw error; }
  };
  if (current()) return destination;
  if (check) throw Error('Client feature source is missing or stale: run bun run upstream:prepare-client');
  fs.mkdirSync(parent, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(parent, 'client-features-stage-'));
  try {
    for (const [name, file] of source) {
      const target = path.join(temporary, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.bytes, { mode: parseInt(file.mode, 8) });
    }
    if (!matches(inventory(temporary), files)) throw Error('Client feature source copy failed authentication.');
    fs.writeFileSync(path.join(temporary, '.source.json'), JSON.stringify(provenance, null, 2));
    // Retire at most one tree. A loser must only observe the peer's winner: retiring again can
    // repeatedly remove authenticated winners and exhaust every contender's readback.
    const aside = path.join(parent, '.client-features-old-' + randomUUID());
    try {
      try { fs.renameSync(destination, aside); } catch (error) { if (errorCode(error) !== 'ENOENT') throw error; }
      try { fs.renameSync(temporary, destination); return destination; }
      catch (error) { if (!['EEXIST', 'ENOTEMPTY'].includes(errorCode(error))) throw error; }
      const deadline = performance.now() + 30_000;
      const wait = new Int32Array(new SharedArrayBuffer(4));
      while (!current()) {
        if (performance.now() >= deadline) throw Error('Timed out waiting for an authenticated concurrent client feature preparation.');
        Atomics.wait(wait, 0, 0, 25);
      }
      return destination;
    } finally { fs.rmSync(aside, { force: true, recursive: true }); }
  } finally { fs.rmSync(temporary, { force: true, recursive: true }); }
}
/** Check-only: the prepared copy's path when current; never writes the shared tree. */
export const checkClientFeatures = (options: Omit<PrepareOptions, 'check'> = {}) => prepareClientFeatures({ ...options, check: true });

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Client feature source prepared: ${prepareClientFeatures()}`);
}
