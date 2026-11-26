// spec/app/passwords/index.md, "Story: Unlock my passwords"; spec/app/passwords/index.md, "Story: Fill passwords in"
import { Layer } from "effect";
import { area } from "../runtime/ui.tsx";
import { PasswordsOverlay } from "./Passwords.tsx";

export { EntryEditor, type EntryEditorProps } from "./EntryEditor.tsx";
export { AutofillPrompt, PasswordsOverlay, PasswordsScreen } from "./Passwords.tsx";
export {
  PasswordVault,
  closePasswords,
  fillSignInField,
  focusSignInField,
  matchingPasswords,
  openPasswords,
  passwords,
  passwordsLayer,
  type BackupReadiness,
  type EntryDraft,
  type PasswordVaultSnapshot,
  type PasswordsBackend,
  type SavedPasswordSummary,
} from "./passwords.vibe";

/** Passwords overlay area, mounted at `overlay` in areas.ts. */
export default area(Layer.empty, PasswordsOverlay);
