# Shell

Where the owner is in Alpha: on Home or in one of the built-in apps, with
Ask Alpha as a layer over it. Every other area is shown
inside the shell and moves through it.

- [Layers](./layers.md): the sheets, menus and dialogs over the page, and what holds the phone
- [Keyboard and canvas](./keyboard.md): the window without the keyboard, the canvas, text size and Ask Alpha's footprint
- [Focus](./focus.md): where focus goes when the screen changes under the owner
- [Gestures](./gestures.md): what a swipe on the page means
- [Haptics](./haptics.md): touch feedback
- [Landing](./landing.md): coming back to Alpha from a provider's consent page

## Story: Move between Home and the apps

> As the phone's owner, I want to open an app from Home, go back the way I
> came and return Home in one step, so that I never lose my place.

### The shell holds the apps opened on the way here, the Apps drawer, how far Ask Alpha is raised, and what this phone admits

Home is the empty trail; the app showing is the last one on it. Ask Alpha
rests as a bar, takes typing, opens as a sheet, or fills the screen. An app
rises over Home, which stays where the owner left it and takes no input
underneath; an app opened from another takes that app's place at once,
with nothing of Home between them; going back takes the app away at once.

```quint
type View = Phone | Messages | Inbox | Telegram | Slack | Calendar | Clock | Reminders | Browser | Camera | Photos | Maps | Notes | Contacts | Files | Workflows | Wallet | Settings
type Detent = Bar | Typing | Sheet | Full
type TextAsk = NoTextAsk | TextAskVisit({ ticket: int, prior: Detent, closing: bool })
type Shell = { trail: List[View], drawer: bool, assistant: Detent, image: bool, contacts: bool, route: int, spokenRoute: int, textAsk: TextAsk, textAskThrough: int }

pure val initial: Shell = { trail: List(), drawer: false, assistant: Bar, image: false, contacts: false, route: 0, spokenRoute: 0, textAsk: NoTextAsk, textAskThrough: 0 }
pure val maxTrail = 6

type RouteMove = { before: Shell, after: Shell }
pure def recordRoute(move: RouteMove): Shell =
  if (move.before.trail == move.after.trail and move.before.drawer == move.after.drawer and move.before.assistant == move.after.assistant) move.after
  else { ...move.after, route: move.before.route + 1 }
```

### Changing the open app trail, drawer or panel takes a new route number

A returned route is a new visit even when the same apps and panel are
showing again.

```quint
pure def stepRouteHasItsOwnNumber(before: Shell, after: Shell): bool =
  if (before.trail == after.trail and before.drawer == after.drawer and before.assistant == after.assistant)
    after.route == before.route
  else after.route == before.route + 1
```

### Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it

```quint
pure def available(s: Shell, view: View): bool =
  if (view == Phone or view == Messages) s.image
  else if (view == Contacts) s.image and s.contacts
  else true
```

### The phone says what it admits, and an app it no longer admits leaves the trail

```quint
pure def admit(s: Shell, image: bool, contacts: bool): Shell =
  val told = { ...s, image: image, contacts: contacts }
  recordRoute({ before: s, after: { ...told, trail: s.trail.select(view => available(told, view)) } })
```

### Opening an app shows it on top and lowers Ask Alpha to its bar

The app already showing is not opened again, and the trail keeps the last
six. An Android Ask Alpha visit closes before the owner can open another app.

```quint
pure def showing(s: Shell, view: View): bool =
  s.trail.length() > 0 and s.trail.nthOr(s.trail.length() - 1, view) == view

pure def canOpenView(s: Shell, view: View): bool =
  s.textAsk == NoTextAsk and available(s, view) and not(showing(s, view))

pure def openView(s: Shell, view: View): Shell =
  val grown = s.trail.append(view)
  recordRoute({ before: s, after: { ...s, trail: if (grown.length() > maxTrail) grown.tail() else grown, drawer: false, assistant: Bar } })
```

### The Apps drawer opens on phone Home with Ask Alpha at rest

An app or the Home command closes the drawer. Ask Alpha can rise above it.

