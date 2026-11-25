// spec/app/wallet/transfer.md, "The send form opens when nothing else is under way, and closes without asking anything"; spec/app/wallet/transfer.md, "The owner asks for a transfer of an amount written exactly in the asset's own units, to a recipient, once"
import { Alert, Button, Input, ListGroup, ListRow, Sheet, SheetContent, WalletAmount } from "@repo/ui";
import { useState } from "react";
import type { Ledger, Transferring } from "./Wallet.tsx";
import { atomicOf, shownUnits } from "./units.ts";

/** Whether `amount` is more than nothing, written exactly in an asset of `decimals` places. */
const exact = (amount: string, decimals: number) => /[1-9]/.test(atomicOf(amount, decimals) ?? "");

/**
 * The send form: one of the holdings an account can send, a recipient and an amount in that asset's own units. What
 * is typed is the form's own until Review asks the agent for the transfer; the agent's review follows.
 * @model spec/app/wallet/transfer.md
 */
export function Send({ ledger, sending }: { ledger: Ledger; sending: Transferring }) {
  const { state, can, send } = sending;
  const sendable = ledger.state.held.filter((holding) => ledger.state.accounts.some((account) => account.family === holding.family && account.canSend));
  const [chosen, setChosen] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const from = sendable[chosen] ?? sendable[0];
  const close = { type: "close" } as const;
  const ask = {
    type: "ask", family: from?.family ?? "Evm", asset: from?.asset ?? "native", recipient: recipient.trim(), amount: amount.trim(),
    exact: from !== undefined && exact(amount.trim(), from.decimals),
  } as const;
  return (
    <Sheet open onOpenChange={(open) => { if (!open && can(close)) void send(close); }}>
      <SheetContent
        title="Send"
        actions={<Button loading={state.stage === "Asking"} disabled={state.stage !== "Asking" && !can(ask)} onClick={() => void send(ask)}>Review</Button>}
      >
        <div className="flex flex-col gap-3 pb-2">
          {state.said === "TurnedDown" && <Alert variant="warn">The wallet turned this down</Alert>}
          <ListGroup surface="plain" aria-label="Send from">
            {sendable.map((holding, index) => {
              const held = shownUnits(holding.units, holding.decimals);
              const network = ledger.state.accounts.find((account) => account.family === holding.family)?.network ?? "";
              return (
                <ListRow
                  key={`${holding.family} ${holding.asset}`}
                  selected={holding === from}
                  aria-label={`Send from ${held} ${holding.symbol} on ${network}`}
                  title={<WalletAmount amount={held} symbol={holding.symbol} />}
                  detail={network}
                  onClick={() => setChosen(index)}
                />
              );
            })}
          </ListGroup>
          <Input aria-label="Recipient" placeholder="To" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={recipient} onChange={(event) => setRecipient(event.target.value)} />
          <Input
            aria-label="Amount"
            placeholder={from === undefined ? "Amount" : from.symbol}
            inputMode="decimal"
            invalid={amount.trim() !== "" && !ask.exact}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
