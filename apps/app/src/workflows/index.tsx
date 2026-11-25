import { area } from "../runtime/area.tsx";
import { stepping } from "../shell/shell.vibe";
import { Machine } from "../../gen/app__workflows__list.effect.vibe";
import { together } from "../runtime/reactor.vibe";
import { Workflows } from "./Workflows.tsx";
import { backList, listing } from "./list.vibe";

const mounted = together(listing, stepping("view:Workflows", Machine, (state) => state.sheet || state.place.tag !== "ListingRows"));

/** Workflows, opened over the resident agent the first time the view is drawn. */
export default area(mounted, Workflows, { back: backList() });
