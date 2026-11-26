// spec/app/notices/toasts.md, "Story: Read a toast before it goes"; spec/app/notices/toasts.md, "Story: Keep an Undo in reach"; spec/app/notices/toasts.md, "Story: Keep what I must not miss"; spec/app/notices/toasts.md, "Story: See a toast over a dialog"
import { Button, Toast, ToastRegion } from "@repo/ui";
import { Effect, Layer } from "effect";
import { X } from "lucide-react";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useMachine } from "../../gen/app__notices__toasts.react.ts";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { Said, nameOf } from "./toasts.vibe";

const modalDialogSelector =
  "[role=dialog]:not([data-alpha-apps-drawer]):not([data-alpha-alert-banner]):not([data-alpha-clock-alert]), [role=alertdialog]:not([data-alpha-alert-banner]):not([data-alpha-clock-alert])";

/** The toast showing and the notices kept, over every screen: a failure is announced at once, news politely. */
function Toasts({ runtime }: Shown<Resident>) {
  const { state, can, send } = useMachine(runtime);
  const said = useMemo(() => runtime.runSync(Effect.flatMap(Said, (found) => Effect.succeed(found))), [runtime]);
  if (!state) return null;
  const words = state.showing ? said.toasts.get(state.current.number) : undefined;
  const dialog = state.shownIn > 0 ? [...document.querySelectorAll(modalDialogSelector)].at(-1) : undefined;
  const region = (
    <ToastRegion
      data-alpha-toast-region=""
      aria-live={words?.failure ? "assertive" : "polite"}
      data-dialog={state.shownIn || undefined}
      className={dialog
        ? "top-[max(--spacing(12),calc(var(--alpha-safe-top)+--spacing(3)))]"
        : "absolute top-[max(--spacing(2),min(max(--spacing(12),calc(var(--alpha-safe-top)+--spacing(3)),calc(var(--alpha-header-clearance,0px)+--spacing(2))),calc(100%_-_var(--alpha-dock-overlap,0px)_-_--spacing(17))))]"}
    >
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
  const keptList = state.kept.length > 0 ? (
    <ul
      aria-label="Notices"
      data-alpha-toast-region=""
      className="fixed inset-x-4 bottom-[calc(max(var(--alpha-dock-overlap,5.75rem),var(--alpha-safe-bottom))+--spacing(3))] z-toast mx-auto flex max-w-103 flex-col gap-2"
    >
      {state.kept.map(({ area: from, about }) => {
        const message = said.kept.get(nameOf(from, about)) ?? "";
        const dismiss = { type: "dismiss", area: from, about } as const;
        return (
          <li key={nameOf(from, about)} className="flex items-center gap-2 rounded-tile bg-destructive px-4 py-2 text-sm text-destructive-foreground">
            <span className="flex-1">{message}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Dismiss ${message}`}
              disabled={!can(dismiss)}
              className="text-destructive-foreground hover:bg-destructive-foreground/15 focus-visible:outline-destructive-foreground"
              onClick={() => { if (can(dismiss)) void send(dismiss); }}
            >
              <X />
            </Button>
          </li>
        );
      })}
    </ul>
  ) : null;
  return (
    <>
      {dialog ? createPortal(region, dialog) : region}
      {keptList ? (dialog ? createPortal(keptList, dialog) : keptList) : null}
    </>
  );
}

/** The toasts, drawn at the shell's `notice` place. */
export default area(Layer.empty, Toasts);
