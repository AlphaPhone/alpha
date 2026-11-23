# Alpha Phone

Alpha Phone is a personal agent phone: a distinct Home, library and assistant over a resident
on-device agent, with Alpha's own identity. It composes Eliza's packages and keeps its own interface,
branding and deployment: the agent runs on the phone, Eliza Cloud serves sign-in, subscription and
metered services, and the AOSP image adds telephony. Each area below is specified top-down, stories
first, then rules, then the Quint model the generated code comes from. The PRD (`docs/prd.md`) is the
requirement source; these specs state what the renderer must do to meet it.

| Area | Specification |
| --- | --- |
| Platform | [Native capabilities, the resident agent, Cloud and durable state](./platform/) |
| Shell | [Home, the library, navigation, the dock, sheets, keyboard and system surfaces](./shell/) |
| Assistant | [Conversation, composer, attachments, action cards and reviewed device actions](./assistant/) |
| Voice | [Dictation, voice conversation, speech routes and the always-on listener](./voice/) |
| Calendar | [Agenda, events, reviewed writes, Google Calendar linking and availability](./calendar/) |
| Notes | [Canonical notes, folders, recording, sharing and Trash](./notes/) |
| Files | [Browsing, preview, recent files, sharing and reviewed file actions](./files/) |
| Inbox | [Gmail accounts, threads, drafts, attachments and send](./inbox/) |
| Maps | [Place search, routes, navigation and agent map controls](./maps/) |
| Browser | [Tabs, private sessions, find in page and agent browsing](./browser/) |
| Camera | [Capture, Photos library, scan and media review](./camera/) |
| Telephony | [Phone, Messages, Contacts, voicemail and the call bar, on the AOSP image](./telephony/) |
| Clock | [Alarms, timers, reminders and notifications](./clock/) |
| Account | [Cloud sign-in, membership and plans, Google connection and delegation](./account/) |
| Workflows | [Resident workflows, digests, hosted results and run history](./workflows/) |
| Settings | [Device preferences, privacy, passwords, diagnostics, updates and reset](./settings/) |
