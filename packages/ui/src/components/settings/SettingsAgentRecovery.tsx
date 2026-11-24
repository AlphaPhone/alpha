import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { Spinner } from "../Spinner.tsx";

export type SettingsAgentRecoveryProps = {
  /** What the account area says of the agent's connection while it is not ready. */
  connection: "starting" | "needs-restart" | "needs-retry" | "offline" | "unpackaged";
  /** Asks the account area to restart Alpha or to try again; each button is shown only with it, when the connection needs that. */
  onRecover?: (how: "restart" | "retry") => void;
};

const words: Record<SettingsAgentRecoveryProps["connection"], { variant: "info" | "warn"; text: string }> = {
  starting: { variant: "info", text: "The agent is starting" },
  "needs-restart": { variant: "warn", text: "The agent needs a restart" },
  "needs-retry": { variant: "warn", text: "The agent could not start" },
  offline: { variant: "warn", text: "The agent is offline" },
  unpackaged: { variant: "info", text: "This build has no agent" },
};

/**
 * What the agent needs of the owner before its actions can be listed: Restart Alpha when it needs a restart, Try again
 * when it needs another try. The account area carries either out.
 * @model spec/app/settings/activity.md
 */
export function SettingsAgentRecovery({ connection, onRecover }: SettingsAgentRecoveryProps) {
  const { variant, text } = words[connection];
  const how = connection === "needs-restart" ? "restart" : connection === "needs-retry" ? "retry" : undefined;
  return (
    <Banner
      variant={variant}
      action={how && onRecover ? <Button variant="outline" size="sm" onClick={() => onRecover(how)}>{how === "restart" ? "Restart Alpha" : "Try again"}</Button> : connection === "starting" ? <Spinner size="sm" label="Starting" /> : undefined}
    >
      {text}
    </Banner>
  );
}
