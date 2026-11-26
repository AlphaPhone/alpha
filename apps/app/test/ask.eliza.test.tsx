// @vitest-environment happy-dom
import { ConversationRecord, type DeviceOperation } from "@elizaos/agent";
import { Effect, Schema } from "effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Ask } from "../gen/app__ask.effect.vibe";
import { Machine as Mailbox } from "../gen/app__inbox.effect.vibe";
import { Machine as Message } from "../gen/app__inbox__message.effect.vibe";
import { Machine as Preferences } from "../gen/app__settings__preferences.effect.vibe";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import ask from "../src/ask/index.tsx";
import assistant from "../src/assistant/index.tsx";
import inbox from "../src/inbox/index.tsx";
import photos from "../src/photos/index.tsx";
import { Agent } from "../src/platform/agent.vibe";
import { Cloud } from "../src/platform/cloud.vibe";
import { askExample, askExampleLines, button, closeAll, drawn, fill, only, openOver, press, pressOnTop, underAct, until } from "./alpha.tsx";
import { owned } from "@repo/eliza-harness";
import { elizaWorld } from "./eliza/world.vibe";
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
  await mine.script({ kind: "text", parts: ["Hello ", "from ", "the cloud."] });
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
  await mine.script({ kind: "stall", first: "Thinking" });
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
  expect(await read("/api/notifications")).toMatchObject({ notifications: [], unreadCount: 0 });
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
  const waitForScreen = (assertScreen: () => void) => vi.waitFor(async () => {
    await drawn(() => undefined);
    assertScreen();
  }, { timeout: 20_000 });
  const send = async (text: string) => {
    await until(alpha, runtime, Composer, (state) => state.slot === "Open" && state.away === "Free" && !state.marked && !state.unsettled);
    await fill("Message Alpha", text);
    await waitForScreen(() => expect(button("Send")?.disabled).toBe(false));
    await press("Send");
  };
  const before = await rooms();
  const beforeBalance = await balance();

  await until(alpha, runtime, Conversation, (state) => state.ready);
  await press("Open conversation");
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Sheet");
  await until(alpha, runtime, Composer, (state) => state.binding.owner > 0 && state.slot === "Open");

  await drawn(() => {
    const trigger = button("Chat actions");
    if (!trigger) throw new Error("Chat actions did not open from Home");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await drawn(() => {
    const start = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent === "New chat");
    if (!start) throw new Error("New chat was not offered");
    start.click();
  });
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

/** The native plugin fixture forwards to the actual services for this journey's account. */
function forward(origin: string, token: string): Answering {
  return async (request) => {
    const { pathname, search } = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set("authorization", `Bearer ${token}`);
    return fetch(new URL(pathname + search, origin), {
      method: request.method, headers, signal: request.signal,
      ...(request.body === null ? {} : { body: await request.arrayBuffer() }),
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
  await drawn(() => vi.waitFor(() => expect(button("Inbox")).toBeDefined()));
  await press("Inbox");
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
  await drawn(() => vi.waitFor(() => expect(review()).toContain(source.body)));
  const before = (await mine.asked()).length;
  await pressOnTop("Add to chat");
  await until(alpha, chat, Composer, (state) => state.slot === "Open" && state.away === "Free");
  expect(await mine.asked()).toHaveLength(before);

  const prompt = "Who owns the onboarding copy?";
  const reply = "Maya owns the onboarding copy.";
  await mine.script({ kind: "text", parts: [`[answer] ${reply}`] });
  await fill("Message Alpha", prompt);
  await drawn(() => vi.waitFor(() => expect(button("Send")?.disabled).toBe(false)));
  await press("Send");
  await until(alpha, chat, Conversation, (state) => state.turn.reply === "Complete");
  await drawn(() => vi.waitFor(() => expect(document.querySelector("[role=log]")?.textContent).toContain(reply)));
  const requests = (await mine.asked()).slice(before);
  const received = requests[0]?.findLast((message) => message.role === "user")?.content;
  expect([requests.length, received, world.inbox.changes]).toEqual([1, expect.stringContaining(JSON.stringify({
    from: source.card.from, to: [...source.card.to, ...source.card.cc], subject: source.card.subject, bodyText: source.body,
  })), []]);
  expect(received).toEqual(expect.stringContaining(prompt));
}, 300_000);

it('Ask my resident agent about one reviewed photo (spec/app/photos/viewer.md, "Story: Share what I am looking at")', async () => {
  const world = { ...scene(), phone: true, image: true, now: Date.now() };
  world.photos.access = { scope: "full", images: "full", videos: "denied" };
  const source = world.photos.rows.find((row) => row.kind === "image" && row.image.startsWith("data:image/png;base64,"));
  if (!source) throw new Error("The phone fixture has no PNG");
  source.name = "Reviewed photo.png";
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
  await until(alpha, chat, Conversation, (state) => state.ready);
  await press("Photos");
  await until(alpha, library, Library, (state) => state.library.status === "Loaded");
  await press(source.name);
  await until(alpha, library, Viewer, (state) => state.read.status === "Loaded");
  await drawn(() => button("Photo actions")?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  await drawn(() => {
    const action = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent === "Ask Alpha");
    if (!action) throw new Error("Ask Alpha was not offered for the photo");
    action.click();
  });
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Sheet");
  await drawn(() => vi.waitFor(() => expect(button(`Remove ${source.name}`)).toBeDefined()));
  expect(received).toEqual([]);

  await mine.script({ kind: "text", parts: [`[answer] ${reply}`] });
  await fill("Message Alpha", prompt);
  await drawn(() => vi.waitFor(() => expect(button("Send")?.disabled).toBe(false)));
  await press("Send");
  await until(alpha, chat, Conversation, (state) => state.turn.reply === "Complete");
  await drawn(() => vi.waitFor(() => expect(document.querySelector("[role=log]")?.textContent).toContain(reply)));
  expect(received).toEqual([expect.objectContaining({
    text: expect.stringContaining(prompt),
    images: [{ data: source.image.slice(source.image.indexOf(",") + 1), mimeType: "image/png", name: source.name }],
  })]);
}, 300_000);

it('Approve a photo requested by the resident agent (spec/app/camera/index.md, "Story: Let Alpha take a photo")', async () => {
  const world = { ...scene(), phone: true, image: true, now: Date.now() };
  world.camera.galleryVolume = "external_primary";
  const { alpha } = await openOver(fakeWorld(world, {
    agent: forward(mine.agent.origin, mine.agent.token),
    cloud: forward(mine.cloud.local, mine.key.token),
  }), only("home", "assistant", "view:Camera", "view:Photos", "notice"));
  const runtime = assistant.runtime(alpha);
  const waitForScreen = (assertScreen: () => void) => vi.waitFor(async () => {
    await drawn(() => undefined);
    assertScreen();
  }, { timeout: 30_000 });

  await until(alpha, runtime, Conversation, (state) => state.ready);
  await press("Open conversation");
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Sheet");
  await until(alpha, runtime, Composer, (state) => state.binding.owner > 0 && state.slot === "Open" && state.away === "Free");
  const prompt = "Take a photo with the back camera.";
  await mine.script({ kind: "tool", name: "PROPOSE_DEVICE_ACTION", input: { operation: { type: "camera_capture_photo", lens: "back" } } }, prompt);
  await mine.script({ kind: "text", parts: ["[answer] Review the request on your phone."] }, prompt);
  await fill("Message Alpha", prompt);
  await waitForScreen(() => expect(button("Send")?.disabled).toBe(false));
  await press("Send");

  await waitForScreen(() => expect(button("Approve")?.disabled).toBe(false));
  expect(world.camera.photos).toHaveLength(0);
  await press("Approve");

  const viewfinder = () => document.querySelector('[aria-label="Camera request"]');
  const take = () => [...(viewfinder()?.querySelectorAll("button") ?? [])].find((control) => control.textContent === "Take photo");
  await waitForScreen(() => {
    expect(viewfinder()?.textContent).toContain("Back camera requested");
    expect(take()?.disabled).toBe(false);
  });
  expect([world.camera.photos.length, world.camera.preview?.direction]).toEqual([0, "back"]);
  await drawn(() => take()?.click());
  await waitForScreen(() => {
    expect(world.camera.photos).toMatchObject([{ saveToGallery: true, thumbnailOnly: true }]);
    expect(button("Open last photo")).toBeDefined();
  });

  const receipt = () => [...(world.telephony.enrollment?.journal.values() ?? [])].find((entry) => entry.acknowledged);
  await waitForScreen(() => expect(receipt()?.evidence.result).toMatchObject({
    kind: "camera_capture_photo", mediaId: "1", libraryId: "m:external_primary:i:1", width: 1280, height: 720,
  }));
  const image = world.photos.rows.find((row) => row.kind === "image" && row.image !== "")?.image;
  if (!image) throw new Error("The phone fixture has no image bytes");
  world.photos.rows.unshift({
    id: "m:external_primary:i:1", name: "Agent capture.jpg", owned: true, kind: "image", image,
    width: 1280, height: 720, size: 10_000, date: world.now, revision: "agent-capture",
  });
  await press("Open last photo");
  await waitForScreen(() => expect(document.querySelector('[data-alpha-subview="photos-viewer"] img[alt="Agent capture.jpg"]')).not.toBeNull());
}, 300_000);

it('Filter Files from Home and open the named file with the resident agent (spec/app/files/index.md, "An exact Files request from another screen may open Files once after the typed reply finishes"); (spec/app/files/index.md, "An explicit request to open or filter Files may act directly on the same idle Files view")', async () => {
  const world = { ...scene(), phone: true, image: true, now: Date.now() };
  const path = "Documents/notes.txt";
  const contents = "This exact file is open on the phone.";
  world.files.texts[path] = contents;
  const { alpha } = await openOver(fakeWorld(world, {
    agent: forward(mine.agent.origin, mine.agent.token),
    cloud: forward(mine.cloud.local, mine.key.token),
  }), only("home", "assistant", "view:Files", "notice"));
  const runtime = assistant.runtime(alpha);
  const waitForScreen = (assertScreen: () => void) => vi.waitFor(async () => {
    await drawn(() => undefined);
    assertScreen();
  }, { timeout: 30_000 });
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
  await until(alpha, runtime, Conversation, (state) => state.ready);
  await press("Open conversation");
  await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0 && state.assistant === "Sheet");

  const filter = { type: "files_filter", kind: "pdf", folder: "Download" } as const;
  await send("Show PDFs in Download", filter);
  await waitForScreen(() => {
    const found = document.querySelector('[role="group"][aria-label="Found"]');
    expect(Array.from(found?.querySelectorAll("button") ?? [], (row) => row.getAttribute("aria-label"))).toEqual(["lease.pdf"]);
    expect(document.body.textContent).toContain("Showing 1 item in Files.");
    expect(button("Approve")).toBeUndefined();
    expect(receipts().map(({ operation }) => JSON.parse(operation))).toEqual([filter]);
  });

  const open = { type: "files_open", path } as const;
  await send("Open Documents/notes.txt", open);
  await waitForScreen(() => {
    expect(document.querySelector('[role="dialog"][aria-label="Preview"] pre')?.textContent).toBe(contents);
    expect(receipts().map(({ operation }) => JSON.parse(operation))).toEqual([filter, open]);
  });
  expect(receipts().map(({ evidence }) => evidence.result)).toEqual([undefined, undefined]);
}, 300_000);
