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

### A note's web page opens only as a parsed web address, in a new ordinary tab

The address is read as the owner would type it, upgraded to a secure address where the browser
host requires one; anything that does not parse as a web address, or reads as empty, is refused.
The page opens in a new tab of the ordinary profile, never in a private one or in a tab the owner
already had open.

```quint
pure def sourceOpens(parsed: bool, empty: bool, tabOpened: bool, submitted: bool): bool =
  parsed and not(empty) and tabOpened and submitted
pure def lawAnUnparsedAddressNeverOpens(empty: bool, tabOpened: bool, submitted: bool): bool =
  not(sourceOpens(false, empty, tabOpened, submitted))
pure def lawAnEmptyAddressNeverOpens(parsed: bool, tabOpened: bool, submitted: bool): bool =
  not(sourceOpens(parsed, true, tabOpened, submitted))
```
