# Telephony

Phone, Messages, Contacts, voicemail and the ongoing-call bar exist only on
an Alpha image, where Alpha is the phone's dialer and SMS app and the
providers are real (PRD AP-08); the shell admits them
([Shell](../shell/index.md), "Phone and Messages exist only on an Alpha
image, and Contacts only where that image admits it"), and everywhere else
they refuse before anything reaches the phone. On the image the three apps
are agentic (PRD AP-16): one bottom bar addresses the person on screen or
Alpha, Alpha drafts and proposes while the owner sends, calls and approves,
End is never covered, and automatic suggestions are deferred.

Each app reads the phone's providers only while its view is in front on an
unlocked phone, through eliza's own clients of the image's plugins, and keeps
what it read in memory for that visit. Drafts, the comms stage and an open
proposal are the owner's and are kept across restarts; nothing is sent,
dialed or written when they are taken up again. A ringing call is Android's
to present, with its own Answer and Decline: Alpha draws no second alert. The
providers' own rules (Telecom, the SMS journal, the voicemail and contacts
providers, the deletion window) are eliza's; these specs say what Alpha does
with what they answer.

- [Shared terms](./common.md): who may act, the emergency-call gate, list queries and call outcomes
- [Ongoing-call bar](./callBar.md): the calls Telecom reports, the bar over every view, Return and End
- [Phone](./phone.md): Recents, the keypad, the owner's own call and the dial handoff
- [Voicemail](./voicemail.md): the carrier's visual voicemail, playback, transcripts and deletion
- [Phone details](./phoneInfo.md): Settings → Phone: each line's SIM, carrier, number and network, and the role holders
- [Messages](./messages.md): conversations, a conversation, a new message, Copy and Delete
- [Drafts and sends](./drafts.md): one draft per conversation, Alpha's draft, pictures, and the reviewed send
- [Contacts](./contacts.md): the address book, the open contact, the editor and the write gate
- [Agentic comms](./comms.md): the bar's target, the stage, sheet heights, End, proposals and briefings
- [Approved phone actions](./actions.md): what runs after the owner approves an Alpha call, text or contact change
- [Home cards](./attention.md): unread texts, missed calls and new voicemail for Home
