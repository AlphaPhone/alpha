# Preferences

What Alpha may do and read without asking, kept in the phone's private storage under the owner.
Other areas read these through the preferences service: the assistant before a reviewed action and
before attaching the phone's location or the Browser page the owner has open, Inbox before loading
remote images, the browser simulator for its microphone and location.

## Story: Decide what Alpha may do without asking

> As the owner, I choose whether Alpha asks before it acts, whether it may use my location and the
> Browser page I have open, and whether email images load, and my choice holds until I change it.

### A new phone lets Alpha use its location, the open Browser page and email images, and does not ask first

Location for Alpha is on by default: the launcher already holds the location grant on the image,
and the owner can turn the switch off or revoke the grant in Android. Browser page for Alpha is on
by default like Location for Alpha.

```quint
type Preferences = {
  askBeforeActions: bool, agentLocation: bool, browserPage: bool, gmailChanges: bool, calendarEdits: bool,
  mailImages: bool, browserMicrophone: bool, browserLocation: bool, edits: int,
}
pure val initial: Preferences = {
  askBeforeActions: false, agentLocation: true, browserPage: true, gmailChanges: true, calendarEdits: true,
  mailImages: true, browserMicrophone: true, browserLocation: true, edits: 0,
}
```

### Each switch changes only its own preference

```quint
type Preference = AskBeforeActions | AgentLocation | BrowserPage | GmailChanges | CalendarEdits | MailImages
  | BrowserMicrophone | BrowserLocation
pure def valueOf(p: Preferences, preference: Preference): bool =
  if (preference == AskBeforeActions) p.askBeforeActions else if (preference == AgentLocation) p.agentLocation
  else if (preference == BrowserPage) p.browserPage
  else if (preference == GmailChanges) p.gmailChanges else if (preference == CalendarEdits) p.calendarEdits
  else if (preference == MailImages) p.mailImages else if (preference == BrowserMicrophone) p.browserMicrophone
  else p.browserLocation
pure def setPreference(p: Preferences, preference: Preference, on: bool): Preferences = {
  val q = { ...p, edits: p.edits + 1 }
  if (preference == AskBeforeActions) { ...q, askBeforeActions: on } else if (preference == AgentLocation) { ...q, agentLocation: on }
  else if (preference == BrowserPage) { ...q, browserPage: on }
  else if (preference == GmailChanges) { ...q, gmailChanges: on } else if (preference == CalendarEdits) { ...q, calendarEdits: on }
  else if (preference == MailImages) { ...q, mailImages: on } else if (preference == BrowserMicrophone) { ...q, browserMicrophone: on }
  else { ...q, browserLocation: on }
}
pure def lawASwitchSetsItsOwnValue(p: Preferences, preference: Preference, on: bool): bool = valueOf(setPreference(p, preference, on), preference) == on
pure def sometimesLocationOff(p: Preferences): bool = not(p.agentLocation) and p.edits >= 1
```

### Preferences that cannot be read ask before every action and share nothing

An unreadable store never draws a switch as off: Ask before Alpha acts shows on and locked, and
the switches that share or load something show off and locked, until the owner resets the store.

```quint
pure def asksBefore(p: Preferences, readable: bool): bool = not(readable) or p.askBeforeActions
pure def sharesLocation(p: Preferences, readable: bool): bool = readable and p.agentLocation
pure def sharesBrowserPage(p: Preferences, readable: bool): bool = readable and p.browserPage
pure def loadsMailImages(p: Preferences, readable: bool): bool = readable and p.mailImages
pure def allowsGmailChanges(p: Preferences, readable: bool): bool = readable and p.gmailChanges
pure def allowsCalendarEdits(p: Preferences, readable: bool): bool = readable and p.calendarEdits
pure def lawUnreadableAlwaysAsks(p: Preferences): bool =
  asksBefore(p, false) and not(sharesLocation(p, false)) and not(sharesBrowserPage(p, false))
```

### The open Browser page goes with a chat turn only while Browser page for Alpha is on

While the owner chats with Browser on screen, a turn may carry the open page's address, title,
visible text and links, never a private tab or a sign-in page; hosted models can receive it. The
send reads the preference just before it, so the first turn after a start reads the saved choice,
and unreadable preferences share no page.

```quint
pure def lawBrowserPageOffSharesNothing(p: Preferences): bool = not(sharesBrowserPage({ ...p, browserPage: false }, true))
pure def sometimesBrowserPageOff(p: Preferences): bool = not(p.browserPage) and p.edits >= 1
```

### A preference an update added starts at its new-phone value, and the owner's saved choices stay

A saved record that lacks a preference reads that one from `initial` and keeps every value it holds;
a record of the wrong shape is unreadable.

```quint
pure def defaultOf(preference: Preference): bool = valueOf(initial, preference)
pure def lawTheBrowserPageStartsOn(preference: Preference): bool = preference == BrowserPage implies defaultOf(preference)
```

### The browser simulator's microphone and location work only with test mocks and the switch on

```quint
pure def sensorAllowed(p: Preferences, readable: bool, mocks: bool, microphone: bool): bool =
  mocks and readable and (if (microphone) p.browserMicrophone else p.browserLocation)
pure def lawNoSimulatedSensorWithoutTestMocks(p: Preferences, microphone: bool): bool = not(sensorAllowed(p, true, false, microphone))
```

### Recovering unreadable preferences restores the defaults, after the owner confirms

Settings offers no backup, import or export of the stored value: the reset is the recovery.

```quint
pure def resetPreferences(p: Preferences): Preferences = { ...initial, edits: p.edits + 1 }
pure def stepAResetRestoresTheDefaults(before: Preferences, via: str, after: Preferences): bool =
  via == "resetPreferences" implies { ...after, edits: 0 } == initial
```
