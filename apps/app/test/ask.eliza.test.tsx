// @vitest-environment happy-dom
import { request as nodeRequest } from "node:http";
import { Readable } from "node:stream";
import { ConversationRecord, type DeviceOperation } from "@elizaos/agent";
import { Effect, Schema } from "effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import { afterEach, beforeAll, expect, it, onTestFinished, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Ask } from "../gen/app__ask.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Mailbox } from "../gen/app__inbox.effect.vibe";
import { Machine as Message } from "../gen/app__inbox__message.effect.vibe";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Machine as Preferences } from "../gen/app__settings__preferences.effect.vibe";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import type { Shell as ShellState } from "../gen/app__shell.ts";
import ask from "../src/ask/index.tsx";
import assistant from "../src/assistant/index.tsx";
import home from "../src/home/index.tsx";
import inbox from "../src/inbox/index.tsx";
import photos from "../src/photos/index.tsx";
import { Agent } from "../src/platform/agent.vibe";
import type { Alpha } from "../src/runtime/area.tsx";
import { Cloud } from "../src/platform/cloud.vibe";
import { askExample, askExampleLines, button, chatAction, closeAll, drawn, fill, hardware, only, openOver, press, pressOnTop, underAct, until } from "./alpha.tsx";
import { owned } from "@repo/eliza-harness";
import { elizaWorld } from "./eliza/world.vibe";
import { memoryIndexedDB } from "./fakes/indexeddb.ts";
import type { Answering } from "./fakes/routes.ts";
import { scene, services } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";

let mine: Awaited<ReturnType<typeof owned>>;

underAct();
beforeAll(async () => {
  // spec/app/ask/index.md, "Story: Talk to my agent": the owner signs in by the code the cloud mails, and the device is given its key.
  mine = await owned("ask");
}, 600_000);
afterEach(closeAll);

/** Hold `check` against the drawn screen until it passes, for at most `timeout` ms. */
const onScreen = (check: () => void | Promise<void>, timeout = 30_000) => vi.waitFor(async () => {
  await drawn(() => undefined);
  await check();
}, { timeout });

type Chat = ReturnType<typeof assistant.runtime>;

/** Raise the conversation from Home once it is ready, until the shell shows it as `sheet` says. */
async function raiseConversation(alpha: Alpha, chat: Chat, sheet: (state: ShellState) => boolean = (state) => state.assistant === "Sheet") {
  await until(alpha, chat, Conversation, (state) => state.ready);
  await press("Open conversation");
  await until(alpha, alpha.runtime, Shell, sheet);
}

/** Send the draft as written, and wait for the finished turn's `reply` in the transcript, looking with `screen`. */
async function sendAndHear(alpha: Alpha, chat: Chat, reply: string, screen: typeof onScreen = onScreen) {
  await screen(() => expect(button("Send")?.disabled).toBe(false));
  await press("Send");
  await until(alpha, chat, Conversation, (state) => state.turn.reply === "Complete");
  await screen(() => expect(document.querySelector("[role=log]")?.textContent).toContain(reply));
}

// spec/app/ask/index.md, "Story: Talk to my agent"
it("Talk to my agent, through eliza's agent and cloud (spec/app/ask/index.md, \"Story: Talk to my agent\")", async () => {
  expect([mine.key.mailed, mine.key.accountId === "", mine.agent.token === ""]).toEqual([expect.stringMatching(/^\d{6}$/), false, false]);
  const { alpha } = await openOver(elizaWorld(mine), askExample);
  const asking = ask.runtime(alpha);
  const balance = async () => (await alpha.runtime.runPromise(Effect.flatMap(Cloud, (cloud) => Effect.promise(() => cloud.client.snapshot())))).balance.usdMicros;
  expect(await balance()).toBe(mine.granted);

  // spec/app/ask/index.md, "The conversation is the one the agent names in answer to that opening, or none when it does not"
  await until(alpha, asking, Ask, (s) => s.conversation !== "");

  // spec/app/ask/index.md, "The owner says something only in a conversation, one turn at a time, and it is sent once"
  await mine.script({ kind: "text", parts: ["[answer] Hello ", "from ", "the cloud."] }, "Say hello.");
  await fill("Ask Alpha", "Say hello.");
  await press("Send");
  // spec/app/ask/index.md, "Only the turn under way is heard: its reply so far, then the whole reply, or that it did not finish"
  await until(alpha, asking, Ask, (s) => s.turn.outcome === "Confirmed");
  expect(askExampleLines()).toEqual(["Say hello.", "Hello from the cloud."]);
  const textOf = (value: unknown) => (typeof value === "string" ? value : "");
  const last = (await mine.asked()).at(-1);
  expect([last?.length, last?.[0]?.role, textOf(last?.[0]?.content).includes(mine.system), last?.[1]?.role, /^Say hello\.(\n|$)/.test(textOf(last?.[1]?.content))])
    .toEqual([2, "system", true, "user", true]);
  expect(await balance()).toBeLessThan(mine.granted);

  // spec/app/ask/index.md, "The owner stops the reply under way once, and the agent is asked to stop that conversation's turn"
  await mine.script({ kind: "stall", first: "[answer] Thinking" }, "Take your time.");
  await fill("Ask Alpha", "Take your time.");
  await press("Send");
  await until(alpha, asking, Ask, (s) => s.reply === "Thinking");
  expect(Boolean(button("Send"))).toBe(false);
  await press("Stop");
  await until(alpha, asking, Ask, (s) => s.turn.outcome === "Refused");
  expect([askExampleLines(), document.querySelector("section[aria-label='Ask Alpha'] [role=alert]")?.textContent]).toEqual([["Say hello.", "Hello from the cloud.", "Take your time.", "Thinking"], "The reply stopped"]);
}, 300_000);