```quint
pure def canOpenDrawer(s: Shell, phone: bool): bool =
  phone and s.trail.length() == 0 and not(s.drawer) and s.assistant == Bar

pure def openDrawer(s: Shell, phone: bool): Shell = recordRoute({ before: s, after: { ...s, drawer: true } })

pure def canCloseDrawer(s: Shell): bool = s.drawer

pure def closeDrawer(s: Shell): Shell = recordRoute({ before: s, after: { ...s, drawer: false } })
```

### Apps can open beside the landscape Ask sheet and Close leaves Ask open

On a landscape phone, the quiet Ask sheet can sit beside Home and its
Apps drawer. Apps opens in the left pane
without moving Ask. Close apps closes only the drawer. Escape does the
same with focus inside Apps after its menu is closed. Back keeps its
usual order. After a rotation the drawer remains on the same route, and
a sheet over it takes input before the drawer until they are beside each
other again or the owner lowers Ask.

```quint
pure def adjacentAskSheet(s: Shell, landscapePhone: bool): bool =
  landscapePhone and s.textAsk == NoTextAsk and s.trail.length() == 0 and s.assistant == Sheet

pure def canOpenDrawerBeside(s: Shell, phone: bool, landscapePhone: bool): bool =
  phone and not(s.drawer) and adjacentAskSheet(s, landscapePhone)

pure def openDrawerBeside(s: Shell, phone: bool, landscapePhone: bool): Shell = openDrawer(s, phone)

pure def lawOpeningAppsBesideKeepsAsk(s: Shell, phone: bool, landscapePhone: bool): bool =
  val opened = openDrawerBeside(s, phone, landscapePhone)
  canOpenDrawerBeside(s, phone, landscapePhone)
    implies (opened.drawer and opened.assistant == s.assistant and opened.route == s.route + 1)

pure val eval_witness_canOpenDrawerBeside = (("raise", Sheet), ("openDrawerBeside", true, true))
```

### Ask Alpha rises to typing, a sheet or the full screen

```quint
pure def height(detent: Detent): int =
  if (detent == Bar) 0 else if (detent == Typing) 1 else if (detent == Sheet) 2 else 3

pure def canRaise(s: Shell, detent: Detent): bool = height(detent) > height(s.assistant)

pure def raise(s: Shell, detent: Detent): Shell = recordRoute({ before: s, after: { ...s, assistant: detent } })
```

### On Phone, Messages and Contacts the app's own bar stands in for Ask Alpha at rest, until Ask Alpha rises

These apps draw one bar that addresses the person on screen or Alpha, so
Ask Alpha's bar is not drawn over them; raised, Ask Alpha is drawn above
the app again. On Home and every other app Ask Alpha's bar is always drawn.

```quint
pure def barApp(view: View): bool = view == Phone or view == Messages or view == Contacts

pure def askAlphaDrawn(s: Shell): bool =
  s.assistant != Bar or s.trail.length() == 0 or not(barApp(s.trail.nthOr(s.trail.length() - 1, Settings)))

pure def alwaysHomeDrawsAskAlpha(s: Shell): bool = s.trail.length() == 0 implies askAlphaDrawn(s)

pure def sometimesAnAppsBarStandsInForAskAlpha(s: Shell): bool = not(askAlphaDrawn(s))
```

### Back closes one layer: Ask Alpha by a step, then the app on top

The full screen lowers to the sheet, and typing or the sheet to the bar.
When Ask Alpha is at rest, Back closes the drawer before it leaves Home. On
bare Home, Android Back keeps Alpha in front while Alpha holds the HOME
role. Otherwise Android Back moves the task behind the previous one and
keeps the page for the next visit.

```quint
pure def layers(s: Shell): int =
  s.trail.length() + (if (s.drawer) 1 else 0) + (if (s.assistant == Bar) 0 else if (s.assistant == Full) 2 else 1)

pure def canGoBack(s: Shell): bool = s.textAsk == NoTextAsk and layers(s) > 0

pure def goBack(s: Shell): Shell =
  if (s.assistant == Full) recordRoute({ before: s, after: { ...s, assistant: Sheet } })
  else if (s.assistant != Bar) recordRoute({ before: s, after: { ...s, assistant: Bar } })
  else if (s.drawer) closeDrawer(s)
  else recordRoute({ before: s, after: { ...s, trail: s.trail.removeAt(s.trail.length() - 1) } })
```

