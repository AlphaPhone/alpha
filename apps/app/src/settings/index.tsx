// spec/app/settings/index.md, "Back shows the parent and forgets the page it closed"
import { Effect, type Layer } from "effect";
import * as Pages from "../../gen/app__settings.effect.vibe";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { about } from "./about.vibe";
import { Licences, Problems } from "./AboutPages.tsx";
import { facts } from "./pages.vibe";
import { phone } from "./phone.vibe";
import { Carrier, Network, Passwords } from "./PhonePages.tsx";
import { resetting } from "./reset.vibe";
import { type Further, Settings } from "./Settings.tsx";

const machines = together(facts, about, phone, resetting);

/** Back inside Settings: the page showing closes and its parent shows, until the first page, where Back leaves the app. */
const back = Pages.Machine.use((pages) =>
  Effect.flatMap(pages.get(), (state) => (state.page === "Top" ? Effect.succeed(false) : Effect.as(Effect.orElseSucceed(pages.send({ type: "goBack" }), () => undefined), true))));

function Screen({ runtime, alpha }: Shown<Layer.Success<typeof machines> | Resident>) {
  const further: Further = {
    NetworkPage: () => <Network runtime={runtime} />,
    CarrierPage: () => <Carrier runtime={runtime} />,
    PasswordsPage: () => <Passwords runtime={runtime} />,
    Licences: () => <Licences runtime={runtime} />,
    Problems: () => <Problems runtime={runtime} />,
  };
  return <Settings runtime={runtime} alpha={alpha} further={further} />;
}

/** Settings, at the Settings view: its pages over the resident place and preferences, and the machines only its screen needs. */
export default area(machines, Screen, { back });