// spec/kit/read.md, "Story: Read from outside"
it("Read what my agent keeps, from eliza's agent with its modules loaded (spec/kit/read.md, \"Story: Read from outside\")", async () => {
  const { alpha } = await openOver(elizaWorld(mine), []);
  const read = (route: string) => alpha.runtime.runPromise(Effect.flatMap(Agent, (agent) => agent.call(HttpClientRequest.get(route))));
  // spec/kit/read.md, "Only the newest ticket's answer is taken, once": each route an area reads answers at the pinned commit, through Alpha's own Agent service.
  expect(await read("/api/approvals")).toMatchObject({ approvals: [] });
  const noticePage = Schema.decodeUnknownSync(Schema.Struct({ nativeEpoch: Schema.NonEmptyString }));
  expect(noticePage(await read("/api/notifications?nativeTransport=true")).nativeEpoch).not.toBe("");
  expect(await read("/api/scheduled-tasks?ownerVisibleOnly=1")).toEqual({ tasks: [expect.objectContaining({ kind: "personal-assistant.checkin", state: { status: "scheduled" } })] });
  expect(await read("/api/triggers")).toEqual({ triggers: [] });
  expect(await read("/api/tasks/current")).toEqual({ task: null });
  expect(await read("/api/client-devices/capabilities")).toMatchObject({ protocol: 1 });
  const found = await read("/api/conversations/messages/search?q=hello") as { results: { text: string }[] };
  expect(found.results.map((one) => one.text)).toContain("Say hello.");
  expect((await alpha.runtime.runPromise(Effect.flatMap(Cloud, (cloud) => Effect.promise(() => cloud.client.account())))).email).toBe("ask@alpha.test");
  const { conversations } = await read("/api/conversations") as { conversations: { id: string }[] };
  const { messages } = await read(`/api/conversations/${conversations[0]?.id}/messages`) as { messages: { role: string; text: string }[] };
  expect(messages.slice(0, 2)).toEqual([expect.objectContaining({ role: "user", text: "Say hello." }), expect.objectContaining({ role: "assistant", text: "Hello from the cloud." })]);
}, 300_000);

