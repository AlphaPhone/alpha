import type { ComponentProps } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { HomeCard, type HomeCardLine, HomeCardLines } from "./HomeCard.tsx";

export type HomeCallsCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** The app the card comes from and opens. */
  app: "Messages" | "Phone";
  /** The rows waiting there: who, and the message or the missed call. */
  lines: readonly HomeCardLine[];
  /** How many wait in the app, such as "2"; left out, the app's name. */
  summary?: string;
  /** When the newest of them came. */
  status?: string;
};

const icons = { Messages: <MessageSquare />, Phone: <Phone /> };

/** The Messages or Phone card, on an Alpha image: what waits there; a press opens the app. */
export function HomeCallsCard({ app, lines, summary, status = "", ...props }: HomeCallsCardProps) {
  return (
    <HomeCard title={summary ?? app} icon={icons[app]} status={status} {...props}>
      <HomeCardLines lines={lines} />
    </HomeCard>
  );
}
