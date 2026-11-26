// spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"; spec/app/platform/adoption.md, "The earlier store is brought in only for the account that signed in to the earlier Alpha"; spec/app/platform/adoption.md, "The earlier store is brought in once, into an empty store, in at most three launches"; spec/app/platform/adoption.md, "Within a launch, a failed bringing-in is tried three times, one and then four seconds apart"; spec/app/platform/adoption.md, "No copy of the earlier store is written to disk: it is read into memory, and an earlier build's copies are removed at start"; spec/app/platform/adoption.md, "What is brought in never acts on its own: every task is paused, a task past its time is marked missed, and earlier grants are left out"
import { Effect } from "effect";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  type Bringing,
  bringingOf,
  broughtTaskOf,
  isEarlierOwner,
  maxEarlierStoreBytes,
  retryDelayMs,
  triesPerLaunch,
} from "../../gen/app__platform__adoption.ts";

/** Cache key written atomically inside the target store once import succeeds. */
export const LEGACY_IMPORT_MARKER_KEY = "legacy-v121-import:v1";

/** File in the account's state directory that counts attempts and records the last outcome. */
export const LEGACY_IMPORT_RECORD_FILE = "earlier-import.json";

/** Name prefix of the plaintext store copies a build of 89bfcc1a8 left in the state directory. */
const EARLIER_SCRATCH_PREFIX = ".earlier-import-";

/** Tag of every task brought in; no scheduler of eliza's reads it. */
export const BROUGHT_TASK_TAG = "earlier-import";

const BROUGHT_TASK_NAME_PREFIX = "earlier-import:";

const BATCH_SIZE = 200;
interface SqlQueryable {
  query<Row = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly Row[] }>;
}

/** Handle to an opened earlier PGlite database copy that can be queried and closed. */
export interface EarlierSqlClient extends SqlQueryable {
  close(): Promise<void>;
}

/** Opens an in-memory image of the earlier PGlite directory, never the directory itself. */
export type LegacyStoreOpener = (image: Blob) => Promise<EarlierSqlClient>;

/** An account named by a user and an organization. */
export interface CloudAccount {
  readonly userId: string;
  readonly organizationId: string;
}

interface TargetStoreAdapter {
  getConnection(): Promise<unknown>;
  transaction<A>(callback: (tx: TargetStoreAdapter) => Promise<A>): Promise<A>;
}

interface ImportLogger {
  warn(context: Record<string, unknown>, message: string): void;
}

interface LegacyImportCounts {
  readonly worlds: number;
  readonly rooms: number;
  readonly entities: number;
  readonly participants: number;
  readonly memories: number;
  readonly tasks: number;
  readonly relationships: number;
  readonly components: number;
}

type SkipReason =
  | "not_the_owner"
  | "no_earlier_store"
  | "already_imported"
  | "store_in_use"
  | "gave_up"
  | "no_adapter"
  | "multi_agent_ambiguous";

type LegacyImportResult =
  | { readonly status: "skipped"; readonly reason: SkipReason }
  | { readonly status: "imported"; readonly sourceAgentId: string | null; readonly targetAgentId: string; readonly counts: LegacyImportCounts }
  | { readonly status: "failed"; readonly error: string };

interface LegacyImportOptions {
  readonly legacyStoreDir: string | undefined;
  readonly owner: CloudAccount | undefined;
  readonly account: CloudAccount | undefined;
  readonly stateDirectory: string;
  readonly agentId: string;
  readonly conversationWorldId?: string;
  readonly adapter: TargetStoreAdapter | undefined;
  readonly openLegacyStore: LegacyStoreOpener;
  readonly logger?: ImportLogger;
  readonly now?: () => number;
  readonly wait?: (ms: number) => Promise<void>;
}

interface ImportRecord {
  readonly attempts: number;
  readonly outcome: LegacyImportResult | { readonly status: "started" };
  readonly at: number;
}

const skipOf: Record<Exclude<Bringing, "BringIn">, SkipReason> = {
  NotTheOwner: "not_the_owner",
  NoEarlierStore: "no_earlier_store",
  AlreadyBroughtIn: "already_imported",
  StoreInUse: "store_in_use",
  GaveUp: "gave_up",
};

interface DeviceRecordWrite {
  readonly key: string;
  readonly data: unknown;
  readonly createdAt: number;
  readonly tableName: string | null;
}

interface EarlierWorldRow {
  readonly id: string;
  readonly agent_id: string | null;
  readonly name: string | null;
  readonly metadata: unknown;
  readonly message_server_id: string | null;
  readonly created_at: unknown;
}

interface EarlierRoomRow {
  readonly id: string;
  readonly agent_id: string | null;
  readonly source: string | null;
  readonly type: string | null;
  readonly message_server_id: string | null;
  readonly connector_server_id: string | null;
  readonly world_id: string | null;
  readonly name: string | null;
  readonly metadata: unknown;
  readonly channel_id: string | null;
  readonly created_at: unknown;
}

interface EarlierEntityRow {
  readonly id: string;
  readonly agent_id: string | null;
  readonly names: unknown;
  readonly metadata: unknown;
  readonly created_at: unknown;
}

interface EarlierParticipantRow {
  readonly id: string | null;
  readonly entity_id: string | null;
  readonly room_id: string | null;
  readonly agent_id: string | null;
  readonly room_state: string | null;
  readonly created_at: unknown;
}

interface EarlierMemoryRow {
  readonly id: string;
  readonly type: string | null;
  readonly created_at: unknown;
  readonly content: unknown;
  readonly entity_id: string | null;
  readonly agent_id: string | null;
  readonly room_id: string | null;
  readonly world_id: string | null;
  readonly unique: unknown;
  readonly metadata: unknown;
}

