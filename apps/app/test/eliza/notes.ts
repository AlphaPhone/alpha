import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type Browser, type Page, chromium } from "playwright";
import { pnpmDev } from "./dev.ts";

interface Case {
  readonly id: string;
  readonly words: string;
  readonly title?: string;
  readonly items?: readonly string[];
  readonly again?: boolean;
}

const cases: readonly Case[] = [
  { id: "title", words: "open the note titled shopping list", title: "Shopping list" },
  { id: "topic", words: "open my note about the dentist appointment", title: "Dentist" },
  { id: "recency", words: "open my most recent note" },
  { id: "create-open", words: "create a checklist called groceries with milk and eggs and open it", title: "Groceries", items: ["milk", "eggs"] },
  { id: "create-open-again", words: "create a checklist called groceries with milk and eggs and open it", title: "Groceries", items: ["milk", "eggs"], again: true },
];

const seeds = [
  { title: "Shopping list", body: "bread, coffee, apples" },
  { title: "Dentist", body: "Appointment with Dr. Lee on Thursday at 3pm, bring the insurance card" },
  { title: "Trip ideas", body: "Lisbon in spring, Kyoto in autumn" },
];

interface Saved { readonly id: string; readonly title: string; readonly updatedAt: string }
interface Call { readonly startedAt: number; readonly ms: number; readonly firstMs?: number; readonly called: readonly string[] }

if ((process.env.ALPHA_DEV_MODEL ?? "") === "" && process.env.ALPHA_NOTES_ORIGIN === undefined) throw new Error("test/eliza/notes.ts asks a real model: set ALPHA_DEV_MODEL (cerebras or cloud)");
const timings = process.env.ALPHA_MODEL_TIMING_LOG ?? path.join(fs.mkdtempSync(path.join(os.tmpdir(), "alpha-notes-")), "model-timing.jsonl");
const shots = process.env.ALPHA_NOTES_SHOTS;
const only = (process.env.ALPHA_NOTES_ONLY ?? "").split(",").filter((one) => one !== "");
const routes = (process.env.ALPHA_NOTES_HOW ?? "typed,spoken").split(",");

async function served(): Promise<{ origin: string; stop: () => void }> {
  const given = process.env.ALPHA_NOTES_ORIGIN;
  if (given !== undefined) return { origin: given, stop: () => undefined };
  return pnpmDev({ ALPHA_MODEL_TIMING_LOG: timings });
}

async function notes(page: Page, origin: string): Promise<Saved[]> {
  const answer = await page.request.get(`${origin}/agent/api/notes/state`);
  return ((await answer.json()) as { data: { notes: Saved[] } }).data.notes;
}

async function interact(page: Page, origin: string, capability: string, params: Record<string, string>) {
  const answer = await page.request.post(`${origin}/agent/api/notes/interact`, { data: { capability, params } });
  if (!answer.ok()) throw new Error(`${capability}: ${answer.status()} ${await answer.text()}`);
}

async function opened(browser: Browser, origin: string, spoken: boolean) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.setDefaultTimeout(240_000);
  if (spoken) {
    await page.route(`${origin}/`, async (route) => {
      const answer = await route.fetch();
      await route.fulfill({ response: answer, body: (await answer.text()).replace("<head>", '<head><script type="module" src="/test/eliza/phone.ts"></script>') });
    });
  }
  await page.goto(origin);
  await page.getByRole("button", { name: "Settings", exact: true }).waitFor();
  if (spoken) {
    const talk = page.getByRole("button", { name: "Talk", exact: true });
    const skip = page.getByRole("button", { name: "Skip", exact: true });
    for (let step = 0; step < 12 && !(await talk.isVisible()); step += 1) {
      if (await skip.isVisible()) await skip.click();
      else await page.waitForTimeout(250);
    }
    await talk.waitFor();
  }
  return page;
}

