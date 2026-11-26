import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { Machine as Agent } from "../gen/app__contacts__agent.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { propose } from "../src/contacts/requests.vibe";
import { closeAll, later, open, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

// spec/app/contacts/agent.md, "Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call"
it("Approve a shown text by touch (spec/app/contacts/agent.md, \"Story: Approve what the agent asked\")", async () => {
  const world = { ...scene(), phone: true, image: true };
  const { alpha } = await open(world);
  await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "NoCall");
  await alpha.runtime.runPromise(propose({ type: "sms_send", recipients: ["+14155550199"], body: "Running late", subscriptionId: 1 }, true));
  await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.addressed);
  const send = page.getByRole("button", { name: "Send this text" });
  await expect.element(send).toBeVisible();
  expect(world.telephony.sent).toEqual([]);
  // spec/app/contacts/agent.md, "Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call": the startup cover lifts at the latest 2.5 s after start; a tap reaches Send only once it has.
  const cover = () => document.querySelector('[role="status"][aria-label="Loading Alpha"]');
  for (let waited = 0; waited < 2500 && cover(); waited += 500) await later(alpha, 500);
  expect(cover()).toBeNull();

  await send.click();
  await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
  expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550199"], body: "Running late" }]);
});
