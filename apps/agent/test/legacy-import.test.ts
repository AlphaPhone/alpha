// spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"; spec/app/platform/adoption.md, "The earlier store is brought in only for the account that signed in to the earlier Alpha"; spec/app/platform/adoption.md, "The earlier store is brought in once, into an empty store, in at most three launches"; spec/app/platform/adoption.md, "What is brought in never acts on its own: every task is paused, a task past its time is marked missed, and earlier grants are left out"
import { deviceConversation } from "@elizaos/agent-host";
import { checkout } from "@repo/eliza-harness";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { ModuleContext } from "@elizaos/agent-host";
import { Effect } from "effect";
import { alphaAppsModuleWith, createAlphaAppsPlugin } from "../src/plugins/index.ts";
import {
  BROUGHT_TASK_TAG,
  type EarlierSqlClient,
  importLegacyStore,
  LEGACY_IMPORT_MARKER_KEY,
  LEGACY_IMPORT_RECORD_FILE,
  sanitizeJsonValue,
  sanitizeKeepableString,
} from "../src/plugins/legacy-import.ts";

interface PGliteStatic {
  create(options?: { readonly dataDir?: string; readonly loadDataDir?: Blob; readonly extensions?: Record<string, unknown> }): Promise<EarlierSqlClient & { exec(sql: string): Promise<unknown> }>;
}

interface OpenedDeviceStore {
  readonly agentId: string;
  readonly adapter: {
    getConnection(): Promise<{ query<Row = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly Row[] }> }>;
    transaction<A>(callback: (tx: OpenedDeviceStore["adapter"]) => Promise<A>): Promise<A>;
    getAllWorlds(): Promise<Array<{ id: string; agentId: string; name?: string }>>;
    createWorlds(worlds: Array<{ id: string; agentId: string; name: string }>): Promise<string[]>;
    getRoomsByIds(ids: string[]): Promise<Array<{ id: string; agentId?: string; worldId?: string; name?: string; metadata?: Record<string, unknown> }>>;
    createRooms(rooms: Array<Record<string, unknown>>): Promise<string[]>;
    getEntitiesByIds(ids: string[]): Promise<Array<{ id: string; agentId: string; names: string[] }>>;
    getParticipantsForRooms(rooms: string[]): Promise<Array<{ roomId: string; entityIds: string[] }>>;
    getMemories(input: { roomId?: string; tableName: string; includeEmbedding?: boolean }): Promise<Array<{
      id?: string;
      agentId?: string;
      entityId: string;
      roomId: string;
      worldId?: string;
      content: { text?: string };
      embedding?: number[];
      createdAt?: number;
    }>>;
    createMemories(inputs: Array<{ memory: Record<string, unknown>; tableName: string }>): Promise<string[]>;
    getTasks(input: Record<string, unknown>): Promise<Array<{ id?: string; name: string; agentId?: string; tags?: string[]; metadata?: Record<string, unknown> }>>;
    getRelationships(input: { entityIds: string[] }): Promise<Array<{ id: string; sourceEntityId: string; targetEntityId: string; agentId: string; tags: string[] }>>;
    getCaches<A>(keys: string[]): Promise<Map<string, A>>;
    close(): Promise<void>;
  };
}

interface StorageModule {
  openDeviceStorage(options: {
    stateDirectory: string;
    persistMemory: boolean;
    account: { userId: string; organizationId: string } | null;
    embeddingDimensions: number;
  }): Promise<OpenedDeviceStore>;
}

interface MigrateModule {
  migrate(db: EarlierSqlClient, owner: { agentId: string; account: { userId: string; organizationId: string } | null; embeddingDimensions: number }, list: readonly unknown[], seeded: boolean): Promise<void>;
}

const OLD_AGENT_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_AGENT_ID = "22222222-2222-4222-8222-222222222222";
const OWNER_ENTITY_ID = "33333333-3333-4333-8333-333333333333";
const WORLD_ID = "44444444-4444-4444-8444-444444444444";
const CONVERSATION_WORLD_ID = "55555555-5555-4555-8555-555555555555";
const CHAT_ROOM_ID = "66666666-6666-4666-8666-666666666666";
const OTHER_ROOM_ID = "77777777-7777-4777-8777-777777777777";
const USER_MSG_ID = "88888888-8888-4888-8888-888888888881";
const AGENT_MSG_ID = "88888888-8888-4888-8888-888888888882";
const FACT_MSG_ID = "88888888-8888-4888-8888-888888888883";
const TASK_ID = "99999999-9999-4999-8999-999999999991";
const PAST_TASK_ID = "99999999-9999-4999-8999-999999999992";
const LATER_TASK_ID = "99999999-9999-4999-8999-999999999993";
const REL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const COMP_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) fs.rmSync(dir, { recursive: true, force: true });
  }
});

async function loadElizaStorageTools() {
  const root = checkout().root;
  const req = createRequire(path.join(root, "packages/agent-host/package.json"));
  const { PGlite } = req("@electric-sql/pglite") as { readonly PGlite: PGliteStatic };
  const { vector } = req("@electric-sql/pglite/vector") as { readonly vector: unknown };
  const storage = (await import(pathToFileURL(path.join(root, "packages/agent-host/dist/src/storage/index.js")).href)) as StorageModule;
  const migrator = (await import(pathToFileURL(path.join(root, "packages/agent-host/dist/src/storage/migrate.js")).href)) as MigrateModule;
  const openEarlier = (image: Blob): Promise<EarlierSqlClient> =>
    PGlite.create({ loadDataDir: image, extensions: { vector } });
  return { PGlite, vector, storage, migrator, openEarlier };
}