### On the launcher the first page of Settings and of Workflows draws no Back, and Android's Back still leaves it

As in Sunday's v119, which drew an app's Back only when Alpha was not the
phone's launcher, the first page of Settings and of Workflows has no Back
control in its header while Alpha is the launcher, and nor has the first
page of Inbox, of Calendar, of Notes, of Files or of Photos (the notes
list, the top of Files, the photo library or albums). A page inside any
of them keeps its Back, and
away from the launcher the first page keeps it too.
The control is only how Back is drawn: Android's own Back gesture still
closes the app as the rule above says.

Phone, Messages and Contacts draw their first page the same way, as v119's
telephony headers did: the Phone tabs (on Recents, Keypad, Voicemail and
Contacts), the Messages conversation list and the Contacts list have no
Back on the launcher. A conversation, a contact and a new message keep
theirs.

```quint
type AppPage = FirstPage | InnerPage

pure def drawsAppBack(s: Shell, launcher: bool, page: AppPage): bool =
  canGoBack(s) and not(launcher and page == FirstPage)

pure def lawAFirstPageOnTheLauncherDrawsNoBack(s: Shell): bool =
  not(drawsAppBack(s, true, FirstPage)) and drawsAppBack(s, false, FirstPage) == canGoBack(s) and drawsAppBack(s, true, InnerPage) == canGoBack(s)
```

### Returning to the prior communications app keeps Ask Alpha open at its current height

The communications stage asks for this step only when its history names
the preceding app. It can return from Phone, Messages or Contacts to one
of those apps while Ask Alpha is open. An Android Ask Alpha visit
handles Back before that history returns.

```quint
pure def commsView(view: View): bool = view == Phone or view == Messages or view == Contacts

pure def canReturnCommsView(s: Shell, previous: View): bool =
  s.textAsk == NoTextAsk and (s.assistant == Sheet or s.assistant == Full)
    and s.trail.length() > 1 and commsView(previous)
    and commsView(s.trail.nthOr(s.trail.length() - 1, Settings)) and s.trail.nthOr(s.trail.length() - 2, Settings) == previous

pure def returnCommsView(s: Shell, previous: View): Shell = recordRoute({ before: s, after: { ...s, trail: s.trail.removeAt(s.trail.length() - 1) } })

pure def stepACommsReturnPreservesTheSheet(before: Shell, via: str, after: Shell): bool =
  via == "returnCommsView" implies (after.assistant == before.assistant and after.trail.length() == before.trail.length() - 1)
```

### Opening another communications app from the stage keeps Ask Alpha open

The owner's action can open an admitted communications app from the app
currently on stage. Back can return to the source at the same height.

```quint
pure def canOpenCommsView(s: Shell, view: View): bool =
  s.textAsk == NoTextAsk and (s.assistant == Sheet or s.assistant == Full)
    and commsView(s.trail.nthOr(s.trail.length() - 1, Settings)) and commsView(view) and canOpenView(s, view)

pure def openCommsView(s: Shell, view: View): Shell =
  val opened = openView(s, view)
  { ...opened, assistant: s.assistant }

pure def stepACommsOpeningPreservesTheSheet(before: Shell, via: str, after: Shell): bool =
  via == "openCommsView" implies (after.assistant == before.assistant
    and after.trail.nthOr(after.trail.length() - 2, Settings) == before.trail.nthOr(before.trail.length() - 1, Settings)
    and commsView(after.trail.nthOr(after.trail.length() - 1, Settings)))
```

### Home leaves every app and closes every layer at once

On Android, HOME, the app icon and a return to Alpha deliver their intents
to the live page when Android can bring its task forward. If Android
repeatedly refuses the handoff, subsequent launches proceed in their own
task.

```quint
pure def canGoHome(s: Shell): bool = layers(s) > 0

pure def goHome(s: Shell): Shell = recordRoute({ before: s, after: { ...s, trail: List(), drawer: false, assistant: Bar, textAsk: NoTextAsk } })
```

