// spec/app/photos/index.md, "Only the newest read's answer is shown, only while Photos is showing, and a further page only adds older items"
import { Effect, Option, type ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__photos.effect.vibe";
import type { Machine as ViewerMachine } from "../../gen/app__photos__viewer.effect.vibe";
import { Time } from "../runtime/time.vibe";
import { Library } from "./library.vibe";

export interface PhotosProps {
  /** Provides Photos and its Viewer, `photos` of photos.vibe, the numbers the phone's items have, and Alpha's time. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | ViewerMachine | Library | Time, unknown>;
}

/** A video's length, from tenths of a second, as minutes and seconds. */
export function lengthOf(tenths: number): string {
  const seconds = Math.round(tenths / 10);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** What the phone said of an item when it last listed or read it. */
export function seenOf(runtime: PhotosProps["runtime"], photo: number) {
  return Option.getOrUndefined(runtime.runSync(Effect.flatMap(Library.asEffect(), (library) => library.seen(photo))));
}

/** What the phone said of an album when it last listed the albums. */
export const albumOf = (runtime: PhotosProps["runtime"], album: number) =>
  Option.getOrUndefined(runtime.runSync(Effect.flatMap(Library.asEffect(), (library) => library.album(album))));

/** The latest time Alpha gave, which a screen reads in place of a clock. */
export const latestOf = (runtime: PhotosProps["runtime"]) => runtime.runSync(Time.use((time) => time.latest()));

/** Days within this many days of today have a heading of their own; older items are grouped by month. */
const dayHeadings = 30;

const startOfDay = (at: number) => new Date(at).setHours(0, 0, 0, 0);

/** The heading an item taken `at` falls under, as of `now`: "Today", "Yesterday", "Sat, Oct 31", then "October 2026". */
export function headingOf(at: number, now: number): string {
  const ago = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  const taken = new Date(at);
  if (ago <= 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago < dayHeadings) {
    const otherYear = taken.getFullYear() !== new Date(now).getFullYear();
    return taken.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(otherYear ? { year: "numeric" } : {}) });
  }
  return taken.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** The items of the grid, newest first, in runs that share a heading. */
export function sections(rows: readonly number[], takenAt: (photo: number) => number | undefined, now: number) {
  const runs: { heading: string; photos: number[] }[] = [];
  for (const photo of rows) {
    const at = takenAt(photo);
    const heading = at === undefined ? "" : headingOf(at, now);
    const last = runs.at(-1);
    if (last && last.heading === heading) last.photos.push(photo);
    else runs.push({ heading, photos: [photo] });
  }
  return runs;
}
