import type { ComponentProps } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { HomeCard, type HomeCardLine, HomeCardLines } from "./HomeCard.tsx";

export type HomeCallsCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** The app the card comes from and opens. */
  app: "Messages" | "Phone";
  /** The rows waiting there, newest first: who, and the message, the missed calls or the voicemail. */
  lines: readonly HomeCardLine[];
  /** How many wait there, such as "7"; the app's name when it is not known. */
  count?: string;
  /** When the newest came, such as "6:30 PM" or "Fri". */
  status?: string;
};

const icons = { Messages: <MessageSquare />, Phone: <Phone /> };

/** The Messages or Phone card, on an Alpha image: how many wait there, the newest two and when the newest came; a press opens the app. */
export function HomeCallsCard({ app, lines, count, status, ...props }: HomeCallsCardProps) {
  return (
    <HomeCard title={count || app} icon={icons[app]} status={status} {...props}>
      <HomeCardLines lines={lines} />
    </HomeCard>
  );
}