interface EarlierTaskRow {
  readonly id: string;
  readonly name: string | null;
  readonly description: string | null;
  readonly room_id: string | null;
  readonly world_id: string | null;
  readonly entity_id: string | null;
  readonly agent_id: string | null;
  readonly tags: unknown;
  readonly metadata: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

interface EarlierRelationshipRow {
  readonly id: string;
  readonly source_entity_id: string | null;
  readonly target_entity_id: string | null;
  readonly agent_id: string | null;
  readonly tags: unknown;
  readonly metadata: unknown;
  readonly created_at: unknown;
}

interface EarlierComponentRow {
  readonly id: string;
  readonly entity_id: string | null;
  readonly agent_id: string | null;
  readonly room_id: string | null;
  readonly world_id: string | null;
  readonly source_entity_id: string | null;
  readonly type: string | null;
  readonly data: unknown;
  readonly created_at: unknown;
}

interface PreparedImport {
  readonly sourceAgentId: string | null;
  readonly worlds: readonly DeviceRecordWrite[];
  readonly rooms: readonly DeviceRecordWrite[];
  readonly entities: readonly DeviceRecordWrite[];
  readonly participants: readonly DeviceRecordWrite[];
  readonly memories: readonly DeviceRecordWrite[];
  readonly tasks: readonly DeviceRecordWrite[];
  readonly relationships: readonly DeviceRecordWrite[];
  readonly components: readonly DeviceRecordWrite[];
}

/** Strips NUL code units and lone UTF-16 surrogates while preserving valid surrogate pairs. */
export function sanitizeKeepableString(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0) continue;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += value.slice(i, i + 2);
        i += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    out += value[i] ?? "";
  }
  return out;
}

/** Recursively strips NUL and lone UTF-16 surrogates from JSON values and keys. */
export function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeKeepableString(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : sanitizeJsonValue(item)));
  if (typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) continue;
      cleaned[sanitizeKeepableString(key)] = sanitizeJsonValue(entry);
    }
    return cleaned;
  }
  return null;
}

function asPlainObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseJsonColumn(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function toEpochMs(value: unknown, fallback: number): number {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? Math.trunc(ms) : fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.trunc(numeric);
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    if (typeof item === "string") result.push(sanitizeKeepableString(item));
  }
  return result;
}

function normalizeUserState(value: string | null): "FOLLOWED" | "MUTED" | null {
  return value === "FOLLOWED" || value === "MUTED" ? value : null;
}

function isSqlQueryable(value: unknown): value is SqlQueryable {
  return typeof value === "object" && value !== null && "query" in value && typeof (value as SqlQueryable).query === "function";
}

function isTargetAdapter(value: unknown): value is TargetStoreAdapter {
  return typeof value === "object"
    && value !== null
    && "getConnection" in value
    && typeof (value as TargetStoreAdapter).getConnection === "function"
    && "transaction" in value
    && typeof (value as TargetStoreAdapter).transaction === "function";
}

const encoder = new TextEncoder();

