// spec/app/startup/index.md, "Story: Start in mock mode only in a test build"; spec/app/startup/index.md, "Story: Show the surface that fits"; spec/app/startup/index.md, "Story: Wait for the agent"; spec/app/startup/access.md, "Story: Walk through each access in order"; spec/app/startup/access.md, "Story: Hear that all is set"; spec/app/startup/recovery.md, "Story: See that something went wrong, and get out of it"; spec/app/startup/journal.md, "Story: Remember what went wrong"
import {
  Banner,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyState,
  ListGroup,
  ListRow,
  StartupAccessPanel,
  type StartupAccessRowState,
  StartupFailureScreen,
  StartupMark,
  startupMainAction,
  startupPanel,
} from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { Check, RefreshCw, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import type { Machine as StartupMachine } from "../../gen/app__startup.effect.vibe";
import { useMachine as useStartup } from "../../gen/app__startup.react.ts";
import { type Outcome, presentation, shows } from "../../gen/app__startup.ts";
import type { Machine as AccessMachine } from "../../gen/app__startup__access.effect.vibe";
import { useMachine as useAccess } from "../../gen/app__startup__access.react.ts";
import { busy, count, flow, grantOf, nextKey, offered, panel, place } from "../../gen/app__startup__access.ts";
import type { Trouble } from "../../gen/app__startup__finish.ts";
import type { Machine as JournalMachine } from "../../gen/app__startup__journal.effect.vibe";
import { useMachine as useJournal } from "../../gen/app__startup__journal.react.ts";
import { type Kind as JournalKind, visible as visibleJournal } from "../../gen/app__startup__journal.ts";
import type { Machine as RecoveryMachine } from "../../gen/app__startup__recovery.effect.vibe";
import { useMachine as useRecovery } from "../../gen/app__startup__recovery.react.ts";
import { type Side, risky, sideOf } from "../../gen/app__startup__recovery.ts";
import { type Key, word } from "../../gen/app__startup__steps.ts";
import { type Agent, native, testMocks } from "../platform/index.vibe";
import { useTimed } from "../runtime/ui.tsx";
import { untimed, Time } from "../runtime/index.vibe";
import { StartupDesk, retryAgentConnection } from "./boot.vibe";

const ordered: readonly Key[] = ["Notifications", "Microphone", "Camera", "Location", "Calendar", "Photos", "Files"];

const troubles: Record<Exclude<Trouble, "NoTrouble">, string> = {
  ConnectionFailed: "Connection failed",
  SignInNeedsAttention: "Check sign-in",
};

const connectionMessages: Partial<Record<Outcome, string>> = {
  Unreachable: "Alpha could not reach your assistant",
  Offline: "You are offline",
  Recovering: "Recovering your assistant",
};

const journalKindLabels: Record<JournalKind, string> = {
  FailedToStart: "Failed to start",
  FailedToDraw: "Failed to draw",
  Uncaught: "Uncaught error",
  KeptFailing: "Kept failing",
  Crashed: "Crashed",
  StoppedAnswering: "Stopped answering",
};

export type StartupRuntime = ManagedRuntime.ManagedRuntime<
  StartupMachine | StartupDesk | AccessMachine | RecoveryMachine | JournalMachine | Agent | Time,
  unknown
>;

/** Banner shown on every surface whenever mock mode is active in a test build. */
export function MockModeBanner({ onExit }: { onExit?: () => void }) {
  return (
    <div
      role="status"
      data-alpha-mock-banner=""
      className="fixed inset-x-0 top-0 z-dialog flex min-h-8.5 shrink-0 items-center justify-between gap-2 bg-alpha px-2.5 text-xs font-semibold text-alpha-foreground"
    >
      <span>Mock mode · simulated data and actions</span>
      {onExit ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 border border-alpha-foreground px-2.5 text-xs text-alpha-foreground hover:bg-alpha-foreground/10 active:bg-alpha-foreground/20"
          onClick={onExit}
        >
          Exit mock mode
        </Button>
      ) : null}
    </div>
  );
}

