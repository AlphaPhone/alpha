// spec/browser/pageContext.md, "Browser prepares one native capture of the open page ahead of a message"
import type { BrowserPageObservation } from "./page-context.ts";

type ReadPage = (signal: AbortSignal) => Promise<BrowserPageObservation | undefined>;

/** One native Browser page and one in-flight read, both scoped to the current selection. */
export class BrowserPageCache {
  #selected: string | undefined;
  #page: BrowserPageObservation | undefined;
  #scheduled: ReturnType<typeof setTimeout> | undefined;
  #reading: {
    readonly controller: AbortController;
    readonly done: Promise<BrowserPageObservation | undefined>;
  } | undefined;

  select(key: string | undefined): boolean {
    if (key === this.#selected) return false;
    this.#selected = key;
    this.#page = undefined;
    this.#cancelScheduled();
    const retired = this.#reading;
    this.#reading = undefined;
    retired?.controller.abort();
    return true;
  }

  age(key: string, now: number): number | undefined {
    const page = key === this.#selected ? this.#page : undefined;
    if (page === undefined || now < page.capturedAt) return undefined;
    return now - page.capturedAt;
  }

  cached(key: string, now: number, maxAge: number): BrowserPageObservation | undefined {
    const age = this.age(key, now);
    return age !== undefined && age <= maxAge ? this.#page : undefined;
  }

  schedule(key: string, delay: number, read: ReadPage): void {
    if (key !== this.#selected || this.#reading !== undefined) return;
    this.#cancelScheduled();
    this.#scheduled = setTimeout(() => {
      this.#scheduled = undefined;
      void this.refresh(key, read);
    }, delay);
  }

  #cancelScheduled(): void {
    clearTimeout(this.#scheduled);
    this.#scheduled = undefined;
  }

  refresh(key: string, read: ReadPage): Promise<BrowserPageObservation | undefined> {
    if (key !== this.#selected) return Promise.resolve(undefined);
    if (this.#reading !== undefined) return this.#reading.done;
    this.#cancelScheduled();
    const controller = new AbortController();
    const done = Promise.resolve().then(() => {
      if (controller.signal.aborted) return undefined;
      return read(controller.signal);
    }).then((page) => {
      if (this.#reading?.done !== done) return undefined;
      this.#page = page;
      return page;
    }, () => undefined).finally(() => {
      if (this.#reading?.done === done) this.#reading = undefined;
    });
    this.#reading = { controller, done };
    return done;
  }
}
