import { Schema } from "effect";
import { MediaId, MediaItem } from "@elizaos/os/bridges/media.schema";
import { expect, it } from "vitest";

it("uses one Effect schema instance for a camera ID across the SDK boundary", () => {
  const id = "m:external_primary:i:41";
  expect(Schema.is(MediaId)(id)).toBe(true);
  expect(Schema.is(MediaItem)({ id, kind: "image", width: 4000, height: 3000, date: 1, size: 1000, revision: "r1" })).toBe(true);
});
