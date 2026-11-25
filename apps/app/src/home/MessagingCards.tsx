// spec/app/home/cards.md, "The Telegram and Slack cards show unread and mention counts with up to two preview rows, marked not up to date when stale, and are not drawn when disconnected or with nothing unread"; spec/app/home/cards.md, "A card opens its app: the agenda Calendar, Messages and Phone their own, mail Inbox, Telegram and Slack their own, the brief and Workflows Workflows; the agenda asks its calendar again if the last read did not succeed"
import { HomeCard, HomeCardLines } from "@repo/ui";
import { Hash, Send } from "lucide-react";
import type { ReactNode } from "react";
import * as Cards from "../../gen/app__home__cards.ts";
import type { MessagingHomeCardSnapshot, MessagingPlatform } from "../messaging/bridge.vibe";

function cardTitle(platform: MessagingPlatform, unread: number, mentions: number): string {
  const counts = mentions > 0 ? `${unread} unread · ${mentions} @` : `${unread} unread`;
  return `${platform} · ${counts}`;
}

/** Convert a live `MessagingBridge` card snapshot into the spec's `Cards.Messaging` record. */
export function messagingStateOf(card: MessagingHomeCardSnapshot): Cards.Messaging {
  return { ...card, rows: [...card.rows] };
}

/** Render one Home Telegram or Slack card with unread/mention counts and up to two preview rows. */
export function renderMessagingCard(
  platform: MessagingPlatform,
  kind: "TelegramCard" | "SlackCard",
  card: MessagingHomeCardSnapshot,
  open: { readonly disabled: boolean; readonly onClick: () => void },
): ReactNode {
  const status = Cards.messagingCard(messagingStateOf(card));
  if (status === "Hidden") return null;
  const title = cardTitle(platform, card.unread, card.mentions);
  return (
    <HomeCard
      key={kind}
      title={title}
      icon={platform === "Slack" ? <Hash /> : <Send />}
      aria-label={`Open ${platform}: ${title}`}
      aria-description={status === "NotUpdated" ? "Not up to date" : undefined}
      status={status === "NotUpdated" ? "Not up to date" : undefined}
      disabled={open.disabled}
      onClick={open.onClick}
    >
      <HomeCardLines lines={card.rows.slice(0, 2)} />
    </HomeCard>
  );
}