function tarHeader(name: string, size: number, type: "0" | "5"): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(512);
  const put = (offset: number, length: number, text: string) => {
    header.set(encoder.encode(text).subarray(0, length), offset);
  };
  const cut = encoder.encode(name).length > 100 ? name.lastIndexOf("/", 155) : -1;
  if (cut > 0 && encoder.encode(name.slice(cut + 1)).length > 100) throw new Error("An earlier store path is too long to read");
  put(0, 100, cut > 0 ? name.slice(cut + 1) : name);
  put(100, 8, type === "5" ? "0000755\0" : "0000644\0");
  put(108, 8, "0000000\0");
  put(116, 8, "0000000\0");
  put(124, 12, `${size.toString(8).padStart(11, "0")}\0`);
  put(136, 12, "00000000000\0");
  put(148, 8, "        ");
  put(156, 1, type);
  put(257, 6, "ustar\0");
  put(263, 2, "00");
  if (cut > 0) put(345, 155, name.slice(0, cut));
  const sum = header.reduce((total, byte) => total + byte, 0);
  put(148, 8, `${sum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

interface StoreEntry {
  readonly name: string;
  readonly full: string;
  readonly kind: "0" | "5";
}

async function listStoreEntries(directory: string, relative: string, into: StoreEntry[]): Promise<number> {
  const entries = (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  let bytes = 0;
  for (const entry of entries) {
    const name = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (name === "postmaster.pid") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      into.push({ name, full, kind: "5" });
      bytes += await listStoreEntries(full, name, into);
    } else if (entry.isFile()) {
      into.push({ name, full, kind: "0" });
      bytes += (await fs.lstat(full)).size;
    }
  }
  return bytes;
}

/** Reads the earlier store's files, never opening or writing them, into a PGlite image held in memory; a store over the limit is not read. */
async function readStoreImage(sourceDir: string): Promise<{ readonly kind: "image"; readonly image: Blob } | { readonly kind: "too_large" }> {
  const entries: StoreEntry[] = [];
  if (await listStoreEntries(sourceDir, "", entries) > maxEarlierStoreBytes) return { kind: "too_large" };
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  for (const entry of entries) {
    if (entry.kind === "5") {
      chunks.push(tarHeader(`/${entry.name}`, 0, "5"));
      continue;
    }
    const data = new Uint8Array(await fs.readFile(entry.full));
    bytes += data.byteLength;
    if (bytes > maxEarlierStoreBytes) return { kind: "too_large" };
    chunks.push(tarHeader(`/${entry.name}`, data.byteLength, "0"), data);
    const padding = (512 - (data.byteLength % 512)) % 512;
    if (padding > 0) chunks.push(new Uint8Array(padding));
  }
  chunks.push(new Uint8Array(1024));
  return { kind: "image", image: new Blob(chunks) };
}

/** True only for `<files>/.eliza/workspace/.elizadb` whose every directory is a real one: never the vault. */
async function isEarlierWorkspaceStore(sourceDir: string | undefined): Promise<boolean> {
  const dir = sourceDir?.trim();
  if (!dir || !path.isAbsolute(dir) || dir.includes("\0")) return false;
  const workspace = path.dirname(dir);
  const eliza = path.dirname(workspace);
  if (path.basename(dir) !== ".elizadb" || path.basename(workspace) !== "workspace" || path.basename(eliza) !== ".eliza") return false;
  for (const step of [eliza, workspace, dir]) {
    const stat = await fs.lstat(step).catch(() => undefined);
    if (stat === undefined || !stat.isDirectory()) return false;
  }
  return true;
}

/** Removes the plaintext copies a build of 89bfcc1a8 left in the state directory; safe to run on every start. */
async function sweepEarlierScratch(stateDirectory: string): Promise<void> {
  const entries = await fs.readdir(stateDirectory).catch(() => [] as string[]);
  for (const name of entries) {
    if (name.startsWith(EARLIER_SCRATCH_PREFIX)) {
      await fs.rm(path.join(stateDirectory, name), { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function readImportRecord(stateDirectory: string): Promise<ImportRecord> {
  const text = await fs.readFile(path.join(stateDirectory, LEGACY_IMPORT_RECORD_FILE), "utf8").catch(() => undefined);
  const parsed = asPlainObject(text === undefined ? {} : parseJsonColumn(text));
  const attempts = typeof parsed.attempts === "number" && Number.isSafeInteger(parsed.attempts) && parsed.attempts >= 0 ? parsed.attempts : 0;
  return { attempts, outcome: { status: "started" }, at: 0 };
}

async function writeImportRecord(stateDirectory: string, record: ImportRecord): Promise<void> {
  await fs.mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  const target = path.join(stateDirectory, LEGACY_IMPORT_RECORD_FILE);
  const staged = `${target}.next`;
  await fs.writeFile(staged, JSON.stringify(record), { mode: 0o600 });
  await fs.rename(staged, target);
}

function sameAccount(owner: CloudAccount | undefined, account: CloudAccount | undefined): boolean {
  if (owner === undefined || account === undefined) return false;
  return isEarlierOwner(
    owner.userId.toLowerCase(),
    owner.organizationId.toLowerCase(),
    account.userId.toLowerCase(),
    account.organizationId.toLowerCase(),
  );
}

/** Parses the phone's `ALPHA_LEGACY_OWNER` value: a user and an organization, or nothing. */
export function parseEarlierOwner(value: string | undefined): CloudAccount | undefined {
  if (value === undefined) return undefined;
  const parsed = asPlainObject(parseJsonColumn(value));
  const { userId, organizationId } = parsed;
  return typeof userId === "string" && userId.trim() !== "" && typeof organizationId === "string" && organizationId.trim() !== ""
    ? { userId, organizationId }
    : undefined;
}

async function tableColumns(db: SqlQueryable, tableName: string): Promise<Set<string>> {
  const result = await db.query<{ readonly column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
    [tableName],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function tableExists(db: SqlQueryable, tableName: string): Promise<boolean> {
  const result = await db.query<{ readonly exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${tableName}`],
  );
  return result.rows[0]?.exists === true;
}

async function resolveSingleSourceAgentId(db: SqlQueryable): Promise<{ readonly kind: "ok"; readonly agentId: string | null } | { readonly kind: "ambiguous" }> {
  const activeAgents = new Set<string>();
  const dataTables = ["worlds", "rooms", "entities", "memories", "tasks", "relationships", "components", "cache"];
  for (const table of dataTables) {
    if (!await tableExists(db, table)) continue;
    const cols = await tableColumns(db, table);
    if (!cols.has("agent_id")) continue;
    const found = await db.query<{ readonly agent_id: string }>(`SELECT DISTINCT agent_id::text AS agent_id FROM "${table}" WHERE agent_id IS NOT NULL`);
    for (const row of found.rows) {
      if (row.agent_id) activeAgents.add(row.agent_id);
    }
  }
  if (activeAgents.size > 1) return { kind: "ambiguous" };
  if (activeAgents.size === 1) return { kind: "ok", agentId: [...activeAgents][0] ?? null };
  if (await tableExists(db, "agents")) {
    const rows = await db.query<{ readonly id: string }>("SELECT id::text AS id FROM agents");
    if (rows.rows.length > 1) return { kind: "ambiguous" };
    return { kind: "ok", agentId: rows.rows[0]?.id ?? null };
  }
  return { kind: "ok", agentId: null };
}

function isConversationRoom(row: EarlierRoomRow, metadata: Record<string, unknown>): boolean {
  const source = (row.source ?? "").trim().toLowerCase();
  if (source === "client_chat" || source === "web" || source === "device" || source === "conversation_fork_pending") return true;
  if (typeof row.channel_id === "string" && row.channel_id.startsWith("web-conv-")) return true;
  return metadata.webConversation !== undefined || metadata.deviceConversation !== undefined;
}

function buildDeviceConversation(
  row: EarlierRoomRow,
  metadata: Record<string, unknown>,
  createdAt: number,
  latestMessageAt: number,
  seq: number,
): Record<string, unknown> {
  const existing = asPlainObject(metadata.deviceConversation);
  if (typeof existing.id === "string" && typeof existing.createdAt === "number" && typeof existing.updatedAt === "number") {
    return existing;
  }
  const webConv = asPlainObject(metadata.webConversation);
  const channelSuffix = typeof row.channel_id === "string" && row.channel_id.startsWith("web-conv-")
    ? row.channel_id.slice("web-conv-".length).trim()
    : "";
  const id = typeof webConv.conversationId === "string" && webConv.conversationId.trim() !== ""
    ? sanitizeKeepableString(webConv.conversationId.trim())
    : channelSuffix !== ""
      ? sanitizeKeepableString(channelSuffix)
      : row.id;
  const pending = metadata.conversationForkPending === true || row.source === "conversation_fork_pending";
  return {
    id,
    createdAt: Math.max(0, createdAt),
    updatedAt: Math.max(0, createdAt, latestMessageAt),
    seq,
    publication: pending ? "ForkPending" : "Published",
  };
}

