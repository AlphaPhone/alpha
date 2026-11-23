// spec/workflows/hostedResults.md, "Story: Be told when my digest is ready, and open exactly that result"; spec/workflows/hostedResults.md, "Story: Ask Alpha about a result from its notice"
import { useState } from "react";
import { useMachine } from "../../../gen/workflows__hostedResults.react.ts";
import { Assistant } from "../../assistant/assistant.vibe";
import { HostedResults, type ResolvedTap } from "../../workflows/results.vibe";
import type { AppId } from "../app-screen.ts";
import { ResultNotice } from "./ResultNotice.tsx";
import { perform, runtime } from "../shell/services.ts";

/** How the result notice surface opens the app it hands a result to. */
export interface ResultNoticeSurfaceProps {
  /** Open an app at a route, as the shell's surfaces do. */
  readonly open: (app: AppId, route?: string) => void;
}

/**
 * The tapped result notice over every screen: it opens the result in Workflows, or turns an excerpt into a draft in the assistant.
 * @model spec/workflows/hostedResults.md
 * @design design.md
 */
export function ResultNoticeSurface({ open }: ResultNoticeSurfaceProps) {
  const results = useMachine(runtime);
  const [tap, setTap] = useState<ResolvedTap>(() => {
    void perform(HostedResults.use((h) => h.pendingTap())).then(setTap);
    return { kind: "none" };
  });
  const [excerpt, setExcerpt] = useState("Help me understand this saved result.");
  if (results.state === undefined) return null;
  const state = results.state;
  return (
    <ResultNotice results={state} tap={tap} excerpt={excerpt} onExcerpt={setExcerpt}
      can={{
        consume: results.can({ type: "consume", token: state.token }), review: results.can({ type: "reviewQuestion", sensitive: false }),
        submit: results.can({ type: "submitQuestion", valid: true }), dismiss: results.can({ type: "dismissQuestion", explicit: true }),
      }}
      onOpen={() => {
        const runId = tap.kind === "ready" ? tap.runId : "";
        void perform(HostedResults.use((h) => h.consume())).then((ok) => { if (ok) { setTap({ kind: "none" }); open("workflows", runId === "" ? "digests" : `digests:${runId}`); } });
      }}
      onAsk={() => void perform(HostedResults.use((h) => h.askReview(false)))}
      onContinue={() => void perform(HostedResults.use((h) => h.askSubmit(excerpt.trim() !== ""))).then(() => perform(HostedResults.use((h) => h.askContinue(true))))
        .then((composed) => { setTap({ kind: "none" }); if (composed) void perform(Assistant.use((a) => a.openWith(excerpt))); })}
      onCancel={() => void perform(HostedResults.use((h) => h.askDismiss(true))).then(() => setTap({ kind: "none" }))} />
  );
}