it('Ask and stop a reply from Home through the real resident and cloud (spec/app/assistant/index.md, "Story: Ask Alpha something"); (spec/app/assistant/index.md, "Story: Stop a reply")', async () => {
  const { alpha } = await openOver(elizaWorld(mine), only("home", "assistant"));
  const runtime = assistant.runtime(alpha);
  const roomList = Schema.decodeUnknownSync(Schema.Struct({ conversations: Schema.Array(ConversationRecord) }));
  const rooms = async () => roomList(await mine.agentSays<unknown>("/api/conversations")).conversations;
  const balance = async () => (await alpha.runtime.runPromise(Effect.flatMap(Cloud, (cloud) => Effect.promise(() => cloud.client.snapshot())))).balance.usdMicros;
  const rendered = () => Array.from(document.querySelectorAll("[role=log] [data-alpha-message-text]"), (row) => row.textContent);
  const waitForScreen = (check: () => void | Promise<void>) => onScreen(check, 20_000);
  const send = async (text: string) => {
    await until(alpha, runtime, Composer, (state) => state.slot === "Open" && state.away === "Free" && !state.marked && !state.unsettled);
    await fill("Message Alpha", text);
    await waitForScreen(() => expect(button("Send")?.disabled).toBe(false));
    await press("Send");
  };
  const before = await rooms();
  const beforeBalance = await balance();

  await raiseConversation(alpha, runtime);
  await until(alpha, runtime, Composer, (state) => state.binding.owner > 0 && state.slot === "Open");

  await drawn(() => runtime.runPromise(Effect.flatMap(Chats, (machine) => machine.send({ type: "start", replying: false, holding: false }))));
  await until(alpha, runtime, Chats, (state) => state.chosen > 0 && state.make.outcome === "Confirmed" && state.page.status === "Loaded");
  await until(alpha, runtime, Composer, (state) => state.binding.conversation > 0 && state.slot === "Open");
  const opened = await rooms();
  const added = opened.filter((room) => before.every((previous) => previous.id !== room.id));
  expect(added).toHaveLength(1);
  const [record] = added;
  if (!record) throw new Error("The agent did not return the new conversation");
  const messagePage = Schema.decodeUnknownSync(Schema.Struct({
    messages: Schema.Array(Schema.Struct({ role: Schema.Literals(["user", "assistant"]), text: Schema.String })),
  }));
  const transcript = async () => messagePage(await mine.agentSays<unknown>(`/api/conversations/${encodeURIComponent(record.id)}/messages`)).messages;

  const prompt = "What time did we set for the review?";
  const answer = "The review is at nine.";
  await mine.script({ kind: "text", parts: ["[answer] The review ", "is at nine."] }, prompt);
  await send(prompt);
  await until(alpha, runtime, Conversation, (state) => state.turn.reply === "Complete");
  await waitForScreen(() => expect(rendered()).toEqual([prompt, answer]));
  expect(await transcript()).toEqual([{ role: "user", text: prompt }, { role: "assistant", text: answer }]);
  expect(await balance()).toBeLessThan(beforeBalance);

  const next = "Read the schedule before you answer.";
  const partial = "I am reading the schedule.";
  await mine.script({ kind: "stall", first: `[answer] ${partial}` }, next);
  await send(next);
  await until(alpha, runtime, Conversation, (state) => state.turn.reply === "Streaming");
  await waitForScreen(() => {
    expect(document.querySelector('[data-alpha-message-id="reply"] [data-alpha-message-text]')?.textContent).toBe(partial);
    expect(button("Stop reply")?.disabled).toBe(false);
  });
  expect(button("Send")).toBeUndefined();
  await press("Stop reply");
  await until(alpha, runtime, Conversation, (state) => state.turn.reply === "Stopped" && state.check !== "Aborting" && state.recheck.status !== "Loading");
  await waitForScreen(() => {
    expect(button("Stop reply")).toBeUndefined();
    expect(rendered()).toEqual(expect.arrayContaining([prompt, answer, next]));
  });
  const saved = await transcript();
  expect(saved.filter(({ role }) => role === "user").map(({ text }) => text)).toEqual([prompt, next]);
  expect(saved.filter(({ role, text }) => role === "assistant" && text === answer)).toHaveLength(1);
  expect((await rooms()).map(({ id }) => id).sort()).toEqual(opened.map(({ id }) => id).sort());
  const sent = (await mine.asked()).map((request) => request.findLast((message) => message.role === "user")?.content);
  const matching = sent.filter((text): text is string => typeof text === "string" && [prompt, next].some((one) => text === one || text.startsWith(`${one}\n\nNote from the agent host, not the person:\n`)));
  expect(matching.map((text) => text.split("\n", 1)[0])).toEqual([prompt, next]);
}, 300_000);

function forward(origin: string, token: string): Answering {
  const service = new URL(origin);
  if (service.protocol !== "http:" || service.hostname !== "127.0.0.1" || !service.port || service.username || service.password) {
    throw new Error("The journey forwards only to its loopback service");
  }
  return async (request) => {
    const { pathname, search } = new URL(request.url);
    const target = new URL(service.origin);
    target.pathname = pathname;
    target.search = search;
    const headers = new Headers(request.headers);
    headers.set("authorization", `Bearer ${token}`);
    headers.set("accept-encoding", "identity");
    headers.delete("host");
    headers.delete("transfer-encoding");
    headers.delete("content-length");
    const body = request.body === null ? undefined : Buffer.from(await request.arrayBuffer());
    if (body !== undefined) headers.set("content-length", String(body.byteLength));
    return new Promise<Response>((resolve, reject) => {
      const outgoing = nodeRequest(target, { method: request.method, headers: Object.fromEntries(headers), signal: request.signal }, (incoming) => {
        const status = incoming.statusCode ?? 502;
        const received = new Headers(Object.entries(incoming.headersDistinct).flatMap(([name, values]) => values?.map((value) => [name, value]) ?? []));
        const bodyless = request.method === "HEAD" || status === 204 || status === 205 || status === 304;
        if (bodyless) incoming.resume();
        const stream = bodyless ? null : Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
        resolve(new Response(stream, { status, headers: received }));
      });
      outgoing.once("error", reject).end(body);
    });
  };
}