### Agent navigation shows an admitted app or Home without lowering Ask Alpha

When the agent navigates during an open conversation or voice session, Ask
Alpha stays at its current height so the conversation is not interrupted.

```quint
pure def canAgentOpenView(s: Shell, view: View): bool = available(s, view) and not(showing(s, view))

pure def agentOpenView(s: Shell, view: View): Shell =
  val grown = s.trail.append(view)
  recordRoute({ before: s, after: { ...s, trail: if (grown.length() > maxTrail) grown.tail() else grown, drawer: false } })

pure def canAgentOpenFilesFrom(s: Shell, source: List[View], panel: Detent, route: int, spoken: bool): bool =
  s.route == route and s.trail == source and s.assistant == panel and not(s.drawer)
    and (panel == Sheet or panel == Full or (spoken and panel == Bar))
    and canAgentOpenView(s, Files)

pure def agentOpenFilesFrom(s: Shell, source: List[View], panel: Detent, route: int, spoken: bool): Shell = agentOpenView(s, Files)

pure val sourceValues = Set(List(), List(Notes), List(Calendar), List(Notes, Calendar), List(Files))
pure val panelValues = Set(Bar, Sheet, Full)
pure val routeValues = Set(0, 1, 2, 3, 6)
pure val eval_witness_canAgentOpenFilesFrom = (("raise", Sheet), ("agentOpenFilesFrom", List(), Sheet, 1, false))

pure def canAgentGoHome(s: Shell): bool = s.trail.length() > 0 or s.drawer

pure def agentGoHome(s: Shell): Shell = recordRoute({ before: s, after: { ...s, trail: List(), drawer: false } })

pure def stepAgentNavigationKeepsAssistant(before: Shell, via: str, after: Shell): bool =
  (via == "agentOpenView" or via == "agentOpenFilesFrom" or via == "agentGoHome"
    or via == "agentOpenSpoken" or via == "agentHomeSpoken") implies (after.assistant == before.assistant)

pure def sometimesAgentNavigatesKeepingSheet(s: Shell): bool = s.assistant == Sheet and s.trail.length() > 0
```

### A page the agent opens in Browser lowers Ask Alpha to its bar

When the page the agent asked for opens in Browser, at once or after the
owner's Open, Ask Alpha lowers to its bar so the page fills the screen, as
on Sunday's v119 demo phone. Only a page opening does this; any other
agent navigation keeps Ask Alpha where it is (above).

```quint
pure def canAgentShowPage(s: Shell): bool = s.textAsk == NoTextAsk and showing(s, Browser) and s.assistant != Bar

pure def agentShowPage(s: Shell): Shell = recordRoute({ before: s, after: { ...s, assistant: Bar } })

pure def stepAnAgentsPageLowersAskAlpha(before: Shell, via: str, after: Shell): bool =
  via == "agentShowPage" implies (after.assistant == Bar and after.trail == before.trail and showing(after, Browser))
```

### Only a spoken move from its exact source route is marked as Talk's navigation

An agent's spoken move can open the destination only from the route the
turn was sent from. The shell records the route that this move created. A
manual move names a new route even when it reaches the same destination.

```quint
pure def canAgentOpenSpoken(s: Shell, view: View, route: int): bool =
  s.route == route and canAgentOpenView(s, view)

pure def agentOpenSpoken(s: Shell, view: View, route: int): Shell =
  val opened = agentOpenView(s, view)
  { ...opened, spokenRoute: opened.route }

pure def canAgentHomeSpoken(s: Shell, route: int): bool =
  s.route == route and canAgentGoHome(s)

pure def agentHomeSpoken(s: Shell, route: int): Shell =
  val returned = agentGoHome(s)
  { ...returned, spokenRoute: returned.route }

pure def stepSpokenRouteMarksTheWriter(before: Shell, via: str, after: Shell): bool =
  if (via == "agentOpenSpoken" or via == "agentHomeSpoken")
    after.spokenRoute == after.route and after.route == before.route + 1
  else after.spokenRoute == before.spokenRoute
```

