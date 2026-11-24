# App

The phone's interface: Home, the built-in apps and Ask Alpha, as one page
that Android shows as the launcher. Each area keeps its own state and
rules.

- [Shell](./shell/): where the owner is, and the layers over it
- [Startup](./startup/): how Alpha comes up, asks for access and recovers
- [Home](./home/): the launcher, its tiles, the Apps drawer's contents and the cards
- [Assistant](./assistant/): Ask Alpha, its conversation, composer and cards
- [Settings](./settings/): the phone's facts, preferences, agent activity and reset
- [Inbox](./inbox/): Gmail's list, a message, drafts and the agent's operations
- [Account](./account/): the agent as the owner sees it, signing in to Alpha Cloud and the session
- [Notes](./notes/): the notes list, a note, the editor and what the agent may propose
- [Ask Alpha](./ask/): one conversation with the resident agent
- [Reminders](./sample/): the sample area, which only its own journeys mount: a read, a feed, an undo window and an attempt outside
- [Text size](./sample/size.md): the second sample, which only its own journeys mount: senders, an opening that asks the phone, the phone's signals and a page-wide effect
- [Maps](./maps/): search, places, directions, guidance and the map, over Cloud Maps
