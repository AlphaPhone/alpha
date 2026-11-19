import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {build} from 'esbuild';
import {stripTypeScriptTypes} from '../../../../test/support/strip-types.mjs';
import {captureSources, read, root} from './support.mjs';

/**
 * The installed phone device executor (agent-adapter.ts, `connectionController.setDeviceExecutor`)
 * mounted without the renderer. The callback text and the module helpers it calls for Previous
 * notes refusals and internal navigation are sliced from the actual source and run unchanged;
 * every contract, predicate, registry, store and presenter it reaches is the real module, bundled
 * from the path the adapter imports. Only effect boundaries are ports: native plugins, durable Trash, the shell, the view
 * context publisher and the connection. A name the fixture does not provide throws when reached.
 */
const adapter = 'apps/app/src/prototype/agent-adapter.ts';
const driver = fileURLToPath(import.meta.url);
const entry = `
export {DeviceActionNotStarted} from './apps/app/src/runtime/device-actions';
export {isCameraCapture} from './.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/camera-contract.ts';
export {isSmsSend} from './apps/app/src/runtime/sms-agent-contract';
export {isPhoneDial} from './apps/app/src/runtime/phone-dial-contract';
export {isTelephonyAction} from './apps/app/src/runtime/telephony-actions-contract';
export {isClockOperation} from './apps/app/src/runtime/clock-contract';
export {isMapsOperation} from './apps/app/src/runtime/maps-contract';
export {readMapsSelection,publishMapsSelection,clearMapsSelection,getMapsSelectedObject,validateMapsSelectedObject} from './apps/app/src/maps/agent-context';
export {isLibraryOperation} from './apps/app/src/runtime/photo-library';
export {isPhotosViewOperation} from './.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/photos-view-contract.ts';
export {isFilesOperation,filesContextAllowed,validateFilesOperation} from './.eliza/client-features/plugins/plugin-files/src/browser/files-agent-contract.ts';
export {isCalendarOperation,validateCalendarResult} from './.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/calendar-contract.ts';
export {isNativeNotesQuery} from './.eliza/client-features/packages/contracts/src/native-notes-query.ts';
export {isNotesOrganizeOperation} from './.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts';
export {isNotesOperation} from './apps/app/src/runtime/notes-contract';
export {NotesCommitUncertain,NotesStore} from './apps/app/src/runtime/notes-store';
export {NotesStorageFull} from './apps/app/src/runtime/notes-secure-store';
export {isNotesTrashFull,addNotesTrashEntry,emptyNotesTrash} from './apps/app/src/runtime/notes-trash-policy';
export {presentDeviceRecordOperation} from './apps/app/src/runtime/device-record-presentation';
export {formatDeviceRecordDateTime} from './apps/app/src/ui/device-actions/device-record-presentation';
export {notesActionFailureText,previousNotesRefusal} from './apps/app/src/ui/notes/notes-action-messages';
export {proposalContextNotice} from './apps/app/src/ui/device-actions/client-coordinator';
export {FILES_DIRECT_TYPES} from './.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/files-browser-contract.ts';
export {alphaViewKey} from './apps/app/src/product/alpha-product';
`;

let bundled;
async function helpers() {
  bundled ??= (async () => {
    const built = await build({absWorkingDir: root, stdin: {contents: entry, resolveDir: root, loader: 'ts'},
      bundle: true, write: false, platform: 'node', format: 'esm', metafile: true,
      define: {'import.meta.env': '{}'}, logLevel: 'error'});
    const sources = Object.keys(built.metafile.inputs).filter(path => !path.startsWith('<') && !path.startsWith('node_modules/'));
    captureSources([driver, adapter, ...sources]);
    const exports = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString('base64')}`);
    return {exports, sources: [driver, adapter, ...sources]};
  })();
  return bundled;
}

function slice(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `agent-adapter.ts still has ${startMarker.trim()}`);
  const end = text.indexOf(endMarker, start);
  assert.ok(end > start, `agent-adapter.ts still ends ${startMarker.trim()} at ${endMarker.trim()}`);
  assert.equal(text.indexOf(startMarker, start + 1), -1, `One ${startMarker.trim()}`);
  return text.slice(start, end);
}

/** Sources every executor campaign binds before it drives the source. */
export async function deviceExecutorSources() {
  return (await helpers()).sources;
}

/**
 * Mount the executor for one shell. `ports` supplies the effect boundaries the reached branches
 * name (registerPlugin, Capacitor, document, alphaClient, connectionController, context, ...).
 * Returns the real executor and the real helpers.
 */
export async function mountDeviceExecutor(shell, ports) {
  const {exports} = await helpers();
  const text = read(adapter);
  const marker = '    connectionController.setDeviceExecutor(';
  // The callback's body closes on the `    });` line that ends the registration call.
  const callback = slice(text, marker, '\n    });\n').slice(marker.length) + '\n    }';
  const refusal = slice(text, '  async function previousNotesRefusalNow(', '  async function previousNotesObservation(');
  const navigation = slice(text, '  function openInternalView(', '  /** Opens Camera for a photo');
  const code = stripTypeScriptTypes(`${refusal}\n${navigation}\nglobalThis.__install = function(){ return (${callback}); };`, {mode: 'strip'});
  const context = vm.createContext({console, JSON, Promise, Error, TypeError, Array, Object, String, Number, Set, Map,
    Date, Intl, URL, AbortController, AbortSignal, DOMException, Event, EventTarget, CustomEvent, TextEncoder,
    structuredClone, crypto, setTimeout, clearTimeout, ...exports, ...ports});
  vm.runInContext(code, context, {filename: fileURLToPath(new URL(`../../../../${adapter}`, import.meta.url))});
  const executor = context.__install.call(shell);
  return {executor, helpers: exports,
    /** Run one approved or direct operation the way the coordinator calls the executor. */
    run(operation, operationId, expectedContext, signal = new AbortController().signal, extra = {}) {
      return executor(operation, operationId, expectedContext, signal, extra.bindingHash ?? 'b'.repeat(64),
        extra.workflowRoute, extra.journalIdentity, extra.agendaSource);
    }};
}

/** The coordinator's admission of a proposal on this screen (assertProposalContext). */
export async function proposalAllowed(operation, context, ports) {
  const {exports} = await helpers();
  return exports.proposalContextNotice(operation, context, ports) === undefined;
}

/** How the coordinator journals an executor settlement: a thrown DeviceActionNotStarted is failed. */
export async function settled(pending) {
  const {exports} = await helpers();
  try {return {...(await pending), threw: null};}
  catch (error) {
    return error instanceof exports.DeviceActionNotStarted ? {status: 'failed', summary: error.message, threw: 'not-started'}
      : {status: 'unknown', summary: String(error?.message ?? error), threw: 'other'};
  }
}
