import type { ReactNode } from "react";
import { StartupAssistantSurface } from "./StartupAssistantSurface.tsx";
import { StartupConnectionNotice } from "./StartupConnectionNotice.tsx";
import { StartupMark } from "./StartupMark.tsx";
import { StartupMockBanner } from "./StartupMockBanner.tsx";
import type { StartupConnection, StartupPresentation } from "./vocabulary.ts";

export type StartupSurfaceProps = {
  /** Which surface Alpha is: Home as the launcher, only chat and close, or a plain page. */
  presentation: StartupPresentation;
  /** Alpha has heard where it runs; until then it shows only the mark. */
  known: boolean;
  /** How the connection to the agent ended; `Pending` keeps Home behind the mark. */
  connection: StartupConnection;
  /** Mock mode is on, in a test build. */
  mocking?: boolean;
  /** Home takes input: its facts are known, the connection has resolved and nothing shows over it. */
  homeTakesInput: boolean;
  /** Home, which the home area and the shell draw. */
  home: ReactNode;
  /** The conversation on the assistant-only surface. */
  chat?: ReactNode;
  /** Ends the assistant-only surface. */
  onClose?: () => void;
  /** Leaves mock mode. */
  onExitMock?: () => void;
};

/**
 * What Alpha shows first: the mark until the agent has answered, then Home, or on the assistant-only surface chat and
 * close alone. Mock mode's banner is on every surface, and Home is inert while anything shows over it.
 * @model spec/app/startup/index.md
 */
export function StartupSurface({ presentation, known, connection, mocking = false, homeTakesInput, home, chat, onClose, onExitMock }: StartupSurfaceProps) {
  const alone = known && presentation === "AssistantOnly";
  const marked = connection === "Pending" && !alone;
  const homeShows = known && !marked && !alone;
  return (
    <div className="flex size-full min-h-0 flex-1 flex-col bg-background text-foreground">
      {mocking ? <StartupMockBanner onExit={onExitMock} /> : null}
      {alone ? <StartupAssistantSurface onClose={onClose}>{chat}</StartupAssistantSurface> : null}
      {marked ? <StartupMark /> : null}
      {homeShows ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <StartupConnectionNotice connection={connection} />
          <div inert={!homeTakesInput} className="flex min-h-0 flex-1 flex-col">{home}</div>
        </div>
      ) : null}
    </div>
  );
}
