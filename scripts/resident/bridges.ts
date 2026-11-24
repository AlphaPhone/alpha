// spec/agent/plugins/profile.md, "A host service never takes an agent service's name"; spec/workflow/approvals.md, "Device steps require the exact reviewed scope and enrolled device"; spec/maps/savedPlaces.md, "A save under a known key repeats its first outcome, and only a new change writes"
import {Buffer} from 'node:buffer';
import {createHash, randomUUID} from 'node:crypto';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {connect} from 'node:net';
import path from 'node:path';
import {Effect} from 'effect';
import {workflowDeviceOffer, type WorkflowDeviceOffer, type WorkflowStep, type WorkflowStepTarget} from '@elizaos/agent';
import type {AgentCli, ResidentHost} from '@elizaos/agent/cli';
import {MapsFailure} from '@elizaos/plugin-maps/client/contracts';
import type {AgentSavedPlaceStore, StoredSaves} from '@elizaos/plugin-maps';
import {WORKFLOW_DEVICE_SERVICE, WORKFLOW_NATIVE_DIGEST_SERVICE} from '@elizaos/plugin-workflow';
import {workflowCalendarRevisionInput, workflowSha} from '@elizaos/plugin-workflow/client';

type ServiceClass = ReturnType<NonNullable<AgentCli['runtimeServices']>>[number];
type Runtime = Parameters<ServiceClass['start']>[0];

/** The launch environment's name for the app process's inference host socket (AlphaInferenceHost.SOCKET_ENV). */
export const INFERENCE_SOCKET_ENV = 'ELIZA_INFERENCE_SOCKET';
/** The launch environment's name for the app process's workflow bridge socket (WorkflowBridgeHost.SOCKET_ENV). */
export const WORKFLOW_SOCKET_ENV = 'ALPHA_WORKFLOW_SOCKET';
const MAX_FRAME = 256 * 1024;
const SAVES_LIMIT = 256 * 1024;

/** The inference host socket the app process named for this launch, or empty when it named none. @throws {never} */
export function inferenceSocket(): string {
	return process.env[INFERENCE_SOCKET_ENV] ?? '';
}

/** The phone's workflow bridge refused a request, or could not be reached; `code` is the bridge's refusal. */
export class WorkflowBridgeRefused extends Error {
	constructor(readonly code: string) {
		super(`The phone's workflow bridge refused: ${code}`);
	}
}

/**
 * One request to the app process's workflow bridge over its abstract socket: a 4-byte big-endian length and UTF-8
 * JSON each way, answered `{ok: true, value}` or `{ok: false, code}`.
 * @throws {WorkflowBridgeRefused}
 */
export function askBridge(request: Readonly<Record<string, unknown>>, socket = process.env[WORKFLOW_SOCKET_ENV] ?? ''): Promise<unknown> {
	return new Promise((resolve, reject) => {
		if (socket === '') {
			reject(new WorkflowBridgeRefused('UNCONFIGURED'));
			return;
		}
		const body = Buffer.from(JSON.stringify(request), 'utf8');
		const head = Buffer.alloc(4);
		head.writeInt32BE(body.length);
		const connection = connect({path: socket.startsWith('/') ? socket : `\0${socket}`});
		const parts: Buffer[] = [];
		let received = 0;
		let settled = false;
		const done = (failure: unknown, value?: unknown) => {
			if (settled) return;
			settled = true;
			connection.destroy();
			if (failure === undefined) resolve(value);
			else reject(failure);
		};
		connection.on('connect', () => connection.write(Buffer.concat([head, body])));
		connection.on('data', (chunk: Buffer) => {
			parts.push(chunk);
			received += chunk.length;
			const all = Buffer.concat(parts, received);
			if (all.length < 4) return;
			const length = all.readInt32BE(0);
			if (length <= 0 || length > MAX_FRAME) return done(new WorkflowBridgeRefused('MALFORMED'));
			if (all.length < 4 + length) return;
			let answer: unknown;
			try {
				answer = JSON.parse(all.subarray(4, 4 + length).toString('utf8'));
			} catch {
				return done(new WorkflowBridgeRefused('MALFORMED'));
			}
			if (typeof answer !== 'object' || answer === null) return done(new WorkflowBridgeRefused('MALFORMED'));
			const reply = answer as {ok?: unknown; value?: unknown; code?: unknown};
			if (reply.ok === true) return done(undefined, reply.value ?? null);
			done(new WorkflowBridgeRefused(typeof reply.code === 'string' ? reply.code : 'UNAVAILABLE'));
		});
		connection.on('error', () => done(new WorkflowBridgeRefused('UNREACHABLE')));
		connection.on('close', () => done(new WorkflowBridgeRefused('UNREACHABLE')));
	});
}

