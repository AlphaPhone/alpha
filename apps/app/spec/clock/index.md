# Clock

Alarms, timers, the stopwatch and world clocks; reminders and undated to-dos; and the notices Alpha
keeps over every screen: a ringing alarm or timer, the Undo of a reviewed deletion, a tapped
notification that opens exactly what it names, and a workflow result waiting for the owner's
return.

Android Clock owns alarms on the phone (PRD, "Explicit limits": Clock remains a native surface). On
the launcher and the AOSP image Alpha hands an alarm request to Clock after the owner reviews it,
and a handoff proves only that Clock opened, never that an alarm exists, changed or rang. The
browser build has no Clock app: there Alpha keeps alarms itself and rings them only while its page
is open and in front. Timers, the stopwatch and world clocks are Alpha's own on every build.

Reminders belong to the phone's reminder store (the reminder alarms of the device image): Alpha
lists them, and every change is journaled before the phone is asked, read back afterwards, and
never sent twice. Notifications are the phone's: Alpha lists its own and the other apps the owner
chose, and acts only on the exact row the owner sees.

- [Vocabulary](./vocabulary.md): days, times and Clock answers every part shares.
- [Ringer](./ringer.md): the page's time, whether it may ring, the alarm lock and the sound.
- [Alarms](./alarms.md): the browser build's own alarms, ringing, snooze and dismissal.
- [Timers](./timers.md): countdowns that ring when they reach zero.
- [Stopwatch](./stopwatch.md): elapsed time and laps.
- [World clock](./worldClock.md): the time zones the owner follows.
- [Clock handoff](./handoff.md): a reviewed request to Android Clock from the Clock screen.
- [Handoff history](./handoffHistory.md): the latest handoff and what Clock answered.
- [Agent Clock review](./agentReview.md): an alarm the agent proposes, reviewed on the phone.
- [Reminders](./reminders.md): the listing, its refreshes and the one reminder write at a time.
- [Reminder journal](./reminderJournal.md): creations and changes kept until the phone confirms them.
- [Reminder taps](./reminderTaps.md): a tapped reminder notification opens its exact reminder.
- [Notifications](./notifications.md): the current notifications, acted on row by row.
- [Notification taps](./canonicalTaps.md): a tapped Alpha notification opens the view it names.
- [Workflow notices](./workflowNotices.md): a workflow notice opens its exact run.
- [Deletion Undo](./deletions.md): ten seconds to undo a reviewed deletion.
- [Notification mirror](./mirror.md): which other apps' notifications Alpha may show.
- [Notices](./notices.md): retained-data notices and the lease of a notice action.
