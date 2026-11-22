// spec/account/devBridge.md, "Story: Sign in through the development bridge"; spec/account/dedicated.md, "Story: Review a dedicated agent in a development build"
import { type Bridge, canBegin, canCancel } from "../../../gen/account__devBridge.ts";
import { type Dedicated, canAccept, canDecline, canFinalize, canPoll, canReviewRead } from "../../../gen/account__dedicated.ts";
import { Button, Card, CardTitle } from "../components/ui/index.ts";

export interface DeveloperPanelProps {
  bridge: Bridge;
  dedicated: Dedicated;
  onBridgeSignIn: () => void;
  onBridgeCancel: () => void;
  onReview: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onPoll: () => void;
  onFinalize: () => void;
}

/**
 * Test-mocks developer surfaces: the bridge's own sign-in and the dedicated agent review. Absent from product builds.
 * @model spec/account/devBridge.md
 */
export function DeveloperPanel({ bridge, dedicated, onBridgeSignIn, onBridgeCancel, onReview, onAccept, onDecline, onPoll, onFinalize }: DeveloperPanelProps) {
  if (!bridge.allowed) return null;
  const view = dedicated.view;
  return (
    <Card className="flex flex-col gap-3 p-4" aria-label="Developer">
      <CardTitle className="font-mono text-xs uppercase">Developer</CardTitle>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!canBegin(bridge)} onClick={onBridgeSignIn}>Bridge sign-in</Button>
        <Button variant="ghost" disabled={!canCancel(bridge)} onClick={onBridgeCancel}>Cancel</Button>
      </div>
      {bridge.phase === "BridgeFailed" && <p role="alert">{bridge.failure}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!canReviewRead(dedicated, false, false)} onClick={onReview}>Dedicated review</Button>
        {view.tag === "Review" && (
          <>
            <Button disabled={!canAccept(dedicated)} onClick={onAccept}>{view.adoption ? "Use existing" : "Start"}</Button>
            <Button variant="ghost" disabled={!canDecline(dedicated)} onClick={onDecline}>Not now</Button>
          </>
        )}
        <Button variant="ghost" disabled={!canPoll(dedicated)} onClick={onPoll}>Check status</Button>
        <Button variant="ghost" disabled={!canFinalize(dedicated)} onClick={onFinalize}>Continue setup</Button>
      </div>
      {dedicated.blocked && <p role="status">Unconfirmed: check status</p>}
      {view.tag === "DedicatedReady" && <p role="status">Dedicated ready</p>}
    </Card>
  );
}
