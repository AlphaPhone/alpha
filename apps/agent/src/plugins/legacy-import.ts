// spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Cache key written atomically inside the target store once import succeeds. */
export const LEGACY_IMPORT_MARKER_KEY = "legacy-v121-import:v1";

const BATCH_SIZE = 200;
const EMBEDDING_COLUMNS = [
  "dim_384",
  "dim_512",
  "dim_768",
  "dim_1024",
  "dim_1536",
  "dim_2048",
  "dim_3072",
  "embedding",
] as const;

const SECRET_KEY_TOKENS = [
  "auth",
  "token",
  "secret",
  "credential",
  "password",
  "passwd",
  "passphrase",
  "session",
  "oauth",
  "jwt",
  "bearer",
  "cookie",
  "apikey",
  "api_key",
  "api-key",
  "private_key",
  "private-key",
  "privatekey",
  "signing_key",
  "signing-key",
  "signingkey",
  "refresh",
  "vault",
  "custody",
  "pairing",
  "bootstrap",
  "jti",
] as const;

interface SqlQueryable {
  query<Row = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly Row[] }>;
}

/** Handle to an opened earlier PGlite database copy that can be queried and closed. */
export interface EarlierSqlClient extends SqlQueryable {
  close(): Promise<void>;
}

/** Opens a copied earlier PGlite directory for read-only inspection. */
export type LegacyStoreOpener = (dataDir: string) => Promise<EarlierSqlClient>;

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
  readonly cache: number;
}

type LegacyImportResult =
  | { readonly status: "skipped"; readonly reason: "no_source_dir" | "source_missing" | "no_adapter" | "already_imported" | "target_not_empty" | "multi_agent_ambiguous" }
  | { readonly status: "imported"; readonly sourceAgentId: string | null; readonly targetAgentId: string; readonly counts: LegacyImportCounts }
  | { readonly status: "failed"; readonly error: string };

interface LegacyImportOptions {
  readonly legacyStoreDir: string | undefined;
  readonly stateDirectory?: string;
  readonly agentId: string;
  readonly conversationWorldId?: string;
  readonly embeddingDimensions?: number;
  readonly adapter: TargetStoreAdapter | undefined;
  readonly openLegacyStore: LegacyStoreOpener;
  readonly logger?: ImportLogger;
  readonly now?: () => number;
}

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

