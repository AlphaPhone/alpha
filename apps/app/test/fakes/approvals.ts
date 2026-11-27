// spec/app/approvals/index.md, "Story: One action at a time"; spec/app/approvals/proposal.md, "Story: Have it done once"; spec/app/approvals/lease.md, "Story: Get the answer a read was for"
import type { Claim, Journal, Result } from "../../gen/app__approvals__proposal.ts";
import type { ApprovalHooks } from "../../src/approvals/approvals.vibe";

/** Controllable boundary hooks for approvals tests: journal, claims, waiting list and read-answer completion. */
export interface ApprovalsHarness {
  readonly hooks: ApprovalHooks;
  readonly journalCalls: string[];
  readonly claimCalls: string[];
  readonly toldCalls: string[];
  readonly continuedCalls: string[];
  setJournal(result: Journal): void;
  setClaim(result: Claim): void;
  setWaiting(ids: readonly string[] | undefined): void;
  setAnswer(reply: { readonly ok: boolean; readonly answer?: string }): void;
}

/** Creates a deterministic boundary fake for approvals outside calls. */
export function approvalsHarness(): ApprovalsHarness {
  let journalResult: Journal = "Written";
  let claimResult: Claim = "Granted";
  let waitingIds: readonly string[] | undefined = [];
  let answerReply: { readonly ok: boolean; readonly answer?: string } = { ok: true, answer: "Read answer" };
  const journalCalls: string[] = [];
  const claimCalls: string[] = [];
  const toldCalls: string[] = [];
  const continuedCalls: string[] = [];

  const hooks: ApprovalHooks = {
    reserve(detail) {
      journalCalls.push(detail.proposalId);
      return Promise.resolve(journalResult);
    },
    claim(detail) {
      claimCalls.push(detail.proposalId);
      return Promise.resolve(claimResult);
    },
    tell(detail) {
      toldCalls.push(detail.proposalId);
      return Promise.resolve(true);
    },
    listWaiting() {
      return Promise.resolve(waitingIds);
    },
    continueAnswer(detail) {
      continuedCalls.push(detail.proposalId);
      return Promise.resolve(answerReply);
    },
  };

  return {
    hooks,
    journalCalls,
    claimCalls,
    toldCalls,
    continuedCalls,
    setJournal(result) { journalResult = result; },
    setClaim(result) { claimResult = result; },
    setWaiting(ids) { waitingIds = ids; },
    setAnswer(reply) { answerReply = reply; },
  };
}

/** A deferred executor whose completion can be released manually to test serial execution. */
export function deferredExecution(): { readonly execute: () => Promise<Result>; readonly finish: (result: Result) => void; readonly started: () => boolean } {
  let resolveFn: ((result: Result) => void) | undefined;
  let begun = false;
  const promise = new Promise<Result>((resolve) => {
    resolveFn = resolve;
  });
  return {
    execute() {
      begun = true;
      return promise;
    },
    finish(result) {
      resolveFn?.(result);
    },
    started() {
      return begun;
    },
  };
}
