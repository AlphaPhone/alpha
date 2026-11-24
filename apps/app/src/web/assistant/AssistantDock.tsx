// spec/assistant/dock.md, "Story: Open and size the chat with one gesture"; spec/assistant/dock.md, "Home keeps its bar, and a dragged height lasts only while the chat it was dragged in is open"; spec/assistant/dock.md, "Story: Size the sheet to what it shows"; spec/assistant/dock.md, "A click the platform still owes a gesture is swallowed inside its window"
import { Effect } from "effect";
import { initial } from "../../../gen/assistant__dock.ts";
import { useMachine } from "../../../gen/assistant__dock.react.ts";
import type { AppId } from "../app-screen.ts";
import { Assistant } from "../../assistant/assistant.vibe";
import { AssistantDockView } from "./AssistantDockView.tsx";
import { ChatPanel } from "./ChatPanel.tsx";
import { runtime } from "./runtime.ts";
import { act } from "../shell/services.ts";

/** What the shell gives the dock: a way to open an app. */
export type AssistantDockProps = {
  /** Open an app, as the shell does. */
  open: (app: AppId, route?: string) => void;
};

/**
 * The compact assistant on every screen, over the runtime: the bar or pill at rest, and the sheet it opens into, sized by one gesture at a time.
 * @model spec/assistant/dock.md
 */
export function AssistantDock({ open }: AssistantDockProps) {
  const { state = initial, can, send } = useMachine(runtime);
  return (
    <AssistantDockView
      chat={state.chat}
      remembered={state.remembered}
      dragging={state.drag.active}
      moved={state.drag.moved}
      pressable={{
        NoControl: can({ type: "down", label: "NoControl" }),
        OpenControl: can({ type: "down", label: "OpenControl" }),
        TypeControl: can({ type: "down", label: "TypeControl" }),
        ResizeControl: can({ type: "down", label: "ResizeControl" }),
      }}
      canSizeButton={can({ type: "sizeButton" })}
      canCloseChat={can({ type: "closeChat" })}
      canTouchOutside={can({ type: "touchOutside" })}
      canCancelDrag={can({ type: "cancelDrag" })}
      onDown={(label) => void send({ type: "down", label })}
      onMove={() => void send({ type: "move" })}
      onTap={() => void send({ type: "tap" })}
      onSettleDrag={(release) => void send({ type: "settleDrag", ...release })}
      onCancelDrag={() => void send({ type: "cancelDrag" })}
      onSizeButton={() => void send({ type: "sizeButton" })}
      onCloseChat={() => void send({ type: "closeChat" })}
      onTouchOutside={() => void send({ type: "touchOutside" })}
    >
      <ChatPanel open={(app, route) => open(app as AppId, route)} onTalk={() => act(Effect.flatMap(Effect.service(Assistant), (assistant) => assistant.requestVoice()))} />
    </AssistantDockView>
  );
}