/** Completion panel shown after the walkthrough for a new account or a late trouble. */
export function AllSetPanel({
  trouble,
  notSaved = false,
  onDone,
}: {
  trouble?: Exclude<Trouble, "NoTrouble">;
  notSaved?: boolean;
  onDone?: () => void;
}) {
  const attention = trouble !== undefined || notSaved;
  return (
    <Dialog open>
      <DialogContent
        className={startupPanel}
        aria-describedby={undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onDone?.();
        }}
      >
        <div className="m-auto flex w-full max-w-90 flex-col items-center text-center">
          <span aria-hidden className="relative mb-7 grid size-20 place-items-center rounded-full bg-secondary">
            <Check className="size-9" />
            {attention ? <span className="absolute top-1.5 right-1.5 size-3.5 rounded-full border-2 border-background bg-warn" /> : null}
          </span>
          <DialogTitle className="mb-5 font-display text-4xl font-light">All set</DialogTitle>
          <div className="flex flex-col items-center gap-2 text-sm">
            {trouble ? <p role="alert">{troubles[trouble]}</p> : null}
            {notSaved ? <p role="alert">Not saved</p> : null}
          </div>
          <div className="mt-9 min-h-27 w-full">
            <Button className={startupMainAction} disabled={!onDone} onClick={onDone}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Bounded failure journal view (capacity 50, 30-day retention), visible only in development builds. */
export function StartupJournalView({
  runtime,
  testBuild = testMocks(),
}: {
  runtime: ManagedRuntime.ManagedRuntime<JournalMachine | Time, unknown>;
  testBuild?: boolean;
}) {
  const { state, can, send } = useTimed(runtime, useJournal);
  if (!state || !testBuild) return null;
  const entries = visibleJournal(state, testBuild);
  const clearEv = { type: "clear", testBuild } as const;
  return (
    <div className="flex flex-col gap-3" data-alpha-startup-journal="">
      {entries.length === 0 ? (
        <EmptyState title="No failures" />
      ) : (
        <ListGroup heading="Failures">
          {entries.map((entry) => (
            <ListRow key={`${entry.at}-${entry.kind}`} title={journalKindLabels[entry.kind]} trailing={String(entry.at)} />
          ))}
        </ListGroup>
      )}
      {state.dropped > 0 ? <p className="px-4 text-sm text-muted-foreground">{state.dropped} older dropped</p> : null}
      {can(clearEv) ? <Button variant="outline" onClick={() => void send(clearEv)}>Clear</Button> : null}
    </div>
  );
}

/**
 * Startup overlay: mock banner, Alpha mark while waiting on the resident agent, connection retry notice,
 * ordered permissions walkthrough, "All set" completion, and HomeSide/AssistantSide recovery failure screens.
 */
export function StartupOverlay({
  runtime,
  side = "HomeSide",
  version = "Unavailable",
}: {
  runtime: StartupRuntime;
  side?: Side;
  version?: string;
}) {
  const boot = useTimed(runtime, useStartup);
  const access = useTimed(runtime, useAccess);
  const recovery = useTimed(runtime, useRecovery);
  const desk = useMemo(() => runtime.runSync(Effect.flatMap(StartupDesk, (found) => Effect.succeed(found))), [runtime]);
  const host = useSyncExternalStore((listener) => desk.subscribe(listener), () => desk.snapshot(), () => desk.snapshot());

  const bootState = boot.state;
  const accessState = access.state;
  const recoveryState = recovery.state;
  const now = runtime.runSync(Effect.flatMap(Time, (clock) => clock.now()));

  const surface = recoveryState ? sideOf(recoveryState, side) : undefined;
  const showFailure = surface !== undefined && (surface.page === "Broken" || surface.page === "Unbuildable");
  const isLauncher = bootState?.launcher ?? false;

  const mockBanner = bootState && shows(bootState, "MockBanner") ? (
    <MockModeBanner onExit={boot.can({ type: "exitMock" }) ? () => void boot.send({ type: "exitMock" }) : undefined} />
  ) : null;

  if (showFailure && surface && recoveryState) {
    const failureKind = surface.failure === "Crashed" || surface.failure === "StoppedAnswering" ? "FailedToStart" : surface.failure;
    const unsaved = risky(surface, now);
    const saving = surface.flush.status === "Loading" && !unsaved;
    const reloadEv = { type: "reload", side, now } as const;
    const reloadAnywayEv = { type: "reloadAnyway", side, now } as const;
    const switchEv = { type: "switchHome", launcher: isLauncher } as const;
    return (
      <>
        {mockBanner}
        <StartupFailureScreen
          kind={failureKind}
          version={version}
          platform={native() ? "android" : "web"}
          withoutWebView={surface.page === "Unbuildable"}
          saving={saving}
          unsaved={unsaved}
          asHome={isLauncher && side === "HomeSide"}
          switching={recoveryState.switchOn && recoveryState.switch.status === "Loading"}
          switchFailed={recoveryState.switchOn && recoveryState.switch.status === "Failed"}
          onReload={recovery.can(reloadEv, "Owner") ? () => void recovery.send({ type: "reload", side, now: untimed }, "Owner") : undefined}
          onReloadAnyway={recovery.can(reloadAnywayEv, "Owner") ? () => void recovery.send({ type: "reloadAnyway", side, now: untimed }, "Owner") : undefined}
          onSwitchHome={recovery.can(switchEv, "Owner") ? () => void recovery.send(switchEv, "Owner") : undefined}
        />
      </>
    );
  }

  const isAssistantOnly = bootState !== undefined && bootState.known && presentation(bootState) === "AssistantOnly";
  if (isAssistantOnly && bootState) {
    return (
      <>
        {mockBanner}
        {shows(bootState, "Close") ? (
          <div data-alpha-assistant-surface="" className="fixed top-3 right-3 z-dialog">
            <Button
              variant="secondary"
              size="sm"
              aria-label="Close"
              disabled={!boot.can({ type: "leave" })}
              onClick={() => void boot.send({ type: "leave" })}
            >
              <X className="size-4" />
              Close
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  const showMark = bootState !== undefined && shows(bootState, "Mark");
  const accessPanel = accessState ? panel(accessState) : "Hidden";
  const connectionMessage = bootState && bootState.known && bootState.connection !== "Pending" && bootState.connection !== "Connected" && !host.agentHealthy
    ? connectionMessages[bootState.connection]
    : undefined;

  return (
    <>
      {mockBanner}
      {showMark ? (
        <div data-alpha-startup-mark="" className="fixed inset-0 z-dialog flex bg-background">
          <StartupMark className="min-h-dvh" />
        </div>
      ) : null}
      {connectionMessage ? (
        <div data-alpha-connection-notice="" className="fixed inset-x-4 top-12 z-dialog">
          <Banner variant="warn">
            <div className="flex w-full items-center justify-between gap-3">
              <span>{connectionMessage}</span>
              <Button
                variant="secondary"
                size="sm"
                loading={host.retrying}
                disabled={host.retrying}
                onClick={() => void runtime.runPromise(retryAgentConnection())}
              >
                <RefreshCw className="size-3.5" />
                Try again
              </Button>
            </div>
          </Banner>
        </div>
      ) : null}
      {accessState && accessPanel === "Walkthrough" ? (() => {
        const current = nextKey(accessState);
        const actEv = { type: "act", now: untimed } as const;
        const proceedEv = { type: "proceed", now: untimed } as const;
        const skipEv = { type: "skip", now: untimed } as const;
        const mayAct = access.can(actEv, "Owner");
        const rows: StartupAccessRowState[] = ordered.filter((key) => offered(accessState, key)).map((key) => {
          const showing = flow(accessState, key);
          const action = current === key && mayAct
            ? accessState.stalled
              ? "Check"
              : showing === "CanRequest"
                ? "Allow"
                : showing === "Unavailable"
                  ? "Try again"
                  : "Settings"
            : undefined;
          return {
            access: key,
            word: word(key, showing, grantOf(accessState, key)),
            busy: current === key && busy(accessState),
            action,
          };
        });
        return (
          <StartupAccessPanel
            current={current}
            place={{ step: place(accessState), count: count(accessState) }}
            rows={rows}
            notice={accessState.notice === "Quiet" ? undefined : accessState.notice}
            onAct={() => {
              if (access.can(actEv, "Owner")) void access.send(actEv, "Owner");
            }}
            onContinue={access.can(proceedEv, "Owner") ? () => void access.send(proceedEv, "Owner") : undefined}
            onSkip={access.can(skipEv, "Owner") ? () => void access.send(skipEv, "Owner") : undefined}
          />
        );
      })() : null}
      {accessState && accessPanel === "AllSet" ? (
        <AllSetPanel
          trouble={accessState.finish.trouble === "NoTrouble" ? undefined : accessState.finish.trouble}
          notSaved={accessState.notice === "NotSaved"}
          onDone={access.can({ type: "done" }, "Owner") ? () => void access.send({ type: "done" }, "Owner") : undefined}
        />
      ) : null}
    </>
  );
}
