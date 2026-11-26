import { describe, expect, it } from "vitest";
import { liftOver } from "../src/maps/lift.ts";

// spec/app/maps/credits.md, "The camera goes to what the owner picked, on every map"
describe("A picked place's pin", () => {
  it("stands midway between the credits and 60px under the search field, 166 on the launcher and 120 off it, as v119 measured its header, and never below the centre", () => {
    expect([liftOver(414, true), liftOver(414, false), liftOver(0, true)]).toEqual([(414 + 46 - 166) / 2, (414 + 46 - 120) / 2, 0]);
  });
});
