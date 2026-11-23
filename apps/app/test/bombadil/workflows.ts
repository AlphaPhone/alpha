// spec/workflows/automations.md, "Allow another releases a held change only after the owner confirms it"; spec/workflows/digests.md, "Run now is offered only for a missed occurrence the agent offers, never for an overlap or an unavailable source"; spec/workflows/digests.md, "Pausing or resuming keeps the saved time, zone and source"; spec/workflows/digestSources.md, "Removing Google access first shows every saved source and digest that reads through it, and a changed list asks again"; spec/workflows/lifecycle.md, "A change is reviewed before it is kept, never while a run is going, and an interrupted run is stopped first"; spec/workflows/deviceSteps.md, "A decision takes two taps on the same choice, and the second rereads the review before acting"; spec/workflows/vocabulary.md, "A run status reads as one of Alpha's run words, and an unknown status reads as unknown"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const screen = extract(({ document }) => {
  const root = document.querySelector('main[aria-label="Workflows"]');
  if (!root) return null;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
  const text = (root.textContent ?? "").toLowerCase();
  return {
    allowAnother: buttons.filter((b) => b.textContent === "Allow another").map((b) => b.disabled),
    busyRows: root.querySelectorAll('[aria-label="Saving"]').length,
    removeEnabled: buttons.some((b) => b.textContent === "Remove" && !b.disabled),
    runGoing: text.includes("a run is going"),
    approveAgain: buttons.some((b) => b.textContent === "Tap again to approve"),
    approveFirst: buttons.some((b) => b.textContent === "Approve"),
    leaked: /waiting-approval|outcome-unknown|worker-running|engine-internal|\bundefined\b/.test(text),
  };
});

/** "Allow another" is never offered while a change is in flight. */
export const workflowsAllowAnotherNeverWhileSending = always(() => {
  const s = screen.current;
  return s === null || s.busyRows === 0 || s.allowAnother.every((disabled) => disabled);
});

/** Remove is never offered while a run of the workflow is going. */
export const workflowsNoRemovalWhileARunGoes = always(() => {
  const s = screen.current;
  return s === null || !(s.runGoing && s.removeEnabled);
});

/** A phone step never shows the confirming second tap and the first tap at once. */
export const workflowsApprovalTakesTwoTapsOfOneChoice = always(() => {
  const s = screen.current;
  return s === null || !(s.approveAgain && s.approveFirst);
});

/** No engine identifier reaches the page as text. */
export const workflowsNoEngineWords = always(() => {
  const s = screen.current;
  return s === null || !s.leaked;
});

const digests = extract(({ document }) => {
  const panel = document.querySelector('section[aria-label="Scheduled digests"]');
  if (!panel) return null;
  const results = Array.from(panel.querySelectorAll('ol[aria-label="Digest results"] > li')).map((li) => ({
    text: li.textContent ?? "",
    runNow: Array.from(li.querySelectorAll("button")).some((b) => b.textContent === "Run now"),
  }));
  return {
    results,
    removeOffered: Array.from(panel.querySelectorAll("button")).some((b) => /^Remove\b/.test(b.textContent ?? "") && !b.disabled),
  };
});

const googleReview = extract(({ document }) => {
  const dialog = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).find((d) => (d.textContent ?? "").includes("Remove Google access?"));
  if (!dialog) return null;
  return { listed: dialog.querySelectorAll("li").length, none: (dialog.textContent ?? "").includes("No saved source or digest reads through Google.") };
});

/** Run now never appears on an occurrence that overlapped or whose source was unavailable. */
export const workflowsRunNowOnlyForAMissedOccurrence = always(() => {
  const s = digests.current;
  return s === null || s.results.every((r) => !r.runNow || !(r.text.includes("an earlier run was still active") || r.text.includes("source unavailable")));
});

/** The digest panel never offers to remove a digest: the agent's digest route can only pause one. */
export const workflowsADigestIsPausedNeverRemoved = always(() => {
  const s = digests.current;
  return s === null || !s.removeOffered;
});

/** Removing Google access is never confirmed from a review that shows nothing of what it stops. */
export const workflowsGoogleRemovalShowsItsImpact = always(() => {
  const s = googleReview.current;
  return s === null || s.listed > 0 || s.none;
});