it('Send one reviewed email as context to my resident agent (spec/app/inbox/message.md, "Story: Ask Alpha about a message")', async () => {
  const world = scene();
  const source = world.inbox.mail.find(({ card }) => card.id === "g4");
  if (!source) throw new Error("The test mailbox has no review email");
  const mailbox = services(world).cloud;
  const cloud = forward(mine.cloud.local, mine.key.token);
  const { alpha } = await openOver(fakeWorld(world, {
    agent: forward(mine.agent.origin, mine.agent.token),
    cloud: (request) => new URL(request.url).pathname.startsWith("/api/v1/eliza/google/") ? mailbox(request) : cloud(request),
  }), only("home", "view:Inbox", "assistant", "notice"));
  const mail = inbox.runtime(alpha);
  const chat = assistant.runtime(alpha);
  const inboxTile = () => document.querySelector<HTMLButtonElement>("[data-home-tile='view:Inbox']");
  const waitForScreen = (check: () => void | Promise<void>) => onScreen(check, 120_000);
  await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0);
  await waitForScreen(async () => {
    const state = await home.runtime(alpha).runPromise(Home.use((machine) => machine.get()));
    expect(state.tiles.load.status).toBe("Loaded");
    expect(inboxTile()).not.toBeNull();
  });
  await drawn(() => {
    const tile = inboxTile();
    if (!tile) throw new Error("The Inbox tile was not shown on Home");
    tile.click();
  });
  await until(alpha, mail, Mailbox, (state) => state.list.status === "Loaded");
  await press(/Standup notes/u);
  await until(alpha, mail, Message, (state) => state.body.status === "Loaded");
  await drawn(() => button("More actions")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  await drawn(() => {
    const action = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent === "Ask Alpha");
    if (!action) throw new Error("Ask Alpha was not offered for the email");
    action.click();
  });
  const review = () => document.querySelector("[role=alertdialog]")?.textContent ?? "";
  await waitForScreen(() => expect(review()).toContain(source.body));
  const prompt = "Who owns the onboarding copy?";
  const reply = "Maya owns the onboarding copy.";
  // spec/app/assistant/context.md, "A reviewed email or voice-note transcript flag travels in structured turn context, never inside the owner's request text"
  const hostLead = `${prompt}\n\nNote from the agent host, not the person:\n`;
  const carrying = async () => (await mine.asked()).map((request) => request.findLast((message) => message.role === "user")?.content)
    .filter((text): text is string => typeof text === "string" && text.startsWith(hostLead) && text.includes("Source: Email") && text.includes(source.body));
  await pressOnTop("Add to chat");
  await until(alpha, chat, Composer, (state) => state.slot === "Open" && state.away === "Free");
  await until(alpha, chat, Conversation, (state) => state.observing);
  expect(await carrying()).toEqual([]);

  await mine.script({ kind: "text", parts: [`[answer] ${reply}`] }, prompt);
  await fill("Message Alpha", prompt);
  await sendAndHear(alpha, chat, reply, waitForScreen);
  const seen = await carrying();
  expect([seen.length, world.inbox.changes]).toEqual([1, []]);
  const [askedText = ""] = seen;
  const [ownerPart = "", hostPart = ""] = askedText.split("\n\nNote from the agent host, not the person:\n");
  expect(ownerPart).toBe(prompt);
  expect(ownerPart).not.toContain(source.body);
  expect(ownerPart).not.toContain(source.card.from);
  expect(ownerPart).not.toContain("Use the following user-reviewed email");
  expect(hostPart).toContain("<<<EXTERNAL_UNTRUSTED_CONTENT>>>");
  expect(hostPart).toContain("<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>");
  expect(hostPart).toContain(`from: ${source.card.from}`);
  expect(hostPart).toContain(`subject: ${source.card.subject}`);
  expect(hostPart).toContain(source.body);
  const roomList = Schema.decodeUnknownSync(Schema.Struct({ conversations: Schema.Array(ConversationRecord) }));
  const { conversations } = roomList(await mine.agentSays<unknown>("/api/conversations"));
  const storedPages = await Promise.all(conversations.map((one) => mine.agentSays<{ messages: { role: string; text: string }[] }>(`/api/conversations/${encodeURIComponent(one.id)}/messages`)));
  const userStored = storedPages.flatMap((page) => page.messages.filter((row) => row.role === "user" && row.text.includes(prompt)));
  expect(userStored.map((row) => row.text)).toEqual([prompt]);
}, 300_000);