function worldRecordFromRow(row: EarlierWorldRow, targetAgentId: string, nowMs: number): DeviceRecordWrite | null {
  if (!row.id) return null;
  const createdAt = toEpochMs(row.created_at, nowMs);
  const data: Record<string, unknown> = {
    id: row.id,
    agentId: targetAgentId,
    name: sanitizeKeepableString(row.name ?? ""),
  };
  if (row.message_server_id) data.messageServerId = row.message_server_id;
  if (row.metadata !== null && row.metadata !== undefined) {
    const { roles: _roles, ownership: _ownership, ...kept } = asPlainObject(sanitizeJsonValue(parseJsonColumn(row.metadata)));
    data.metadata = kept;
  }
  return { key: row.id, data, createdAt, tableName: null };
}

async function readEarlierWorlds(db: SqlQueryable, targetAgentId: string, nowMs: number): Promise<DeviceRecordWrite[]> {
  if (!await tableExists(db, "worlds")) return [];
  const cols = await tableColumns(db, "worlds");
  const select = [
    "id::text AS id",
    "agent_id::text AS agent_id",
    "name",
    cols.has("metadata") ? "metadata AS metadata" : "NULL::jsonb AS metadata",
    cols.has("message_server_id") ? "message_server_id::text AS message_server_id" : "NULL::text AS message_server_id",
    cols.has("created_at") ? "created_at AS created_at" : "NULL AS created_at",
  ].join(", ");
  const { rows } = await db.query<EarlierWorldRow>(`SELECT ${select} FROM worlds`);
  const worlds: DeviceRecordWrite[] = [];
  for (const row of rows) {
    const record = worldRecordFromRow(row, targetAgentId, nowMs);
    if (record !== null) worlds.push(record);
  }
  return worlds;
}

async function readRawEarlierMemories(db: SqlQueryable, nowMs: number): Promise<{
  readonly rawMemories: EarlierMemoryRow[];
  readonly latestMessageByRoom: Map<string, number>;
}> {
  const rawMemories: EarlierMemoryRow[] = [];
  const latestMessageByRoom = new Map<string, number>();
  if (!await tableExists(db, "memories")) return { rawMemories, latestMessageByRoom };
  const cols = await tableColumns(db, "memories");
  const typeExpr = cols.has("type") ? "type" : "'messages'::text";
  const entityExpr = cols.has("entity_id") ? "entity_id::text" : "NULL::text";
  const agentExpr = cols.has("agent_id") ? "agent_id::text" : "NULL::text";
  const roomExpr = cols.has("room_id") ? "room_id::text" : "NULL::text";
  const worldExpr = cols.has("world_id") ? "world_id::text" : "NULL::text";
  const uniqueExpr = cols.has("unique") ? '"unique"' : "true";
  const metaExpr = cols.has("metadata") ? "metadata" : "'{}'::jsonb";
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const rows = await db.query<EarlierMemoryRow>(
    `SELECT id::text AS id, ${typeExpr} AS type, ${createdExpr} AS created_at, content, ${entityExpr} AS entity_id, ${agentExpr} AS agent_id, ${roomExpr} AS room_id, ${worldExpr} AS world_id, ${uniqueExpr} AS "unique", ${metaExpr} AS metadata FROM memories`,
  );
  for (const row of rows.rows) {
    if (!row.id) continue;
    rawMemories.push(row);
    if (row.room_id && (row.type ?? "messages") === "messages") {
      const at = toEpochMs(row.created_at, nowMs);
      const prior = latestMessageByRoom.get(row.room_id) ?? 0;
      if (at > prior) latestMessageByRoom.set(row.room_id, at);
    }
  }
  return { rawMemories, latestMessageByRoom };
}

