// spec/app/settings/facts.md, "Story: Manage my saved passwords"
import { SettingsProtonPass, type SettingsFactReading } from "@repo/ui";
import { useEffect, useState } from "react";
import { useMachine as useFacts } from "../../gen/app__settings__facts.react.ts";
import { say } from "../notices/toasts.vibe";
import type { PasswordProvider, PasswordProviderAction } from "../platform/systemSettings.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { handPasswordProvider, passwordPageVisible, readPasswordProvider } from "./passwords.vibe";
import type { SettingsRuntime } from "./Settings.tsx";

const word = (value: string, status: "ok" | "warn" | "error" | "off" = "off"): SettingsFactReading => ({ word: "reported", value, status });
const unknown = word("—");
const installations: Record<PasswordProvider["installation"], SettingsFactReading> = {
  installed: word("Verified", "ok"),
  disabled: word("Disabled", "warn"),
  absent: word("Not installed"),
  "unrecognized-publisher": word("Unrecognized", "error"),
  unknown,
};
const support: Record<PasswordProvider["support"], SettingsFactReading> = {
  available: word("Available", "ok"),
  unavailable: word("Unavailable"),
  unknown,
};
const selection = ({ selection: selected, installation }: PasswordProvider): SettingsFactReading => {
  if (selected === "none") return word("None");
  if (selected === "other") return word("Other");
  if (selected !== "proton") return unknown;
  if (installation === "installed") return word("Selected", "ok");
  return installation === "disabled" ? installations.disabled : word("Unverified", "error");
};

/** Android's checked status and handoffs for the other password provider. */
export function ProtonPass({ runtime, alpha }: { runtime: SettingsRuntime; alpha: Alpha }) {
  const { state, can, send } = useTimed(runtime, useFacts);
  const [provider, setProvider] = useState<PasswordProvider>();
  const [opening, setOpening] = useState<PasswordProviderAction>();
  const front = state?.vault.front;
  const ticket = state?.read.read.ticket;
  useEffect(() => {
    if (!front) return;
    const request = new AbortController();
    void runtime.runPromise(readPasswordProvider(), { signal: request.signal }).then((answer) => {
      if (!request.signal.aborted) setProvider(answer);
    }, () => {
      if (!request.signal.aborted) setProvider(undefined);
    });
    return () => request.abort();
  }, [runtime, front, ticket]);

  const refresh = { type: "refresh", at: untimed } as const;
  const open = async (action: PasswordProviderAction) => {
    if (opening) return;
    setOpening(action);
    try {
      const opened = await runtime.runPromise(handPasswordProvider(action)).catch(() => false);
      if (!(await runtime.runPromise(passwordPageVisible()).catch(() => false))) return;
      if (!opened) alpha.runtime.runFork(say("Unavailable", true));
      if (can(refresh)) void send(refresh);
    } finally {
      setOpening(undefined);
    }
  };
  const extra = provider?.installation === "installed" ? "open" : provider?.installation === "absent" ? "install" : undefined;
  return (
    <SettingsProtonPass installation={provider ? installations[provider.installation] : unknown}
      selection={provider ? selection(provider) : unknown} autofill={provider ? support[provider.support] : unknown}
      extra={extra} opening={opening} onAction={front ? (action) => void open(action) : undefined}
      onRefresh={can(refresh) ? () => void send(refresh) : undefined} />
  );
}
