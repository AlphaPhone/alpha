// spec/calendar/presentation.md, "Story: Move between days, weeks, months and my schedule"; spec/calendar/presentation.md, "Story: Search my events and list what is coming"; spec/calendar/presentation.md, "Story: See only what the current read found, for the current account"; spec/calendar/presentation.md, "A day is free only when the read covering it was complete"; spec/calendar/presentation.md, "Without an agent session Calendar says Not connected and offers Settings, never a dead Connect"; spec/calendar/presentation.md, "Story: Choose which calendars I see"; spec/calendar/presentation.md, "The Calendars sheet is a modal over the view, opened only with no form or delete sheet open"; spec/notes/origins.md, "Story: Go from a saved event or reminder back to its note"
import { Effect } from "effect";
import { useState } from "react";
import { useMachine } from "../../../gen/calendar__presentation.react.ts";
import { initial, rowShown } from "../../../gen/calendar__presentation.ts";
import type { RecurrenceScope } from "../../../gen/calendar__editor.ts";
import { readCalendar } from "../../calendar/binding.vibe";
import { CalendarLink } from "../../calendar/link.vibe";
import { CalendarDrafts } from "../../calendar/drafts.vibe";
import type { DraftFieldsRecord } from "../../calendar/drafts.schema.vibe";
import { type CalendarRow, agentEventKey, eventSourceKey } from "../../calendar/model.vibe";
import {
  answerRow, closeEditor, closeRow, closeSources, deleteRow, linkSavedNote, newFields, openEditor, openEventLink, openRow, openRowOrigin, openSources, placeRow,
  rowFields, rowTimingLocked, saveEditor, timingChanged,
} from "../../calendar/screen.vibe";
import type { OriginView } from "../../notes/origins.vibe";
import { newId } from "../../platform/ids.ts";
import { deviceZone } from "../../calendar/time.ts";
import type { ScreenProps } from "../app-screen.ts";
import { CalendarScreenView, type CalendarEditing } from "./CalendarScreenView.tsx";
import { eventFacts } from "./EventDetail.tsx";
import { useAgentView, useCalendarLink, useDeviceRead, useDeviceWrites, useDraft, useHeld, useRouteOpen } from "./hooks.ts";
import { perform } from "../shell/services.ts";
import { calendarRows } from "./layout.ts";
import { runtime } from "./runtime.ts";

const SCOPE: Readonly<Record<RecurrenceScope, "instance" | "this_and_following" | "series" | "event">> = {
  NoScope: "event", ThisOccurrence: "instance", ThisAndFollowing: "this_and_following", EntireSeries: "series",
};

function draftFields(text: string): DraftFieldsRecord | undefined {
  try {
    return JSON.parse(text) as DraftFieldsRecord;
  } catch {
    return undefined;
  }
}

/** The Calendar screen's props: the route it opened at and how to close it. */
export type CalendarScreenProps = ScreenProps;

/**
 * The Calendar app: day, week, month and schedule views of the agent's Calendar and the phone's calendars.
 * @model spec/calendar/presentation.md
 */
