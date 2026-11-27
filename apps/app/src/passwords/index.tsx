// spec/app/passwords/index.md, "Story: Unlock my passwords"; spec/app/passwords/index.md, "Story: Fill passwords in"
import { Layer } from "effect";
import { area } from "../runtime/ui.tsx";
import { PasswordsOverlay } from "./Passwords.tsx";

/** Passwords overlay area, mounted at `overlay` in areas.ts. */
export default area(Layer.empty, PasswordsOverlay);
