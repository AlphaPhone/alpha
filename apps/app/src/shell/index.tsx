// spec/app/shell/index.md, "Opening an app shows it on top, closes the drawer and lowers Ask Alpha to its bar"
import { Layer } from "effect";
import { useMachine } from "../../gen/app__shell.react.ts";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { Home } from "./Home.tsx";

function Apps({ alpha }: Shown<Resident>) {
  const { can, send } = useMachine(alpha.runtime);
  return <Home offered={(view) => can({ type: "openView", view })} onOpen={(view) => void send({ type: "openView", view })} />;
}

/** Home as the shell draws it, the apps this phone admits, until the home area takes its place (areas.ts). */
export default area(Layer.empty, Apps);
