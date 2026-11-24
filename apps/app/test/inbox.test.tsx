// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as List } from "../gen/app__inbox.effect.vibe";
import { Machine as Marks } from "../gen/app__inbox__marking.effect.vibe";
import { Machine as Shown } from "../gen/app__inbox__message.effect.vibe";
import { Machine as Changes } from "../gen/app__inbox__sending.effect.vibe";
import inbox from "../src/inbox/index.tsx";
import { button, closeAll, fill, later, open, press, underAct, until } from "./alpha.tsx";
import { letter } from "./fakes/inbox.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const rows = () => [...document.querySelectorAll("ul[aria-label=Mail] li > button:not([role=checkbox])")].map((row) => row.getAttribute("aria-label"));
const told = () => [...document.querySelectorAll("section[aria-label=Inbox] [role=alert], section[aria-label=Inbox] [role=status], section[aria-label=Inbox] .text-sm")].map((one) => one.textContent);
const step = (name: string) => process.stderr.write(`STEP ${name}\n`);
const search = (text: string) => fill("Search mail", text).then(() => document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  it("See my mail (spec/app/inbox/index.md, \"Story: See my mail\")", async () => {
    const world = { ...scene(), phone };
    for (let at = 5; at <= 30; at += 1) world.inbox.mail.push(letter(at, `Newsletter ${at}`, ["INBOX"]));
    const first = await open(world);
    const { alpha } = first;
    const runtime = inbox.runtime(alpha);

    // spec/app/inbox/index.md, "Opening Inbox, and every change to Google access, checks the accounts again, even while a check is out"
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages === 1);
    step("1");
    expect([rows().slice(0, 2), rows().length]).toEqual([["Lunch on Friday", "Your tax return"], 25]);

    // spec/app/inbox/index.md, "More messages are read with the page cursor, which is given up as its page is asked"
    await press("More");
    await until(alpha, runtime, List, (s) => s.pages === 2);
    step("2");
    expect([rows().length, Boolean(button("More"))]).toEqual([28, false]);

    // spec/app/inbox/index.md, "Choosing a folder or a search reads its first page"
    await search("tax");
    await until(alpha, runtime, List, (s) => s.selected.query === "tax" && s.list.status === "Loaded");
    step("3");
    expect(rows()).toEqual(["Your tax return"]);
    await press("Spam");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Spam" && s.list.status === "Loaded");
    step("4");
    expect(rows()).toEqual(["Win a prize"]);
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");
    step("5");

    // spec/app/inbox/message.md, "A message opens at its newest place in the thread, only while the grant of its account allows reading"; spec/app/inbox/marking.md, "Opening an unread message marks it read once in a session, silently, and never again, even when it is not known to have worked"
    await press("Lunch on Friday");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded");
    step("6");
    await until(alpha, runtime, Marks, (s) => s.attempt.outcome === "Confirmed");
    step("7");
    expect([document.querySelector("article h2")?.textContent, world.inbox.changes]).toEqual(["Lunch on Friday", ["mark-read g1"]]);

    // spec/app/inbox/message.md, "Only an https link without credentials in it can be reviewed and opened; any other link stays text"
    const visited = vi.spyOn(window, "open").mockReturnValue(null);
    await press("https://cafe.test/menu");
    await until(alpha, runtime, Shown, (s) => s.link === 1);
    step("8");
    await press("Open");
    await until(alpha, runtime, Shown, (s) => s.link === 0);
    step("9");
    expect(visited).toHaveBeenCalledWith("https://cafe.test/menu", "_blank", "noopener,noreferrer");

    // spec/app/inbox/marking.md, "The owner marks a message read or unread; while another mark is in flight the owner is told it is still in progress, and a message whose last mark was unconfirmed is marked again only after the list was read afresh"
    await press("Mark unread");
    await until(alpha, runtime, Marks, (s) => s.told === "Marked");
    step("10");
    expect(world.inbox.changes).toEqual(["mark-read g1", "mark-unread g1"]);
    await press("Back to the list");
    await until(alpha, runtime, Shown, (s) => s.message === 0);
    step("11");

    // spec/app/inbox/sending.md, "Archive and Trash are held for the undo window, and only the owner's Undo before it ends sends nothing"
    await press("Choose Your tax return");
    await press("Archive");
    await press("Archive");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Held");
    step("12");
    expect([rows().includes("Your tax return"), (await alpha.runtime.runPromise(List.use((list) => list.get()))).chosen]).toEqual([false, []]);
    await later(alpha, 4_000);
    await press("Undo");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Undone");
    step("13");
    expect([rows().includes("Your tax return"), world.inbox.changes]).toEqual([true, ["mark-read g1", "mark-unread g1"]]);

    // spec/app/inbox/sending.md, "A recorded operation sends its one request, for its own account under that account's grant now, exactly as reviewed: a draft while it is at the revision shown and its hand-over is written to the phone, archive and Trash once the undo window has passed"
    await press("Choose Your tax return");
    await press("Archive");
    await press("Archive");
    await later(alpha, 10_000);
    await until(alpha, runtime, Changes, (s) => s.attempt.outcome === "Confirmed");
    step("14");
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded");
    step("15");
    expect([rows().includes("Your tax return"), world.inbox.changes.at(-1)]).toEqual([false, "archive g2"]);

    // spec/app/inbox/index.md, "A read that fails offline or for another reason keeps what was on screen and the count, and says why"
    world.inbox.offline = true;
    await press("Refresh");
    await until(alpha, runtime, List, (s) => s.list.status === "Failed");
    step("16");
    expect([rows().length, told()]).toEqual([25, expect.arrayContaining(["You are offline"])]);
    await first.close();

    // spec/app/inbox/index.md, "A restart keeps the selection, the list kept for it and its credential, whether Spam and Trash can be searched, and the count as no longer fresh, and forgets the rest"; spec/app/inbox/index.md, "The saved list can be on screen while Gmail cannot be reached"
    const second = await open(world);
    const again = inbox.runtime(second.alpha);
    await until(second.alpha, again, List, (s) => s.saved && s.accounts.status === "Failed");
    step("17");
    expect([rows().length, told()]).toEqual([25, expect.arrayContaining(["Saved on this phone"])]);

    // spec/app/inbox/index.md, "Only the newest read's answer is shown, and only while reading is allowed": a read Google refuses as withdrawn empties the screen and asks to reconnect.
    world.inbox.offline = false;
    world.inbox.revoked = true;
    await press("Retry");
    await until(second.alpha, again, List, (s) => s.failure === "Revoked");
    step("18");
    expect([rows(), told()]).toEqual([[], expect.arrayContaining(["Reconnect Gmail in Settings"])]);
  });
});

