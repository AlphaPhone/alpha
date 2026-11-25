// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Approvals, entry, leaseOf } from "../gen/app__approvals.effect.vibe";
import {
  ApprovalDesk,
  fetchPendingApprovals,
  hearMessage,
  recoverPending,
  resetApprovalJournal,
  setApprovalContext,
  submitDirect,
  submitProposal,
} from "../src/approvals/approvals.vibe";
import { classifyOperation, preferenceFromSetting } from "../src/approvals/operation.ts";
import { closeAll, later, only, open, pressOnTop, underAct, until } from "./alpha.tsx";
import { approvalsHarness, deferredExecution } from "./fakes/approvals.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(async () => {
  resetApprovalJournal();
  await closeAll();
});

const approvalMounts = () => only("home", "overlay", "notice");

describe("approvals", () => {
  it("runs one approved action at a time and queues the next (spec/app/approvals/index.md, \"Story: One action at a time\"; spec/app/approvals/proposal.md, \"Story: Decide\"; spec/app/approvals/proposal.md, \"Story: Have it done once\")", async () => {
    const world = scene();
    const { alpha } = await open(world, approvalMounts());
    const harness = approvalsHarness();
    await alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => d.setHooks(harness.hooks))));

    const firstExec = deferredExecution();
    const secondExec = deferredExecution();
    const expires = world.now + 60_000;

    await alpha.runtime.runPromise(submitProposal({
      id: 1, proposalId: "prop-1", title: "Send SMS", detail: "Text Alex hi", operation: "Change", available: true, execute: firstExec.execute,
    }, expires, { presentNow: true }));
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 1).review.showing);

    await pressOnTop("Approve");
    await until(alpha, alpha.runtime, Approvals, (s) => s.running === 1 && entry(s, 1).stage === "Sent");
    expect(firstExec.started()).toBe(true);

    await alpha.runtime.runPromise(submitProposal({
      id: 2, proposalId: "prop-2", title: "Archive email", detail: "Archive thread 2", operation: "Change", available: true, execute: secondExec.execute,
    }, expires, { presentNow: true }));
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 2).review.showing);
    await pressOnTop("Approve");
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 2).stage === "Claimed");
    expect([firstExec.started(), secondExec.started()]).toEqual([true, false]);

    firstExec.finish("Done");
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 1).attempt.outcome === "Confirmed" && s.running === 2);
    expect(secondExec.started()).toBe(true);

    secondExec.finish("Done");
    await until(alpha, alpha.runtime, Approvals, (s) => s.running === 0 && entry(s, 2).attempt.outcome === "Confirmed" && entry(s, 2).told);
    expect(harness.journalCalls).toEqual(["prop-1", "prop-2"]);
    expect(harness.claimCalls).toEqual(["prop-1", "prop-2"]);
  });

  it("expires a pending proposal before the owner taps Approve (spec/app/approvals/proposal.md, \"Story: Decide\"; spec/app/approvals/index.md, \"Story: One action at a time\")", async () => {
    const world = scene();
    const { alpha } = await open(world, approvalMounts());
    const harness = approvalsHarness();
    await alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => d.setHooks(harness.hooks))));

    await alpha.runtime.runPromise(submitProposal({
      id: 10, proposalId: "prop-expire", title: "Delete file", detail: "Remove old report", operation: "Change", available: true,
    }, world.now + 5_000, { presentNow: true }));
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 10).stage === "Pending" && entry(s, 10).review.showing);

    await later(alpha, 5_000);
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 10).stage === "Lapsed" && !entry(s, 10).review.showing && entry(s, 10).told);
    expect(harness.claimCalls).toHaveLength(0);
  });

  it("caps direct allow-listed runs at four per message and requires review for the fifth or non-allow-listed (spec/app/approvals/direct.md, \"Story: Let Alpha show me things without asking each time\"; spec/app/approvals/operation.md, \"Story: Know what the agent is asking for\")", async () => {
    const world = scene();
    const { alpha } = await open(world, approvalMounts());
    const harness = approvalsHarness();
    await alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => d.setHooks(harness.hooks))));

    expect(classifyOperation("phone.emergency")).toBe("EmergencyCall");
    expect(classifyOperation("calendar.glance")).toBe("Glance");
    expect(preferenceFromSetting(undefined)).toBe("Unreadable");

    await alpha.runtime.runPromise(hearMessage(1));
    const expires = world.now + 60_000;
    for (let id = 1; id <= 4; id += 1) {
      const outcome = await alpha.runtime.runPromise(submitDirect({
        id, proposalId: `direct-${id}`, title: `Open ${id}`, detail: "Show app", operation: "Show", available: true,
      }, { message: 1, typed: true, automated: false, expires }));
      expect(outcome).toBe("direct");
      await until(alpha, alpha.runtime, Approvals, (s) => entry(s, id).attempt.outcome === "Confirmed" && s.running === 0);
    }

    const fifth = await alpha.runtime.runPromise(submitDirect({
      id: 5, proposalId: "direct-5", title: "Open 5", detail: "Fifth direct request", operation: "Show", available: true,
    }, { message: 1, typed: true, automated: false, expires }));
    expect(fifth).toBe("proposed");
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 5).stage === "Pending" && entry(s, 5).review.showing);
  });

  it("forbids emergency calls immediately without creating a claim or execution (spec/app/approvals/proposal.md, \"Story: Be asked before Alpha acts\"; spec/app/approvals/operation.md, \"Story: Know what the agent is asking for\")", async () => {
    const world = scene();
    const { alpha } = await open(world, approvalMounts());
    const harness = approvalsHarness();
    await alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => d.setHooks(harness.hooks))));

    let executed = false;
    await alpha.runtime.runPromise(submitProposal({
      id: 20,
      proposalId: "emergency-1",
      title: "Call 911",
      detail: "Dial emergency services yourself.",
      operation: "EmergencyCall",
      available: true,
      execute: () => { executed = true; return Promise.resolve("Done"); },
    }, world.now + 60_000));

    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 20).stage === "Forbidden" && entry(s, 20).told);
    expect(executed).toBe(false);
    expect(harness.claimCalls).toHaveLength(0);
    expect(document.body.textContent).toContain("Dial emergency services yourself");
  });

  it("completes a read lease when approved and cancels leases and cards on owner switch (spec/app/approvals/lease.md, \"Story: Get the answer a read was for\"; spec/app/approvals/index.md, \"Story: Change owner with an approval in hand\"; spec/app/approvals/index.md, \"Story: Get the answer a read was for\")", async () => {
    const world = scene();
    const { alpha } = await open(world, approvalMounts());
    const harness = approvalsHarness();
    harness.setAnswer({ ok: true, answer: "You have 2 meetings today." });
    await alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => d.setHooks(harness.hooks))));

    const expires = world.now + 60_000;
    await alpha.runtime.runPromise(submitProposal({
      id: 30, proposalId: "read-1", title: "Read notes", detail: "Check meeting notes", operation: "Look", available: true,
    }, expires, { holdLease: true, presentNow: true }));
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 30).review.showing && leaseOf(s, 30).status === "Held");

    await pressOnTop("Allow read");
    await until(alpha, alpha.runtime, Approvals, (s) => leaseOf(s, 30).status === "Answered");
    const snap = await alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => d.snapshot())));
    expect(snap.answers.get(30)).toBe("You have 2 meetings today.");

    await alpha.runtime.runPromise(submitProposal({
      id: 31, proposalId: "read-2", title: "Read inbox", detail: "Check unread mail", operation: "Look", available: true,
    }, expires, { holdLease: true, presentNow: true }));
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 31).review.showing && leaseOf(s, 31).status === "Held");

    await alpha.runtime.runPromise(setApprovalContext({ signedIn: 2 }));
    await until(alpha, alpha.runtime, Approvals, (s) => entry(s, 31).stage === "Lapsed" && leaseOf(s, 31).status === "Dropped");
  });

  it("reads back an in-flight change after a restart before reporting completion (spec/app/approvals/index.md, \"Story: Pick up the cards after a restart\"; spec/app/approvals/proposal.md, \"Story: Pick up after a restart\")", async () => {
    const world = scene();
    const first = await open(world, approvalMounts());
    const harness1 = approvalsHarness();
    await first.alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => d.setHooks(harness1.hooks))));

    const stuckExec = deferredExecution();
    await first.alpha.runtime.runPromise(submitProposal({
      id: 40, proposalId: "change-40", title: "Update event", detail: "Move dinner to 7pm", operation: "Change", available: true, execute: stuckExec.execute,
    }, world.now + 60_000, { presentNow: true }));
    await until(first.alpha, first.alpha.runtime, Approvals, (s) => entry(s, 40).review.showing);
    await pressOnTop("Approve");
    await until(first.alpha, first.alpha.runtime, Approvals, (s) => s.running === 40 && entry(s, 40).stage === "Sent");

    await first.close();

    const second = await open(world, approvalMounts());
    const harness2 = approvalsHarness();
    harness2.setWaiting([]);
    let readBackCount = 0;
    await second.alpha.runtime.runPromise(Effect.flatMap(ApprovalDesk, (d) => Effect.sync(() => {
      d.setHooks(harness2.hooks);
      d.register({
        id: 40,
        proposalId: "change-40",
        title: "Update event",
        detail: "Move dinner to 7pm",
        operation: "Change",
        available: true,
        readBack: () => { readBackCount += 1; return Promise.resolve("Done"); },
      });
    })));
    await second.alpha.runtime.runPromise(recoverPending());
    await second.alpha.runtime.runPromise(fetchPendingApprovals(false));
    await until(second.alpha, second.alpha.runtime, Approvals, (s) => entry(s, 40).stage === "Reconciling" && entry(s, 40).attempt.outcome === "Confirmed" && entry(s, 40).told);
    expect(readBackCount).toBe(1);
  });
});
