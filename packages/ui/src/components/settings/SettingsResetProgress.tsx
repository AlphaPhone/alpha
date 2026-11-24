import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { StatusDot, type StatusDotProps } from "../StatusDot.tsx";

export type SettingsResetProgressProps = {
  /** The step of the try under way: what uses the account is stopped, then the cloud keys are revoked, then the phone is asked to erase. */
  step: "stopping" | "revoking" | "erasing";
};

const steps = [
  { id: "stopping", title: "Stopping what uses the account" },
  { id: "revoking", title: "Revoking cloud keys" },
  { id: "erasing", title: "Erasing on the phone" },
] as const;

const dots: Record<"done" | "working" | "waiting", { status: StatusDotProps["status"]; label: string }> = {
  done: { status: "ok", label: "Done" },
  working: { status: "busy", label: "Working" },
  waiting: { status: "off", label: "Waiting" },
};

/**
 * The steps of a reset try, each only after the one before: which are done, which is under way and which wait.
 * @model spec/app/settings/reset.md
 */
export function SettingsResetProgress({ step }: SettingsResetProgressProps) {
  const at = steps.findIndex((s) => s.id === step);
  return (
    <ListGroup>
      {steps.map((s, index) => (
        <ListRow key={s.id} title={s.title} trailing={<StatusDot {...dots[index < at ? "done" : index === at ? "working" : "waiting"]} />} />
      ))}
    </ListGroup>
  );
}