function record(value: unknown): Readonly<Record<string, unknown>> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new WorkflowBridgeRefused('MALFORMED');
	return value as Readonly<Record<string, unknown>>;
}

/** The enrolled phone this installation is, as the bridge answers it, or undefined while it has no enrollment. @throws {WorkflowBridgeRefused} */
export async function bridgeEnrollment(ask = askBridge): Promise<{installationId: string; enrollmentId: string; protocol: number} | undefined> {
	const answer = await ask({op: 'enrollment'});
	if (answer === null) return undefined;
	const {installationId, enrollmentId, protocol} = record(answer);
	if (typeof installationId !== 'string' || typeof enrollmentId !== 'string' || typeof protocol !== 'number' || !Number.isSafeInteger(protocol) || protocol < 0) {
		throw new WorkflowBridgeRefused('MALFORMED');
	}
	return {installationId, enrollmentId, protocol};
}

/** A reviewed native digest grant's time zone, current at least until `expiresAt`. @throws {WorkflowBridgeRefused} */
export async function bridgeGrant(selection: unknown, expiresAt: number, ask = askBridge): Promise<{readonly timeZone: string}> {
	const {timeZone} = record(await ask({op: 'grant', selection, expiresAt}));
	if (typeof timeZone !== 'string' || timeZone === '') throw new WorkflowBridgeRefused('MALFORMED');
	return {timeZone};
}

/** One reviewed native digest read for the occurrence at `at`. @throws {WorkflowBridgeRefused} */
export async function bridgeRead(selection: unknown, at: number, ask = askBridge): Promise<string> {
	const text = await ask({op: 'read', selection, at});
	if (typeof text !== 'string') throw new WorkflowBridgeRefused('MALFORMED');
	return text;
}

type Members = Readonly<Record<string, (...args: never[]) => Promise<unknown>>>;

function hostService(serviceType: string, description: string, members: (runtime: Runtime) => Members): ServiceClass {
	const service = class {
		static serviceType = serviceType;
		readonly capabilityDescription = description;
		constructor(readonly runtime: Runtime) {
			Object.assign(this, members(runtime));
		}
		static start(runtime: Runtime) {
			return Promise.resolve(new service(runtime));
		}
		stop(): Promise<void> {
			return Promise.resolve();
		}
	};
	return service as unknown as ServiceClass;
}

/** The device operations the phone performs inside its own process, without a review on screen: an exact reviewed Calendar range. */
export const NATIVE_DEVICE_OPERATIONS: ReadonlySet<string> = new Set(['read_calendar_range']);

function operationType(operation: unknown): string {
	return typeof operation === 'object' && operation !== null && typeof (operation as {type?: unknown}).type === 'string' ? (operation as {type: string}).type : '';
}

/**
 * A native Calendar range read with each row's revision added, as the agent's read result requires: the bridge reads the rows
 * and the revision is the workflow hash of each row's own fields (`workflowCalendarRevisionInput`). Anything else is returned as it is.
 * @throws {never}
 */
export async function withCalendarRevisions(answer: unknown): Promise<unknown> {
	if (typeof answer !== 'object' || answer === null) return answer;
	const read = answer as {kind?: unknown; events?: unknown};
	if (read.kind !== 'calendar' || !Array.isArray(read.events)) return answer;
	const events = await Promise.all(read.events.map(async (row: unknown) => {
		if (typeof row !== 'object' || row === null) return row;
		const fields = row as {id: string; calendarId: string; title: string; start: string; end: string; allDay: boolean};
		const revision = await Effect.runPromise(workflowSha(workflowCalendarRevisionInput({
			id: fields.id, calendarId: fields.calendarId, title: fields.title, start: fields.start, end: fields.end, allDay: fields.allDay,
		})));
		return {id: fields.id, calendarId: fields.calendarId, revision, title: fields.title, start: fields.start, end: fields.end, allDay: fields.allDay};
	}));
	return {...read, events};
}

/**
 * The workflow device bridge: the enrolled phone as the agent's own device requests know it, an exact reviewed Calendar
 * range read by the app process over its bridge, and every other step offered to the phone for review (`offer`), which
 * answers with the result it applied.
 * @throws {never}
 */
