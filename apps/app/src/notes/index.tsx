import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { NotesScreen } from "./Notes.tsx";
import { back } from "./notes.vibe";

export default area(Layer.empty, NotesScreen, { back });
