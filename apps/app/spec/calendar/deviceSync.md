# Syncing the phone's calendar with Google

On the phone, the owner may link Alpha's own device calendar with one Google calendar they chose,
through Eliza Cloud's `calendar/sync-v1` protocol. Upstream `@elizaos/plugin-calendar/linked-sync`
owns the host: its review, enable, pause and reconciliation passes, the opt-in it saves and the
foreground generation a pass belongs to (`spec/calendar/syncSettlement.md`,
`linkedReconcile.md`). [Device sync consent](./nativeSync.md) owns Android's own consent dialog and
[the local port](./linkedLocal.md) every local change. This file states what Alpha adds: which
account, agent and Google calendar a pass is for, where its checkpoints are kept, and which
calendars the owner may choose. A library.

## Story: Sync my phone's calendar only with the Google calendar I chose, for the account I use

> As the owner, I want my phone's calendar to sync only with the Google calendar I picked for the
> account and agent I am signed in with, only while Alpha is in front, and never into another
> account's calendar after I switch.

### A pass is prepared only for a signed-in production Cloud account with an agent and a chosen Google calendar

Device sync never uses a staging Cloud. A browser build has no device calendar and offers none.

```quint
pure def deviceSyncReady(signedIn: bool, production: bool, agent: bool, chosen: bool, phone: bool): bool =
  phone and signedIn and production and agent and chosen
pure val signedInValues = Set(true, false)
pure val productionValues = Set(true, false)
pure val agentValues = Set(true, false)
pure val chosenValues = Set(true, false)
pure val phoneValues = Set(true, false)
pure def lawStagingNeverSyncs(signedIn: bool, agent: bool, chosen: bool): bool = not(deviceSyncReady(signedIn, false, agent, chosen, true))
pure def lawNoChoiceNeverSyncs(signedIn: bool, production: bool, agent: bool): bool = not(deviceSyncReady(signedIn, production, agent, false, true))
pure def lawTheBrowserNeverSyncs(signedIn: bool, production: bool, agent: bool, chosen: bool): bool = not(deviceSyncReady(signedIn, production, agent, chosen, false))
```

### The phone's prepared binding must name exactly the account, organization, agent, connection and calendar chosen

A binding the phone prepared for any other account, agent, Google connection or calendar enables
nothing and says the bindings differ.

```quint
pure def bindingAgrees(environment: bool, user: bool, organization: bool, agent: bool, connection: bool, calendar: bool): bool =
  environment and user and organization and agent and connection and calendar
pure val environmentValues = Set(true, false)
pure val userValues = Set(true, false)
pure val organizationValues = Set(true, false)
pure val connectionValues = Set(true, false)
pure val calendarValues = Set(true, false)
pure def lawAnotherAgentNeverAgrees(environment: bool, user: bool, organization: bool, connection: bool, calendar: bool): bool =
  not(bindingAgrees(environment, user, organization, false, connection, calendar))
```

### A pass belongs to the identity it was prepared under; a changed account, key, Cloud session, choice or agent session retires it

The identity is the Cloud environment, user, organization, the key's credential, the account's
sign-in generation, the chosen Google calendar, the agent and its session. While any part is
missing the identity is empty and nothing is current.

```quint
pure def passCurrent(signalOpen: bool, inFront: bool, sameIdentity: bool, identityKnown: bool): bool =
  signalOpen and inFront and sameIdentity and identityKnown
pure val signalOpenValues = Set(true, false)
pure val inFrontValues = Set(true, false)
pure val sameIdentityValues = Set(true, false)
pure val identityKnownValues = Set(true, false)
pure def lawAHiddenPhoneHasNoCurrentPass(signalOpen: bool, sameIdentity: bool, identityKnown: bool): bool =
  not(passCurrent(signalOpen, false, sameIdentity, identityKnown))
pure def lawAnotherIdentityHasNoCurrentPass(signalOpen: bool, inFront: bool, identityKnown: bool): bool =
  not(passCurrent(signalOpen, inFront, false, identityKnown))
```

### The owner may choose only a calendar it can write, of a Google account that granted Calendar changes

The choice is kept per Cloud account; a choice made for another account is never read. A choice
the earlier Alpha kept for this account is carried over once.

```quint
pure def destinationOffered(connected: bool, writeGranted: bool, writable: bool): bool = connected and writeGranted and writable
pure val connectedValues = Set(true, false)
pure val writeGrantedValues = Set(true, false)
pure val writableValues = Set(true, false)
pure def lawAReadOnlyCalendarIsNeverOffered(connected: bool, writeGranted: bool): bool = not(destinationOffered(connected, writeGranted, false))
pure def lawNoCalendarWithoutTheWriteGrant(connected: bool, writable: bool): bool = not(destinationOffered(connected, false, writable))
```

### Checkpoints are kept only in the encrypted slot of their own name, never above 4 MiB

On the phone the opt-in and each link document are kept in the secure store's slot
`calendar-linked-sync:v1:<sha256>`, written only by compare and exchange on the value read; what
the earlier Alpha kept in its own encrypted slot of that name is carried over before the first read.
A browser keeps them in its private storage under the same name.

```quint
pure val checkpointLimit = 4194304
pure def checkpointKept(slotNamed: bool, bytes: int, matches: bool): bool = slotNamed and bytes <= checkpointLimit and matches
pure val slotNamedValues = Set(true, false)
pure val bytesValues = Set(0, 4194304, 4194305)
pure val matchesValues = Set(true, false)
pure def lawAnOversizedCheckpointIsRefused(slotNamed: bool, matches: bool): bool = not(checkpointKept(slotNamed, checkpointLimit + 1, matches))
pure def lawAStaleExchangeKeepsWhatIsThere(slotNamed: bool, bytes: int): bool = not(checkpointKept(slotNamed, bytes, false))
```