export function workflowDevice(offer: WorkflowDeviceOffer, ask = askBridge): {
	enrollment(): Promise<{installationId: string; enrollmentId: string; protocol: number} | undefined>;
	perform(binding: WorkflowStep, target: WorkflowStepTarget, operation: unknown, signal?: AbortSignal): Promise<unknown>;
} {
	return {
		enrollment: () => offer.enrollment(),
		perform: (binding, target, operation, signal) => NATIVE_DEVICE_OPERATIONS.has(operationType(operation))
			? ask({op: 'perform', binding, target, operation}).then(withCalendarRevisions)
			: offer.perform(binding, target, operation, signal),
	};
}

/** The `workflow-device` runtime service: the enrolled phone and one bound device step, natively or offered for review. */
export const workflowDeviceService: ServiceClass = hostService(WORKFLOW_DEVICE_SERVICE, "The enrolled phone's reviewed workflow device steps", (runtime) =>
	workflowDevice(workflowDeviceOffer(runtime)));

/** The `workflow-native-digests` runtime service: reviewed native digest sources, over the app process's bridge. */
export const workflowNativeDigestService: ServiceClass = hostService(WORKFLOW_NATIVE_DIGEST_SERVICE, "The phone's reviewed native digest sources", () => ({
	grant: (selection: unknown, expiresAt: number) => bridgeGrant(selection, expiresAt),
	read: (selection: unknown, at: number) => bridgeRead(selection, at),
}));

let residentState: string | undefined;

/** The resident's runtime services for its state directory: the workflow device and native digest bridges. @throws {never} */
export function residentServices(host: ResidentHost): readonly ServiceClass[] {
	residentState = host.stateDirectory;
	return [workflowDeviceService, workflowNativeDigestService];
}

/** The state directory the agent CLI handed the runtime services, once it has. @throws {never} */
export function residentStateDirectory(): string | undefined {
	return residentState;
}


function ownerFile(directory: string, ownerEntityId: string): string {
	return path.join(directory, `${createHash('sha256').update(ownerEntityId, 'utf8').digest('hex')}.json`);
}

function storageFailure(message: string): MapsFailure {
	return new MapsFailure({code: 'storage', message});
}

async function readSaves(file: string): Promise<StoredSaves | undefined> {
	let text: string;
	try {
		text = await readFile(file, 'utf8');
	} catch (error) {
		if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return undefined;
		throw error;
	}
	const stored: unknown = JSON.parse(text);
	const {revision, text: saved} = record(stored);
	if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0 || typeof saved !== 'string') throw new Error('Saved places are damaged');
	return {revision, text: saved};
}

/**
 * The assistant's saved places as files under the resident's state directory, one per owner: a write lands only
 * against the revision it read, through an atomic rename, one write at a time.
 * @throws {never}
 */
export function savedPlaceFiles(directory: () => string | undefined): AgentSavedPlaceStore {
	let queue: Promise<unknown> = Promise.resolve();
	const serial = <A>(work: () => Promise<A>): Promise<A> => {
		const next = queue.then(work, work);
		queue = next.catch(() => undefined);
		return next;
	};
	const root = () => {
		const state = directory();
		if (state === undefined) throw storageFailure('The resident has no state directory yet.');
		return path.join(state, 'maps', 'saved-places');
	};
	return {
		read: (ownerEntityId) => Effect.tryPromise({
			try: () => serial(() => readSaves(ownerFile(root(), ownerEntityId))),
			catch: () => storageFailure('Saved places could not be read.'),
		}),
		write: (ownerEntityId, expectedRevision, text) => Effect.tryPromise({
			try: () => serial(async () => {
				if (Buffer.byteLength(text, 'utf8') > SAVES_LIMIT) return false;
				const folder = root();
				await mkdir(folder, {recursive: true, mode: 0o700});
				const file = ownerFile(folder, ownerEntityId);
				const current = await readSaves(file);
				if ((current?.revision) !== expectedRevision) return false;
				const staged = `${file}.${randomUUID()}.part`;
				await writeFile(staged, JSON.stringify({revision: (current?.revision ?? 0) + 1, text}), {mode: 0o600, flag: 'wx'});
				await rename(staged, file);
				return true;
			}),
			catch: () => storageFailure('Saved places could not be written.'),
		}),
	};
}
