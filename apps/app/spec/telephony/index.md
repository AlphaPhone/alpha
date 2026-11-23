# Telephony

Phone, Messages, Contacts, voicemail and the ongoing-call bar exist only on the Alpha AOSP image,
where Alpha is preassigned as the default dialer and SMS app and the native providers are real
(PRD AP-08). Everywhere else they are hidden and refuse before anything reaches native code. On
the image the three apps are agentic (PRD AP-16, `docs/agentic-comms.md` AC-01 to AC-32): one bottom
bar addresses the person on screen or Alpha, opening Alpha moves the app into a stage above the
conversation sheet instead of covering it, End is never covered, Alpha drafts and proposes while
the owner sends, calls and approves, and automatic suggestions are deferred.

The renderer reads the providers only while their view is in front on an unlocked phone and keeps
what it read in memory for that visit. Drafts, the stage and an open proposal are the owner's and
survive process death; nothing is sent, dialed or written on restore. The native side (Telecom,
the SMS journal, the voicemail and contacts providers) is specified upstream in
`spec/os/android/{phone,messages,contacts,voicemail}.md`; these specs state what Alpha's renderer
does with what the native side answers. A confirmed delete of a message, voicemail or contact waits in
the upstream deletion window (`spec/os/android/deletionWindow.md`, `deferredDeletion.md`): its row is
hidden from its list, and the window's own notice offers Undo while Undo can still win.

- [Shared terms](./common.md): where the apps exist, who may act, the emergency-call gate, list queries and call outcomes.
- [Ongoing-call bar](./callBar.md): the calls Telecom reports, the bar over every view, Return and End.
- [Phone](./phone.md): Recents, the keypad, the owner's own call and the dial handoff.
- [Voicemail](./voicemail.md): the carrier's visual voicemail, playback, on-device transcripts and deletion.
- [Messages](./messages.md): threads, a conversation, a new message, links, Copy and Delete.
- [Drafts and sends](./drafts.md): one draft slot per conversation, Alpha's draft, pictures, and the reviewed SMS or MMS send.
- [Contacts](./contacts.md): the address book read, the in-app editor and the write gate.
- [Agentic comms](./comms.md): the bar's target, the stage, sheet heights, End placement, proposals and briefings.
- [Approved phone actions](./actions.md): what runs after the owner approves an Alpha call, text or contact change.
- [Home cards](./attention.md): unread texts, missed calls and new voicemail on Home.
