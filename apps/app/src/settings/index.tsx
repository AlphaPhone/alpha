// spec/app/settings/index.md, "Back shows the parent and forgets the page it closed"; spec/app/settings/licences.md, "Back from a licence returns to the same search"
import { Effect, type Layer } from "effect";
import type { Page } from "../../gen/app__settings.ts";
import * as Licensing from "../../gen/app__settings__licences.effect.vibe";
import * as Pages from "../../gen/app__settings.effect.vibe";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { about } from "./about.vibe";
import { Licences, Problems } from "./AboutPages.tsx";
import { facts } from "./pages.vibe";
import { phone } from "./phone.vibe";
import { Carrier, Network } from "./PhonePages.tsx";
import { resetting } from "./reset.vibe";
import { type Drawn, Settings } from "./Settings.tsx";

const machines = together(facts, about, phone, resetting);

/** Back inside Settings: an open licence closes to its search; otherwise the page showing closes and its parent shows, until the first page, where Back leaves the app. */
const back = Effect.flatMap(Licensing.Machine, (licences) =>
  Effect.flatMap(licences.get(), (open) =>
    open.licence >= 0
      ? Effect.as(Effect.orElseSucceed(licences.send({ type: "closeLicence" }), () => undefined), true)
      : Pages.Machine.use((pages) =>
        Effect.flatMap(pages.get(), (state) => (state.page === "Top" ? Effect.succeed(false) : Effect.as(Effect.orElseSucceed(pages.send({ type: "goBack" }), () => undefined), true))))));

function Screen({ runtime, alpha }: Shown<Layer.Success<typeof machines> | Resident>) {
  const further: Partial<Record<Page, Drawn>> = {
    NetworkPage: ({ common }) => <Network runtime={runtime} common={common} />,
    CarrierPage: ({ common }) => <Carrier runtime={runtime} common={common} />,
    Licences: ({ common }) => <Licences runtime={runtime} common={common} />,
    Problems: ({ common }) => <Problems runtime={runtime} common={common} />,
  };
  return <Settings runtime={runtime} alpha={alpha} further={further} />;
}

/** Settings, at the Settings view: its pages over the resident place and preferences, and the machines only its screen needs. */
export default area(machines, Screen, { back });
