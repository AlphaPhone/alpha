// spec/app/notes/index.md, "Story: See my notes"
import { area } from "../runtime/area.tsx";
import { Notes } from "./Notes.tsx";
import { notes } from "./notes.vibe";

/** Notes, at its view (areas.ts): the owner's list of notes, read from the agent's store each time Notes comes forward. */
export default area(notes, Notes);
