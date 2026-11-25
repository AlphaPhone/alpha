// spec/app/slack/auth.md, "Every scope consent, OAuth or unauthenticated state is sensitive"; spec/app/slack/auth.md, "Bot tokens are never admitted into connected workspaces, and per-workspace sign-out preserves all other workspaces"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const slackSurface = extract(({ document }) => {
  const text = document.body.textContent ?? "";
  const admitsBotToken = /\bxoxb-[a-z0-9-]+\b/i.test(text);
  const consentShown = text.includes("Connect Slack workspace") || text.includes("Slack user permissions");
  const askSendEnabled = [...document.querySelectorAll<HTMLButtonElement>("section[aria-label='Ask Alpha'] button")]
    .some((button) => (button.getAttribute("aria-label") ?? button.textContent) === "Send" && !button.disabled);
  return { admitsBotToken, consentShown, askSendEnabled };
});

/** Slack never surfaces a bot token, and while its scope consent or OAuth screen shows, Ask Alpha cannot send over it. */
export const slackAuthIsSensitiveAndUserOnly = always(() =>
  !slackSurface.current.admitsBotToken
  && !(slackSurface.current.consentShown && slackSurface.current.askSendEnabled));