it("Connect Gmail and keep to its grant (spec/app/inbox/index.md, \"Story: Connect Gmail and keep to its grant\")", async () => {
  const world = { ...scene(), phone: true };
  world.inbox.google = undefined;
  const { alpha } = await open(world);
  const runtime = inbox.runtime(alpha);

  // spec/app/inbox/index.md, "The owner can be signed out, have no account connected, have several to choose from, lack read access, be asked to reconnect Gmail, and a check can be asked again before the last answers"
  await press("Inbox");
  await until(alpha, runtime, List, (s) => s.accounts.status === "Loaded" && s.connected.length === 0);
  expect(told()).toEqual(expect.arrayContaining(["Connect Gmail in Settings to read your mail"]));

  // spec/app/inbox/index.md, "Mail is read only while signed in, for a selected account whose grant allows reading, and not once Google refused it as withdrawn"
  world.inbox.google = { email: "owner@gmail.test", connection: "grant-2", capabilities: ["google.basic_identity"] };
  await alpha.back();
  await press("Inbox");
  await until(alpha, runtime, List, (s) => s.accounts.status === "Loaded" && s.connected.length === 1);
  await press("owner@gmail.test");
  await until(alpha, runtime, List, (s) => s.selected.account !== 0);
  expect([rows(), told()]).toEqual([[], expect.arrayContaining(["Give Alpha access to read this account in Settings"])]);
});
