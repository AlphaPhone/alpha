import { describe, expect, it } from "vitest";
import { liftOver } from "../src/maps/lift.ts";

// spec/app/maps/credits.md, "The camera goes to what the owner picked, on every map"
describe("A picked place's pin", () => {
  it("stands midway between 60px under the search field and the credits, as v119 measured its header", () => {
    // A place card 400px high puts the credits 414px up: v119's launcher header ended at 106, so the top inset was 166
    expect(liftOver(414, true)).toBe((414 + 46 - 166) / 2);
    // Off the launcher the field ends at 60, so the inset is 120
    expect(liftOver(414, false)).toBe((414 + 46 - 120) / 2);
    // Never lifted below the centre
    expect(liftOver(0, true)).toBe(0);
  });
});