### When Alpha opens again the trail is kept, and Ask Alpha is closed

```quint
pure def reopen(s: Shell): Shell = recordRoute({ before: s, after: { ...s, drawer: false, assistant: Bar, textAsk: NoTextAsk, textAskThrough: 0 } })
```

### The trail never holds more than six apps

```quint
pure def alwaysTrailIsBounded(s: Shell): bool = s.trail.length() <= maxTrail
```

### Every app on the trail is one this phone admits

```quint
pure def alwaysTrailIsAdmitted(s: Shell): bool = s.trail.every(view => available(s, view))
```

### Back never closes more than one layer

```quint
pure def stepBackClosesOneLayer(before: Shell, via: str, after: Shell): bool =
  via == "goBack" implies layers(after) == layers(before) - 1
```

### Home always ends on Home with nothing over it

```quint
pure def stepHomeIsBare(before: Shell, via: str, after: Shell): bool =
  via == "goHome" implies layers(after) == 0
```

### Ask Alpha can fill the screen over an app

```quint
pure def sometimesAskAlphaOverAnApp(s: Shell): bool = s.assistant == Full and s.trail.length() > 0
```

### The trail can fill

```quint
pure def sometimesTrailIsFull(s: Shell): bool = s.trail.length() == maxTrail
```

### The Apps drawer can be open

```quint
pure def sometimesDrawerOpen(s: Shell): bool = s.drawer
```

### Contacts can be showing

```quint
pure def sometimesContactsShowing(s: Shell): bool = showing(s, Contacts)
```

## Story: Open text Ask Alpha from Android

> As the owner, I want an Android assistant invocation on my Alpha image
> to open Ask Alpha and let me return to where I was without opening the
> microphone.

### Only a native Android visit opens text Ask, and Back or Close settles that exact visit

Alpha raises its existing chat without starting a voice turn or applying
any intent content. The phone says when the current visit has closed.
When Alpha was already visible the prior panel returns in place.
Otherwise Android moves Alpha's task behind the preceding one. A refused
return leaves Ask open so the owner can try again. A communications
stage behind the visit does not take Back before that visit closes.

```quint
pure val ticketValues = Set(1, 2, 3)

pure def canOpenTextAsk(s: Shell, ticket: int): bool = s.image and ticket > s.textAskThrough and s.textAsk == NoTextAsk
pure def openTextAsk(s: Shell, ticket: int): Shell =
  recordRoute({ before: s, after: { ...s, assistant: Full, textAsk: TextAskVisit({ ticket: ticket, prior: s.assistant, closing: false }), textAskThrough: ticket } })

pure def canCloseTextAsk(s: Shell, ticket: int): bool =
  val visit = s.textAsk
  match visit { | NoTextAsk => false | TextAskVisit(v) => not(v.closing) and v.ticket == ticket }

pure def closeTextAsk(s: Shell, ticket: int): Shell =
  val visit = s.textAsk
  match visit { | NoTextAsk => s | TextAskVisit(v) => { ...s, textAsk: TextAskVisit({ ...v, closing: true }) } }

pure def canTextAskClosed(s: Shell, ticket: int, closed: bool): bool =
  val visit = s.textAsk
  match visit { | NoTextAsk => false | TextAskVisit(v) => v.closing and v.ticket == ticket }

pure def textAskClosed(s: Shell, ticket: int, closed: bool): Shell =
  val visit = s.textAsk
  match visit {
    | NoTextAsk => s
    | TextAskVisit(v) =>
      if (closed) recordRoute({ before: s, after: { ...s, assistant: v.prior, textAsk: NoTextAsk } })
      else { ...s, textAsk: TextAskVisit({ ...v, closing: false }) }
  }

pure def alwaysTextAskIsFull(s: Shell): bool = s.textAsk != NoTextAsk implies s.assistant == Full

pure def stepClosedTextAskKeepsTheAdmittedTicket(before: Shell, via: str, after: Shell): bool =
  (via == "closeTextAsk" or via == "textAskClosed") implies after.textAskThrough == before.textAskThrough
```