async function readEarlierRooms(
  db: SqlQueryable,
  targetAgentId: string,
  conversationWorldId: string | undefined,
  latestMessageByRoom: ReadonlyMap<string, number>,
  nowMs: number,
): Promise<{
  readonly rooms: DeviceRecordWrite[];
  readonly remappedRoomWorlds: Map<string, { readonly from: string | null; readonly to: string }>;
}> {
  const rooms: DeviceRecordWrite[] = [];
  const remappedRoomWorlds = new Map<string, { readonly from: string | null; readonly to: string }>();
  if (!await tableExists(db, "rooms")) return { rooms, remappedRoomWorlds };
  const cols = await tableColumns(db, "rooms");
  const serverExpr = cols.has("message_server_id") ? "message_server_id::text" : "NULL::text";
  const connServerExpr = cols.has("connector_server_id") ? "connector_server_id" : "NULL::text";
  const worldExpr = cols.has("world_id") ? "world_id::text" : "NULL::text";
  const nameExpr = cols.has("name") ? "name" : "NULL::text";
  const metaExpr = cols.has("metadata") ? "metadata" : "NULL::jsonb";
  const channelExpr = cols.has("channel_id") ? "channel_id" : "NULL::text";
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const rows = await db.query<EarlierRoomRow>(
    `SELECT id::text AS id, agent_id::text AS agent_id, source, type, ${serverExpr} AS message_server_id, ${connServerExpr} AS connector_server_id, ${worldExpr} AS world_id, ${nameExpr} AS name, ${metaExpr} AS metadata, ${channelExpr} AS channel_id, ${createdExpr} AS created_at FROM rooms ORDER BY ${createdExpr} ASC NULLS LAST, id ASC`,
  );
  let conversationSeq = 0;
  for (const row of rows.rows) {
    if (!row.id) continue;
    const createdAt = toEpochMs(row.created_at, nowMs);
    const metadata = asPlainObject(sanitizeJsonValue(parseJsonColumn(row.metadata ?? {})));
    let worldId = row.world_id ?? undefined;
    if (conversationWorldId !== undefined && isConversationRoom(row, metadata)) {
      conversationSeq += 1;
      const latestAt = latestMessageByRoom.get(row.id) ?? createdAt;
      metadata.deviceConversation = buildDeviceConversation(row, metadata, createdAt, latestAt, conversationSeq);
      if (worldId !== conversationWorldId) {
        if (worldId !== undefined) metadata.importedFromWorldId = worldId;
        remappedRoomWorlds.set(row.id, { from: row.world_id, to: conversationWorldId });
        worldId = conversationWorldId;
      }
    }
    const data: Record<string, unknown> = {
      id: row.id,
      agentId: targetAgentId,
      source: sanitizeKeepableString(row.source ?? "device"),
      type: sanitizeKeepableString(row.type ?? "DM"),
    };
    if (worldId) data.worldId = worldId;
    if (row.name !== null && row.name !== undefined) data.name = sanitizeKeepableString(row.name);
    if (row.channel_id !== null && row.channel_id !== undefined) data.channelId = sanitizeKeepableString(row.channel_id);
    if (row.connector_server_id !== null && row.connector_server_id !== undefined) data.serverId = sanitizeKeepableString(row.connector_server_id);
    if (row.message_server_id) data.messageServerId = row.message_server_id;
    if (Object.keys(metadata).length > 0) data.metadata = metadata;
    rooms.push({ key: row.id, data, createdAt, tableName: null });
  }
  return { rooms, remappedRoomWorlds };
}

async function readEarlierEntities(
  db: SqlQueryable,
  targetAgentId: string,
  remapEntity: (id: string | null) => string | null,
  nowMs: number,
): Promise<DeviceRecordWrite[]> {
  const entities: DeviceRecordWrite[] = [];
  if (!await tableExists(db, "entities")) return entities;
  const cols = await tableColumns(db, "entities");
  const namesExpr = cols.has("names") ? "names" : "ARRAY[]::text[]";
  const metaExpr = cols.has("metadata") ? "metadata" : "'{}'::jsonb";
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const rows = await db.query<EarlierEntityRow>(
    `SELECT id::text AS id, agent_id::text AS agent_id, ${namesExpr} AS names, ${metaExpr} AS metadata, ${createdExpr} AS created_at FROM entities`,
  );
  for (const row of rows.rows) {
    if (!row.id) continue;
    const entityId = remapEntity(row.id) ?? row.id;
    entities.push({
      key: entityId,
      data: {
        id: entityId,
        agentId: targetAgentId,
        names: toStringArray(row.names),
        metadata: asPlainObject(sanitizeJsonValue(parseJsonColumn(row.metadata ?? {}))),
      },
      createdAt: toEpochMs(row.created_at, nowMs),
      tableName: null,
    });
  }
  return entities;
}

async function readEarlierParticipants(
  db: SqlQueryable,
  remapEntity: (id: string | null) => string | null,
  nowMs: number,
): Promise<DeviceRecordWrite[]> {
  const participants: DeviceRecordWrite[] = [];
  const seen = new Set<string>();
  if (!await tableExists(db, "participants")) return participants;
  const cols = await tableColumns(db, "participants");
  const stateExpr = cols.has("room_state") ? "room_state" : "NULL::text";
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const rows = await db.query<EarlierParticipantRow>(
    `SELECT id::text AS id, entity_id::text AS entity_id, room_id::text AS room_id, agent_id::text AS agent_id, ${stateExpr} AS room_state, ${createdExpr} AS created_at FROM participants`,
  );
  for (const row of rows.rows) {
    if (!row.room_id || !row.entity_id) continue;
    const entityId = remapEntity(row.entity_id) ?? row.entity_id;
    const key = JSON.stringify([row.room_id, entityId]);
    if (seen.has(key)) continue;
    seen.add(key);
    participants.push({
      key,
      data: {
        id: row.id ?? randomUUID(),
        entityId,
        roomId: row.room_id,
        userState: normalizeUserState(row.room_state),
      },
      createdAt: toEpochMs(row.created_at, nowMs),
      tableName: null,
    });
  }
  return participants;
}

function earlierTaskTime(tags: readonly string[], metadata: Record<string, unknown>, lastAt: number): number | undefined {
  const trigger = asPlainObject(metadata.trigger);
  for (const candidate of [metadata.dueAt, metadata.scheduledAt, metadata.nextRunAt, trigger.atIso]) {
    if (candidate === undefined || candidate === null) continue;
    const at = toEpochMs(candidate, Number.NaN);
    if (Number.isFinite(at)) return at;
  }
  const interval = metadata.updateInterval;
  if (tags.includes("repeat") && typeof interval === "number" && Number.isFinite(interval) && interval > 0) {
    return toEpochMs(metadata.lastRunAt ?? metadata.updatedAt, lastAt) + interval;
  }
  return undefined;
}

