import { afterEach, expect, it } from "vitest";
import { Machine as Agent } from "../gen/app__contacts__agent.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { propose, spokenSend } from "../src/contacts/requests.vibe";
import { closeAll, open, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

it("Approve what the agent asked by saying Send this text, only while its Send is on screen (spec/app/contacts/agent.md, \"Story: Approve what the agent asked\")", async () => {
  const world = { ...scene(), phone: true, image: true };
  const { alpha } = await open(world);
  await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "NoCall");
  await alpha.runtime.runPromise(propose({ type: "sms_send", recipients: ["+14155550199"], body: "Running late", subscriptionId: 1 }, true));
  await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.addressed);

  // spec/app/contacts/agent.md, "Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call": a Send something covers is not on screen
  const cover = document.createElement("div");
  cover.style.cssText = "position:fixed;inset:0;z-index:2147483647";
  document.body.append(cover);
  expect(await alpha.runtime.runPromise(spokenSend())).toBe(false);
  cover.remove();
  expect(world.telephony.sent).toEqual([]);

  expect(await alpha.runtime.runPromise(spokenSend())).toBe(true);
  await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
  expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550199"], body: "Running late" }]);
});
