// spec/app/digests/index.md, "Story: See my digests"; spec/app/digests/schedules.md, "Story: Keep my digest schedules"
import { digestStatusLabel, digestSummaryText, digestTemplateName } from "@elizaos/plugin-workflow/digests";
import { Alert, Button, EmptyState, ListRow, Spinner } from "@repo/ui";
import { CalendarDays, ChevronRight, RefreshCw, Sun } from "lucide-react";
import { useMachine } from "../../gen/app__digests__schedules.react.ts";
import type { Machine } from "../../gen/app__digests__schedules.effect.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";
import { DigestWords } from "./digests.vibe";

interface DigestsProps extends Pick<Shown<Resident | Machine | DigestWords>, "runtime"> {
  readonly owner: number;
  readonly result: number;
  readonly onResult: (number: number) => void;
}

/** Scheduled digests and the exact results already kept from the owner's agent. */
export function Digests({ runtime, owner, result, onResult }: DigestsProps) {
  const model = useMachine(runtime);
  const state = model.state;
  if (!state || state.owner !== owner) return <Spinner aria-label="Reading scheduled digests" />;
  const home = runtime.runSync(DigestWords.use((words) => words.view(owner)));
  if (result > 0) {
    const selected = home.results.find((entry) => entry.cursor === result);
    if (selected === undefined) return <EmptyState title="This result isn’t available" />;
    return <section aria-label="Digest result" className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{digestStatusLabel(selected.status)} · {new Date(selected.scheduledAt).toLocaleString()}</p>
      <div className="rounded-tile bg-secondary p-4 whitespace-pre-wrap break-words">{digestSummaryText(selected)}</div>
    </section>;
  }
  const refresh = { type: "refresh" } as const;
  const unavailable = state.schedules.status === "Failed";
  return <section className="flex flex-col gap-4">
    {model.can(refresh) && <Button className="self-end" variant="ghost" size="icon" aria-label="Refresh digests" onClick={() => void model.send(refresh)}><RefreshCw aria-hidden /></Button>}
    {state.schedules.status === "Loading" && <Spinner aria-label="Reading scheduled digests" />}
    {unavailable && <Alert variant="warn" role="status">Scheduled digests couldn’t be read.</Alert>}
    {home.partial && <Alert variant="warn" role="status">Some digest information couldn’t be read.</Alert>}
    {state.schedules.status === "Loaded" && !home.capable && <EmptyState title="Scheduled digests aren’t available on this agent" icon={<Sun />} />}
    {home.loops.length > 0 && <ul aria-label="Digest schedules" className="divide-y divide-border">
      {home.loops.map((loop) => <li key={loop.id}>
        <ListRow leading={<CalendarDays />} title={loop.name || digestTemplateName(loop.spec.template)}
          detail={`${loop.spec.localTime} · ${loop.spec.timeZone}`}
          trailing={loop.sourceState === "expired" ? "Source expired" : loop.sourceState === "revoked" ? "Source revoked" : loop.active ? "Active" : "Paused"} />
      </li>)}
    </ul>}
    {home.sources.length > 0 && <ul aria-label="Digest sources" className="divide-y divide-border">
      {home.sources.map((source) => <li key={source.id}>
        <ListRow leading={<CalendarDays />} title={source.label} detail={source.kind}
          trailing={source.revoked ? "Revoked" : `Expires ${new Date(source.expiresAt).toLocaleDateString()}`} />
      </li>)}
    </ul>}
    {home.results.length > 0 && <ul aria-label="Digest results" className="divide-y divide-border">
      {home.results.map((entry) => <li key={entry.runId}>
        <ListRow leading={<Sun />} title={new Date(entry.scheduledAt).toLocaleString()} detail={digestStatusLabel(entry.status)}
          trailing={<ChevronRight aria-hidden />} onClick={() => onResult(entry.cursor)} />
      </li>)}
    </ul>}
    {home.capable && !home.partial && home.results.length === 0 && <EmptyState title="No digest results yet" icon={<Sun />} />}
  </section>;
}
