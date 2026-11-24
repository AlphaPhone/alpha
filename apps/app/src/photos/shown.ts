// spec/app/photos/index.md, "Only the newest read's answer is shown, only while Photos is showing, and a further page only adds older items"
import { Effect, Option, type ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__photos.effect.vibe";
import type { Machine as ViewerMachine } from "../../gen/app__photos__viewer.effect.vibe";
import { Library } from "./library.vibe";

export interface PhotosProps {
  /** Provides Photos and its Viewer, `photos` of photos.vibe, and the numbers the phone's items have. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | ViewerMachine | Library, unknown>;
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

