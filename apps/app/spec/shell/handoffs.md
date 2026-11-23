# Handoffs

Another area can ask the shell to show something it made: Notes hands over a note to open, an email
draft of a note, or the web page a note came from. The shell opens the one app that does it with
what was handed over, as a draft the owner still reviews; nothing is sent or saved by the handoff.
Calendar drafts from Notes are Calendar's own and do not pass through the shell.

```quint
type Request = OpenNotes | EmailDraft | OpenWebSource | CalendarDraft
type Destination = ToNotes | ToInbox | ToBrowser | ToCalendar
```

## Story: Carry what I asked for in Notes into the app that does it

> As the owner, I want "email this note", "open where this came from" and a link back to a note to
> open the app that does it, holding a draft I still review, and to be told when that app could not.

### Each request opens exactly the app that does it, and a refused one opens nothing and says so

Opening Notes at a note cannot be refused. Inbox refusing the draft, or Browser refusing the page,
leaves the screen as it was and shows a failure toast.

```quint
pure def destinationOf(request: Request): Destination = match request {
  | OpenNotes => ToNotes
  | EmailDraft => ToInbox
  | OpenWebSource => ToBrowser
  | CalendarDraft => ToCalendar
}
pure def throughShell(request: Request): bool = request != CalendarDraft
pure def opensApp(request: Request, accepted: bool): bool = throughShell(request) and (accepted or request == OpenNotes)
pure def refusalShown(request: Request, accepted: bool): bool = throughShell(request) and not(opensApp(request, accepted))
pure def lawARefusalOpensNothing(request: Request): bool = request != OpenNotes implies not(opensApp(request, false))
pure def lawARefusalIsAlwaysSaid(request: Request, accepted: bool): bool =
  throughShell(request) implies (opensApp(request, accepted) or refusalShown(request, accepted))
pure def lawCalendarFollowsItsOwnDrafts(accepted: bool): bool =
  not(opensApp(CalendarDraft, accepted)) and not(refusalShown(CalendarDraft, accepted))
```

### A note's web page opens only as a secure web address, through Browser's approved open

The page opens the way an approved open from the agent does: Browser takes it only as an HTTPS
address with a host and no credentials in it, opens it in the tab in front, and presents it once the
owner is in Browser. Anything else, or a page Browser refuses, opens nothing and says why.

```quint
pure def sourceOpens(secure: bool, dispatched: bool): bool = secure and dispatched
pure def lawAnInsecureAddressNeverOpens(dispatched: bool): bool = not(sourceOpens(false, dispatched))
pure def lawARefusedPageNeverOpens(secure: bool): bool = not(sourceOpens(secure, false))
```
