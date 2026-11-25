// spec/app/telegram/auth.md, "Every non-authenticated auth state is sensitive, so Ask Alpha sees nothing of sign-in screens"; spec/app/telegram/auth.md, "Bot tokens are never authenticated, an authenticated session always names a user account and positive credential revision, and FloodWait blocks submits"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const telegramSurface = extract(({ document }) => {
  const text = document.body.textContent ?? "";
  const hasBotTokenPrompt = /\b(bot\s+token|botfather)\b/i.test(text);
  const authShown = text.includes("Sign in to Telegram") || text.includes("Enter verification code") || text.includes("Two-factor password");
  const askSendEnabled = [...document.querySelectorAll<HTMLButtonElement>("section[aria-label='Ask Alpha'] button")]
    .some((button) => (button.getAttribute("aria-label") ?? button.textContent) === "Send" && !button.disabled);
  return { hasBotTokenPrompt, authShown, askSendEnabled };
});

/** Telegram never asks for a bot token, and while its sign-in screen shows, Ask Alpha cannot send over it. */
export const telegramAuthIsSensitiveAndUserOnly = always(() =>
  !telegramSurface.current.hasBotTokenPrompt
  && !(telegramSurface.current.authShown && telegramSurface.current.askSendEnabled));
