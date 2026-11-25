import type { ComponentProps } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";

export type WalletAddressProps = Omit<ComponentProps<"div">, "children" | "onCopy"> & {
  /** The whole address, shown in full: an address is never shortened where it is read to be paid at. */
  address: string;
  /** Whose address it is, such as "Ethereum": names the copy control. */
  name: string;
  /** Copy the address; without it no copy control is drawn. */
  onCopy?: () => void;
  /** Whether the last copy put the address on the clipboard. */
  copied?: boolean;
};

/** An address as text that wraps, with the control that copies it, which shows a check once it has. */
export function WalletAddress({ address, name, onCopy, copied = false, className, ...props }: WalletAddressProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <span className="min-w-0 flex-1 font-mono text-sm break-all text-foreground select-all">{address}</span>
      {onCopy && (
        <Button variant="ghost" size="icon" aria-label={copied ? `${name} address copied` : `Copy ${name} address`} onClick={onCopy}>
          {copied ? <Check className="text-ok" /> : <Copy />}
        </Button>
      )}
    </div>
  );
}