export function CalendarScreen({ route, onClose }: CalendarScreenProps) {
  useRouteOpen(route);
  const { state, can, send } = useMachine(runtime);
  const p = state ?? initial;
  const agent = useAgentView();
  const device = useDeviceRead();
  const held = useHeld();
  const draft = useDraft();
  const writes = useDeviceWrites();
  const link = useCalendarLink();
  const linkDo = (act: (service: CalendarLink.Shape) => Effect.Effect<void>) => void perform(CalendarLink.use(act));
  const [editing, setEditing] = useState<CalendarEditing | undefined>(undefined);
  const [problem, setProblem] = useState("");
  const [answering, setAnswering] = useState(false);
  const [origin, setOrigin] = useState<{ readonly rowId: string; readonly view: OriginView | undefined } | undefined>(undefined);
  const [formWas, setFormWas] = useState(p.form);
  if (formWas !== p.form) {
    setFormWas(p.form);
    if (p.form === "NoForm" && editing !== undefined) setEditing(undefined);
  }
  const zone = deviceZone();
  const now = Date.now();
  const heldTargets = new Set(held.held.map((entry) => entry.target));
  const agentHidden = p.owner !== "" && p.hiddenAgentOwners.includes(p.owner);
  const deviceShown = p.deviceVisible && p.deviceAccess;
  const heldHidden = (row: CalendarRow) => row.source === "agent" && agent.feed?.events.some((event) => `agent:${agentEventKey(event)}` === row.id && heldTargets.has(event.id)) === true;
  const rows = calendarRows(agent, device, zone, now, (row) =>
    heldHidden(row) || !rowShown(row.source === "agent", agentHidden, deviceShown));
  const open = rows.find((row) => row.id === p.openEvent);
  const openEvent = open?.source === "agent" ? agent.feed?.events.find((event) => `agent:${agentEventKey(event)}` === open.id) : undefined;
  const openCalendar = openEvent === undefined ? undefined : agent.calendars.find((calendar) => JSON.stringify([calendar.provider, calendar.side, calendar.grantId, calendar.connectorAccountId, calendar.calendarId]) === eventSourceKey(openEvent));
  const facts = eventFacts(openEvent, openCalendar);
  const shownOrigin = open !== undefined && origin?.rowId === open.id ? origin.view : undefined;
  const handedOver = editing === undefined && p.form === "NewForm" && draft.alive && draft.origin !== "TypedHere" ? draftFields(draft.text) : undefined;
  const shown = editing ?? (handedOver === undefined ? undefined : { fields: handedOver, row: undefined, owner: agent.state.owner });
  const startEditor = (row: CalendarRow | undefined) => {
    setProblem("");
    void perform(Effect.gen(function* () {
      const creationId = newId().replace(/[^-a-zA-Z0-9_]/g, "");
      const opened = yield* openEditor(row);
      if (!opened) return;
      const retained = yield* CalendarDrafts.use((drafts) => drafts.retained(row?.id ?? ""));
      const fields = retained ?? (row === undefined ? yield* newFields(p.day, creationId) : rowFields(row, creationId));
      setEditing({ fields, row, owner: agent.state.owner });
    }));
  };
  return (
    <CalendarScreenView presentation={p} can={can} agent={agent} device={device} writes={writes} draft={draft} link={link} rows={rows} facts={facts}
      {...(shownOrigin === undefined ? {} : { origin: shownOrigin })} {...(shown === undefined ? {} : { editing: shown })}
      timingLocked={rowTimingLocked(shown?.row)} problem={problem} zone={zone} now={now}
      onClose={onClose}
      onEvent={(event, read) => void send(event).then(() => (read ? perform(readCalendar(false, false)) : undefined))}
      onOpenSources={() => void perform(openSources())}
      onCloseSources={() => void perform(closeSources())}
      onLink={(step) => linkDo((service) => step === "link" ? service.link() : step === "cancel" ? service.cancel() : step === "disconnect" ? service.disconnect() : service.connect())}
      onRetry={() => void perform(readCalendar(true, false))}
      onConnectDevice={() => void perform(readCalendar(true, true))}
      onOpenRow={(row) => void perform(openRow(row)).then((view) => setOrigin({ rowId: row.id, view }))}
      onOpenLink={(url) => void perform(openEventLink(url)).then((how) => { if (how === "web") window.open(url, "_blank", "noopener,noreferrer"); })}
      onDelete={(row, scope) => void perform(deleteRow(row, SCOPE[scope], facts.mode === "DeclineInvitation" ? "decline_invitation" : "organizer_cancel"))}
      onAnswer={(row, answer) => {
        setAnswering(true);
        void perform(answerRow(row, answer)).finally(() => setAnswering(false));
      }}
      answering={answering}
      onPlace={(row) => void perform(placeRow(row))}
      onOpenOrigin={(row) => void perform(openRowOrigin(row))}
      onCloseRow={() => void perform(closeRow())}
      onStartEditor={startEditor}
      draftActions={{
        onEdit: (fields) => void perform(CalendarDrafts.use((drafts) => drafts.edit(fields))),
        onRestore: () => perform(CalendarDrafts.use((drafts) => drafts.restore())),
        onReview: (kind) => void perform(CalendarDrafts.use((drafts) => drafts.openReview(kind))),
        onAnswerReview: (confirmed) => void perform(CalendarDrafts.use((drafts) => drafts.answerReview(confirmed))),
        onRetry: () => void perform(CalendarDrafts.use((drafts) => drafts.retry())),
        onRecovery: (step) => void perform(CalendarDrafts.use((drafts) => step === "open" ? Effect.flatMap(drafts.openRecovery(), () => drafts.captureRecovery())
          : step === "request" ? drafts.requestReset() : step === "confirm" ? drafts.confirmReset() : drafts.closeRecovery())),
      }}
      onSave={(fields) => {
        if (shown === undefined) return;
        void perform(saveEditor(fields, shown.row, rowTimingLocked(shown.row), timingChanged(shown.fields, fields))).then((text) => {
          setProblem(text);
          if (text !== "") return;
          setEditing(undefined);
          if (shown.row === undefined && fields.noteLink !== undefined) void perform(linkSavedNote(fields.creationId, fields.noteLink));
        });
      }}
      onCloseEditor={() => { setEditing(undefined); void perform(closeEditor()); }} />
  );
}
