// spec/browser/session.md, "Story: Browse in tabs"
import { Effect } from "effect";
import { BrowserAutofill } from "../../browser/autofill.vibe";
import { BrowserBookmarks } from "../../browser/bookmarks.vibe";
import { BrowserEgress } from "../../browser/egress.vibe";
import { BrowserHandoff } from "../../browser/handoff.vibe";
import { BrowserPresenter } from "../../browser/presentation.vibe";
import { BrowserReading } from "../../browser/reading.vibe";
import { BrowserReviews } from "../../browser/reviews.vibe";
import { BrowserTabs } from "../../browser/session.vibe";
import { runtime } from "./runtime.ts";

/** The Browser services a control may use. */
export interface BrowserServices {
  readonly tabs: BrowserTabs.Shape;
  readonly marks: BrowserBookmarks.Shape;
  readonly egress: BrowserEgress.Shape;
  readonly handoff: BrowserHandoff.Shape;
  readonly presenter: BrowserPresenter.Shape;
  readonly reading: BrowserReading.Shape;
  readonly reviews: BrowserReviews.Shape;
  readonly autofill: BrowserAutofill.Shape;
}

const services = Effect.all({
  tabs: Effect.service(BrowserTabs), marks: Effect.service(BrowserBookmarks), egress: Effect.service(BrowserEgress), handoff: Effect.service(BrowserHandoff),
  presenter: Effect.service(BrowserPresenter), reading: Effect.service(BrowserReading), reviews: Effect.service(BrowserReviews), autofill: Effect.service(BrowserAutofill),
});

/** Starts one Browser effect for something the owner did. */
export function run(use: (browser: BrowserServices) => Effect.Effect<unknown, unknown>): void {
  runtime.runFork(Effect.flatMap(services, use));
}

/** Hardware or gesture Back inside Browser: true when Browser closed one of its own layers or went back a page. */
export function back(): Promise<boolean> {
  return runtime.runPromise(Effect.flatMap(Effect.service(BrowserTabs), (tabs) => tabs.back()));
}
