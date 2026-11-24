// spec/voice/conversation.md, "Saying the send phrase sends the bound card once, as its Send tap does, only as the next thing said and only while it is still the one live text shown in that conversation"
import { expect, it } from "vitest";
import { talkSendVisible } from "../../src/shell/page.ts";

it("accepts only the bound text's enabled and uncovered Send control", () => {
  const card = document.createElement("div");
  card.dataset.alphaProposalId = "reviewed-text";
  card.style.cssText = "position:fixed;top:20px;left:20px;z-index:1";
  const send = document.createElement("button");
  send.dataset.alphaTalkSend = "";
  send.textContent = "Send";
  card.append(send);
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:2";
  document.body.append(card);
  try {
    expect(talkSendVisible("reviewed-text")).toBe(true);
    expect(talkSendVisible("another-text")).toBe(false);
    send.disabled = true;
    expect(talkSendVisible("reviewed-text")).toBe(false);
    send.disabled = false;
    document.body.append(overlay);
    expect(talkSendVisible("reviewed-text")).toBe(false);
    overlay.remove();
    card.style.top = "-100px";
    expect(talkSendVisible("reviewed-text")).toBe(false);
  } finally {
    card.remove();
    overlay.remove();
  }
});