interface EarlierCacheRow {
  readonly key: string;
  readonly agent_id: string | null;
  readonly value: unknown;
  readonly created_at: unknown;
  readonly expires_at: unknown;
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
  readonly cache: readonly DeviceRecordWrite[];
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

/** Returns true when a cache key names auth, token, secret, session, or credential material. */
export function isSecretOrAuthCacheKey(key: string): boolean {
  const lower = key.trim().toLowerCase();
  if (lower === "" || lower === LEGACY_IMPORT_MARKER_KEY) return true;
  for (const token of SECRET_KEY_TOKENS) {
    if (lower.includes(token)) return true;
  }
  return false;
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

function parseVectorText(raw: unknown): number[] | undefined {
  if (Array.isArray(raw)) {
    const numbers = raw.map((item) => Number(item));
    return numbers.length > 0 && numbers.every(Number.isFinite) ? numbers : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return undefined;
  const body = trimmed.slice(1, -1).trim();
  if (body === "") return undefined;
  const numbers = body.split(",").map((part) => Number(part.trim()));
  return numbers.length > 0 && numbers.every(Number.isFinite) ? numbers : undefined;
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

async function copyDirectoryWithoutMutatingSource(sourceDir: string, destDir: string, isRoot: boolean): Promise<void> {
  await fs.mkdir(destDir, { recursive: true, mode: 0o700 });
  await fs.chmod(destDir, 0o700);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (isRoot && entry.name === "postmaster.pid") continue;
    if (entry.isSymbolicLink()) continue;
    const srcPath = path.join(sourceDir, entry.name);
    const dstPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirectoryWithoutMutatingSource(srcPath, dstPath, false);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, dstPath);
      await fs.chmod(dstPath, 0o600);
    } else {
      const stat = await fs.lstat(srcPath);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        await copyDirectoryWithoutMutatingSource(srcPath, dstPath, false);
      } else if (stat.isFile()) {
        await fs.copyFile(srcPath, dstPath);
        await fs.chmod(dstPath, 0o600);
      }
    }
  }
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

async function readEmbeddingsByMemoryId(db: SqlQueryable, targetDimensions: number): Promise<Map<string, number[]>> {
  const vectors = new Map<string, number[]>();
  if (targetDimensions <= 0 || !await tableExists(db, "embeddings")) return vectors;
  const cols = await tableColumns(db, "embeddings");
  if (!cols.has("memory_id")) return vectors;
  const presentDimCols = EMBEDDING_COLUMNS.filter((col) => cols.has(col));
  if (presentDimCols.length === 0) return vectors;
  const selectExprs = presentDimCols.map((col) => `"${col}"::text AS "${col}"`).join(", ");
  const rows = await db.query<Record<string, unknown>>(
    `SELECT memory_id::text AS memory_id, ${selectExprs} FROM embeddings WHERE memory_id IS NOT NULL`,
  );
  for (const row of rows.rows) {
    const memoryId = typeof row.memory_id === "string" ? row.memory_id : "";
    if (!memoryId) continue;
    for (const col of presentDimCols) {
      const parsed = parseVectorText(row[col]);
      if (parsed !== undefined && parsed.length === targetDimensions) {
        vectors.set(memoryId, parsed);
        break;
      }
    }
  }
  return vectors;
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
  if (row.metadata !== null && row.metadata !== undefined) data.metadata = sanitizeJsonValue(parseJsonColumn(row.metadata));
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
    const data: Record<string, unknown> = {
      id: row.id,
      name: sanitizeKeepableString(row.name ?? ""),
      agentId: targetAgentId,
      tags: toStringArray(row.tags),
      metadata: asPlainObject(sanitizeJsonValue(parseJsonColumn(row.metadata ?? {}))),
      createdAt,
    };
    if (row.description !== null && row.description !== undefined) data.description = sanitizeKeepableString(row.description);
    if (row.room_id) data.roomId = row.room_id;
    if (row.world_id) data.worldId = row.world_id;
    if (row.entity_id) data.entityId = remapEntity(row.entity_id) ?? row.entity_id;
    if (row.updated_at !== null && row.updated_at !== undefined) data.updatedAt = toEpochMs(row.updated_at, createdAt);
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

async function readEarlierCache(db: SqlQueryable, nowMs: number): Promise<DeviceRecordWrite[]> {
  const cache: DeviceRecordWrite[] = [];
  if (!await tableExists(db, "cache")) return cache;
  const cols = await tableColumns(db, "cache");
  const createdExpr = cols.has("created_at") ? "created_at" : "NULL";
  const expiresExpr = cols.has("expires_at") ? "expires_at" : "NULL";
  const rows = await db.query<EarlierCacheRow>(
    `SELECT key, agent_id::text AS agent_id, value, ${createdExpr} AS created_at, ${expiresExpr} AS expires_at FROM cache`,
  );
  for (const row of rows.rows) {
    if (typeof row.key !== "string" || isSecretOrAuthCacheKey(row.key)) continue;
    if (row.expires_at !== null && row.expires_at !== undefined && toEpochMs(row.expires_at, nowMs + 1) <= nowMs) continue;
    const key = sanitizeKeepableString(row.key);
    if (isSecretOrAuthCacheKey(key)) continue;
    cache.push({
      key,
      data: { value: sanitizeJsonValue(parseJsonColumn(row.value)) },
      createdAt: toEpochMs(row.created_at, nowMs),
      tableName: null,
    });
  }
  return cache;
}

async function readEarlierRows(
  db: SqlQueryable,
  targetAgentId: string,
  conversationWorldId: string | undefined,
  targetDimensions: number,
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
  const embeddingsByMemoryId = await readEmbeddingsByMemoryId(db, targetDimensions);
  const memories: DeviceRecordWrite[] = rawMemories.map((row) => {
    const tableName = typeof row.type === "string" && row.type.trim() !== "" ? sanitizeKeepableString(row.type.trim()) : "memories";
    const createdAt = toEpochMs(row.created_at, nowMs);
    const entityId = remapEntity(row.entity_id) ?? targetAgentId;
    const remap = row.room_id ? remappedRoomWorlds.get(row.room_id) : undefined;
    const worldId = remap !== undefined && (row.world_id === null || row.world_id === remap.from)
      ? remap.to
      : row.world_id ?? undefined;
    const embedding = embeddingsByMemoryId.get(row.id);
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
    if (embedding !== undefined) data.embedding = embedding;
    return { key: row.id, data, createdAt, tableName };
  });
  const tasks = await readEarlierTasks(db, targetAgentId, remapEntity, nowMs);
  const relationships = await readEarlierRelationships(db, targetAgentId, remapEntity, nowMs);
  const components = await readEarlierComponents(db, targetAgentId, remapEntity, nowMs);
  const cache = await readEarlierCache(db, nowMs);

  return {
    kind: "ok",
    prepared: { sourceAgentId, worlds, rooms, entities, participants, memories, tasks, relationships, components, cache },
  };
}

async function readTargetEligibility(conn: SqlQueryable, fallbackDimensions: number): Promise<{
  readonly marked: boolean;
  readonly populated: boolean;
  readonly embeddingDimensions: number;
}> {
  const status = await conn.query<{ readonly marked: boolean; readonly populated: boolean }>(
    `SELECT
       EXISTS(SELECT 1 FROM device_records WHERE collection = 'cache' AND key = $1) AS marked,
       EXISTS(SELECT 1 FROM device_records WHERE collection IN ('memories', 'rooms', 'worlds')) AS populated`,
    [LEGACY_IMPORT_MARKER_KEY],
  );
  const owner = await conn.query<{ readonly embedding_dimensions: number }>(
    "SELECT embedding_dimensions FROM device_owner WHERE singleton",
  );
  return {
    marked: status.rows[0]?.marked === true,
    populated: status.rows[0]?.populated === true,
    embeddingDimensions: owner.rows[0]?.embedding_dimensions ?? fallbackDimensions,
  };
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
 * One-shot importer from an archived earlier PGlite store into a fresh v4 device store.
 * Copies the source directory to a private 0700 temp directory before opening (never mutating
 * the archive), writes all migrated records plus the idempotency marker in one transaction,
 * and logs a warning without failing boot on any unreadable or corrupt earlier database.
 */
export async function importLegacyStore(options: LegacyImportOptions): Promise<LegacyImportResult> {
  const sourceDir = options.legacyStoreDir?.trim();
  if (!sourceDir || !path.isAbsolute(sourceDir) || sourceDir.includes("\0")) {
    return { status: "skipped", reason: "no_source_dir" };
  }
  if (!isTargetAdapter(options.adapter)) {
    return { status: "skipped", reason: "no_adapter" };
  }
  const nowMs = (options.now ?? Date.now)();
  let tempRoot: string | undefined;
  let sourceClient: EarlierSqlClient | undefined;
  try {
    const sourceStat = await fs.lstat(sourceDir).catch(() => undefined);
    if (sourceStat === undefined || sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) {
      return { status: "skipped", reason: "source_missing" };
    }
    const rawConn = await options.adapter.getConnection();
    if (!isSqlQueryable(rawConn)) return { status: "skipped", reason: "no_adapter" };
    const preflight = await readTargetEligibility(rawConn, options.embeddingDimensions ?? 0);
    if (preflight.marked) return { status: "skipped", reason: "already_imported" };
    if (preflight.populated) return { status: "skipped", reason: "target_not_empty" };

    const tempBase = options.stateDirectory && path.isAbsolute(options.stateDirectory) ? options.stateDirectory : os.tmpdir();
    await fs.mkdir(tempBase, { recursive: true, mode: 0o700 });
    tempRoot = await fs.mkdtemp(path.join(tempBase, ".earlier-import-"));
    await fs.chmod(tempRoot, 0o700);
    const tempDbDir = path.join(tempRoot, "db");
    await copyDirectoryWithoutMutatingSource(sourceDir, tempDbDir, true);
    await fs.rm(path.join(tempDbDir, "postmaster.pid"), { force: true });

    sourceClient = await options.openLegacyStore(tempDbDir);
    const extracted = await readEarlierRows(
      sourceClient,
      options.agentId,
      options.conversationWorldId,
      preflight.embeddingDimensions,
      nowMs,
    );
    if (extracted.kind === "ambiguous") {
      options.logger?.warn({ src: "alpha:earlier-import" }, "Skipped earlier store import because multiple agent records were present");
      return { status: "skipped", reason: "multi_agent_ambiguous" };
    }
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
      cache: prepared.cache.length,
    };

    const marker: DeviceRecordWrite = {
      key: LEGACY_IMPORT_MARKER_KEY,
      data: {
        value: {
          version: 1,
          importedAt: nowMs,
          sourceAgentId: prepared.sourceAgentId,
          targetAgentId: options.agentId,
          counts,
        },
      },
      createdAt: nowMs,
      tableName: null,
    };

    const outcome = await options.adapter.transaction(async (tx): Promise<LegacyImportResult> => {
      const txConn = await tx.getConnection();
      if (!isSqlQueryable(txConn)) return { status: "skipped", reason: "no_adapter" };
      const inside = await readTargetEligibility(txConn, preflight.embeddingDimensions);
      if (inside.marked) return { status: "skipped", reason: "already_imported" };
      if (inside.populated) return { status: "skipped", reason: "target_not_empty" };
      await writeBatch(txConn, "worlds", prepared.worlds);
      await writeBatch(txConn, "rooms", prepared.rooms);
      await writeBatch(txConn, "entities", prepared.entities);
      await writeBatch(txConn, "participants", prepared.participants);
      await writeBatch(txConn, "memories", prepared.memories);
      await writeBatch(txConn, "tasks", prepared.tasks);
      await writeBatch(txConn, "relationships", prepared.relationships);
      await writeBatch(txConn, "components", prepared.components);
      await writeBatch(txConn, "cache", [...prepared.cache, marker]);
      return { status: "imported", sourceAgentId: prepared.sourceAgentId, targetAgentId: options.agentId, counts };
    });
    return outcome;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.logger?.warn({ src: "alpha:earlier-import", error: message }, "Earlier store import failed; continuing with fresh device store");
    return { status: "failed", error: message };
  } finally {
    if (sourceClient !== undefined) {
      await sourceClient.close().catch(() => undefined);
    }
    if (tempRoot !== undefined) {
      await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

/** Runs the one-shot importer against an AgentRuntime during Alpha product plugin init. */
export async function importLegacyStoreForRuntime(options: {
  readonly legacyStoreDir: string | undefined;
  readonly stateDirectory?: string;
  readonly runtime: unknown;
  readonly conversationWorldId?: string;
  readonly embeddingDimensions?: number;
  readonly openLegacyStore: LegacyStoreOpener;
}): Promise<LegacyImportResult> {
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
    stateDirectory: options.stateDirectory,
    agentId,
    conversationWorldId: options.conversationWorldId,
    embeddingDimensions: options.embeddingDimensions,
    adapter,
    openLegacyStore: options.openLegacyStore,
    logger,
  });
}
