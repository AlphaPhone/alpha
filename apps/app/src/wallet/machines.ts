import type { useMachine } from "../../gen/app__wallet.react.ts";
import type { useMachine as useTransfer } from "../../gen/app__wallet__transfer.react.ts";

/** The wallet machine as a screen holds it, once it has a state. */
export type Ledger = ReturnType<typeof useMachine> & { state: NonNullable<ReturnType<typeof useMachine>["state"]> };

/** The transfer machine as a screen holds it, once it has a state. */
export type Transferring = ReturnType<typeof useTransfer> & { state: NonNullable<ReturnType<typeof useTransfer>["state"]> };