async function readEarlierTasks(
  db: SqlQueryable,
  targetAgentId: string,
  remapEntity: (id: string | null) => string | null,
  nowMs: number,
): Promise<DeviceRecordWrite[]> {
  const tasks: DeviceRecordWrite[] = [];
  if (!await tableExists(db, "tasks")) return tasks;
  const cols = await tableColumns(db, "tasks");
  const descExpr = cols.has("description") ? "description" : "NULL::text";
  const roomExpr = cols.has("room_id") ? "room_id::text" : "NULL::text";
  const worldExpr = cols.has("world_id") ? "world_id::text" : "NULL::text";
  const entityExpr = cols.has("entity_id") ? "entity_id::text" : "NULL::text";
  const tagsExpr = cols.has("tags") ? "tags" : "ARRAY[]::text[]";
  const metaExpr = cols.has("metadata") ? "metadata" : "'{}'::jsonb";
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const updatedExpr = cols.has("updated_at") ? "updated_at" : "NULL";
  const rows = await db.query<EarlierTaskRow>(
    `SELECT id::text AS id, name, ${descExpr} AS description, ${roomExpr} AS room_id, ${worldExpr} AS world_id, ${entityExpr} AS entity_id, agent_id::text AS agent_id, ${tagsExpr} AS tags, ${metaExpr} AS metadata, ${createdExpr} AS created_at, ${updatedExpr} AS updated_at FROM tasks`,
  );
  for (const row of rows.rows) {
    if (!row.id) continue;
    const createdAt = toEpochMs(row.created_at, nowMs);
    const name = sanitizeKeepableString(row.name ?? "");
    const tags = toStringArray(row.tags);
    const metadata = asPlainObject(sanitizeJsonValue(parseJsonColumn(row.metadata ?? {})));
    const updatedAt = row.updated_at !== null && row.updated_at !== undefined ? toEpochMs(row.updated_at, createdAt) : undefined;
    const dueAt = earlierTaskTime(tags, metadata, updatedAt ?? createdAt);
    const data: Record<string, unknown> = {
      id: row.id,
      name: `${BROUGHT_TASK_NAME_PREFIX}${name}`,
      agentId: targetAgentId,
      tags: [BROUGHT_TASK_TAG],
      metadata: {
        paused: true,
        earlierImport: {
          name,
          tags,
          metadata,
          ...(dueAt === undefined ? {} : { dueAt }),
          state: broughtTaskOf(dueAt !== undefined, dueAt ?? 0, nowMs),
        },
      },
      createdAt,
    };
    if (row.description !== null && row.description !== undefined) data.description = sanitizeKeepableString(row.description);
    if (row.room_id) data.roomId = row.room_id;
    if (row.world_id) data.worldId = row.world_id;
    if (row.entity_id) data.entityId = remapEntity(row.entity_id) ?? row.entity_id;
    if (updatedAt !== undefined) data.updatedAt = updatedAt;
    tasks.push({ key: row.id, data, createdAt, tableName: null });
  }
  return tasks;
}

async function readEarlierRelationships(
  db: SqlQueryable,
  targetAgentId: string,
  remapEntity: (id: string | null) => string | null,
  nowMs: number,
): Promise<DeviceRecordWrite[]> {
  const relationships: DeviceRecordWrite[] = [];
  if (!await tableExists(db, "relationships")) return relationships;
  const cols = await tableColumns(db, "relationships");
  const tagsExpr = cols.has("tags") ? "tags" : "ARRAY[]::text[]";
  const metaExpr = cols.has("metadata") ? "metadata" : "'{}'::jsonb";
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const rows = await db.query<EarlierRelationshipRow>(
    `SELECT id::text AS id, source_entity_id::text AS source_entity_id, target_entity_id::text AS target_entity_id, agent_id::text AS agent_id, ${tagsExpr} AS tags, ${metaExpr} AS metadata, ${createdExpr} AS created_at FROM relationships`,
  );
  for (const row of rows.rows) {
    if (!row.id || !row.source_entity_id || !row.target_entity_id) continue;
    const createdAt = toEpochMs(row.created_at, nowMs);
    relationships.push({
      key: row.id,
      data: {
        id: row.id,
        sourceEntityId: remapEntity(row.source_entity_id) ?? row.source_entity_id,
        targetEntityId: remapEntity(row.target_entity_id) ?? row.target_entity_id,
        agentId: targetAgentId,
        tags: toStringArray(row.tags),
        metadata: asPlainObject(sanitizeJsonValue(parseJsonColumn(row.metadata ?? {}))),
        createdAt: new Date(createdAt).toISOString(),
      },
      createdAt,
      tableName: null,
    });
  }
  return relationships;
}

async function readEarlierComponents(
  db: SqlQueryable,
  targetAgentId: string,
  remapEntity: (id: string | null) => string | null,
  nowMs: number,
): Promise<DeviceRecordWrite[]> {
  const components: DeviceRecordWrite[] = [];
  if (!await tableExists(db, "components")) return components;
  const cols = await tableColumns(db, "components");
  const worldExpr = cols.has("world_id") ? "world_id::text" : "NULL::text";
  const sourceEntityExpr = cols.has("source_entity_id") ? "source_entity_id::text" : "NULL::text";
  const dataExpr = cols.has("data") ? "data" : "'{}'::jsonb";
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const rows = await db.query<EarlierComponentRow>(
    `SELECT id::text AS id, entity_id::text AS entity_id, agent_id::text AS agent_id, room_id::text AS room_id, ${worldExpr} AS world_id, ${sourceEntityExpr} AS source_entity_id, type, ${dataExpr} AS data, ${createdExpr} AS created_at FROM components`,
  );
  for (const row of rows.rows) {
    if (!row.id || !row.entity_id || !row.room_id || !row.type) continue;
    const createdAt = toEpochMs(row.created_at, nowMs);
    const data: Record<string, unknown> = {
      id: row.id,
      entityId: remapEntity(row.entity_id) ?? row.entity_id,
      agentId: targetAgentId,
      roomId: row.room_id,
      type: sanitizeKeepableString(row.type),
      data: asPlainObject(sanitizeJsonValue(parseJsonColumn(row.data ?? {}))),
      createdAt,
    };
    if (row.world_id) data.worldId = row.world_id;
    if (row.source_entity_id) data.sourceEntityId = remapEntity(row.source_entity_id) ?? row.source_entity_id;
    components.push({ key: row.id, data, createdAt, tableName: null });
  }
  return components;
}

