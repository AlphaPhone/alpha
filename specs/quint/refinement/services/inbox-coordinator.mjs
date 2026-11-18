// Observation labels are derived from real product state after each controlled schedule.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { captureInputs, checkTraces } from "../check-traces.mjs";
import { createInboxFixture, inboxDriverSources, rebuildInboxDriver } from "./inbox-coordinator-ports.mjs";
const action = (name, ...args) => ({ name, args });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => resolve = done);
  return { promise, resolve };
};
async function until(ready, label) {
  const deadline = Date.now() + 10000;
  while (!ready()) {
    assert.ok(Date.now() < deadline, label);
    await new Promise((done) => setTimeout(done, 0));
  }
}
const bodyClass = (value) => !value ? 0 : value === "original" ? 1 : 2;
const attachmentClass = (files) => !files?.length ? 0 : files.some((file) => file.dataBase64 === "Yg==") ? 2 : 1;
function recordFor(fixture, owner) {
  const user = fixture.controller.getSnapshot().cloudAccount?.userId;
  return [...fixture.slots.values()].find((value) => value?.requestId && value.grantId === `grant-${owner}` && JSON.parse(value.owner)[1] === user) ?? null;
}
function observe(fixture, coordinator, owner = 1) {
  const user = fixture.controller.getSnapshot().cloudAccount?.userId;
  const current = coordinator.drafts.email(), saved = [...fixture.slots.values()].find((value) => value?.version === 1 && value.id && value.owner && JSON.parse(value.owner)[1] === user && JSON.parse(value.owner)[3] === `grant-${owner}`);
  const retained = [...fixture.slots.values()].find((value) => value?.binding && value.text && JSON.parse(JSON.parse(value.binding)[2])[1] === user && JSON.parse(JSON.parse(value.binding)[2])[3] === `grant-${owner}`);
  const kept = retained ? fixture.modules.readInboxUnsaved(retained.text, JSON.parse(retained.binding)[2]) : null;
  const shelf = [...fixture.slots.values()].find((value) => value?.items && value.owner && JSON.parse(value.owner)[1] === user && JSON.parse(value.owner)[3] === `grant-${owner}`);
  const record = recordFor(fixture, owner), view = coordinator.provider.render().provider;
  return {
    phase: record?.phase ?? "empty",
    requests: fixture.events.filter((event) => event[0] === "dispatch" && event[1] === `grant-${owner}`).length,
    canConfirm: !view.busy && view.canConfirm,
    "copy.current": bodyClass(current?.proposal.bodyText),
    "copy.saved": bodyClass(saved?.body),
    "copy.retained": bodyClass(kept?.draft.body),
    "copy.shelf": bodyClass(shelf?.items[0]?.draft.body),
    "copy.earlier": saved?.earlierThanSent === true
  };
}
function step(trace, label, actions, expect) {
  trace.steps.push({ label, action: actions, expect });
}
async function setup(name, traces) {
  const fixture = await createInboxFixture(), coordinator = fixture.createPair();
  const trace = { name, init: action("init"), expect: observe(fixture, coordinator), steps: [] };
  traces.push(trace);
  await coordinator.bind();
  step(trace, "bind the real provider and local draft coordinator", [action("bind", 1), action("regrant")], observe(fixture, coordinator));
  return { fixture, coordinator, trace };
}
async function compose(fixture, coordinator, trace, { save = false, edit = false } = {}) {
  assert.equal(coordinator.drafts.begin(undefined, undefined, "", { to: ["recipient@example.test"], subject: "Subject", body: "original" }), true);
  await fixture.settle();
  step(trace, "create and retain the local source email", action("newDraft"), observe(fixture, coordinator));
  if (save) {
    coordinator.drafts.render().c.save();
    await fixture.settle();
    step(trace, "save a version and consume its retained edit", action("saveDraft"), observe(fixture, coordinator));
  }
  if (edit) {
    coordinator.drafts.render().c.onBody({ target: { value: "edited" } });
    await fixture.settle();
    step(trace, "edit after the saved version", action("editDraft"), observe(fixture, coordinator));
  }
}
// One tap on the composer's Send prepares the exact email, binds it in the journal and dispatches it once.
const directSend = (owner = 1) => [action("prepare", "send"), action("reviewed", true), action("reserve"), action("persisted", owner), action("dispatched")];
function tapSend(coordinator) {
  coordinator.drafts.render().c.send();
}
async function send(fixture, coordinator, trace) {
  const gate = deferred();
  const prepared = fixture.state.prepares;
  fixture.gates({ dispatch: () => gate.promise });
  tapSend(coordinator);
  await until(() => fixture.state.dispatches === 1, "provider dispatch");
  assert.equal(fixture.state.prepares, prepared + 1);
  step(trace, "one Send tap prepares, durably binds and dispatches one provider request", directSend(), observe(fixture, coordinator));
  return gate;
}
/** Holds the provider prepare of a Send tap so a change can land between prepare and dispatch. */
async function sendHeldAtPrepare(fixture, coordinator, trace) {
  const gate = deferred();
  fixture.gates({ prepare: () => gate.promise });
  tapSend(coordinator);
  await until(() => fixture.state.prepares === 1, "provider prepare");
  step(trace, "Send prepares the exact composer email", action("prepare", "send"), observe(fixture, coordinator));
  return gate;
}
/** Holds the journal write that admits dispatch. */
async function sendHeldAtCommit(fixture, coordinator, trace, refuse = false) {
  const gate = deferred();
  let entered = false;
  fixture.gates({ store: async (event) => {
    if (event.value?.phase === "dispatching") {
      entered = true;
      await gate.promise;
      if (refuse) throw Error("Fixture refused the dispatch journal write");
    }
  } });
  tapSend(coordinator);
  await until(() => entered, "held dispatching CAS");
  step(trace, "Send binds the prepared email and awaits its durable journal write", [action("prepare", "send"), action("reviewed", true), action("reserve")], observe(fixture, coordinator));
  return gate;
}
export async function runInboxCoordinatorRefinement(extraSources = []) {
  const discovered = await inboxDriverSources();
  const sources = [...discovered, fileURLToPath(import.meta.url), "specs/quint/refinement/services/inbox-coordinator-ports.mjs", "bun.lock", ...extraSources];
  const driverHashes = captureInputs(sources);
  rebuildInboxDriver(discovered);
  const traces = [];
  for (const mode of ["capability-withdrawn", "capability-unavailable"]) {
    const { fixture, coordinator, trace } = await setup(mode, traces);
    await compose(fixture, coordinator, trace);
    if (mode === "capability-withdrawn") fixture.capability(1, { send: false });
    else fixture.capability(1, null);
    await coordinator.provider.bind("grant-1");
    step(trace, "fresh negative capability read disables Send", action("capabilities", 0, 1, 0, mode !== "capability-unavailable", false, mode !== "capability-unavailable", mode !== "capability-unavailable"), observe(fixture, coordinator));
    tapSend(coordinator);
    await fixture.settle();
    assert.equal(fixture.state.prepares, 0);
    assert.equal(fixture.state.dispatches, 0);
    step(trace, "Send cannot prepare or dispatch without the current capability", { ...action("prepare", "send"), reject: true }, observe(fixture, coordinator));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("capability-withdrawn-during-send", traces);
    await compose(fixture, coordinator, trace);
    const gate = await sendHeldAtPrepare(fixture, coordinator, trace);
    fixture.capability(1, { send: false });
    await coordinator.provider.bind("grant-1");
    step(trace, "a capability read during prepare withdraws send", action("capabilities", 0, 1, 0, true, false, true, true), observe(fixture, coordinator));
    gate.resolve();
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 0);
    assert.equal(recordFor(fixture, 1), null);
    step(trace, "the prepared email is discarded instead of dispatched", [action("reviewed", true), { ...action("reserve"), reject: true }, action("cancelReview")], observe(fixture, coordinator));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("stale-capability-readback", traces);
    await compose(fixture, coordinator, trace);
    const pending = [];
    fixture.gates({ capability: () => new Promise((resolve) => pending.push(resolve)) });
    const older = coordinator.provider.bind("grant-1"), newer = coordinator.provider.bind("grant-1");
    await until(() => pending.length === 2, "overlapping capability reads");
    step(trace, "two explicit refreshes overlap", [action("startCapabilityRead"), action("startCapabilityRead")], observe(fixture, coordinator));
    pending[1]({ send: false, providerDrafts: false, mailboxMutations: false });
    await newer;
    step(trace, "newer negative readback owns capabilities", action("capabilities", 2, 1, 0, true, false, false, false), observe(fixture, coordinator));
    pending[0]({ send: true, providerDrafts: true, mailboxMutations: true });
    await older;
    step(trace, "late positive readback cannot re-enable Send", action("capabilities", 1, 1, 0, true, true, true, true), observe(fixture, coordinator));
    fixture.gates({});
    tapSend(coordinator);
    await fixture.settle();
    assert.equal(fixture.state.prepares, 0);
    assert.equal(fixture.state.dispatches, 0);
    step(trace, "Send stays refused under the newer negative readback", { ...action("prepare", "send"), reject: true }, observe(fixture, coordinator));
    coordinator.dispose();
  }
  for (const mode of ["exact", "earlier", "edited-in-flight", "unknown-restart"]) {
    const { fixture, coordinator, trace } = await setup("source-cleanup-" + mode, traces);
    await compose(fixture, coordinator, trace, { save: true, edit: mode === "earlier" });
    if (mode === "unknown-restart") fixture.state.outcome = "lost";
    const gate = await send(fixture, coordinator, trace);
    if (mode === "edited-in-flight") {
      coordinator.drafts.render().c.onBody({ target: { value: "edited" } });
      await until(() => [...fixture.slots.values()].some((value) => value?.text?.includes("edited")), "new retained edits");
      step(trace, "typing after dispatch changes the local copy only", action("editDraft"), observe(fixture, coordinator));
    }
    gate.resolve();
    await fixture.settle();
    if (mode === "unknown-restart") {
      // An unresolved delivery reopens the review sheet with its saved receipt.
      assert.equal(coordinator.provider.render().providerReview, true);
      step(trace, "lost response preserves every local copy", action("lostReply"), observe(fixture, coordinator));
      coordinator.dispose();
      const restored = fixture.createPair();
      await restored.bind();
      assert.equal(restored.provider.render().providerReview, true);
      step(trace, "reload never dispatches the saved intent again", action("restart"), observe(fixture, restored));
      assert.equal(fixture.state.dispatches, 1);
      restored.provider.render().provider.check();
      await fixture.settle();
      step(trace, "fresh matching receipt permits source cleanup", [action("checkReceipt", true), action("cleanup", "saved")], observe(fixture, restored));
      restored.dispose();
    } else {
      assert.equal(coordinator.provider.render().providerReview, false);
      step(trace, "confirmed send cleans only matching source copies", [action("result", "succeeded"), action("cleanup", "saved")], observe(fixture, coordinator));
      coordinator.dispose();
    }
  }
  {
    const { fixture, coordinator, trace } = await setup("owner-changes-during-dispatch-cas", traces);
    await compose(fixture, coordinator, trace);
    const gate = await sendHeldAtCommit(fixture, coordinator, trace);
    const rebound = coordinator.bind("grant-2");
    await until(() => coordinator.provider.capabilities()?.from === "owner-2@example.test" && coordinator.drafts.ready, "new account binding");
    step(trace, "new account uses a separate retained operation", [action("bind", 2), action("regrant")], observe(fixture, coordinator, 2));
    gate.resolve();
    await rebound;
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 0);
    assert.equal(recordFor(fixture, 1).phase, "dispatching");
    step(trace, "old CAS may commit but cannot dispatch under the new binding", action("persisted", 1), observe(fixture, coordinator, 2));
    step(trace, "new binding cannot continue the old dispatch", { ...action("dispatched"), reject: true }, observe(fixture, coordinator, 2));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("withdrawn-grant-discards-prepared-send", traces);
    await compose(fixture, coordinator, trace);
    const gate = await sendHeldAtPrepare(fixture, coordinator, trace);
    fixture.capability(1, { send: false, providerDrafts: false, mailboxMutations: false });
    coordinator.provider.withdrawn();
    await coordinator.provider.bind("grant-1");
    step(trace, "grant withdrawal waits behind the running prepare", action("withdraw", false), observe(fixture, coordinator));
    gate.resolve();
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 0);
    assert.equal(recordFor(fixture, 1), null);
    step(trace, "the withdrawn grant removes the undispatched send", [action("reviewed", true), { ...action("reserve"), reject: true }, action("applyWithdrawal")], observe(fixture, coordinator));
    fixture.capability(1, { send: true, providerDrafts: true, mailboxMutations: true });
    await coordinator.provider.bind("grant-1");
    step(trace, "regrant leaves the discarded send absent", action("regrant"), observe(fixture, coordinator));
    coordinator.provider.render().provider.confirm();
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 0);
    step(trace, "regrant cannot revive the old send", { ...action("reserve"), reject: true }, observe(fixture, coordinator));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("attachment-owner-fence", traces);
    await compose(fixture, coordinator, trace);
    const gate = deferred();
    let entered = false;
    fixture.gates({ attachment: async () => {
      entered = true;
      await gate.promise;
    } });
    fixture.state.attachments.push({ name: "a.txt", mimeType: "text/plain", dataBase64: "YQ==", size: 1 });
    coordinator.drafts.render().c.attach();
    await until(() => entered, "held selected attachment");
    step(trace, "selected bytes remain tied to the original draft", action("selectAttachment"), observe(fixture, coordinator));
    await coordinator.bind("grant-2");
    step(trace, "account changes before the byte read completes", [action("bind", 2), action("regrant")], observe(fixture, coordinator, 2));
    gate.resolve();
    await fixture.settle();
    assert.equal(coordinator.drafts.email(), null);
    assert.deepEqual(fixture.state.choices, [false]);
    step(trace, "late file result is dropped without attaching to another account", action("attachmentResult", true, 1), observe(fixture, coordinator, 2));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("attachment-content-binds-send", traces);
    await compose(fixture, coordinator, trace);
    const file = (text, name) => ({ name, mimeType: "text/plain", dataBase64: Buffer.from(text).toString("base64"), size: Buffer.byteLength(text) });
    fixture.state.attachments.push(file("a", "a.txt"));
    coordinator.drafts.render().c.attach();
    await fixture.settle();
    step(trace, "selected file is hashed before attachment", [action("selectAttachment"), action("attachmentResult", true, 1)], { ...observe(fixture, coordinator), "copy.attachment": attachmentClass(coordinator.drafts.email().proposal.attachments) });
    const gate = await sendHeldAtPrepare(fixture, coordinator, trace);
    coordinator.drafts.render().c.atts[0].rm();
    await until(() => coordinator.drafts.email().proposal.attachments.length === 0, "attachment removal");
    step(trace, "removing selected bytes changes the composer during prepare", action("removeAttachment"), { ...observe(fixture, coordinator), "copy.attachment": 0 });
    gate.resolve();
    await fixture.settle();
    assert.equal(recordFor(fixture, 1), null);
    assert.equal(fixture.state.dispatches, 0);
    step(trace, "the prepared email no longer matches the composer and is discarded undispatched", [action("reviewed", true), { ...action("reserve"), reject: true }, action("cancelReview")], { ...observe(fixture, coordinator), "copy.attachment": 0 });
    fixture.state.attachments.push(file("b", "a.txt"));
    coordinator.drafts.render().c.attach();
    await fixture.settle();
    step(trace, "same name with different bytes is a different attachment", [action("selectAttachment"), action("attachmentResult", true, 2)], { ...observe(fixture, coordinator), "copy.attachment": attachmentClass(coordinator.drafts.email().proposal.attachments) });
    fixture.gates({});
    const dispatch = await send(fixture, coordinator, trace);
    assert.deepEqual(recordFor(fixture, 1).proposal.attachments.map((item) => item.dataBase64), ["Yg=="]);
    dispatch.resolve();
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 1);
    assert.equal(coordinator.drafts.email(), null);
    step(trace, "only the current bytes are sent, once", [action("result", "succeeded"), action("cleanup", "saved")], observe(fixture, coordinator));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("withdrawal-during-dispatch-cas-retains-unknown", traces);
    await compose(fixture, coordinator, trace, { save: true });
    fixture.state.outcome = "lost";
    const gate = await sendHeldAtCommit(fixture, coordinator, trace);
    fixture.capability(1, { send: false, providerDrafts: false, mailboxMutations: false });
    coordinator.provider.withdrawn();
    await coordinator.provider.bind("grant-1");
    step(trace, "withdrawal is queued behind the admitted run", action("withdraw", false), observe(fixture, coordinator));
    gate.resolve();
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 1);
    assert.equal(coordinator.provider.render().providerReview, true);
    step(trace, "admitted request may reach provider and lose its reply", [action("persisted", 1), action("dispatched"), action("lostReply"), action("applyWithdrawal")], observe(fixture, coordinator));
    const request = recordFor(fixture, 1).requestId;
    fixture.gates({});
    fixture.capability(1, { send: true, providerDrafts: true, mailboxMutations: true });
    await coordinator.provider.bind("grant-1");
    step(trace, "regrant preserves the original unknown operation", action("regrant"), observe(fixture, coordinator));
    assert.equal(recordFor(fixture, 1).requestId, request);
    tapSend(coordinator);
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 1);
    assert.equal(coordinator.provider.render().providerReview, true);
    step(trace, "Send never redispatches over an unresolved delivery", { ...action("prepare", "send"), reject: true }, observe(fixture, coordinator));
    coordinator.provider.render().provider.check();
    await fixture.settle();
    step(trace, "fresh receipt resolves the retained operation without redispatch", [action("checkReceipt", true), action("cleanup", "saved")], observe(fixture, coordinator));
    assert.equal(fixture.state.dispatches, 1);
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("earlier-mail-action-blocks-send", traces);
    await compose(fixture, coordinator, trace);
    await coordinator.provider.prepare({ kind: "archive", messageId: "message-1", expectedHistoryId: "1" });
    await fixture.settle();
    assert.equal(recordFor(fixture, 1).proposal.kind, "archive");
    step(trace, "an earlier mail action awaits review", [action("prepare", "archive"), action("reviewed", true)], observe(fixture, coordinator));
    coordinator.provider.close();
    tapSend(coordinator);
    await fixture.settle();
    assert.equal(fixture.state.prepares, 1);
    assert.equal(fixture.state.dispatches, 0);
    assert.equal(recordFor(fixture, 1).proposal.kind, "archive");
    assert.equal(coordinator.provider.render().providerReview, true);
    step(trace, "Send opens that review instead of preparing or dispatching over it", { ...action("prepare", "send"), reject: true }, observe(fixture, coordinator));
    coordinator.dispose();
  }
  {
    const fixture = await createInboxFixture(), app = fixture.mount();
    const projected = { provider: { render: () => ({ provider: app.render().provider }) }, drafts: { email: () => {
      const c = app.render().c;
      return c ? { proposal: { bodyText: c.body, attachments: [] } } : null;
    } } };
    const trace = { name: "full-adapter-read-withdrawal-and-regrant", init: action("init"), expect: observe(fixture, projected), steps: [] };
    traces.push(trace);
    app.render();
    await fixture.settle();
    step(trace, "actual adapter discovers and binds the selected Gmail account", [action("bind", 1), action("regrant")], observe(fixture, projected));
    app.render().compose();
    await fixture.settle();
    let composer = app.render().c;
    composer.onTo({ target: { value: "recipient@example.test" } });
    app.render().c.addRaw();
    app.render().c.onBody({ target: { value: "original" } });
    await fixture.settle();
    step(trace, "normal Inbox compose entrypoint retains the email", action("newDraft"), observe(fixture, projected));
    const gate = deferred();
    fixture.gates({ prepare: () => gate.promise });
    app.render().c.send();
    await until(() => fixture.state.prepares === 1, "adapter Send prepare");
    step(trace, "normal Send entrypoint prepares the email", action("prepare", "send"), observe(fixture, projected));
    fixture.capability(1, { read: false, send: false, providerDrafts: false, mailboxMutations: false });
    fixture.capability(2, null);
    await app.shell.inboxAccountsChanged(new Event("change"));
    gate.resolve();
    await fixture.settle();
    fixture.gates({});
    step(trace, "account reread withdraws read access and discards only the undispatched send", [action("withdraw", true), action("unbind"), action("applyWithdrawal")], observe(fixture, projected));
    assert.equal(recordFor(fixture, 1), null);
    assert.equal(fixture.state.dispatches, 0);
    fixture.capability(1, { read: true, send: true, providerDrafts: true, mailboxMutations: true });
    app.shell.inboxAccountsChanged(new Event("change"));
    app.render();
    await fixture.settle();
    step(trace, "read grant restoration leaves the old send absent", [action("bind", 1), action("regrant"), action("resumeDraft")], observe(fixture, projected));
    const draftsFolder = app.render().extraFolders.find((row) => row.value === "drafts");
    assert.ok(draftsFolder);
    draftsFolder.pick();
    await fixture.settle();
    const resume = app.render().rows.find((row) => row.name === "On this device");
    assert.ok(resume);
    resume.open();
    await fixture.settle();
    step(trace, "retained local text opens through the actual Inbox adapter", null, observe(fixture, projected));
    app.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("dispatch-journal-failure-and-retry", traces);
    await compose(fixture, coordinator, trace, { save: true });
    const refused = await sendHeldAtCommit(fixture, coordinator, trace, true);
    refused.resolve();
    await fixture.settle();
    fixture.gates({});
    assert.equal(fixture.state.dispatches, 0);
    const request = recordFor(fixture, 1).requestId;
    step(trace, "failed durable commit keeps the prepared email and all local copies", action("storageRefused", 1), observe(fixture, coordinator));
    const gate = deferred();
    fixture.gates({ dispatch: () => gate.promise });
    tapSend(coordinator);
    await until(() => fixture.state.dispatches === 1, "retried dispatch");
    assert.equal(fixture.state.prepares, 1);
    assert.equal(recordFor(fixture, 1).requestId, request);
    step(trace, "tapping Send again reuses the same prepared request", [action("reserve"), action("persisted", 1), action("dispatched")], observe(fixture, coordinator));
    gate.resolve();
    await fixture.settle();
    assert.equal(recordFor(fixture, 1).requestId, request);
    step(trace, "the retried request cleans up only after success", [action("result", "succeeded"), action("cleanup", "saved")], observe(fixture, coordinator));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("owner-changes-during-prepare", traces);
    await compose(fixture, coordinator, trace);
    const gate = await sendHeldAtPrepare(fixture, coordinator, trace);
    const rebound = coordinator.bind("grant-2");
    await until(() => coordinator.provider.capabilities()?.from === "owner-2@example.test" && coordinator.drafts.ready, "new account is bound");
    step(trace, "selecting another account retires the first account's Send", [action("bind", 2), action("regrant")], observe(fixture, coordinator, 2));
    gate.resolve();
    await rebound;
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 0);
    step(trace, "the late prepare cannot dispatch under the new account", { ...action("reserve"), reject: true }, observe(fixture, coordinator, 2));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("cloud-owner-changes-during-dispatch-cas", traces);
    await compose(fixture, coordinator, trace);
    const gate = await sendHeldAtCommit(fixture, coordinator, trace);
    const oldRequest = recordFor(fixture, 1).requestId;
    fixture.switchOwner(2);
    const rebound = coordinator.bind("grant-1");
    await until(() => coordinator.provider.capabilities() && coordinator.drafts.ready, "new Cloud owner is bound");
    step(trace, "a new Cloud owner cannot adopt a matching Google connection ID", [action("bind", 2), action("regrant")], observe(fixture, coordinator));
    gate.resolve();
    await rebound;
    await fixture.settle();
    assert.equal(fixture.state.dispatches, 0);
    assert.equal(recordFor(fixture, 1), null);
    assert.ok([...fixture.slots.values()].some(value => value?.requestId === oldRequest && JSON.parse(value.owner)[1] === "user-1"));
    step(trace, "old Cloud owner retains its operation without exposing it to the new owner", action("persisted", 1), observe(fixture, coordinator));
    step(trace, "the new owner cannot continue the old dispatch", { ...action("dispatched"), reject: true }, observe(fixture, coordinator));
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("old-account-capability-readback", traces);
    const gate = deferred();
    let entered = false;
    fixture.gates({ capability: grant => {
      if (grant === "grant-1") {
        entered = true;
        return gate.promise;
      }
      return { from: "owner-2@example.test", send: false, providerDrafts: false, mailboxMutations: false };
    } });
    const oldRead = coordinator.provider.bind("grant-1");
    await until(() => entered, "held old account capability read");
    step(trace, "a capability refresh is pending for the old account", action("startCapabilityRead"), observe(fixture, coordinator));
    const rebound = coordinator.bind("grant-2");
    await until(() => coordinator.provider.capabilities()?.from === "owner-2@example.test" && coordinator.drafts.ready, "new account is bound");
    step(trace, "new account has its own negative capability result", [action("bind", 2), action("capabilities", 1, 2, 1, true, false, false, false)], {
      ...observe(fixture, coordinator, 2), "s.send": coordinator.provider.capabilities().send,
      "s.drafts": coordinator.provider.capabilities().providerDrafts, "s.mailbox": coordinator.provider.capabilities().mailboxMutations,
    });
    gate.resolve({ send: true, providerDrafts: true, mailboxMutations: true });
    await oldRead;
    await rebound;
    await fixture.settle();
    step(trace, "old account callback cannot authorize the replacement account", action("capabilities", 1, 1, 0, true, true, true, true), {
      ...observe(fixture, coordinator, 2), "s.send": coordinator.provider.capabilities().send,
      "s.drafts": coordinator.provider.capabilities().providerDrafts, "s.mailbox": coordinator.provider.capabilities().mailboxMutations,
    });
    coordinator.dispose();
  }
  {
    const { fixture, coordinator, trace } = await setup("old-account-cas-refusal-keeps-prepared-send", traces);
    await compose(fixture, coordinator, trace);
    const gate = await sendHeldAtCommit(fixture, coordinator, trace, true);
    const rebound = coordinator.bind("grant-2");
    await until(() => coordinator.provider.capabilities()?.from === "owner-2@example.test" && coordinator.drafts.ready, "new account is bound");
    step(trace, "replacement account is independent of old persistence", [action("bind", 2), action("regrant")], observe(fixture, coordinator, 2));
    gate.resolve();
    await rebound;
    await fixture.settle();
    step(trace, "failed old write leaves the old prepared send intact", action("storageRefused", 1), observe(fixture, coordinator, 2));
    assert.equal(recordFor(fixture, 1).phase, "review");
    assert.equal(fixture.state.dispatches, 0);
    fixture.gates({});
    await coordinator.bind("grant-1");
    step(trace, "returning to the first account reopens its unsent review", [action("bind", 1), action("regrant")], observe(fixture, coordinator));
    assert.equal(coordinator.provider.render().providerReview, true);
    assert.equal(coordinator.provider.render().provider.canConfirm, true);
    coordinator.dispose();
  }
  const receipt = await checkTraces({ model: "InboxCoordinator", sources, driverHashes, traces, scope: "bounded-orchestration", assumptions: [
    "Actual provider controls, composer, InboxOperation, inboxUnsaved and AssistantDraftController execute in isolated JavaScript realms. Primitive storage, Gmail, attachment picker and native lifecycle ports are controlled.",
    "Two logical account/grant identities, one dispatched request per identity, and fixed original/edited body and attachment equivalence classes bound these schedules.",
    "The imported InboxDelivery committing phase records the awaited CAS boundary. Network dispatch is observed separately. Already-admitted requests may remain uncertain after permission changes.",
    "HTML body rendering, installed Keystore/provider behavior and real Gmail delivery remain separate obligations."
  ] });
  return { receipts: [receipt], obligations: [{ model: "InboxCoordinator", obligation: "installed Gmail and persistence qualification", reason: "The source coordination executes with controlled external ports and bounded identities/content classes." }, { model: "InboxCoordinator", obligation: "Inbox row reconciliation and wider cleanup interleavings", reason: "Repeated message/draft/part IDs, interrupted individual cleanup writes, arbitrary shelf collections and provider-draft/forward orchestration need additional source schedules." }] };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runInboxCoordinatorRefinement();
  console.log(JSON.stringify({ traces: result.receipts[0].traces, checkpoints: result.receipts[0].checkpoints }));
}

export {action, observe, step, setup, compose, send};