/** The fields of the note the editor shows now: its title and checklist items as the owner reads them, or nothing where no editor is open. */
function editorShows(page: Page) {
  return page.evaluate(() => {
    if (![...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Done")) return undefined;
    return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")]
      .filter((field) => !/Ask Alpha|Message Alpha/.test(field.placeholder))
      .map((field) => field.value);
  });
}

/** `words` in Ask Alpha's composer once it takes them: a page still settling its conversation may clear what was typed first. */
async function typed(page: Page, words: string) {
  const send = page.locator("button[aria-label='Send']:not([disabled])");
  for (let tries = 0; tries < 10; tries += 1) {
    await page.locator("textarea").first().fill(words);
    if (await send.waitFor({ timeout: 3000 }).then(() => true, () => false)) return;
  }
  throw new Error("Ask Alpha did not take the words");
}

/** The words the phone heard, handed to Talk as its route hands them over: the Cloud relay's speech end, else on-device speech's final transcript. */
function heard(page: Page, words: string) {
  return page.evaluate((said) => {
    const { voice } = (globalThis as unknown as { alphaPhone: { voice: { startCloudSpeechCalls: number; activeMicSession: string; emitCloud: (event: object) => void; emitLocal: (name: string, event: object) => void } } }).alphaPhone;
    if (voice.startCloudSpeechCalls > 0) {
      voice.emitCloud({ sessionId: voice.activeMicSession, type: "speech-start" });
      voice.emitCloud({ sessionId: voice.activeMicSession, type: "speech-end", text: said });
    } else voice.emitLocal("liveCaptureTranscript", { captureId: voice.activeMicSession, final: { turnId: "notes", text: said, mode: "device" } });
  }, words);
}

/** What Talk said through the fake phone's Cloud speech relay so far, and how often the relay was started, stopped and hushed. */
function relay(page: Page) {
  return page.evaluate(() => {
    const { voice } = (globalThis as unknown as { alphaPhone: { voice: { spoken: { text: string }[]; hushCalls: number; startCloudSpeechCalls: number; stopCloudSpeechCalls: number; activeMicSession?: string } } }).alphaPhone;
    return { said: voice.spoken.map((line) => line.text), hushes: voice.hushCalls, micStarts: voice.startCloudSpeechCalls, micStops: voice.stopCloudSpeechCalls, mic: voice.activeMicSession };
  });
}

function calls(from: number, to: number): Call[] {
  if (!fs.existsSync(timings)) return [];
  return fs.readFileSync(timings, "utf8").split("\n").filter((line) => line !== "").map((line) => JSON.parse(line) as Call)
    .filter((call) => call.startedAt >= from && call.startedAt <= to);
}

async function turn(browser: Browser, origin: string, one: Case, spoken: boolean) {
  const page = await opened(browser, origin, spoken);
  const before = await notes(page, origin);
  if (one.items !== undefined && one.again !== true) for (const old of before) if (old.title.toLowerCase() === one.title?.toLowerCase()) await interact(page, origin, "delete-note", { id: old.id });
  const kept = await notes(page, origin);
  const newest = [...kept].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  const title = one.title ?? newest?.title ?? "";
  let ended: number | undefined;
  let shownId: string | undefined;
  let view: string | undefined;
  let streamFailed: string | undefined;
  page.on("requestfinished", (request) => { if (request.url().includes("/messages/stream")) ended = Date.now(); });
  page.on("requestfailed", (request) => { if (request.url().includes("/messages/stream")) streamFailed = `${request.failure()?.errorText ?? "failed"} after ${Date.now() - sent} ms`; });
  page.on("request", (request) => {
    if (!request.url().includes("/views/interact-result")) return;
    const told = request.postDataJSON() as { success?: boolean; result?: { switched?: boolean; shown?: { noteId?: string } } };
    shownId = told.result?.shown?.noteId;
    view = told.result?.shown !== undefined ? "shown" : told.result?.switched === true ? "switched, note not shown" : "not switched";
  });
  if (spoken) {
    await page.getByRole("button", { name: "Talk", exact: true }).click();
    await page.waitForFunction(() => (globalThis as unknown as { alphaPhone: { voice: { activeMicSession?: string } } }).alphaPhone.voice.activeMicSession !== undefined);
  } else await typed(page, one.words);
  const sent = Date.now();
  const trace: string[] = [];
  const traced = async () => {
    if (!spoken || process.env.ALPHA_NOTES_TRACE !== "1") return;
    const { said, hushes, micStarts, micStops, mic } = await relay(page);
    const now = `said ${said.length}, relay started ${micStarts}, stopped ${micStops}, hushed ${hushes}, mic ${mic === undefined ? "closed" : mic.slice(0, 8)}`;
    if (trace.at(-1)?.endsWith(now) !== true) trace.push(`${Date.now() - sent} ms: ${now}`);
  };
  if (spoken) await heard(page, one.words);
  else await page.getByRole("button", { name: "Send", exact: true }).click();
  let shown: number | undefined;
  while (Date.now() - sent < 120_000 && (ended === undefined || Date.now() - ended < 15_000)) {
    await traced();
    const fields = await editorShows(page);
    if (shownId !== undefined && fields?.some((field) => field.toLowerCase() === title.toLowerCase()) && (one.items ?? []).every((item) => fields.some((field) => field.toLowerCase() === item))) {
      shown = Date.now();
      break;
    }
    await page.waitForTimeout(100);
  }
  const after = await notes(page, origin);
  const meant = one.items !== undefined ? after.find((note) => !kept.some((old) => old.id === note.id) && note.title.toLowerCase() === title.toLowerCase())
    : one.title === undefined ? newest : kept.find((note) => note.title === one.title);
  if (shots !== undefined) await page.screenshot({ path: path.join(shots, `${spoken ? "spoken" : "typed"}-${one.id}.png`) });
  const made = calls(sent, ended ?? Date.now());
  const voiced = spoken ? { ...await relay(page), ...(trace.length === 0 ? {} : { trace }) } : undefined;
  await page.context().close();
  return {
    how: spoken ? "spoken" : "typed", id: one.id, title, opened: shown !== undefined && shownId === meant?.id, created: one.items === undefined ? undefined : meant !== undefined,
    replyMs: ended === undefined ? undefined : ended - sent, openMs: shown === undefined ? undefined : shown - sent,
    view: view ?? "no view handed back",
    ...(streamFailed === undefined ? {} : { streamFailed }),
    ...(voiced === undefined ? {} : { voiced }),
    modelCalls: made.length, modelMs: made.reduce((sum, call) => sum + call.ms, 0),
    steps: made.map((call) => `${call.called.join("+") || "reply"} ${call.ms}`).join(", "),
  };
}

const { origin, stop } = await served();
const browser = await chromium.launch({ args: ["--mute-audio"] });
try {
  const setup = await opened(browser, origin, false);
  const kept = (await notes(setup, origin)).map((note) => note.title);
  for (const seed of seeds) if (!kept.includes(seed.title)) await interact(setup, origin, "create-note", { content: `${seed.title}\n${seed.body}` });
  await setup.context().close();
  const rows = [];
  for (const spoken of [false, true].filter((voiced) => routes.includes(voiced ? "spoken" : "typed"))) for (const one of cases) if (only.length === 0 || only.includes(one.id)) rows.push(await turn(browser, origin, one, spoken));
  for (const row of rows) process.stdout.write(`${JSON.stringify(row)}\n`);
  if (rows.some((row) => !row.opened)) process.exitCode = 1;
} finally {
  await browser.close();
  stop();
}
