// spec/app/wallet/transfer.md, "The review shows the agent's exact terms for the request that was opened, and only the newest asking's answer is taken"; spec/app/wallet/transfer.md, "The owner approves only the review shown, before it lapses, and the approval is sent once with that review's own marks"; spec/app/wallet/transfer.md, "A waiting request is opened for review when nothing else is under way, or afresh from its own stale review, unless it is spent"
import { Alert, Button, ListGroup, ListRow, Sheet, SheetContent, Spinner, WalletAmount } from "@repo/ui";
import { untimed } from "../runtime/reactor.vibe";
import type { Transferring } from "./Wallet.tsx";
import { shownUnits } from "./units.ts";

const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });

/**
 * The agent's review of one request: exactly what will be sent, to whom, on which network, the largest fee the network
 * may take and the time the review is good until. Approve is offered only for the review shown, before it lapses; a
 * review that lapsed or was turned down offers a fresh one, and Decline takes the request off the list.
 * @model spec/app/wallet/transfer.md
 */
export function Review({ sending }: { sending: Transferring }) {
  const { state, can, send } = sending;
  const { terms } = state;
  const close = { type: "close" } as const;
  const approve = { type: "approve", now: untimed } as const;
  const decline = { type: "decline", request: state.request } as const;
  const again = { type: "openReview", request: state.request } as const;
  const deciding = state.stage === "Deciding";
  const shown = state.stage === "Reviewing" || deciding;
  return (
    <Sheet open onOpenChange={(open) => { if (!open && can(close)) void send(close); }}>
      <SheetContent
        title="Review transfer"
        actions={state.stage === "Opening" ? undefined : (
          <>
            {(can(decline) || deciding) && <Button variant="outline" disabled={deciding} onClick={() => void send(decline)}>Decline</Button>}
            {(can(approve) || deciding) && <Button loading={deciding} onClick={() => void send(approve)}>Approve</Button>}
            {can(again) && <Button onClick={() => void send(again)}>Review again</Button>}
          </>
        )}
      >
        <div className="flex flex-col gap-3 pb-2">
          {state.stage === "Opening" && <Spinner label="Opening the review" className="self-center" />}
          {state.stage === "Stale" && <Alert variant="warn">{state.said === "Lapsed" ? "This review lapsed" : state.why === "" ? "The wallet turned this down" : state.why}</Alert>}
          {shown && (
            <>
              <WalletAmount size="lg" amount={shownUnits(terms.units, terms.decimals)} symbol={terms.symbol} />
              <ListGroup surface="plain" aria-label="Terms">
                <ListRow title={<span className="font-mono text-sm break-all">{terms.recipient}</span>} detail="To" />
                <ListRow title={terms.network} detail="Network" />
                <ListRow title={`${shownUnits(terms.fee, terms.feeDecimals)} ${terms.feeSymbol}`} detail="Largest network fee" />
                <ListRow title={clock.format(terms.expires)} detail="Approve by" />
              </ListGroup>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
