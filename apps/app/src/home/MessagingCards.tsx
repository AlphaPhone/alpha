// spec/app/home/cards.md, "The Telegram and Slack cards show unread and mention counts with up to two preview rows, marked not up to date when stale, and are not drawn when disconnected or with nothing unread"; spec/app/home/cards.md, "A card opens its app: the agenda Calendar, Messages and Phone their own, mail Inbox, Telegram and Slack their own, the brief and Workflows Workflows; the agenda asks its calendar again if the last read did not succeed"
import { HomeCard, HomeCardLines } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Hash, Send } from "lucide-react";
import { useSyncExternalStore } from "react";
import * as Cards from "../../gen/app__home__cards.ts";
import type { Machine } from "../../gen/app__home__cards.effect.vibe";
import { useMachine } from "../../gen/app__home__cards.react.ts";
import { MessagingBridge, type MessagingPlatform } from "../messaging/bridge.vibe";

const platforms: ReadonlyArray<{ readonly platform: MessagingPlatform; readonly kind: "TelegramCard" | "SlackCard" }> = [
  { platform: "Telegram", kind: "TelegramCard" },
  { platform: "Slack", kind: "SlackCard" },
];

function cardTitle(platform: MessagingPlatform, unread: number, mentions: number): string {
  const counts = mentions > 0 ? `${unread} unread · ${mentions} @` : `${unread} unread`;
  return `${platform} · ${counts}`;
}

/** Home's Telegram and Slack cards: unread and mention counts with up to two preview rows; a tap opens the app. */
export function MessagingCards({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Machine | MessagingBridge, unknown> }) {
  const { state, can, send } = useMachine(runtime);
  const bridge = runtime.runSync(MessagingBridge);
  const snap = useSyncExternalStore((listener) => bridge.subscribe(listener), () => bridge.snapshot(), () => bridge.snapshot());
  if (!state) return null;
  const now = Math.max(state.calendar.since, state.agent.since, state.today * Cards.dayLength);
  return (
    <>
      {platforms.map(({ platform, kind }) => {
        const card = snap.cards[platform];
        const status = Cards.messagingCard({ ...card, rows: [...card.rows] });
        if (status === "Hidden") return null;
        const open = { type: "openCard", kind, now } as const;
        const title = cardTitle(platform, card.unread, card.mentions);
        return (
          <HomeCard
            key={kind}
            title={title}
            icon={platform === "Slack" ? <Hash /> : <Send />}
            aria-label={`Open ${platform}: ${title}`}
            aria-description={status === "NotUpdated" ? "Not up to date" : undefined}
            notCurrent={status === "NotUpdated" ? "Not up to date" : undefined}
            disabled={!can(open)}
            onClick={() => void send(open)}
          >
            <HomeCardLines lines={card.rows.slice(0, 2)} />
          </HomeCard>
        );
      })}
    </>
  );
}
