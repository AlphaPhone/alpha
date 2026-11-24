// spec/app/home/cards.md, "The Workflows card shows the first two enabled rows and how many more, marked when they are not current, stale or partly unavailable, and is not drawn without a row"; spec/app/home/cards.md, "Story: Open my day from a card"
import { HomeWorkflowsCard, type HomeWorkflowsFreshness } from "@repo/ui";
import { Layer } from "effect";
import { flowRows, moreFlows, opens, workflowsCard } from "../../gen/app__home__cards.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { useMachine as useWorkflows } from "../../gen/app__workflows__list.react.ts";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import workflows from "../workflows/index.tsx";
import { Rows } from "../workflows/list.vibe";

/** The owner-scoped workflows already read by the Workflows area, projected into Home's card. */
function WorkflowsOnHome({ alpha }: Shown<Resident>) {
  const runtime = workflows.runtime(alpha);
  const { state } = useWorkflows(runtime);
  const shell = useShell(alpha.runtime);
  if (!state || state.owner === 0) return null;
  const snapshot = runtime.runSync(Rows.use((rows) => rows.view(state.owner)));
  const rows = snapshot.rows.filter((row) => (row.kind === "Routine" || row.kind === "Prompt") && row.on && !row.removed)
    .map((row) => ({ title: row.title, detail: "On" }));
  const freshness: HomeWorkflowsFreshness = state.list.status === "Failed" ? "Stale"
    : snapshot.problems.some((source) => source === "Workflows" || source === "Prompts") ? "SomeUnavailable"
      : state.list.status === "Loaded" ? "UpToDate" : "NotCurrent";
  const flows = { rows, freshness };
  if (workflowsCard(flows) === "Hidden") return null;
  const open = { type: "openView", view: opens("WorkflowsCard") } as const;
  return <HomeWorkflowsCard
    lines={flowRows(flows)}
    more={moreFlows(flows)}
    freshness={freshness}
    aria-label={`Open Workflows, ${rows.length} on`}
    disabled={!shell.can(open)}
    onClick={() => void shell.send(open)}
  />;
}

/** Home's Workflows card uses the same runtime as the full view. */
export default area(Layer.empty, WorkflowsOnHome);
