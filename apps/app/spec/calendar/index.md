# Calendar

Alpha's Calendar app (PRD AP-09): the owner's agenda in day, week, month and schedule views, event
detail and a retained editor, the phone's own device calendars, the resident agent's Calendar, an
optional Google Calendar connection with explicit local-first sync, and every change the agent asks
for reviewed before it is made. Upstream `@elizaos/plugin-calendar` owns the shared records,
availability projection, series scope, linked reconciliation and sync settlement; the Android
`spec/os/android/calendar.md` owns the device provider's reads, tickets and deletion journal. These
specs state what Alpha's renderer adds on top of them.

| Area | Specifications |
| --- | --- |
| Seeing the calendar | [Views and navigation](./presentation.md), [the Home agenda](./home.md) |
| Changing events | [Editor rules](./editor.md), [retained drafts](./drafts.md), [device calendar writes](./device.md), [the assistant's selection](./selection.md) |
| The agent's Calendar | [Reads and reviewed writes](./agent.md), [deletion Undo](./deletions.md), [approval review](./approvals.md) |
| Agent requests on the phone | [Device actions](./deviceActions.md), [named reads](./namedRead.md), [availability](./availability.md), [reviewed range reads](./rangeRead.md) |
| Google Calendar | [Linking](./googleLink.md), [sync control and consent](./sync.md), [device sync consent](./nativeSync.md), [the local port](./linkedLocal.md), [disconnect](./disconnect.md) |
| Keeping what exists | [Legacy calendar preservation, backups and recovery](./preservation.md) |
