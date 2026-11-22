# Browser

Alpha's Browser (PRD AP-10) shows websites in native tabs beside the app's own WebView: the
`AlphaBrowser` tab host on Android, an isolated frame surface on the browser build. Normal tabs keep
sign-ins in one persistent profile and come back after a restart; private tabs use an ephemeral
profile that dies with the tab and never reaches saved tabs or history. The owner reaches every page
action from the toolbar and menu; the agent opens, switches and drives tabs only through reviewed
actions bound to the page the owner was looking at. The native host's surface lifecycle, address
test, tab storage and page reading are `@elizaos/os/browser`'s; the agent's request grounding and
remote control are `@elizaos/plugin-browser`'s. These specs state what Alpha's renderer must do over
them.

| Area | Specifications |
| --- | --- |
| Vocabulary | [Pages, addresses and limits](./page.md) |
| Tabs | [Tabs, layers, find in page and restore](./session.md), [saved session writer](./persistence.md), [bookmarks](./bookmarks.md) |
| The page on screen | [Presentation and host rects](./presentation.md), [the browser build's frame surface](./webSurface.md) |
| Leaving the page | [Confirmations](./reviews.md), [another browser and app links](./handoff.md), [share, copy and email](./egress.md), [downloads](./downloads.md) |
| Reading | [Read aloud and Ask about page](./reading.md) |
| Sites | [Site prompts and site data](./site.md), [eligible autofill](./autofill.md) |
| Agent | [Agent opens and reviewed controls](./agent.md) |
| Sign-in and Cloud | [Google browser return](./googleReturn.md), [Cloud request custody](./cloudCustody.md) |