async function readEarlierRows(
  db: SqlQueryable,
  targetAgentId: string,
  conversationWorldId: string | undefined,
  nowMs: number,
): Promise<{ readonly kind: "ok"; readonly prepared: PreparedImport } | { readonly kind: "ambiguous" }> {
  const resolved = await resolveSingleSourceAgentId(db);
  if (resolved.kind === "ambiguous") return resolved;
  const sourceAgentId = resolved.agentId;
  const remapEntity = (id: string | null): string | null =>
    id === null ? null : sourceAgentId !== null && id === sourceAgentId ? targetAgentId : id;

  const worlds = await readEarlierWorlds(db, targetAgentId, nowMs);
  const { rawMemories, latestMessageByRoom } = await readRawEarlierMemories(db, nowMs);
  const { rooms, remappedRoomWorlds } = await readEarlierRooms(db, targetAgentId, conversationWorldId, latestMessageByRoom, nowMs);
  const entities = await readEarlierEntities(db, targetAgentId, remapEntity, nowMs);
  const participants = await readEarlierParticipants(db, remapEntity, nowMs);
  const memories: DeviceRecordWrite[] = rawMemories.map((row) => {
    const tableName = typeof row.type === "string" && row.type.trim() !== "" ? sanitizeKeepableString(row.type.trim()) : "memories";
    const createdAt = toEpochMs(row.created_at, nowMs);
    const entityId = remapEntity(row.entity_id) ?? targetAgentId;
    const remap = row.room_id ? remappedRoomWorlds.get(row.room_id) : undefined;
    const worldId = remap !== undefined && (row.world_id === null || row.world_id === remap.from)
      ? remap.to
      : row.world_id ?? undefined;
    const data: Record<string, unknown> = {
      id: row.id,
      agentId: targetAgentId,
      entityId,
      content: asPlainObject(sanitizeJsonValue(parseJsonColumn(row.content ?? {}))),
      createdAt,
      unique: row.unique === undefined || row.unique === null ? true : Boolean(row.unique),
      metadata: asPlainObject(sanitizeJsonValue(parseJsonColumn(row.metadata ?? {}))),
    };
    if (row.room_id) data.roomId = row.room_id;
    if (worldId) data.worldId = worldId;
    return { key: row.id, data, createdAt, tableName };
  });
  const tasks = await readEarlierTasks(db, targetAgentId, remapEntity, nowMs);
  const relationships = await readEarlierRelationships(db, targetAgentId, remapEntity, nowMs);
  const components = await readEarlierComponents(db, targetAgentId, remapEntity, nowMs);

  return {
    kind: "ok",
    prepared: { sourceAgentId, worlds, rooms, entities, participants, memories, tasks, relationships, components },
  };
}

/** The store is in use once it holds a memory, a room, or a world other than the conversation world the host makes at every start. */
async function readTargetEligibility(conn: SqlQueryable, conversationWorldId: string | undefined): Promise<{
  readonly marked: boolean;
  readonly populated: boolean;
}> {
  const status = await conn.query<{ readonly marked: boolean; readonly populated: boolean }>(
    `SELECT
       EXISTS(SELECT 1 FROM device_records WHERE collection = 'cache' AND key = $1) AS marked,
       EXISTS(SELECT 1 FROM device_records WHERE collection IN ('memories', 'rooms')
         OR (collection = 'worlds' AND key IS DISTINCT FROM $2)) AS populated`,
    [LEGACY_IMPORT_MARKER_KEY, conversationWorldId ?? null],
  );
  return { marked: status.rows[0]?.marked === true, populated: status.rows[0]?.populated === true };
}

async function writeBatch(conn: SqlQueryable, collection: string, rows: readonly DeviceRecordWrite[]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const chunk = rows.slice(offset, offset + BATCH_SIZE);
    await conn.query(
      `INSERT INTO device_records (collection, key, data, created_at, table_name)
       SELECT $1, key, data, "createdAt", "tableName"
       FROM jsonb_to_recordset($2::jsonb) AS item(key text, data jsonb, "createdAt" bigint, "tableName" text)
       ON CONFLICT (collection, key) DO NOTHING`,
      [collection, JSON.stringify(chunk)],
    );
  }
}

/**
 * Brings the earlier v121 store into this account's empty device store, once, only for its owner.
 * Reads the store's files into an in-memory image (never opening or writing them), writes every
 * record plus the marker in one transaction, records the attempt and outcome in the state
 * directory, and never fails boot.
 */
export async function importLegacyStore(options: LegacyImportOptions): Promise<LegacyImportResult> {
  await sweepEarlierScratch(options.stateDirectory);
  if (options.legacyStoreDir === undefined) return { status: "skipped", reason: skipOf.NoEarlierStore };
  const nowMs = (options.now ?? Date.now)();
  const result: LegacyImportResult = sameAccount(options.owner, options.account)
    ? await decideAndBringIn(options, nowMs)
    : { status: "skipped", reason: skipOf.NotTheOwner };
  if (!isSettledByAnEarlierLaunch(result)) {
    const record = await readImportRecord(options.stateDirectory);
    await writeImportRecord(options.stateDirectory, { attempts: record.attempts, outcome: result, at: nowMs }).catch(() => undefined);
  }
  if (result.status !== "imported") {
    options.logger?.warn({ src: "alpha:earlier-import", outcome: result }, "The earlier store was not brought in");
  }
  return result;
}

function isSettledByAnEarlierLaunch(result: LegacyImportResult): boolean {
  return result.status === "skipped" && (result.reason === "already_imported" || result.reason === "gave_up");
}

function failureOf(error: unknown): string {
  if (!(error instanceof Error)) return "Error";
  const code = (error as { readonly code?: unknown }).code;
  return typeof code === "string" && /^[A-Za-z0-9_]{1,32}$/.test(code) ? `${error.name}:${code}` : error.name;
}

