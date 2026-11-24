import { Smartphone } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantReceiptCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** What Alpha did on the phone. */
  title: string;
  /** What changed, a line each. */
  lines?: string[];
};

/** The receipt for something Alpha did on the phone itself; pressing it opens where it was done. */
export function AssistantReceiptCard({ title, lines = [], ...frame }: AssistantReceiptCardProps) {
  return (
    <AssistantCardFrame icon={<Smartphone />} title={title} {...frame}>
      {lines.length ? (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {lines.map((line) => <li key={line}>{line}</li>)}
        </ul>
      ) : null}
    </AssistantCardFrame>
  );
}
