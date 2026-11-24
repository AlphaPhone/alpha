// spec/browser/session.md, "Story: Browse in tabs"; spec/browser/session.md, "Story: Keep my place with the Browser's layers and Back"; spec/browser/reviews.md, "Back denies the newest open review first, and is Browser's to pass on only when no review is open"
import { Effect } from "effect";
import { BrowserAutofill } from "../../browser/autofill.vibe";
import { BrowserBookmarks } from "../../browser/bookmarks.vibe";
import { BrowserEgress } from "../../browser/egress.vibe";
import { BrowserHandoff } from "../../browser/handoff.vibe";
import { BrowserPresenter } from "../../browser/presentation.vibe";
import { BrowserReading } from "../../browser/reading.vibe";
import { BrowserReviews } from "../../browser/reviews.vibe";
import { BrowserTabs } from "../../browser/session.vibe";
import { act, ask } from "../shell/services.ts";

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
  act(Effect.flatMap(services, use));
}

/** Hardware or gesture Back inside Browser: true when Browser denied its newest confirmation, closed its excerpt review, closed one of its own layers or went back a page. */
export function back(): Promise<boolean> {
  return ask(Effect.flatMap(services, ({ reviews, reading, tabs }) =>
    Effect.flatMap(reviews.back(), (denied) => denied ? Effect.succeed(true) :
      Effect.flatMap(reading.back(), (closed) => closed ? Effect.succeed(true) : tabs.back()))), false);
}
