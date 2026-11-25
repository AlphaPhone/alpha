// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Listing } from "../gen/app__workflows__list.effect.vibe";
import { Machine as Definition } from "../gen/app__workflows.effect.vibe";
import { Machine as Runs } from "../gen/app__workflows__runs.effect.vibe";
import { Machine as Sheet } from "../gen/app__workflows__sheet.effect.vibe";
import workflows from "../src/workflows/index.tsx";
import { button, closeAll, drawn, open, press, pressOnTop, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const rows = () => [...document.querySelectorAll("ul[aria-label=Workflows] li > button")];
const visible = (...names: string[]) => names.filter((name) => rows().some((row) => row.textContent?.startsWith(name)));
const choose = (name: string) => drawn(() => {
  const row = rows().find((one) => one.textContent?.startsWith(name));
  if (!(row instanceof HTMLButtonElement)) throw new Error(`No workflow named ${name}`);
  row.click();
});

describe("Workflows", () => {
  it('Filters the owner’s work and keeps removed history (spec/app/workflows/list.md, "Story: Find a workflow")', async () => {
    const world = scene();
    const { alpha } = await open(world);
    await press("Workflows");
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && state.complete);
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Monthly statement", "Desk check"]);

    await press("Filter workflows");
    await pressOnTop("Removed");
    await pressOnTop("Done");
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Retired brief"]);

    await choose("Retired brief");
    await until(alpha, area, Sheet, (state) => state.history.status === "Loaded" && state.removed);
    await drawn(() => alpha.back());
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Retired brief"]);

    world.workflows.failingPrompts = true;
    await press("Filter workflows");
    await pressOnTop("Refresh list");
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && !state.complete);
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Retired brief"]);
  });

  it('Runs the reviewed version and opens its output (spec/app/workflows/runs.md, "Story: Run a workflow now"; spec/app/workflows/sheet.md, "Story: Read a run\'s sheet")', async () => {
    const world = scene();
    const { alpha } = await open(world);
    await press("Workflows");
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded");
    await choose("Monthly statement");
    await until(alpha, area, Definition, (state) => state.detail.status === "Loaded");
    await until(alpha, area, Runs, (state) => state.reading.status === "Loaded");
    await press("Run now");
    await pressOnTop("Run now");
    await until(alpha, area, Sheet, (state) => state.history.status === "Loaded" && state.shown === 1);
    expect(world.workflows.admissions).toHaveLength(1);
    expect(world.workflows.admissions[0]?.version).toBe("monthly-statement-v3");
    await drawn(() => {
      const row = document.querySelector<HTMLButtonElement>('[aria-label="Run history"] li > button');
      if (!row) throw new Error("No run history");
      row.click();
    });
    await until(alpha, area, Sheet, (state) => state.output.status === "Loaded");
    expect(document.querySelector('[aria-label="Run details"]')?.textContent).toContain("Your statement is ready.");
  });

  it('Removes a workflow only after its review, keeps its history, and restores it (spec/app/workflows/index.md, "Story: Change a workflow")', async () => {
    const world = scene();
    const { alpha } = await open(world);
    await press("Workflows");
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded");
    await choose("Monthly statement");
    await until(alpha, area, Definition, (state) => state.detail.status === "Loaded");
    await until(alpha, area, Sheet, (state) => state.history.status === "Loaded");

    await press("Remove");
    expect(document.querySelector("[role=alertdialog]")?.textContent).toContain("The schedule stops and the run history is kept.");
    await pressOnTop("Cancel");
    await until(alpha, area, Definition, (state) => !state.review.showing);
    expect(world.workflows.changes).toEqual([]);

    await press("Remove");
    await pressOnTop("Remove");
    await until(alpha, area, Definition, (state) => state.removed && state.detail.status === "Loaded" && !state.change.live);
    expect(world.workflows.changes).toEqual([{ operation: "remove", version: "monthly-statement-v3" }]);
    expect(button("Run now")).toBeUndefined();

    await drawn(() => alpha.back());
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded");
    expect(visible("Monthly statement")).toEqual([]);
    await press("Filter workflows");
    await pressOnTop("Removed");
    await pressOnTop("Done");
    expect(visible("Monthly statement", "Retired brief")).toEqual(["Monthly statement", "Retired brief"]);

    await choose("Monthly statement");
    await until(alpha, area, Definition, (state) => state.detail.status === "Loaded" && state.removed);
    await press("Restore");
    expect(document.querySelector("[role=alertdialog]")?.textContent).toContain("The workflow comes back turned off");
    await pressOnTop("Restore");
    await until(alpha, area, Definition, (state) => !state.removed && state.detail.status === "Loaded" && !state.change.live);
    expect(world.workflows.changes).toEqual([
      { operation: "remove", version: "monthly-statement-v3" },
      { operation: "restore", version: "monthly-statement-v4" },
    ]);
    expect(world.workflows.statement).toMatchObject({ removed: false, active: false });
  });
});