it('Ask my resident agent about one reviewed photo (spec/app/photos/viewer.md, "Story: Share what I am looking at"); (spec/app/assistant/composer.md, "A later reviewed photo replaces the chosen draft photo"); (spec/app/photos/viewer.md, "Removing its draft attachment closes only the exact photo still showing")', async () => {
  // spec/app/assistant/index.md, "Stored attachments are posted with their message, and a message whose attachments could not be stored never left": the WebView's IndexedDB keeps the draft's photos for the turn.
  vi.stubGlobal("indexedDB", memoryIndexedDB());
  onTestFinished(() => { vi.unstubAllGlobals(); });
  const world = { ...scene(), phone: true, image: true, now: Date.now() };
  world.photos.access = { scope: "full", images: "full", videos: "denied" };
  const source = world.photos.rows.find((row) => row.kind === "image" && row.image.startsWith("data:image/png;base64,"));
  const replacement = world.photos.rows.find((row) => row.kind === "image" && row.image.startsWith("data:image/jpeg;base64,"));
  const picture = world.photos.rows.find((row) => row.kind === "image" && row !== source && row.image.startsWith("data:image/png;base64,"));
  if (!source || !replacement || !picture) throw new Error("The phone fixture needs three different photos");
  source.name = "Reviewed photo.png";
  replacement.name = "Replacement photo.jpg";
  const ordinary = "Ordinary attachment.png";
  picture.name = ordinary;
  const ordinaryData = picture.image.slice(picture.image.indexOf(",") + 1);
  const prompt = "What should I look for in this photo?";
  const reply = "Look for the landmarks near the center.";
  const received: unknown[] = [];
  const forwardAgent = forward(mine.agent.origin, mine.agent.token);
  const { alpha } = await openOver(fakeWorld(world, {
    agent: async (request) => {
      if (request.method === "POST" && /^\/api\/conversations\/[^/]+\/messages(?:\/stream)?$/u.test(new URL(request.url).pathname)) {
        const body: unknown = await request.clone().json();
        received.push(body);
      }
      return forwardAgent(request);
    },
    cloud: forward(mine.cloud.local, mine.key.token),
  }), only("home", "view:Photos", "assistant", "notice"));
  const library = photos.runtime(alpha);
  const chat = assistant.runtime(alpha);
  const readViewer = () => library.runPromise(Viewer.use((machine) => machine.get()));
  const readDraft = () => chat.runPromise(Composer.use((machine) => machine.get()));
  const readShell = () => alpha.runtime.runPromise(Shell.use((machine) => machine.get()));
  const waitForScreen = onScreen;
  await until(alpha, chat, Conversation, (state) => state.ready);
  await until(alpha, chat, Composer, (state) => state.slot === "Open" && state.away === "Free");
  await press("Photos");
  await until(alpha, library, Library, (state) => state.library.status === "Loaded");
  const openPhoto = async (name = source.name) => {
    const previous = (await readViewer()).read.ticket;
    await press(name);
    await waitForScreen(async () => {
      const view = await readViewer();
      expect(view.open).toBeGreaterThan(0);
      expect(view.read).toMatchObject({ status: "Loaded" });
      expect(view.read.ticket).toBeGreaterThan(previous);
      const openImage = [...document.querySelectorAll<HTMLImageElement>('[data-alpha-subview="photos-viewer"] img')];
      expect(openImage.map((image) => image.alt)).toContain(name);
    });
  };
  const askAbout = async () => {
    await drawn(() => button("Photo actions")?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    await drawn(() => {
      const action = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent === "Ask Alpha");
      if (!action) throw new Error("Ask Alpha was not offered for the photo");
      action.click();
    });
  };
  const offerPhoto = async (name: string, files: number) => {
    const [opened, draft] = await Promise.all([readViewer(), readDraft()]);
    await askAbout();
    await waitForScreen(async () => {
      const [shell, view, current] = await Promise.all([readShell(), readViewer(), readDraft()]);
      expect([shell.assistant, shell.trail.at(-1)]).toEqual(["Sheet", "Photos"]);
      expect(view).toMatchObject({
        open: opened.open,
        revision: opened.revision,
        read: { status: "Loaded", ticket: opened.read.ticket },
      });
      expect([current.binding, current.read.ticket, current.editor.files]).toEqual([draft.binding, draft.read.ticket, files]);
      expect(button(`Remove ${name}`)?.disabled).toBe(false);
    });
  };
  await openPhoto();
  const priorReads = world.photos.readCount;
  const gate = Promise.withResolvers<void>();
  world.photos.readGate = gate.promise;
  try {
    await askAbout();
    await waitForScreen(() => expect(world.photos.readCount).toBe(priorReads + 1));
    await press("Back to photos");
    await until(alpha, library, Viewer, (state) => state.open === 0);
  } finally {
    delete world.photos.readGate;
    await drawn(async () => { gate.resolve(); await gate.promise; });
  }
  expect([button(`Remove ${source.name}`), received]).toEqual([undefined, []]);
  await openPhoto();
  await offerPhoto(source.name, 1);
  await press(`Remove ${source.name}`);
  await until(alpha, library, Viewer, (state) => state.open === 0);
  await until(alpha, chat, Composer, (state) => state.editor.files === 0);
  await hardware("back");
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Bar");
  await openPhoto();
  await offerPhoto(source.name, 1);
  chatAction("Attach media");
  // spec/app/assistant/attachments.md, "Story: Choose files to attach": with the library granted, the phone's picker lists its photos to choose from.
  const picked = () => [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Attach files"] button')].find((one) => one.getAttribute("aria-label") === ordinary);
  await waitForScreen(() => expect(document.querySelector('[aria-label="Attach files"]')).not.toBeNull());
  await fill("Search photos", "Ordinary");
  await waitForScreen(() => expect(picked()?.disabled).toBe(false));
  await pressOnTop(ordinary);
  await waitForScreen(() => expect(button(`Remove ${ordinary} from the selection`)).toBeDefined());
  await pressOnTop("Attach selected files");
  await until(alpha, chat, Composer, (state) => state.editor.files === 2);
  await fill("Message Alpha", prompt);
  await hardware("back");
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Bar");
  await press("Back to photos");
  await until(alpha, library, Viewer, (state) => state.open === 0);
  await openPhoto(replacement.name);
  await offerPhoto(replacement.name, 2);
  const writing = await readDraft();
  const text = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message Alpha"]')?.value;
  expect([button(`Remove ${source.name}`), Boolean(button(`Remove ${ordinary}`)), writing.editor.files, text, received])
    .toEqual([undefined, true, 2, prompt, []]);

  await mine.script({ kind: "text", parts: [`[answer] ${reply}`] }, prompt);
  await sendAndHear(alpha, chat, reply);
  expect(received).toEqual([expect.objectContaining({
    text: expect.stringContaining(prompt),
    images: [
      { data: replacement.image.slice(replacement.image.indexOf(",") + 1), mimeType: "image/jpeg", name: replacement.name },
      { data: ordinaryData, mimeType: "image/png", name: ordinary },
    ],
  })]);
}, 300_000);

it('Approve a photo requested by the resident agent (spec/app/camera/index.md, "Story: Let Alpha take a photo"); (spec/app/camera/agent.md, "A confirmed capture can be offered in the same draft for the owner to send")', async () => {
  const world = { ...scene(), phone: true, image: true, now: Date.now() };
  world.camera.galleryVolume = "external_primary";
  world.telephony.enrollment = { journal: new Map() };
  let outgoing = 0;
  const forwardAgent = forward(mine.agent.origin, mine.agent.token);
  const { alpha } = await openOver(fakeWorld(world, {
    agent: (request) => {
      if (request.method === "POST" && /^\/api\/conversations\/[^/]+\/messages(?:\/stream)?$/u.test(new URL(request.url).pathname)) outgoing++;
      return forwardAgent(request);
    },
    cloud: forward(mine.cloud.local, mine.key.token),
  }), only("home", "assistant", "view:Camera", "view:Photos", "notice"));
  const runtime = assistant.runtime(alpha);
  const waitForScreen = onScreen;

  await raiseConversation(alpha, runtime);
  await until(alpha, runtime, Composer, (state) => state.binding.owner > 0 && state.slot === "Open" && state.away === "Free");
  const prompt = "Take a photo with the back camera.";
  await mine.script({ kind: "tool", name: "PROPOSE_DEVICE_ACTION", input: { operation: { type: "camera_capture_photo", lens: "back" } } }, prompt);
  await mine.script({ kind: "text", parts: ["[answer] Review the request on your phone."] }, prompt);
  await fill("Message Alpha", prompt);
  await waitForScreen(() => expect(button("Send")?.disabled).toBe(false));
  await press("Send");

  await waitForScreen(() => {
    expect(document.querySelector('[role="log"]')?.textContent).toContain("Open the rear camera to review the shot");
    expect(button("Approve")?.disabled).toBe(false);
  });
  expect(world.camera.photos).toHaveLength(0);
  await press("Approve");

  const viewfinder = () => document.querySelector('[aria-label="Camera request"]');
  const take = () => [...(viewfinder()?.querySelectorAll("button") ?? [])].find((control) => control.textContent === "Take photo");
  await waitForScreen(() => {
    expect(viewfinder()?.textContent).toContain("Back camera requested");
    expect(take()?.disabled).toBe(false);
  });
  expect([world.camera.photos.length, world.camera.preview?.direction]).toEqual([0, "back"]);
  const image = world.photos.rows.find((row) => row.kind === "image" && row.image.startsWith("data:image/jpeg;base64,"))?.image;
  if (!image) throw new Error("The phone fixture has no JPEG bytes");
  await drawn(() => {
    world.photos.rows.unshift({
      id: "m:external_primary:i:1", name: "Agent capture.jpg", owned: true, kind: "image", image,
      width: 1280, height: 720, size: 10_000, date: world.now, revision: "agent-capture",
    });
    take()?.click();
  });
  await waitForScreen(() => {
    expect(world.camera.photos).toMatchObject([{ saveToGallery: true, thumbnailOnly: true }]);
    expect(button("Open last photo")).toBeDefined();
  });

  const receipt = () => [...(world.telephony.enrollment?.journal.values() ?? [])].find((entry) => entry.acknowledged);
  await waitForScreen(() => expect(receipt()?.evidence.result).toMatchObject({
    kind: "camera_capture_photo", mediaId: "1", libraryId: "m:external_primary:i:1", width: 1280, height: 720,
  }));
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Sheet");
  await waitForScreen(() => {
    expect(button("Remove Agent capture.jpg")).toBeDefined();
    expect(outgoing).toBe(1);
  });
  await hardware("back");
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Bar");
  await press("Open last photo");
  await waitForScreen(() => expect(document.querySelector('[data-alpha-subview="photos-viewer"] img[alt="Agent capture.jpg"]')).not.toBeNull());
}, 300_000);

it('Approve the resident agent’s exact text once and read its recorded outcome (spec/app/contacts/agent.md, "Nothing is done but what the owner approved, as it was shown, once"; spec/app/contacts/agent.md, "Only the phone answers the action, and the request ends as that answer says")', async () => {
  const world = { ...scene(), phone: true, image: true, now: Date.now() };
  const enrollment: NonNullable<typeof world.telephony.enrollment> = { journal: new Map() };
  world.telephony.enrollment = enrollment;
  const agent = forward(mine.agent.origin, mine.agent.token);
  const proposalsPath = "/api/client-devices/proposals";
  let enrolled: Headers | undefined;
  const { alpha } = await openOver(fakeWorld(world, {
    agent: (request) => {
      if (new URL(request.url).pathname === proposalsPath) enrolled = new Headers(request.headers);
      return agent(request);
    },
    cloud: forward(mine.cloud.local, mine.key.token),
  }), only("home", "assistant", "view:Messages", "notice"));
  const runtime = assistant.runtime(alpha);

  await until(alpha, alpha.runtime, Shell, (state) => state.image);
  await until(alpha, alpha.runtime, Phone, (state) => state.telecom === "NoCall");
  const messages = () => document.querySelector<HTMLButtonElement>('[data-home-tile="view:Messages"]');
  await onScreen(() => expect(messages()).not.toBeNull());
  await drawn(() => messages()?.click());
  await until(alpha, alpha.runtime, Messages, (state) => state.pane === "Threads" && state.list.status === "Loaded");
  await until(alpha, runtime, Conversation, (state) => state.ready && state.context.showing.tag === "App" && state.context.showing.view === "Messages");
  await onScreen(() => expect(button("Open Alpha")?.disabled).toBe(false));
  await press("Open Alpha");
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Sheet");
  await until(alpha, runtime, Composer, (state) => state.binding.owner > 0 && state.slot === "Open" && state.away === "Free");

  const operation = { type: "sms_send", recipients: ["+14155550100"], body: "Meet at the front door", subscriptionId: 1 } satisfies DeviceOperation;
  const prompt = "Send an SMS to +14155550100 saying Meet at the front door";
  await mine.script({ kind: "tool", name: "PROPOSE_DEVICE_ACTION", input: { operation } }, prompt);
  await mine.script({ kind: "text", parts: ["[answer] Review this send on your phone."] }, prompt);
  await fill("Ask Alpha", prompt);
  await onScreen(() => expect(button("Send")?.disabled).toBe(false));
  await press("Send");

  const proposalList = Schema.decodeUnknownSync(Schema.Struct({ proposals: Schema.Array(Schema.Unknown) }));
  const proposalIdentity = Schema.decodeUnknownSync(Schema.Struct({ id: Schema.NonEmptyString, digest: Schema.NonEmptyString }));
  const readProposals = async () => {
    if (!enrolled) throw new Error("The app has not asked for its enrolled proposals");
    const response = await agent(new Request(new URL(proposalsPath, mine.agent.origin), { headers: enrolled }));
    expect(response.status).toBe(200);
    return proposalList(await response.json()).proposals;
  };
  await onScreen(() => expect(button("Send this text")?.disabled).toBe(false));
  const review = button("Send this text")?.closest("[data-alpha-sms-review]");
  expect(review?.textContent).toContain(operation.body);
  expect(review?.textContent).toContain("(415) 555-0100");
  expect(review?.textContent).toContain("SIM 1");
  const proposals = await readProposals();
  const pending = proposals.find((one) => typeof one === "object" && one !== null && "id" in one && one.id === review?.getAttribute("data-alpha-review"));
  expect(pending).toMatchObject({ state: "pending", payload: { operation } });
  const { id, digest } = proposalIdentity(pending);
  expect(world.telephony.sent).toEqual([]);

  const native = Promise.withResolvers<void>();
  world.telephony.hold = native.promise;
  const settled = (state: string) => expect.objectContaining({ id, digest, state });
  try {
    await press("Send this text");
    await vi.waitFor(async () => {
      expect(await readProposals()).toContainEqual(settled("executing"));
    }, { timeout: 30_000 });
    expect(world.telephony.sent).toEqual([]);
  } finally {
    native.resolve();
  }
  await vi.waitFor(async () => {
    expect(await readProposals()).toContainEqual(expect.objectContaining({
      id, digest, state: "done", execution: expect.objectContaining({
        providerIdempotencyKey: id,
        providerReceipt: expect.objectContaining({
          outcome: "applied", operationId: id,
          result: expect.objectContaining({ kind: "sms-send", operationId: id, subscriptionId: 1, status: "sent" }),
        }),
      }),
    }));
  }, { timeout: 30_000 });
  await onScreen(() => expect(enrollment.journal.get(id)?.acknowledged).toBe(true));
  expect(world.telephony.sent).toEqual([{ operationId: id, recipients: operation.recipients, body: operation.body }]);
}, 300_000);

it('Filter Files from Home and open the named file with the resident agent (spec/app/files/index.md, "An exact Files request from another screen may open Files once after the typed reply finishes"); (spec/app/files/index.md, "An explicit request to open or filter Files may act directly on the same idle Files view")', async () => {
  const world = { ...scene(), phone: true, image: true, now: Date.now() };
  world.telephony.enrollment = { journal: new Map() };
  const path = "Documents/notes.txt";
  const contents = "This exact file is open on the phone.";
  world.files.texts[path] = contents;
  const { alpha } = await openOver(fakeWorld(world, {
    agent: forward(mine.agent.origin, mine.agent.token),
    cloud: forward(mine.cloud.local, mine.key.token),
  }), only("home", "assistant", "view:Files", "notice"));
  const runtime = assistant.runtime(alpha);
  const waitForScreen = onScreen;
  const receipts = () => [...(world.telephony.enrollment?.journal.values() ?? [])].filter((entry) => entry.acknowledged);
  const send = async (prompt: string, operation: DeviceOperation) => {
    await until(alpha, runtime, Composer, (state) => state.binding.owner > 0 && state.slot === "Open" && state.away === "Free");
    await mine.script({ kind: "tool", name: "PROPOSE_DEVICE_ACTION", input: { operation } }, prompt);
    await mine.script({ kind: "text", parts: ["[answer] I’ll look in Files."] }, prompt);
    await fill("Message Alpha", prompt);
    await waitForScreen(() => expect(button("Send")?.disabled).toBe(false));
    await press("Send");
  };

  await until(alpha, alpha.runtime, Preferences, (state) => state.document.read.status === "Loaded" && !state.askFirst);
  await raiseConversation(alpha, runtime, (state) => state.trail.length === 0 && state.assistant === "Sheet");

  const filter = { type: "files_filter", kind: "pdf", folder: "Download" } as const;
  await send("Show PDFs in Download", filter);
  await waitForScreen(() => {
    const found = document.querySelector('[role="group"][aria-label="Found"]');
    expect(Array.from(found?.querySelectorAll("button") ?? [], (row) => row.getAttribute("aria-label"))).toEqual(["lease.pdf"]);
    expect(document.body.textContent).toContain("Showing 1 item in Files.");
    expect(button("Approve")).toBeUndefined();
    expect(receipts().map(({ operation }): unknown => JSON.parse(operation))).toEqual([filter]);
  });

  const open = { type: "files_open", path } as const;
  await send("Open Documents/notes.txt", open);
  await waitForScreen(() => expect(receipts().map(({ operation }): unknown => JSON.parse(operation))).toEqual([filter, open]));
  // Files draws its preview only while Ask Alpha is not raised over it: the file opened behind the sheet shows once it is put away.
  await hardware("back");
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Bar");
  await waitForScreen(() => expect(document.querySelector('[role="dialog"][aria-label="Preview"] pre')?.textContent).toBe(contents));
  expect(receipts().map(({ evidence }) => evidence.result)).toEqual([undefined, undefined]);
}, 300_000);
