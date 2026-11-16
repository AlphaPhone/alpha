// Upserts Alpha Phone's native App Auth registration (scripts/cloud-registration.ts) into a Cloud
// database. Run with the working directory inside an installed upstream tree, so `pg` is upstream's.
// Inputs: SEED_PACKAGE_JSON (a package.json in that tree), SEED_DATABASE_URL, SEED_ROWS (JSON array).
// Output: one JSON line describing what was created or updated. Never prints the database URL.
import {createRequire} from "node:module";

type Row = Record<string, any>;
interface PgClient { connect(): Promise<void>; query(text: string, values?: unknown[]): Promise<{rows: Row[]}>; end(): Promise<void> }
const {Client} = createRequire(process.env.SEED_PACKAGE_JSON ?? '')("pg") as {Client: new (options: {connectionString?: string}) => PgClient};
const rows = JSON.parse(process.env.SEED_ROWS ?? "[]");
if (!Array.isArray(rows) || !rows.length) throw new Error("SEED_ROWS is empty");
const database = new Client({connectionString: process.env.SEED_DATABASE_URL});
await database.connect();
const sql = async (text: string, values: unknown[] = []): Promise<Row[]> => (await database.query(text, values)).rows;
const columns = async (table: string) => new Set((await sql("select column_name from information_schema.columns where table_schema = 'public' and table_name = $1", [table])).map(r => r.column_name));
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
// jsonb columns take JSON text; `redirect_uris` (text[]) takes the array itself.
const json = new Set(["allowed_origins", "android_relations", "android_cert_fingerprints", "browser_sign_in"]);
const param = (key: string, value: unknown) => (json.has(key) ? JSON.stringify(value) : value);
async function upsert(table: string, row: Row, conflict: string, present: Set<string>) {
  const keys = Object.keys(row).filter(key => present.has(key));
  const updates = keys.filter(key => key !== conflict).map(key => `${quote(key)} = excluded.${quote(key)}`);
  if (present.has("updated_at")) updates.push('"updated_at" = now()');
  const text = `insert into ${quote(table)} (${keys.map(quote).join(", ")}) values (${keys.map((_, i) => "$" + (i + 1)).join(", ")}) on conflict (${quote(conflict)}) do update set ${updates.join(", ")} returning (xmax = 0) as inserted`;
  const [result] = await sql(text, keys.map(key => param(key, row[key])));
  return result.inserted ? "created" : "updated";
}

const report: Row[] = [];
try {
  await sql("begin");
  const apps = await columns("apps"), clients = await columns("mobile_app_auth_clients"), users = await columns("users");
  if (!apps.size || !clients.size) throw new Error("apps or mobile_app_auth_clients missing: apply the Cloud migrations first");
  for (const {owner, app, client} of rows as Row[]) {
    // The owning organization and an operator user: apps belong to an organization.
    let [org] = await sql("select id from organizations where slug = $1 limit 1", [owner.organizationSlug]);
    if (!org) [org] = await sql("insert into organizations (name, slug) values ($1, $2) returning id", [owner.organizationName, owner.organizationSlug]);
    let [user] = await sql("select id from users where email = $1 limit 1", [owner.email]);
    if (!user) {
      const values: Row = {email: owner.email, organization_id: org.id, role: "owner", ...(users.has("steward_user_id") ? {steward_user_id: `operator-${org.id}`} : {})};
      const keys = Object.keys(values);
      [user] = await sql(`insert into users (${keys.map(quote).join(", ")}) values (${keys.map((_, i) => "$" + (i + 1)).join(", ")}) returning id`, Object.values(values));
    }
    const appRow = {...app, organization_id: org.id, created_by_user_id: user.id, ...(apps.has("redirect_uris") ? {redirect_uris: app.allowed_origins} : {}),
      ...(apps.has("approval_status") ? {approval_status: "approved"} : {})};
    const appResult = await upsert("apps", appRow, "id", apps);
    const clientResult = await upsert("mobile_app_auth_clients", client, "client_id", clients);
    report.push({clientId: client.client_id, appId: app.id, redirectUri: client.redirect_uri, app: appResult, client: clientResult, fingerprints: client.android_cert_fingerprints.length});
  }
  await sql("commit");
} catch (error) {
  await sql("rollback").catch(() => {});
  throw error;
} finally {
  await database.end();
}
console.log(JSON.stringify({seeded: report}));
