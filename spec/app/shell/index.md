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

### The shell holds the apps opened on the way here, how far Ask Alpha is raised, and what this phone admits

Home is the empty trail; the app showing is the last one on it. Ask Alpha
rests as a bar, takes typing, opens as a sheet, or fills the screen.

```quint
type View = Phone | Messages | Inbox | Calendar | Browser | Camera | Photos | Maps | Notes | Contacts | Files | Workflows | Settings
type Detent = Bar | Typing | Sheet | Full
type Shell = { trail: List[View], assistant: Detent, image: bool, contacts: bool }

pure val initial: Shell = { trail: List(), assistant: Bar, image: false, contacts: false }
pure val maxTrail = 6
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
  { ...told, trail: s.trail.select(view => available(told, view)) }
```

### Opening an app shows it on top and lowers Ask Alpha to its bar

The app already showing is not opened again, and the trail keeps the last
six.

```quint
pure def showing(s: Shell, view: View): bool =
  s.trail.length() > 0 and s.trail.nthOr(s.trail.length() - 1, view) == view

pure def canOpenView(s: Shell, view: View): bool = available(s, view) and not(showing(s, view))

pure def openView(s: Shell, view: View): Shell =
  val grown = s.trail.append(view)
  { ...s, trail: if (grown.length() > maxTrail) grown.tail() else grown, assistant: Bar }
```

### Ask Alpha rises to typing, a sheet or the full screen

```quint
pure def height(detent: Detent): int =
  if (detent == Bar) 0 else if (detent == Typing) 1 else if (detent == Sheet) 2 else 3

pure def canRaise(s: Shell, detent: Detent): bool = height(detent) > height(s.assistant)

pure def raise(s: Shell, detent: Detent): Shell = { ...s, assistant: detent }
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

The full screen lowers to the sheet, and typing or the sheet to the bar. On
bare Home, Android Back keeps Alpha in front while Alpha holds the HOME
role. Otherwise Android Back moves the task behind the previous one and
keeps the page for the next visit.

```quint
pure def layers(s: Shell): int =
  s.trail.length() + (if (s.assistant == Bar) 0 else if (s.assistant == Full) 2 else 1)

pure def canGoBack(s: Shell): bool = layers(s) > 0

pure def goBack(s: Shell): Shell =
  if (s.assistant == Full) { ...s, assistant: Sheet }
  else if (s.assistant != Bar) { ...s, assistant: Bar }
  else { ...s, trail: s.trail.removeAt(s.trail.length() - 1) }
```

### Returning to the prior communications app keeps Ask Alpha open at its current height

The communications stage asks for this step only when its history names
the preceding app. It can return from Phone, Messages or Contacts to one
of those apps while Ask Alpha is open.

```quint
pure def commsView(view: View): bool = view == Phone or view == Messages or view == Contacts

pure def canReturnCommsView(s: Shell, previous: View): bool =
  (s.assistant == Sheet or s.assistant == Full) and s.trail.length() > 1 and commsView(previous)
    and commsView(s.trail.nthOr(s.trail.length() - 1, Settings)) and s.trail.nthOr(s.trail.length() - 2, Settings) == previous

pure def returnCommsView(s: Shell, previous: View): Shell = { ...s, trail: s.trail.removeAt(s.trail.length() - 1) }

pure def stepACommsReturnPreservesTheSheet(before: Shell, via: str, after: Shell): bool =
  via == "returnCommsView" implies (after.assistant == before.assistant and after.trail.length() == before.trail.length() - 1)
```

### Home leaves every app and closes every layer at once

On Android, HOME, the app icon and a return to Alpha deliver their intents
to the live page when Android can bring its task forward. If Android
repeatedly refuses the handoff, subsequent launches proceed in their own
task.

```quint
pure def canGoHome(s: Shell): bool = layers(s) > 0

pure def goHome(s: Shell): Shell = { ...s, trail: List(), assistant: Bar }
```

### Agent navigation shows an admitted app or Home without lowering Ask Alpha

When the agent navigates during an open conversation or voice session, Ask
Alpha stays at its current height so the conversation is not interrupted.

```quint
pure def canAgentOpenView(s: Shell, view: View): bool = available(s, view) and not(showing(s, view))

pure def agentOpenView(s: Shell, view: View): Shell =
  val grown = s.trail.append(view)
  { ...s, trail: if (grown.length() > maxTrail) grown.tail() else grown }

pure def canAgentGoHome(s: Shell): bool = s.trail.length() > 0

pure def agentGoHome(s: Shell): Shell = { ...s, trail: List() }

pure def stepAgentNavigationKeepsAssistant(before: Shell, via: str, after: Shell): bool =
  (via == "agentOpenView" or via == "agentGoHome") implies (after.assistant == before.assistant)

pure def sometimesAgentNavigatesKeepingSheet(s: Shell): bool = s.assistant == Sheet and s.trail.length() > 0
```

### When Alpha opens again the trail is kept, and Ask Alpha is closed

```quint
pure def reopen(s: Shell): Shell = { ...s, assistant: Bar }
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

### Contacts can be showing

```quint
pure def sometimesContactsShowing(s: Shell): bool = showing(s, Contacts)
```
