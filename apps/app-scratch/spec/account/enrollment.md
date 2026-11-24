# Device enrollment

The phone's enrollment with its resident agent, which lets the agent offer device proposals to this
phone and lets the phone read, claim and receipt them. Each time the resident verifies a connection,
the phone registers under its own device key through `POST /api/client-devices/register`, carrying
`x-eliza-device-id` (the agent id the connection verified, which upstream's enrollment names as the
installation), `x-eliza-device-key` (the phone's own key) and `x-eliza-device-capabilities` as
device headers of the platform's `Resident.json` (spec/platform/index.md, "A request carries only
the device headers the resident reads, each one bounded line"). The agent answers the installation,
an enrollment id, the capabilities it offers and its enabled-view profile version; the phone agrees
its enabled views, keeps the enrollment id beside the key, and on the phone reads the committed
`GET /api/client-devices/context` back before anything uses it. The upstream routes are
`@elizaos/agent`'s device enrollment (`src/device-actions/enrollment.vibe`).

The device key is 32 random bytes as 64 lowercase hex characters, kept in the native secure store
(`ElizaSecureStore`) in the slot `device:<scope>`, where the scope is the SHA-256 of the JSON
`[origin, owner, agent]` that the earlier Alpha used, so a key the earlier Alpha kept in its
`AlphaConnection` slot of that name is adopted first (spec/platform/storage.md). The key leaves the
slot only as its own header; it is never stored elsewhere, logged or shown.

## Story: Let my agent act on my phone once it knows this phone

> As the owner, I want my phone enrolled with my agent under its own key each time my agent
> connects, so that my agent's proposals reach this phone and only this phone, and chat keeps
> working whenever enrollment cannot finish.

### Each connection enrolls once, and a result for an earlier connection changes nothing

A verified connection starts one enrollment. Every answer names the connection it was asked for;
an answer for a connection that has since been replaced is dropped. A lost connection leaves the
phone unenrolled until the next one is verified.

```quint
type EnrollPhase = Unenrolled | Registering | Negotiating | Committing | Enrolled | ChatOnly
type EnrollEffect = Register({ protocol: int }) | NegotiateViews | CommitEnrollment
type Enrollment = { phase: EnrollPhase, connection: int, protocol: int, stepDowns: int, enrollments: int, failures: int }
type EnrollStep = { state: Enrollment, out: List[EnrollEffect] }
pure val initial: Enrollment = { phase: Unenrolled, connection: 0, protocol: 0, stepDowns: 0, enrollments: 0, failures: 0 }
pure val connectionValues = Set(1, 2, 3)
pure val ofConnectionValues = Set(1, 2, 3)
pure def inFlight(p: EnrollPhase): bool = p == Registering or p == Negotiating or p == Committing
pure def canConnect(e: Enrollment, connection: int, presentation: bool): bool = connection > e.connection
pure def connect(e: Enrollment, connection: int, presentation: bool): EnrollStep = {
  val protocol = preferredProtocol(presentation)
  { state: { ...e, phase: Registering, connection: connection, protocol: protocol, stepDowns: 0 }, out: List(Register({ protocol: protocol })) }
}
pure def canDisconnect(e: Enrollment): bool = e.phase != Unenrolled
pure def disconnect(e: Enrollment): Enrollment = { ...e, phase: Unenrolled }
pure def canFailed(e: Enrollment, ofConnection: int): bool = inFlight(e.phase) and ofConnection == e.connection
pure def failed(e: Enrollment, ofConnection: int): Enrollment = { ...e, phase: ChatOnly, failures: e.failures + 1 }
pure def alwaysNothingEnrollsBeforeAConnection(e: Enrollment): bool = e.connection == 0 implies e.phase == Unenrolled
pure def stepAConnectionNeverGoesBack(before: Enrollment, after: Enrollment): bool = after.connection >= before.connection
pure def stepOnlyANewConnectionRegisters(before: Enrollment, via: str, after: Enrollment): bool =
  (via == "connect") implies (after.connection > before.connection and after.phase == Registering)
pure def sometimesChatOnly(e: Enrollment): bool = e.phase == ChatOnly and e.failures >= 1
```

### The workflow protocol starts at what the phone can present and steps down only on a 409, never below 2

A phone whose notifications and voice both present workflow results (`workflowPresentationCapabilities`
answers protocol 2, probed once more when the first probe stalls past two seconds, and always off the
phone) registers with protocol 5, which verifies a Calendar range against a workflow's persisted run
time; any other phone registers with protocol 1. A 409 for the protocol lets the same device try the
next older one, down to 2; any other refusal ends the enrollment.

```quint
pure val calendarAnchorProtocol = 5
pure def preferredProtocol(presentation: bool): int = if (presentation) calendarAnchorProtocol else 1
pure def olderProtocol(protocol: int): int = if (protocol == 5) 4 else if (protocol == 4) 3 else if (protocol == 3) 2 else 0
pure val protocolValues = Set(0, 1, 2, 3, 4, 5, 6)
pure def lawAStepDownIsOneAndNeverBelowTwo(protocol: int): bool =
  olderProtocol(protocol) == 0 or (olderProtocol(protocol) == protocol - 1 and olderProtocol(protocol) >= 2)
pure def canProtocolRefused(e: Enrollment, ofConnection: int): bool =
  e.phase == Registering and ofConnection == e.connection and olderProtocol(e.protocol) != 0
pure def protocolRefused(e: Enrollment, ofConnection: int): EnrollStep = {
  val fallback = olderProtocol(e.protocol)
  { state: { ...e, protocol: fallback, stepDowns: e.stepDowns + 1 }, out: List(Register({ protocol: fallback })) }
}
pure def alwaysARegisteringProtocolIsKnown(e: Enrollment): bool = inFlight(e.phase) implies (e.protocol >= 1 and e.protocol <= calendarAnchorProtocol)
pure def stepTheProtocolOnlyFalls(before: Enrollment, via: str, after: Enrollment): bool =
  (via != "connect" and after.connection == before.connection) implies after.protocol <= before.protocol
pure def sometimesSteppedDown(e: Enrollment): bool = e.stepDowns >= 1 and e.phase == Enrolled
```

### A registration is used only when it names the connected agent as the installation

The answer must name the agent the connection verified as its installation and an enrollment id of 1
to 128 letters, digits, underscores and hyphens starting with a letter or digit, and offer view
profile version 1 or none. An agent that offers a view profile has the phone's enabled views agreed
next; one that offers none keeps the phone's own view checks.

```quint
pure def registrationVerified(installationIsAgent: bool, enrollmentWellFormed: bool, viewVersion: int): bool =
  installationIsAgent and enrollmentWellFormed and (viewVersion == 0 or viewVersion == 1)
pure val viewVersionValues = Set(0, 1, 2)
pure def lawAnotherInstallationIsNeverUsed(enrollmentWellFormed: bool, viewVersion: int): bool =
  not(registrationVerified(false, enrollmentWellFormed, viewVersion))
pure def lawAnUnknownViewProfileIsRefused(installationIsAgent: bool, enrollmentWellFormed: bool): bool =
  not(registrationVerified(installationIsAgent, enrollmentWellFormed, 2))
pure def canRegistered(e: Enrollment, ofConnection: int, viewProfile: bool): bool = e.phase == Registering and ofConnection == e.connection
pure def registered(e: Enrollment, ofConnection: int, viewProfile: bool): EnrollStep =
  if (viewProfile) { state: { ...e, phase: Negotiating }, out: List(NegotiateViews) }
  else { state: { ...e, phase: Committing }, out: List(CommitEnrollment) }
```

### The enabled views are agreed against the profile revision the phone read

The phone reads `GET /api/client-devices/view-profile`, and wants the agent's supported views that
Alpha enables: Home, Reminders, Inbox, Calendar, Browser, Camera, Photos, Maps, Notes, Files,
Workflows and Settings, with Phone, Messages and Contacts only on the Alpha image. A profile that
already holds exactly those views is kept. Otherwise the phone writes them once with the revision it
read (none for no profile); the write is confirmed only when the answer holds exactly those views
under a new revision. A write is never retried.

```quint
pure val enabledViews: Set[str] = Set("home", "reminders", "inbox", "calendar", "browser", "camera", "photos", "maps", "notes", "files", "workflows", "settings")
pure val imageViews: Set[str] = Set("phone", "messages", "contacts")
pure def viewChangeConfirmed(hadProfile: bool, sameViews: bool, revisionAdvanced: bool): bool =
  sameViews and (not(hadProfile) or revisionAdvanced)
pure def lawAnUnchangedRevisionIsNotConfirmed(sameViews: bool): bool = not(viewChangeConfirmed(true, sameViews, false))
pure def lawOtherViewsAreNotConfirmed(hadProfile: bool, revisionAdvanced: bool): bool = not(viewChangeConfirmed(hadProfile, false, revisionAdvanced))
pure def canViewsSettled(e: Enrollment, ofConnection: int, confirmed: bool): bool = e.phase == Negotiating and ofConnection == e.connection
pure def viewsSettled(e: Enrollment, ofConnection: int, confirmed: bool): EnrollStep =
  if (confirmed) { state: { ...e, phase: Committing }, out: List(CommitEnrollment) }
  else { state: { ...e, phase: ChatOnly, failures: e.failures + 1 }, out: List() }
```

### Only an enrollment the agent's own context confirmed is used, and anything else leaves chat only

The enrollment id is saved beside the key first. On the phone the committed context must name the
same agent, the same installation, the same enrollment and, as its subject, the owner the connection
verified or the signed-in Cloud account. Only then does the phone carry its device headers on
requests and name its installation and enrollment to the assistant; a phone that is chat only names
neither, and the conversation goes on.

```quint
pure def contextConfirmed(sameAgent: bool, sameInstallation: bool, sameEnrollment: bool, ownSubject: bool): bool =
  sameAgent and sameInstallation and sameEnrollment and ownSubject
pure def lawAnotherOwnersContextIsNeverUsed(sameAgent: bool, sameInstallation: bool, sameEnrollment: bool): bool =
  not(contextConfirmed(sameAgent, sameInstallation, sameEnrollment, false))
pure def canCommitted(e: Enrollment, ofConnection: int, matched: bool): bool = e.phase == Committing and ofConnection == e.connection
pure def committed(e: Enrollment, ofConnection: int, matched: bool): Enrollment =
  if (matched) { ...e, phase: Enrolled, enrollments: e.enrollments + 1 } else { ...e, phase: ChatOnly, failures: e.failures + 1 }
pure def stepOnlyTheContextEnrolls(before: Enrollment, via: str, after: Enrollment): bool =
  (after.phase == Enrolled and before.phase != Enrolled) implies via == "committed"
pure def alwaysAnEnrolledPhoneHasAProtocol(e: Enrollment): bool = e.phase == Enrolled implies (e.protocol >= 1 and e.enrollments >= 1)
pure def sometimesEnrolled(e: Enrollment): bool = e.phase == Enrolled
pure def sometimesReenrolled(e: Enrollment): bool = e.phase == Enrolled and e.enrollments >= 2
```
