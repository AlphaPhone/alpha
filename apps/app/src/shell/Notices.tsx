// spec/app/shell/notices.md, "Story: Read what just happened, at my own pace"; spec/app/shell/notices.md, "Story: Keep what I must not miss"
import { Button, Toast, ToastRegion } from "@repo/ui";
import { X } from "lucide-react";
import { Layer } from "effect";
import { useMachine } from "../../gen/app__shell__notices.react.ts";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { untimed } from "../runtime/reactor.vibe";
import { takeUndo } from "./notices.vibe";

/** The toast shown and the notices kept, over every screen: a failure is announced at once, news politely. */
function Notices({ runtime }: Shown<Resident>) {
  const { state, can, send } = useMachine(runtime);
  if (!state) return null;
  const { shown, seq } = state;
  const dismiss = { type: "dismissShown", seq, now: untimed } as const;
  return (
    <>
      <ToastRegion aria-live={shown.failure ? "assertive" : "polite"}>
        {shown.message !== "" ? (
          <Toast
            key={seq}
            onFocus={() => can({ type: "hold" }) && void send({ type: "hold" })}
            onBlur={() => can({ type: "resume", now: untimed }) && void send({ type: "resume", now: untimed })}
            onPointerEnter={() => can({ type: "hold" }) && void send({ type: "hold" })}
            onPointerLeave={() => can({ type: "resume", now: untimed }) && void send({ type: "resume", now: untimed })}
            {...(shown.undo !== "" && can({ type: "takeUndo", seq, now: untimed }) ? { onUndo: () => void runtime.runPromiseExit(takeUndo()) } : {})}
          >
            <button type="button" className="text-left" onClick={() => can(dismiss) && void send(dismiss)}>{shown.message}</button>
          </Toast>
        ) : null}
      </ToastRegion>
      {state.kept.length > 0 ? (
        <ul aria-label="Notices" className="fixed inset-x-4 bottom-24 z-toast flex flex-col gap-2">
          {state.kept.map((message) => (
            <li key={message} className="flex items-center gap-2 rounded-tile bg-destructive px-4 py-2 text-sm text-destructive-foreground">
              <span className="flex-1">{message}</span>
              <Button variant="ghost" size="icon" aria-label={`Dismiss ${message}`} onClick={() => void send({ type: "dismiss", message })}><X /></Button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/** The notices, drawn at the shell's `notice` place. */
export default area(Layer.empty, Notices);