function makeEarlierStoreDir(prefix: string): string {
  const dir = path.join(makeTempDir(prefix), ".eliza/workspace/.elizadb");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const account = (userId: string, organizationId: string) => ({ userId, organizationId });
const noWait = () => Promise.resolve();

function readRecord(stateDir: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(stateDir, LEGACY_IMPORT_RECORD_FILE), "utf8"));
}

function scratchLeft(stateDir: string): string[] {
  return fs.readdirSync(stateDir).filter((name) => name.startsWith(".earlier-import-"));
}

function snapshotDirectory(root: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  const walk = (current: string) => {
    for (const name of fs.readdirSync(current).sort()) {
      const full = path.join(current, name);
      const rel = path.relative(root, full);
      const stat = fs.lstatSync(full);
      if (stat.isDirectory()) {
        hashes[rel] = "dir";
        walk(full);
      } else if (stat.isFile()) {
        const bytes = fs.readFileSync(full);
        hashes[rel] = `file:${bytes.byteLength}:${createHash("sha256").update(bytes).digest("hex")}`;
      }
    }
  };
  walk(root);
  return hashes;
}

async function createSyntheticV121Fixture(
  PGlite: PGliteStatic,
  vector: unknown,
  fixtureDir: string,
  options: { readonly multiAgent?: boolean } = {},
): Promise<void> {
  const db = await PGlite.create({ dataDir: fixtureDir, extensions: { vector } });
  try {
    await db.exec(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE agents (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE worlds (
        id uuid PRIMARY KEY,
        agent_id uuid NOT NULL REFERENCES agents(id),
        name text NOT NULL,
        metadata jsonb,
        message_server_id uuid,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE rooms (
        id uuid PRIMARY KEY,
        agent_id uuid REFERENCES agents(id),
        source text NOT NULL,
        type text NOT NULL,
        message_server_id uuid,
        connector_server_id text,
        world_id uuid,
        name text,
        metadata jsonb,
        channel_id text,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE entities (
        id uuid PRIMARY KEY,
        agent_id uuid NOT NULL REFERENCES agents(id),
        created_at timestamp NOT NULL DEFAULT now(),
        names text[] NOT NULL DEFAULT '{}'::text[],
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE TABLE participants (
        id uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        entity_id uuid REFERENCES entities(id),
        room_id uuid REFERENCES rooms(id),
        agent_id uuid REFERENCES agents(id),
        room_state text
      );
      CREATE TABLE memories (
        id uuid PRIMARY KEY,
        type text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        content json NOT NULL,
        entity_id uuid REFERENCES entities(id),
        agent_id uuid NOT NULL REFERENCES agents(id),
        room_id uuid REFERENCES rooms(id),
        world_id uuid,
        "unique" boolean NOT NULL DEFAULT true,
        metadata json NOT NULL DEFAULT '{}'::json
      );
      CREATE TABLE embeddings (
        id uuid PRIMARY KEY,
        memory_id uuid REFERENCES memories(id),
        created_at timestamp NOT NULL DEFAULT now(),
        dim_384 vector(384),
        dim_1536 vector(1536)
      );
      CREATE TABLE tasks (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        description text,
        room_id uuid,
        world_id uuid,
        entity_id uuid,
        agent_id uuid NOT NULL REFERENCES agents(id),
        tags text[] DEFAULT '{}'::text[],
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE relationships (
        id uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        source_entity_id uuid NOT NULL REFERENCES entities(id),
        target_entity_id uuid NOT NULL REFERENCES entities(id),
        agent_id uuid NOT NULL REFERENCES agents(id),
        tags text[],
        metadata jsonb
      );
      CREATE TABLE components (
        id uuid PRIMARY KEY,
        entity_id uuid NOT NULL REFERENCES entities(id),
        agent_id uuid NOT NULL REFERENCES agents(id),
        room_id uuid NOT NULL REFERENCES rooms(id),
        world_id uuid REFERENCES worlds(id),
        source_entity_id uuid REFERENCES entities(id),
        type text NOT NULL,
        data jsonb DEFAULT '{}'::jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE cache (
        key text NOT NULL,
        agent_id uuid NOT NULL REFERENCES agents(id),
        value jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz,
        PRIMARY KEY (key, agent_id)
      );
      CREATE TABLE logs (
        id uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        entity_id uuid NOT NULL,
        body jsonb NOT NULL,
        type text NOT NULL,
        room_id uuid NOT NULL
      );
    `);

    await db.query("INSERT INTO agents (id, name) VALUES ($1, $2)", [OLD_AGENT_ID, "Alpha"]);
    if (options.multiAgent) {
      await db.query("INSERT INTO agents (id, name) VALUES ($1, $2)", [SECOND_AGENT_ID, "Other"]);
    }
    await db.query(
      "INSERT INTO worlds (id, agent_id, name, metadata, created_at) VALUES ($1, $2, $3, $4::jsonb, $5)",
      [WORLD_ID, OLD_AGENT_ID, "Phone World", JSON.stringify({ origin: "v121", ownership: { ownerId: OWNER_ENTITY_ID }, roles: { [OWNER_ENTITY_ID]: "OWNER" } }), "2026-10-01T10:00:00.000Z"],
    );
    if (options.multiAgent) {
      await db.query(
        "INSERT INTO worlds (id, agent_id, name) VALUES ($1, $2, $3)",
        ["44444444-4444-4444-8444-444444444445", SECOND_AGENT_ID, "Second World"],
      );
    }
    await db.query(
      "INSERT INTO rooms (id, agent_id, source, type, world_id, name, channel_id, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)",
      [
        CHAT_ROOM_ID,
        OLD_AGENT_ID,
        "client_chat",
        "DM",
        WORLD_ID,
        "Ask Alpha",
        "web-conv-conv-121",
        JSON.stringify({ webConversation: { conversationId: "conv-121" } }),
        "2026-10-01T10:01:00.000Z",
      ],
    );
    await db.query(
      "INSERT INTO rooms (id, agent_id, source, type, world_id, name, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [OTHER_ROOM_ID, OLD_AGENT_ID, "telegram", "GROUP", WORLD_ID, "Family", "2026-10-01T10:02:00.000Z"],
    );
    await db.query(
      "INSERT INTO entities (id, agent_id, names, metadata) VALUES ($1, $2, $3, $4::jsonb), ($5, $6, $7, $8::jsonb)",
      [OWNER_ENTITY_ID, OLD_AGENT_ID, ["Owner"], JSON.stringify({ role: "owner" }), OLD_AGENT_ID, OLD_AGENT_ID, ["Alpha"], JSON.stringify({ self: true })],
    );
    await db.query(
      "INSERT INTO participants (id, entity_id, room_id, agent_id, room_state) VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)",
      [
        "cccccccc-cccc-4ccc-8ccc-ccccccccccc1", OWNER_ENTITY_ID, CHAT_ROOM_ID, OLD_AGENT_ID, "FOLLOWED",
        "cccccccc-cccc-4ccc-8ccc-ccccccccccc2", OLD_AGENT_ID, CHAT_ROOM_ID, OLD_AGENT_ID, null,
      ],
    );

    const dirtyUserContent = '{"text":"Remember heron\\u0000 and lone \\ud800 x \\udfff keep \\ud83d\\ude80"}';
    const agentReplyContent = JSON.stringify({ text: "I will remember heron." });
    const factContent = JSON.stringify({ text: "Owner prefers quiet mornings." });
    await db.query(
      `INSERT INTO memories (id, type, created_at, content, entity_id, agent_id, room_id, world_id, "unique", metadata)
       VALUES
         ($1, 'messages', '2026-10-01T10:03:00.000Z', $2::json, $3, $4, $5, $6, true, '{"type":"message"}'::json),
         ($7, 'messages', '2026-10-01T10:04:00.000Z', $8::json, $9, $4, $5, $6, true, '{"type":"message"}'::json),
         ($10, 'facts', '2026-10-01T10:05:00.000Z', $11::json, $3, $4, $12, $6, true, '{"type":"fact"}'::json)`,
      [
        USER_MSG_ID, dirtyUserContent, OWNER_ENTITY_ID, OLD_AGENT_ID, CHAT_ROOM_ID, WORLD_ID,
        AGENT_MSG_ID, agentReplyContent, OLD_AGENT_ID,
        FACT_MSG_ID, factContent, OTHER_ROOM_ID,
      ],
    );

    const vec384 = `[${Array.from({ length: 384 }, (_, idx) => (idx === 0 ? 0.5 : 0)).join(",")}]`;
    const vec1536 = `[${Array.from({ length: 1536 }, (_, idx) => (idx === 0 ? 0.25 : 0)).join(",")}]`;
    await db.query(
      `INSERT INTO embeddings (id, memory_id, dim_384, dim_1536) VALUES
         ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', $1, $2::vector(384), NULL),
         ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', $3, NULL, $4::vector(1536))`,
      [USER_MSG_ID, vec384, AGENT_MSG_ID, vec1536],
    );

    await db.query(
      "INSERT INTO tasks (id, name, description, room_id, world_id, entity_id, agent_id, tags, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)",
      [TASK_ID, "morning-brief", "Daily summary", CHAT_ROOM_ID, WORLD_ID, OWNER_ENTITY_ID, OLD_AGENT_ID, ["repeat", "queue"], JSON.stringify({ hour: 8 })],
    );
    await db.query(
      "INSERT INTO tasks (id, name, description, room_id, world_id, entity_id, agent_id, tags, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)",
      [PAST_TASK_ID, "REMINDER", "Call the dentist", CHAT_ROOM_ID, WORLD_ID, OWNER_ENTITY_ID, OLD_AGENT_ID, ["queue"], JSON.stringify({ dueAt: "2026-10-02T09:00:00.000Z" })],
    );
    await db.query(
      "INSERT INTO tasks (id, name, description, room_id, world_id, entity_id, agent_id, tags, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)",
      [LATER_TASK_ID, "WORKFLOW_TRIGGER", "Weekly digest", CHAT_ROOM_ID, WORLD_ID, OWNER_ENTITY_ID, OLD_AGENT_ID, ["queue", "repeat"], JSON.stringify({ updateInterval: 604_800_000, lastRunAt: Date.parse("2099-01-01T00:00:00.000Z") })],
    );
    await db.query(
      "INSERT INTO relationships (id, source_entity_id, target_entity_id, agent_id, tags, metadata) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
      [REL_ID, OWNER_ENTITY_ID, OLD_AGENT_ID, OLD_AGENT_ID, ["owner"], JSON.stringify({ trust: "high" })],
    );
    await db.query(
      "INSERT INTO components (id, entity_id, agent_id, room_id, world_id, source_entity_id, type, data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)",
      [COMP_ID, OWNER_ENTITY_ID, OLD_AGENT_ID, CHAT_ROOM_ID, WORLD_ID, OLD_AGENT_ID, "profile", JSON.stringify({ city: "Portland" })],
    );
    await db.query(
      `INSERT INTO cache (key, agent_id, value, expires_at) VALUES
         ('pref:theme', $1, '{"mode":"dark"}'::jsonb, NULL),
         ('auth:session:v1', $1, '{"jwt":"should-never-migrate"}'::jsonb, NULL),
         ('google_oauth_token', $1, '{"access":"secret"}'::jsonb, NULL),
         ('user_api_key', $1, '{"key":"sk-secret"}'::jsonb, NULL),
         ('pref:expired', $1, '{"stale":true}'::jsonb, '2020-01-01T00:00:00.000Z')`,
      [OLD_AGENT_ID],
    );
    await db.query(
      "INSERT INTO logs (id, entity_id, body, type, room_id) VALUES ($1, $2, $3::jsonb, $4, $5)",
      ["eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1", OWNER_ENTITY_ID, JSON.stringify({ event: "ephemeral" }), "model_call", CHAT_ROOM_ID],
    );
  } finally {
    await db.close();
  }
  fs.writeFileSync(path.join(fixtureDir, "postmaster.pid"), "999999\nstale-lock\n", "utf8");
}

describe("Earlier v121 PGlite one-shot importer", () => {
  let sharedFixtureRoot = "";
  let sharedFixtureDir = "";
  let sharedFixtureBefore: Record<string, string> = {};

  beforeAll(async () => {
    const { PGlite, vector } = await loadElizaStorageTools();
    sharedFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v121-shared-fixture-"));
    sharedFixtureDir = path.join(sharedFixtureRoot, ".eliza/workspace/.elizadb");
    fs.mkdirSync(sharedFixtureDir, { recursive: true });
    await createSyntheticV121Fixture(PGlite, vector, sharedFixtureDir);
    sharedFixtureBefore = snapshotDirectory(sharedFixtureDir);
  }, 120_000);

  afterAll(() => {
    if (sharedFixtureRoot !== "") fs.rmSync(sharedFixtureRoot, { recursive: true, force: true });
  });

  it("sanitizes NUL and lone UTF-16 surrogates while preserving valid surrogate pairs", () => {
    expect(sanitizeKeepableString("a\u0000b\ud800c\udfffd\ud83d\ude80")).toBe("abcd\ud83d\ude80");
    expect(sanitizeJsonValue({ "k\u0000": ["v\ud800", 42, Number.NaN, { ok: "\ud83d\ude80" }] })).toEqual({
      k: ["v", 42, null, { ok: "\ud83d\ude80" }],
    });
  });

  it("proves all 6 migration safety invariants against a real synthetic v121 PGlite store", async () => {
    const { PGlite, vector, storage, migrator, openEarlier } = await loadElizaStorageTools();
    const fixtureDir = sharedFixtureDir;
    const fixtureBefore = sharedFixtureBefore;

    const directCopy = makeTempDir("v121-direct-migrate-");
    fs.cpSync(fixtureDir, directCopy, { recursive: true });
    fs.rmSync(path.join(directCopy, "postmaster.pid"), { force: true });
    const directDb = await PGlite.create({ dataDir: directCopy, extensions: { vector } });
    try {
      await expect(
        migrator.migrate(
          directDb,
          { agentId: OLD_AGENT_ID, account: { userId: "owner-1", organizationId: "org-1" }, embeddingDimensions: 0 },
          [],
          false,
        ),
      ).rejects.toMatchObject({ fault: "Corrupt" });
      const ownerTable = await directDb.query<{ readonly exists: boolean }>("SELECT to_regclass('public.device_owner') IS NOT NULL AS exists");
      expect(ownerTable.rows[0]?.exists).toBe(false);
    } finally {
      await directDb.close();
    }

    const stateDir = makeTempDir("v4-state-");
    const opened = await storage.openDeviceStorage({
      stateDirectory: stateDir,
      persistMemory: true,
      account: { userId: "owner-1", organizationId: "org-1" },
      embeddingDimensions: 0,
    });
    try {
      const warnings: Array<{ readonly ctx: Record<string, unknown>; readonly msg: string }> = [];
      let openCount = 0;
      const countingOpener = (image: Blob) => {
        openCount += 1;
        expect(snapshotDirectory(fixtureDir)).toEqual(fixtureBefore);
        expect(scratchLeft(stateDir)).toEqual([]);
        return openEarlier(image);
      };

      const { plugin } = createAlphaAppsPlugin({
        stateDirectory: stateDir,
        earlierImport: {
          legacyStoreDir: fixtureDir,
          owner: account("OWNER-1", "org-1"),
          account: account("owner-1", "org-1"),
          conversationWorldId: CONVERSATION_WORLD_ID,
          openLegacyStore: countingOpener,
        },
      });
      await plugin.init?.({}, {
        agentId: opened.agentId,
        adapter: opened.adapter,
        logger: { warn: (ctx: Record<string, unknown>, msg: string) => warnings.push({ ctx, msg }) },
      } as never);

      expect(openCount).toBe(1);
      expect(warnings).toEqual([]);
      expect(snapshotDirectory(fixtureDir)).toEqual(fixtureBefore);
      expect(fs.readdirSync(stateDir).filter((name) => name.startsWith(".earlier-import-"))).toEqual([]);

      const worlds = await opened.adapter.getAllWorlds();
      expect(worlds).toHaveLength(1);
      expect(worlds[0]).toMatchObject({ id: WORLD_ID, agentId: opened.agentId, name: "Phone World", metadata: { origin: "v121" } });
      expect(worlds[0]).not.toHaveProperty("metadata.roles");
      expect(worlds[0]).not.toHaveProperty("metadata.ownership");

      const rooms = await opened.adapter.getRoomsByIds([CHAT_ROOM_ID, OTHER_ROOM_ID]);
      const chatRoom = rooms.find((room) => room.id === CHAT_ROOM_ID);
      const otherRoom = rooms.find((room) => room.id === OTHER_ROOM_ID);
      expect(chatRoom).toMatchObject({ id: CHAT_ROOM_ID, agentId: opened.agentId, worldId: CONVERSATION_WORLD_ID, name: "Ask Alpha" });
      expect(deviceConversation(chatRoom as never)).toMatchObject({ id: "conv-121", roomId: CHAT_ROOM_ID, title: "Ask Alpha", publication: "Published" });
      expect(otherRoom).toMatchObject({ id: OTHER_ROOM_ID, agentId: opened.agentId, worldId: WORLD_ID, name: "Family" });

      const entities = await opened.adapter.getEntitiesByIds([OWNER_ENTITY_ID, opened.agentId]);
      expect(entities.map((entity) => entity.id).sort()).toEqual([OWNER_ENTITY_ID, opened.agentId].sort());
      expect(entities.every((entity) => entity.agentId === opened.agentId)).toBe(true);

      const participants = await opened.adapter.getParticipantsForRooms([CHAT_ROOM_ID]);
      expect(participants[0]?.entityIds.sort()).toEqual([OWNER_ENTITY_ID, opened.agentId].sort());

      const messages = await opened.adapter.getMemories({ roomId: CHAT_ROOM_ID, tableName: "messages" });
      const userMsg = messages.find((m) => m.id === USER_MSG_ID);
      const agentMsg = messages.find((m) => m.id === AGENT_MSG_ID);
      expect(userMsg).toMatchObject({
        id: USER_MSG_ID,
        agentId: opened.agentId,
        entityId: OWNER_ENTITY_ID,
        worldId: CONVERSATION_WORLD_ID,
        content: { text: "Remember heron and lone  x  keep \ud83d\ude80" },
      });
      expect(userMsg?.embedding).toBeUndefined();
      expect(agentMsg).toMatchObject({
        id: AGENT_MSG_ID,
        agentId: opened.agentId,
        entityId: opened.agentId,
        content: { text: "I will remember heron." },
      });
      expect(agentMsg?.embedding).toBeUndefined();

      const facts = await opened.adapter.getMemories({ roomId: OTHER_ROOM_ID, tableName: "facts" });
      expect(facts).toHaveLength(1);
      expect(facts[0]?.content.text).toBe("Owner prefers quiet mornings.");

      const tasks = await opened.adapter.getTasks({});
      const byId = (id: string) => tasks.find((task) => task.id === id);
      expect(tasks).toHaveLength(3);
      expect(await opened.adapter.getTasks({ tags: ["queue"] })).toEqual([]);
      expect(await opened.adapter.getTasks({ tags: ["repeat"] })).toEqual([]);
      expect(byId(TASK_ID)).toMatchObject({
        name: "earlier-import:morning-brief",
        agentId: opened.agentId,
        tags: [BROUGHT_TASK_TAG],
        metadata: { paused: true, earlierImport: { name: "morning-brief", tags: ["repeat", "queue"], metadata: { hour: 8 }, state: "Paused" } },
      });
      expect(byId(PAST_TASK_ID)).toMatchObject({
        name: "earlier-import:REMINDER",
        tags: [BROUGHT_TASK_TAG],
        metadata: { paused: true, earlierImport: { name: "REMINDER", tags: ["queue"], dueAt: Date.parse("2026-10-02T09:00:00.000Z"), state: "Missed" } },
      });
      expect(byId(LATER_TASK_ID)).toMatchObject({
        name: "earlier-import:WORKFLOW_TRIGGER",
        metadata: { paused: true, earlierImport: { dueAt: Date.parse("2099-01-01T00:00:00.000Z") + 604_800_000, state: "Paused" } },
      });
      expect(Object.keys(byId(PAST_TASK_ID)?.metadata ?? {}).sort()).toEqual(["earlierImport", "paused"]);

      const relationships = await opened.adapter.getRelationships({ entityIds: [OWNER_ENTITY_ID] });
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toMatchObject({ id: REL_ID, sourceEntityId: OWNER_ENTITY_ID, targetEntityId: opened.agentId, agentId: opened.agentId });

      const conn = await opened.adapter.getConnection();
      const components = await conn.query<{ readonly key: string; readonly data: Record<string, unknown> }>(
        "SELECT key, data FROM device_records WHERE collection = 'components'",
      );
      expect(components.rows).toHaveLength(1);
      expect(components.rows[0]?.data).toMatchObject({ id: COMP_ID, entityId: OWNER_ENTITY_ID, agentId: opened.agentId, type: "profile" });

      const logs = await conn.query("SELECT key FROM device_records WHERE collection = 'logs'");
      expect(logs.rows).toHaveLength(0);

      const caches = await opened.adapter.getCaches<unknown>([
        "pref:theme",
        "auth:session:v1",
        "google_oauth_token",
        "user_api_key",
        "pref:expired",
        LEGACY_IMPORT_MARKER_KEY,
      ]);
      expect(caches.has("pref:theme")).toBe(false);
      expect(caches.has("auth:session:v1")).toBe(false);
      expect(caches.has("google_oauth_token")).toBe(false);
      expect(caches.has("user_api_key")).toBe(false);
      expect(caches.has("pref:expired")).toBe(false);
      expect(caches.get(LEGACY_IMPORT_MARKER_KEY)).toMatchObject({
        version: 2,
        sourceAgentId: OLD_AGENT_ID,
        targetAgentId: opened.agentId,
      });

      expect(readRecord(stateDir)).toMatchObject({ attempts: 1, outcome: { status: "imported", counts: { tasks: 3, worlds: 1 } } });

      const secondRun = await importLegacyStore({
        legacyStoreDir: fixtureDir,
        owner: account("owner-1", "org-1"),
        account: account("owner-1", "org-1"),
        stateDirectory: stateDir,
        agentId: opened.agentId,
        conversationWorldId: CONVERSATION_WORLD_ID,
        adapter: opened.adapter,
        openLegacyStore: countingOpener,
      });
      expect(secondRun).toEqual({ status: "skipped", reason: "already_imported" });
      expect(openCount).toBe(1);
      expect(snapshotDirectory(fixtureDir)).toEqual(fixtureBefore);
    } finally {
      await opened.adapter.close();
    }
  }, 120_000);

  it("brings in no embeddings, even when v4 enables vectors of the same size", async () => {
    const { storage, openEarlier } = await loadElizaStorageTools();
    const stateDir = makeTempDir("v4-vec-state-");
    const opened = await storage.openDeviceStorage({
      stateDirectory: stateDir,
      persistMemory: true,
      account: { userId: "owner-vec", organizationId: "org-vec" },
      embeddingDimensions: 384,
    });
    try {
      const result = await importLegacyStore({
        legacyStoreDir: sharedFixtureDir,
        owner: account("owner-vec", "org-vec"),
        account: account("owner-vec", "org-vec"),
        stateDirectory: stateDir,
        agentId: opened.agentId,
        conversationWorldId: CONVERSATION_WORLD_ID,
        adapter: opened.adapter,
        openLegacyStore: openEarlier,
      });
      expect(result.status).toBe("imported");
      expect(snapshotDirectory(sharedFixtureDir)).toEqual(sharedFixtureBefore);
      const messages = await opened.adapter.getMemories({ roomId: CHAT_ROOM_ID, tableName: "messages", includeEmbedding: true });
      const with384 = messages.find((m) => m.id === USER_MSG_ID);
      const with1536 = messages.find((m) => m.id === AGENT_MSG_ID);
      expect(with384?.content.text).toBe("Remember heron and lone  x  keep \ud83d\ude80");
      expect(with384?.embedding).toBeUndefined();
      expect(with1536?.embedding).toBeUndefined();
    } finally {
      await opened.adapter.close();
    }
  }, 120_000);

  it("never writes into a store in use and never opens the earlier store", async () => {
    const { storage, openEarlier } = await loadElizaStorageTools();
    const stateDir = makeTempDir("v4-nonempty-state-");
    const opened = await storage.openDeviceStorage({
      stateDirectory: stateDir,
      persistMemory: true,
      account: { userId: "owner-2", organizationId: "org-2" },
      embeddingDimensions: 0,
    });
    try {
      const freshRoomId = "ffffffff-ffff-4fff-8fff-fffffffffff1";
      await opened.adapter.createRooms([{ id: freshRoomId, agentId: opened.agentId, source: "device", type: "DM", name: "Existing" }]);
      let openedCount = 0;
      const result = await importLegacyStore({
        legacyStoreDir: sharedFixtureDir,
        owner: account("owner-2", "org-2"),
        account: account("owner-2", "org-2"),
        stateDirectory: stateDir,
        agentId: opened.agentId,
        adapter: opened.adapter,
        openLegacyStore: (image) => {
          openedCount += 1;
          return openEarlier(image);
        },
      });
      expect(result).toEqual({ status: "skipped", reason: "store_in_use" });
      expect(openedCount).toBe(0);
      expect(readRecord(stateDir)).toMatchObject({ attempts: 0, outcome: { status: "skipped", reason: "store_in_use" } });
      expect(await opened.adapter.getRoomsByIds([CHAT_ROOM_ID])).toEqual([]);
      expect((await opened.adapter.getCaches([LEGACY_IMPORT_MARKER_KEY])).size).toBe(0);
    } finally {
      await opened.adapter.close();
    }
  }, 120_000);

  it("brings the earlier store into no other account, never reads the vault, and removes an earlier build's copies at start", async () => {
    const { storage, openEarlier } = await loadElizaStorageTools();
    const stateDir = makeTempDir("v4-accounts-state-");
    const opened = await storage.openDeviceStorage({
      stateDirectory: stateDir,
      persistMemory: true,
      account: { userId: "owner-5", organizationId: "org-5" },
      embeddingDimensions: 0,
    });
    const leftover = path.join(stateDir, ".earlier-import-AbC123/db");
    fs.mkdirSync(leftover, { recursive: true });
    fs.writeFileSync(path.join(leftover, "PG_VERSION"), "17\n", "utf8");
    const vaultDir = path.join(path.dirname(path.dirname(sharedFixtureDir)), ".vault-pglite");
    fs.mkdirSync(vaultDir, { recursive: true });
    try {
      let openedCount = 0;
      const factory = alphaAppsModuleWith({
        openLegacyStore: (image) => {
          openedCount += 1;
          return openEarlier(image);
        },
      });
      const owner = JSON.stringify(account("owner-5", "org-5"));
      const launchAs = async (launch: Record<string, unknown>) => {
        const context = { runtime: {}, launch: { embeddingDimensions: 0, ...launch }, stateDirectory: stateDir, timeZone: "UTC", conversationOwner: { world: CONVERSATION_WORLD_ID } } as unknown as ModuleContext;
        await Effect.runSync(factory(context)).plugin.init?.({}, { agentId: opened.agentId, adapter: opened.adapter } as never);
      };
      const refused: Record<string, Record<string, unknown>> = {
        "another user": { account: account("someone-else", "org-5"), environment: { ALPHA_LEGACY_STORE_DIR: sharedFixtureDir, ALPHA_LEGACY_OWNER: owner } },
        "the owner in another organization": { account: account("owner-5", "work-org"), environment: { ALPHA_LEGACY_STORE_DIR: sharedFixtureDir, ALPHA_LEGACY_OWNER: owner } },
        "an unknown owner": { account: account("owner-5", "org-5"), environment: { ALPHA_LEGACY_STORE_DIR: sharedFixtureDir } },
        "an owner without an organization": { account: account("owner-5", "org-5"), environment: { ALPHA_LEGACY_STORE_DIR: sharedFixtureDir, ALPHA_LEGACY_OWNER: JSON.stringify({ userId: "owner-5" }) } },
        "no account": { environment: { ALPHA_LEGACY_STORE_DIR: sharedFixtureDir, ALPHA_LEGACY_OWNER: owner } },
        "the vault as the source": { account: account("owner-5", "org-5"), environment: { ALPHA_LEGACY_STORE_DIR: vaultDir, ALPHA_LEGACY_OWNER: owner } },
      };
      for (const [name, launch] of Object.entries(refused)) {
        await launchAs(launch);
        expect({ name, openedCount, scratch: scratchLeft(stateDir) }).toEqual({ name, openedCount: 0, scratch: [] });
        expect(await opened.adapter.getAllWorlds()).toEqual([]);
        expect((await opened.adapter.getCaches([LEGACY_IMPORT_MARKER_KEY])).size).toBe(0);
      }
      expect(readRecord(stateDir)).toMatchObject({ attempts: 0, outcome: { status: "skipped", reason: "no_earlier_store" } });

      await launchAs({ account: account("owner-5", "org-5"), environment: { ALPHA_LEGACY_STORE_DIR: sharedFixtureDir, ALPHA_LEGACY_OWNER: owner } });
      expect(openedCount).toBe(1);
      expect((await opened.adapter.getAllWorlds()).map((world) => world.id)).toEqual([WORLD_ID]);
      expect(readRecord(stateDir)).toMatchObject({ attempts: 1, outcome: { status: "imported" } });
      await launchAs({ account: account("owner-5", "org-5"), environment: {} });
      await launchAs({ account: account("owner-5", "org-5"), environment: { ALPHA_LEGACY_STORE_DIR: sharedFixtureDir, ALPHA_LEGACY_OWNER: owner } });
      expect(openedCount).toBe(1);
      expect(readRecord(stateDir)).toMatchObject({ attempts: 1, outcome: { status: "imported", counts: { worlds: 1 } } });
      expect(snapshotDirectory(sharedFixtureDir)).toEqual(sharedFixtureBefore);
    } finally {
      fs.rmSync(vaultDir, { recursive: true, force: true });
      await opened.adapter.close();
    }
  }, 120_000);

  it("tries three times in a launch, one and then four seconds apart, and gives up after three launches", async () => {
    const { storage, openEarlier } = await loadElizaStorageTools();
    const open = async (name: string) => storage.openDeviceStorage({
      stateDirectory: makeTempDir(name),
      persistMemory: true,
      account: { userId: "owner-6", organizationId: "org-6" },
      embeddingDimensions: 0,
    });
    const failing = await open("v4-retry-state-");
    const flaky = await open("v4-flaky-state-");
    try {
      const stateDir = makeTempDir("v4-retry-record-");
      const waits: number[] = [];
      let openedCount = 0;
      const launch = () => importLegacyStore({
        legacyStoreDir: sharedFixtureDir,
        conversationWorldId: CONVERSATION_WORLD_ID,
        owner: account("owner-6", "org-6"),
        account: account("owner-6", "org-6"),
        stateDirectory: stateDir,
        agentId: failing.agentId,
        adapter: failing.adapter,
        wait: (ms) => { waits.push(ms); return Promise.resolve(); },
        openLegacyStore: () => {
          openedCount += 1;
          return Promise.reject(new Error("store busy"));
        },
      });
      for (const attempts of [1, 2, 3]) {
        expect(await launch()).toEqual({ status: "failed", error: "Error" });
        expect(readRecord(stateDir)).toMatchObject({ attempts, outcome: { status: "failed", error: "Error" } });
        await failing.adapter.createWorlds([{ id: CONVERSATION_WORLD_ID, agentId: failing.agentId, name: "Device" }]);
      }
      expect(waits).toEqual([1000, 4000, 1000, 4000, 1000, 4000]);
      expect(openedCount).toBe(9);
      expect(await launch()).toEqual({ status: "skipped", reason: "gave_up" });
      expect(openedCount).toBe(9);
      expect((await failing.adapter.getAllWorlds()).map((world) => world.id)).toEqual([CONVERSATION_WORLD_ID]);
      expect(readRecord(stateDir)).toMatchObject({ attempts: 3, outcome: { status: "failed", error: "Error" } });

      const flakyState = makeTempDir("v4-flaky-record-");
      const flakyWaits: number[] = [];
      let flakyCalls = 0;
      const result = await importLegacyStore({
        legacyStoreDir: sharedFixtureDir,
        owner: account("owner-6", "org-6"),
        account: account("owner-6", "org-6"),
        stateDirectory: flakyState,
        agentId: flaky.agentId,
        adapter: flaky.adapter,
        wait: (ms) => { flakyWaits.push(ms); return Promise.resolve(); },
        openLegacyStore: (image) => {
          flakyCalls += 1;
          return flakyCalls === 1 ? Promise.reject(new Error("store busy")) : openEarlier(image);
        },
      });
      expect(result.status).toBe("imported");
      expect(flakyWaits).toEqual([1000]);
      expect(readRecord(flakyState)).toMatchObject({ attempts: 1, outcome: { status: "imported" } });
    } finally {
      await failing.adapter.close();
      await flaky.adapter.close();
    }
  }, 120_000);

  it("logs a warning and lets fresh store-v4 boot cleanly when the earlier fixture is corrupt", async () => {
    const { storage, openEarlier } = await loadElizaStorageTools();
    const corruptDir = makeEarlierStoreDir("v121-corrupt-fixture-");
    fs.mkdirSync(path.join(corruptDir, "global"), { recursive: true });
    fs.writeFileSync(path.join(corruptDir, "PG_VERSION"), "not-a-pg-version\n", "utf8");
    fs.writeFileSync(path.join(corruptDir, "global/pg_control"), Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    fs.writeFileSync(path.join(corruptDir, "postmaster.pid"), "12345\n", "utf8");
    const before = snapshotDirectory(corruptDir);

    const stateDir = makeTempDir("v4-corrupt-state-");
    const opened = await storage.openDeviceStorage({
      stateDirectory: stateDir,
      persistMemory: true,
      account: { userId: "owner-3", organizationId: "org-3" },
      embeddingDimensions: 0,
    });
    try {
      const warnings: string[] = [];
      const result = await importLegacyStore({
        legacyStoreDir: corruptDir,
        owner: account("owner-3", "org-3"),
        account: account("owner-3", "org-3"),
        wait: noWait,
        stateDirectory: stateDir,
        agentId: opened.agentId,
        adapter: opened.adapter,
        openLegacyStore: openEarlier,
        logger: { warn: (_ctx, msg) => warnings.push(msg) },
      });
      expect(result.status).toBe("failed");
      expect(warnings).toHaveLength(1);
      expect(snapshotDirectory(corruptDir)).toEqual(before);
      expect(fs.readdirSync(stateDir).filter((name) => name.startsWith(".earlier-import-"))).toEqual([]);
      expect((await opened.adapter.getCaches([LEGACY_IMPORT_MARKER_KEY])).size).toBe(0);
      await opened.adapter.createRooms([{ id: "ffffffff-ffff-4fff-8fff-fffffffffff2", agentId: opened.agentId, source: "device", type: "DM", name: "Still Healthy" }]);
      expect(await opened.adapter.getRoomsByIds(["ffffffff-ffff-4fff-8fff-fffffffffff2"])).toHaveLength(1);
    } finally {
      await opened.adapter.close();
    }
  }, 120_000);

  it("skips cleanly with a warning when an earlier store contains multiple agents with data", async () => {
    const { PGlite, vector, storage, openEarlier } = await loadElizaStorageTools();
    const fixtureDir = makeEarlierStoreDir("v121-multi-fixture-");
    await createSyntheticV121Fixture(PGlite, vector, fixtureDir, { multiAgent: true });
    const stateDir = makeTempDir("v4-multi-state-");
    const opened = await storage.openDeviceStorage({
      stateDirectory: stateDir,
      persistMemory: true,
      account: { userId: "owner-4", organizationId: "org-4" },
      embeddingDimensions: 0,
    });
    try {
      const warnings: string[] = [];
      const result = await importLegacyStore({
        legacyStoreDir: fixtureDir,
        owner: account("owner-4", "org-4"),
        account: account("owner-4", "org-4"),
        stateDirectory: stateDir,
        agentId: opened.agentId,
        adapter: opened.adapter,
        openLegacyStore: openEarlier,
        logger: { warn: (_ctx, msg) => warnings.push(msg) },
      });
      expect(result).toEqual({ status: "skipped", reason: "multi_agent_ambiguous" });
      expect(warnings).toHaveLength(1);
      expect(await opened.adapter.getAllWorlds()).toEqual([]);
    } finally {
      await opened.adapter.close();
    }
  }, 120_000);
});
