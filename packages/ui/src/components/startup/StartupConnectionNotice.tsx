import { Banner } from "../Banner.tsx";
import type { StartupConnection } from "./vocabulary.ts";

export type StartupConnectionNoticeProps = {
  /** How the connection ended; `Connected` and `Pending` say nothing. */
  connection: StartupConnection;
};

const words: Partial<Record<StartupConnection, string>> = {
  Unreachable: "Can't reach Alpha's agent",
  Offline: "Alpha's agent is offline",
  Recovering: "Alpha's agent is restarting",
};

/**
 * What Home says when the agent did not answer: unreachable, offline or being recovered. A connection that is up says nothing.
 * @model spec/app/startup/index.md
 */
export function StartupConnectionNotice({ connection }: StartupConnectionNoticeProps) {
  const word = words[connection];
  return word ? <Banner variant={connection === "Recovering" ? "info" : "warn"}>{word}</Banner> : null;
}
