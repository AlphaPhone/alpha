// spec/app/wallet/index.md, "Receive opens over a wallet that serves and has an account, and closes when it no longer does"; spec/app/wallet/index.md, "Copy puts one of the wallet's own addresses on the clipboard, one copy at a time, and says whether it was copied"
import { Alert, Sheet, SheetContent, WalletAddress, WalletQr } from "@repo/ui";
import { useState } from "react";
import type { Ledger } from "./Wallet.tsx";

/**
 * Each account's address to be paid at: as a code another phone scans and as text, with the control that copies it.
 * Which address was last copied is the sheet's own; whether the clipboard took it is the wallet's.
 * @model spec/app/wallet/index.md
 */
export function Receive({ ledger }: { ledger: Ledger }) {
  const { state, can, send } = ledger;
  const [asked, setAsked] = useState("");
  const close = { type: "closeReceive" } as const;
  return (
    <Sheet open onOpenChange={(open) => { if (!open && can(close)) void send(close); }}>
      <SheetContent title="Receive">
        <div className="flex flex-col gap-6 pb-2">
          {state.copy.status === "Failed" && <Alert variant="warn">The address was not copied</Alert>}
          {state.accounts.map((account) => {
            const copy = { type: "copyAddress", address: account.address } as const;
            const name = account.network === "" ? account.symbol : account.network;
            return (
              <section key={account.family} aria-label={name} className="flex flex-col items-center gap-3">
                <WalletQr value={account.address} label={`${name} address as a QR code`} />
                <WalletAddress
                  className="self-stretch"
                  address={account.address}
                  name={name}
                  copied={asked === account.address && state.copy.status === "Loaded"}
                  onCopy={can(copy) ? () => { setAsked(account.address); void send(copy); } : undefined}
                />
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