async function decideAndBringIn(options: LegacyImportOptions, nowMs: number): Promise<LegacyImportResult> {
  const storeHeld = await isEarlierWorkspaceStore(options.legacyStoreDir);
  if (!storeHeld) return { status: "skipped", reason: skipOf.NoEarlierStore };
  if (!isTargetAdapter(options.adapter)) return { status: "skipped", reason: "no_adapter" };
  const adapter = options.adapter;
  const sourceDir = options.legacyStoreDir?.trim() ?? "";
  try {
    const rawConn = await adapter.getConnection();
    if (!isSqlQueryable(rawConn)) return { status: "skipped", reason: "no_adapter" };
    const preflight = await readTargetEligibility(rawConn, options.conversationWorldId);
    const record = await readImportRecord(options.stateDirectory);
    const bringing = bringingOf(true, storeHeld, preflight.marked, preflight.populated, record.attempts);
    if (bringing !== "BringIn") return { status: "skipped", reason: skipOf[bringing] };
    await writeImportRecord(options.stateDirectory, { attempts: record.attempts + 1, outcome: { status: "started" }, at: nowMs });
    const wait = options.wait ?? ((ms: number) => Effect.runPromise(Effect.sleep(ms)));
    for (let failures = 1; ; failures += 1) {
      try {
        return await bringIn(options, adapter, sourceDir, nowMs);
      } catch (error) {
        if (failures >= triesPerLaunch) return { status: "failed", error: failureOf(error) };
        await wait(retryDelayMs(failures));
      }
    }
  } catch (error) {
    return { status: "failed", error: failureOf(error) };
  }
}

async function bringIn(
  options: LegacyImportOptions,
  adapter: TargetStoreAdapter,
  sourceDir: string,
  nowMs: number,
): Promise<LegacyImportResult> {
  const read = await readStoreImage(sourceDir);
  if (read.kind === "too_large") return { status: "failed", error: "source_too_large" };
  const sourceClient = await options.openLegacyStore(read.image);
  try {
    const extracted = await readEarlierRows(sourceClient, options.agentId, options.conversationWorldId, nowMs);
    if (extracted.kind === "ambiguous") return { status: "skipped", reason: "multi_agent_ambiguous" };
    const { prepared } = extracted;
    const counts: LegacyImportCounts = {
      worlds: prepared.worlds.length,
      rooms: prepared.rooms.length,
      entities: prepared.entities.length,
      participants: prepared.participants.length,
      memories: prepared.memories.length,
      tasks: prepared.tasks.length,
      relationships: prepared.relationships.length,
      components: prepared.components.length,
    };
    const marker: DeviceRecordWrite = {
      key: LEGACY_IMPORT_MARKER_KEY,
      data: { value: { version: 2, importedAt: nowMs, sourceAgentId: prepared.sourceAgentId, targetAgentId: options.agentId, counts } },
      createdAt: nowMs,
      tableName: null,
    };
    return await adapter.transaction(async (tx): Promise<LegacyImportResult> => {
      const txConn = await tx.getConnection();
      if (!isSqlQueryable(txConn)) return { status: "skipped", reason: "no_adapter" };
      const inside = await readTargetEligibility(txConn, options.conversationWorldId);
      if (inside.marked) return { status: "skipped", reason: "already_imported" };
      if (inside.populated) return { status: "skipped", reason: "store_in_use" };
      await writeBatch(txConn, "worlds", prepared.worlds);
      await writeBatch(txConn, "rooms", prepared.rooms);
      await writeBatch(txConn, "entities", prepared.entities);
      await writeBatch(txConn, "participants", prepared.participants);
      await writeBatch(txConn, "memories", prepared.memories);
      await writeBatch(txConn, "tasks", prepared.tasks);
      await writeBatch(txConn, "relationships", prepared.relationships);
      await writeBatch(txConn, "components", prepared.components);
      await writeBatch(txConn, "cache", [marker]);
      return { status: "imported", sourceAgentId: prepared.sourceAgentId, targetAgentId: options.agentId, counts };
    });
  } finally {
    await sourceClient.close().catch(() => undefined);
  }
}

/** Runs the one-shot importer against an AgentRuntime during Alpha product plugin init. */
export async function importLegacyStoreForRuntime(options: {
  readonly legacyStoreDir: string | undefined;
  readonly owner: CloudAccount | undefined;
  readonly account: CloudAccount | undefined;
  readonly stateDirectory: string | undefined;
  readonly runtime: unknown;
  readonly conversationWorldId?: string;
  readonly openLegacyStore: LegacyStoreOpener;
}): Promise<LegacyImportResult> {
  if (options.stateDirectory === undefined || !path.isAbsolute(options.stateDirectory)) return { status: "skipped", reason: "no_adapter" };
  const runtimeRecord = asPlainObject(options.runtime);
  const agentId = typeof runtimeRecord.agentId === "string" ? runtimeRecord.agentId : "";
  if (!agentId) return { status: "skipped", reason: "no_adapter" };
  const adapter = isTargetAdapter(runtimeRecord.adapter) ? runtimeRecord.adapter : undefined;
  const rawLogger = asPlainObject(runtimeRecord.logger);
  const logger: ImportLogger | undefined = typeof rawLogger.warn === "function"
    ? { warn: (ctx, msg) => { (rawLogger.warn as (c: Record<string, unknown>, m: string) => void)(ctx, msg); } }
    : undefined;
  return importLegacyStore({
    legacyStoreDir: options.legacyStoreDir,
    owner: options.owner,
    account: options.account,
    stateDirectory: options.stateDirectory,
    agentId,
    conversationWorldId: options.conversationWorldId,
    adapter,
    openLegacyStore: options.openLegacyStore,
    logger,
  });
}
