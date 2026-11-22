// spec/browser/session.md, "Story: Browse in tabs"
import { Effect } from "effect";
import { runtime } from "../shell/runtime.ts";
import type { BrowserAutofill } from "../../browser/autofill.vibe";
import type { BrowserBookmarks } from "../../browser/bookmarks.vibe";
import type { BrowserEgress } from "../../browser/egress.vibe";
import type { BrowserHandoff } from "../../browser/handoff.vibe";
import type { BrowserPresenter } from "../../browser/presentation.vibe";
import type { BrowserReading } from "../../browser/reading.vibe";
import type { BrowserReviews } from "../../browser/reviews.vibe";
import type { BrowserTabs } from "../../browser/session.vibe";
import { BrowserTabs as Tabs } from "../../browser/session.vibe";
import { BrowserBookmarks as Marks } from "../../browser/bookmarks.vibe";
import { BrowserEgress as Egress } from "../../browser/egress.vibe";
import { BrowserHandoff as Handoff } from "../../browser/handoff.vibe";
import { BrowserPresenter as Presenter } from "../../browser/presentation.vibe";
import { BrowserReading as ReadingService } from "../../browser/reading.vibe";
import { BrowserReviews as Reviews } from "../../browser/reviews.vibe";
import { BrowserAutofill as Autofill } from "../../browser/autofill.vibe";

export { runtime };

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
  tabs: Effect.service(Tabs), marks: Effect.service(Marks), egress: Effect.service(Egress), handoff: Effect.service(Handoff),
  presenter: Effect.service(Presenter), reading: Effect.service(ReadingService), reviews: Effect.service(Reviews), autofill: Effect.service(Autofill),
});

/** Starts one Browser effect for something the owner did. */
export function run(use: (browser: BrowserServices) => Effect.Effect<unknown, unknown>): void {
  runtime.runFork(Effect.flatMap(services, use));
}
