// spec/workflows/hostedResults.md, "Story: Ask Alpha about a result from its notice"; spec/workflows/hostedResults.md, "A tap that cannot open says why only once the account is known"
import type { HostedResults } from "../../../gen/workflows__hostedResults.ts";
import type { ResolvedTap } from "../../workflows/results.vibe";
import { Button, Card, CardTitle, Textarea } from "../components/ui/index.ts";

/** A tapped result notice, its question and what it allows now. */
export interface ResultNoticeProps {
  results: HostedResults;
  /** The tap the shade captured, as resolved for this account. */
  tap: ResolvedTap;
  /** The excerpt the owner may edit before it becomes a draft. */
  excerpt: string;
  can: { readonly consume: boolean; readonly review: boolean; readonly submit: boolean; readonly dismiss: boolean };
  onOpen: () => void;
  onAsk: () => void;
  onExcerpt: (text: string) => void;
  onContinue: () => void;
  onCancel: () => void;
}

const tapWords = { TapWaits: "", SignInToMatching: "Sign in to the matching account to open this result.", ResultUnavailable: "This result isn’t available." } as const;

/**
 * A tapped result notice: open the result, or ask Alpha about it through a reviewed excerpt that becomes a draft and is never sent.
 * @model spec/workflows/hostedResults.md
 * @design design.md
 */
export function ResultNotice({ results, tap, excerpt, can, onOpen, onAsk, onExcerpt, onContinue, onCancel }: ResultNoticeProps) {
  if (tap.kind === "none") return null;
  if (tap.kind === "notice") return tapWords[tap.notice] ? <p role="status" className="px-4 text-sm">{tapWords[tap.notice]}</p> : null;
  return (
    <Card role="dialog" aria-label="Scheduled result" className="m-4 flex flex-col gap-3 p-4">
      <CardTitle>Scheduled result</CardTitle>
      {results.question === "QuestionReview" ? (
        <>
          <Textarea aria-label="Question" value={excerpt} onChange={(e) => onExcerpt(e.target.value)} />
          <div className="flex gap-2">
            <Button size="lg" disabled={!can.submit || excerpt.trim() === ""} onClick={onContinue}>Continue</Button>
            <Button size="lg" variant="ghost" disabled={!can.dismiss} onClick={onCancel}>Cancel</Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Button size="lg" disabled={!can.consume} onClick={onOpen}>Open</Button>
          {tap.question && <Button size="lg" variant="outline" disabled={!can.review} onClick={onAsk}>Ask Alpha</Button>}
        </div>
      )}
    </Card>
  );
}
