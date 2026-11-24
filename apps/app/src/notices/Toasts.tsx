// spec/app/notices/toasts.md, "Story: Read a toast before it goes"; spec/app/notices/toasts.md, "Story: Keep an Undo in reach"; spec/app/notices/toasts.md, "Story: Keep what I must not miss"; spec/app/notices/toasts.md, "Story: See a toast over a dialog"
import { Button, Toast, ToastRegion } from "@repo/ui";
import { Effect, Layer } from "effect";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useMachine } from "../../gen/app__notices__toasts.react.ts";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { Said, nameOf } from "./toasts.vibe";

/** The toast showing and the notices kept, over every screen: a failure is announced at once, news politely. */
function Toasts({ runtime }: Shown<Resident>) {
  const { state, can, send } = useMachine(runtime);
  if (!state) return null;
  const said = runtime.runSync(Said.use((found) => Effect.succeed(found)));
  const words = state.showing ? said.toasts.get(state.current.number) : undefined;
  const dialog = state.shownIn > 0 ? [...document.querySelectorAll("[role=dialog], [role=alertdialog]")].at(-1) : undefined;
  const region = (
    <ToastRegion aria-live={words?.failure ? "assertive" : "polite"} data-dialog={state.shownIn || undefined}>
      {state.showing && words ? (
        <Toast
          key={state.current.number}
          onFocus={() => can({ type: "hold" }) && void send({ type: "hold" })}
          onBlur={() => can({ type: "letGo" }) && void send({ type: "letGo" })}
          onPointerEnter={() => can({ type: "hold" }) && void send({ type: "hold" })}
          onPointerLeave={() => can({ type: "letGo" }) && void send({ type: "letGo" })}
          {...(can({ type: "tapUndo" }) ? { onUndo: () => void send({ type: "tapUndo" }) } : {})}
        >
          {words.message}
        </Toast>
      ) : null}
    </ToastRegion>
  );
  return (
    <>
      {dialog ? createPortal(region, dialog) : region}
      {state.kept.length > 0 ? (
        <ul aria-label="Notices" className="fixed inset-x-4 bottom-24 z-toast flex flex-col gap-2">
          {state.kept.map(({ area: from, about }) => {
            const message = said.kept.get(nameOf(from, about)) ?? "";
            return (
              <li key={nameOf(from, about)} className="flex items-center gap-2 rounded-tile bg-destructive px-4 py-2 text-sm text-destructive-foreground">
                <span className="flex-1">{message}</span>
                <Button variant="ghost" size="icon" aria-label={`Dismiss ${message}`} onClick={() => void send({ type: "dismiss", area: from, about })}><X /></Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}

/** The toasts, drawn at the shell's `notice` place. */
export default area(Layer.empty, Toasts);
