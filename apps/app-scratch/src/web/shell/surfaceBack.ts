// spec/shell/navigation.md, "A layer is listed once, closes with its owner or with Back, and holds the phone while open"
import { Effect, Option, Stream } from "effect";
import type { SurfaceBack } from "../app-screen.ts";
import type { AppServices } from "../runtime.ts";

/** A surface sheet's Back read from one area value stream: `open` says whether a value shows the sheet, `close` closes it for the value shown now. */
export function sheetBack<A>(
  values: Effect.Effect<Stream.Stream<A, unknown, AppServices>, unknown, AppServices>,
  open: (value: A) => boolean,
  close: (value: A) => Effect.Effect<boolean, unknown, AppServices>,
): SurfaceBack {
  const stream = Stream.unwrap(values);
  return {
    shown: Stream.map(stream, open),
    close: Effect.flatMap(Stream.runHead(stream), (now) => Option.isSome(now) && open(now.value) ? close(now.value) : Effect.succeed(false)),
  };
}

/** One surface's Back over several of its sheets: shown while any is, and closing the first in `innermost` order that is open. */
export function eitherBack(...innermost: readonly SurfaceBack[]): SurfaceBack {
  return {
    shown: innermost.slice(1).reduce(
      (any, sheet) => Stream.zipLatestWith(any, sheet.shown, (left, right) => left || right),
      innermost[0]?.shown ?? Stream.make(false),
    ),
    close: Effect.gen(function* () {
      for (const sheet of innermost) if (yield* sheet.close) return true;
      return false;
    }),
  };
}

/** Back that runs `close` and takes Back, for a sheet whose own close cannot refuse. */
export function closes(close: Effect.Effect<unknown, unknown, AppServices>): Effect.Effect<boolean, unknown, AppServices> {
  return Effect.as(close, true);
}
