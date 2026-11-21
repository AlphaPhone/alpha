# AI provider

Where the agent's requests for AI go: to Alpha Cloud, under the owner's
[plan](./plan.md), or straight to Cerebras with a key the owner saved on
the phone; and the owner's own voice key, which the voice area uses. The
phone's secure store keeps the keys and checks them; this page only
knows which keys are saved, which provider is selected, and the revision
of that choice the phone last reported. A change to what the agent runs
on waits for a reply in flight to finish, holds the [agent](./index.md)
stopped first and lets it go after; the assistant says whether a turn is
in flight.

## Story: See where my requests go

> As the owner, I want to know where Alpha sends what I ask, and what it
> sends, before I choose.

### The provider is undecided, Cloud or the owner's own key, with the keys saved and the phone's revision of that choice

It holds the read of the phone's provider status, the request in flight
with its number and when it was made, the key form and the kind of key
it is for, whether a checked key waits for the owner, the review of a
choice with what it offers, whether the change waits for or holds the
agent, and what went wrong.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import outside as O from "./outside"

type Kind = TextKey | VoiceKey
type Mode = Undecided | CloudAi | OwnKey
type Offer = UseText | SaveText | UseVoice | UseCloud
type Work = Resting | CheckingKey | Waiting | Using | Selecting | Removing
type Trouble = Fine | KeyRefused | KeyUnchecked | CheckWithdrawn | NotUsed | NotSelected | NotRemoved | Interrupted | Unconfirmed
type Provider = {
  mode: Mode, text: bool, voice: bool, revision: int, report: R::Read,
  work: Work, ticket: int, since: int, form: bool, kind: Kind, candidate: bool,
  choice: V::Review, offer: Offer, removing: bool, holding: bool, trouble: Trouble,
}

pure val initial: Provider = {
  mode: Undecided, text: false, voice: false, revision: 0, report: R::unread,
  work: Resting, ticket: 0, since: 0, form: false, kind: TextKey, candidate: false,
  choice: V::unreviewed, offer: UseCloud, removing: false, holding: false, trouble: Fine,
}

pure val ticketValues = Set(1, 2, 3)
pure val revisionValues = Set(1, 2)
pure val nowValues = Set(0, 500)
pure val keyValues = Set("csk-test")
pure val weight_reported = 5
pure val weight_agentHeld = 10
```

### A key is secret, and what the page asks of the phone names the revision it was made on

The phone refuses a request made on a choice that has since changed.

```quint
type SecretKey = str
type Effect =
  ReadProvider({ check: int }) | CheckKey({ ticket: int, kind: Kind, key: SecretKey }) | DropKey({ ticket: int })
  | UseKey({ ticket: int, kind: Kind, select: bool, expected: int }) | SelectProvider({ ticket: int, mode: Mode, expected: int })
  | RemoveKey({ ticket: int, kind: Kind, expected: int }) | HoldAgent | ReleaseAgent
type Moved = { state: Provider, out: List[Effect] }
```

### A request sends the message, the conversation it continues and the context the owner allowed, to Alpha Cloud or to Cerebras, and only Cerebras ever receives the owner's key

With no provider chosen, nothing is sent. A voice key goes only to the
voice provider, with the audio of what is said. A key saved beside Cloud
is shown with what it will send once it is chosen.

```quint
type Recipient = NoOne | AlphaCloud | Cerebras | VoiceProvider
type Sends = { recipient: Recipient, conversation: bool, ownKey: bool }

pure def sends(mode: Mode): Sends =
  if (mode == CloudAi) { recipient: AlphaCloud, conversation: true, ownKey: false }
  else if (mode == OwnKey) { recipient: Cerebras, conversation: true, ownKey: true }
  else { recipient: NoOne, conversation: false, ownKey: false }

pure def shows(offer: Offer): Sends =
  if (offer == UseText or offer == SaveText) sends(OwnKey)
  else if (offer == UseCloud) sends(CloudAi)
  else { recipient: VoiceProvider, conversation: false, ownKey: true }

pure def lawOnlyCerebrasReceivesTheOwnKey(mode: Mode): bool =
  (sends(mode).ownKey implies sends(mode).recipient == Cerebras) and (sends(mode).conversation iff mode != Undecided)
    and shows(UseText) == sends(OwnKey) and shows(SaveText) == sends(OwnKey) and shows(UseCloud) == sends(CloudAi)
    and not(shows(UseVoice).conversation)
```

### The agent answers with the owner's key, with Cloud while the plan allows, or not at all

The voice area takes whether a voice key is saved, and the session
whether the owner's own key is in use.

```quint
pure def answersWith(planAllows: bool, s: Provider): Recipient =
  if (s.mode == OwnKey) Cerebras else if (s.mode == CloudAi and planAllows) AlphaCloud else NoOne

pure def ownKeyInUse(s: Provider): bool = s.mode == OwnKey

pure def voiceKey(s: Provider): bool = s.voice

pure def lawNoPlanStillAnswersWithTheOwnKey(saved: bool): bool =
  answersWith(false, { ...initial, mode: OwnKey, text: true }) == Cerebras
    and answersWith(false, { ...initial, mode: CloudAi, text: saved }) == NoOne
```

### The phone says which provider is selected and which keys are saved; only the newest asking is answered, and an answer that contradicts itself is taken as failed

A choice under review when the phone reports another revision is no
longer the one shown.

```quint
pure def canAskReport(s: Provider): bool = s.report.status != R::Loading

pure def askReport(s: Provider): Moved =
  { state: { ...s, report: R::ask(s.report) }, out: List(ReadProvider({ check: s.report.ticket + 1 })) }

pure def reread(out: List[Effect], s: Provider): Moved =
  if (canAskReport(s)) { state: askReport(s).state, out: out.concat(askReport(s).out) } else { state: s, out: out }

pure def canReported(s: Provider, ticket: int): bool = R::canAnswer(s.report, ticket)

pure def reported(s: Provider, ticket: int, ok: bool, mode: Mode, text: bool, voice: bool, revision: int): Provider =
  if (not(ok) or (mode == OwnKey and not(text)) or revision < 0) { ...s, report: R::answer(s.report, false) }
  else { ...s, report: R::answer(s.report, true), mode: mode, text: text, voice: voice, revision: revision,
    choice: if (revision != s.revision) V::revise(s.choice) else s.choice }
```

### The owner's own key is selected only while a text key is saved

```quint
pure def alwaysOwnKeyNeedsASavedKey(s: Provider): bool = s.mode == OwnKey implies s.text
```

### Where requests go, and which keys are saved, change only on the phone's word

```quint
pure def stepTheProviderChangesOnlyOnThePhonesWord(before: Provider, via: str, after: Provider): bool =
  (after.mode != before.mode or after.text != before.text or after.voice != before.voice)
    implies (via == "reported" or via == "used" or via == "selected" or via == "removed" or via == "restart" or via == "erase")
```

### Every request to the phone takes the next number, the number moves only with a request, and a change names the revision it was made on

```quint
pure def ticketed(out: List[Effect]): bool =
  out.some(e => match e {
    | CheckKey(x) => true | DropKey(x) => true | UseKey(x) => true | SelectProvider(x) => true | RemoveKey(x) => true | _ => false
  })

pure def stepEveryRequestTakesTheNextNumber(before: Provider, after: Provider, out: List[Effect]): bool =
  out.every(e => match e {
    | CheckKey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | DropKey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | UseKey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1 and x.expected == before.revision and (x.select implies x.kind == TextKey)
    | SelectProvider(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1 and x.expected == before.revision
    | RemoveKey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1 and x.expected == before.revision
    | _ => true
  }) and (ticketed(out) or after.ticket == before.ticket)
```

### What is in flight fits what the owner started, and the agent is held exactly while a change to what it runs on is carried out

```quint
pure def alwaysTheRequestFitsItsForm(s: Provider): bool = and {
  s.work == CheckingKey implies s.form,
  s.form implies not(s.choice.showing),
  s.choice.showing implies s.work == Resting,
  s.work == Waiting implies not(s.holding),
  s.work == Selecting implies s.holding,
  s.work == Using implies (s.holding iff s.offer == UseText),
  s.holding implies (s.work == Using or s.work == Selecting or s.work == Removing),
  s.removing implies (s.work == Waiting or s.work == Removing),
}
```

### A provider the phone reports can be the owner's key

```quint
pure def sometimesOwnKeySelected(s: Provider): bool = s.mode == OwnKey and s.work == Resting and s.revision > 0
```

## Story: Use my own key

> As the owner, I want to give Alpha my Cerebras key or my voice key,
> have it checked before it is used, see what it will send, and never
> lose the key I had to one that did not work.

### A key typed in the form is sent to the phone to be checked, and Back during the check withdraws it and keeps the saved key

```quint
pure def canOpenKeyForm(s: Provider, kind: Kind): bool = not(s.form) and s.work == Resting and not(s.choice.showing)

pure def openKeyForm(s: Provider, kind: Kind): Provider = { ...s, form: true, kind: kind, trouble: Fine }

pure def canCloseKeyForm(s: Provider): bool = s.form and s.work == Resting

pure def closeKeyForm(s: Provider): Provider = { ...s, form: false }

pure def canEnterKey(s: Provider): bool = s.form and s.work == Resting

pure def enterKey(s: Provider, key: SecretKey): Moved =
  { state: { ...s, work: CheckingKey, ticket: s.ticket + 1, candidate: false, trouble: Fine },
    out: List(CheckKey({ ticket: s.ticket + 1, kind: s.kind, key: key })) }

pure def canWithdrawKey(s: Provider): bool = s.work == CheckingKey

pure def withdrawKey(s: Provider): Moved =
  { state: { ...s, work: Resting, ticket: s.ticket + 1, trouble: CheckWithdrawn }, out: List(DropKey({ ticket: s.ticket + 1 })) }
```

### A key the provider accepts is kept aside and offered with what it sends; one it refuses, or that could not be checked, changes nothing

A key that could not be checked has the status read again. A text key
can be used, or, while the owner's own key is not in use, saved beside
Cloud without changing where requests go.

```quint
type Verdict = Accepted | Refused | Unchecked

pure def canKeyChecked(s: Provider, ticket: int): bool = s.work == CheckingKey and ticket == s.ticket

pure def keyChecked(s: Provider, ticket: int, verdict: Verdict): Moved =
  if (verdict == Accepted)
    { state: { ...s, work: Resting, form: false, candidate: true, offer: if (s.kind == TextKey) UseText else UseVoice,
        choice: V::present(s.choice), trouble: Fine }, out: List() }
  else if (verdict == Refused) { state: { ...s, work: Resting, trouble: KeyRefused }, out: List() }
  else reread(List(), { ...s, work: Resting, trouble: KeyUnchecked })

pure def canSaveOnly(s: Provider): bool =
  s.candidate and s.choice.showing and s.offer == UseText and s.mode != OwnKey and s.work == Resting

pure def saveOnly(s: Provider): Provider = { ...s, offer: SaveText, choice: V::present(V::revise(s.choice)) }

pure def stepCheckingAKeyChangesNoKey(before: Provider, via: str, after: Provider): bool =
  (via == "keyChecked" or via == "withdrawKey" or via == "enterKey")
    implies (after.mode == before.mode and after.text == before.text and after.voice == before.voice and after.revision == before.revision)
```

### A key is used only after the owner saw what it sends and confirmed it, and only the phone's report selects it otherwise

```quint
pure def stepOwnKeyIsSelectedOnlyAfterItsDisclosure(before: Provider, via: str, after: Provider): bool =
  (after.mode == OwnKey and before.mode != OwnKey and via != "reported")
    implies (before.holding and before.offer == UseText and (before.work == Using or before.work == Selecting))

pure def alwaysAKeyIsUsedOnlyAsOffered(s: Provider): bool =
  (s.work == Using implies (s.candidate and ((s.offer == UseText or s.offer == SaveText) iff s.kind == TextKey) and s.offer != UseCloud))
    and (s.work == Selecting implies (s.offer == UseText or s.offer == UseCloud))
```

### A key can be refused while another stays saved

```quint
pure def sometimesARefusedKeyKeepsTheOldOne(s: Provider): bool = s.trouble == KeyRefused and s.text
```

### A key that could not be checked has the status read again

```quint
pure def sometimesKeyUnchecked(s: Provider): bool = s.trouble == KeyUnchecked and s.report.status == R::Loading
```

### A checked key can wait for the owner, showing what it will send

```quint
pure def sometimesANewKeyAwaitsItsDisclosure(s: Provider): bool = s.candidate and s.choice.showing and s.offer == UseText and s.text
```

### A key check can be withdrawn

```quint
pure def sometimesAKeyCheckWithdrawn(s: Provider): bool = s.trouble == CheckWithdrawn and s.form
```

### A voice key can be saved beside Cloud

```quint
pure def sometimesAVoiceKeyBesideCloud(s: Provider): bool = s.voice and s.mode == CloudAi and s.work == Resting
```

### A text key can be replaced beside Cloud without stopping the agent

```quint
pure def sometimesAKeyReplacedBesideCloud(s: Provider): bool = s.text and s.mode == CloudAi and s.offer == SaveText and s.work == Resting and s.revision > 0
```

## Story: Choose Cloud or my key

> As the owner, I want to switch between Cloud and my own key after
> seeing what each sends, and to remove a key without Alpha quietly
> sending my requests elsewhere.

### Choosing shows what that provider sends, from Account or from the assistant's card, and only a choice the owner confirmed for the provider as it is now is carried out

```quint
pure def canOffer(s: Provider, what: Offer, origin: O::Origin): bool =
  s.work == Resting and not(s.form) and not(s.choice.showing) and s.report.status == R::Loaded and O::opens(origin)
    and (if (what == UseCloud) s.mode != CloudAi else if (what == UseText) s.text and s.mode != OwnKey else false)

pure def offer(s: Provider, what: Offer, origin: O::Origin): Provider = { ...s, offer: what, candidate: false, choice: V::present(s.choice), trouble: Fine }

pure def canDecline(s: Provider): bool = s.choice.showing

pure def decline(s: Provider): Provider = { ...s, choice: V::dismiss(s.choice), candidate: false }
```

### A confirmed change to what the agent runs on waits for a reply in flight, then holds the agent; a voice key, or a text key saved beside Cloud, is used at once

```quint
pure def affectsAgent(offer: Offer): bool = offer == UseText or offer == UseCloud

pure def canChoose(s: Provider, busy: bool, origin: O::Origin, now: int): bool =
  V::canConfirm(s.choice) and s.work == Resting and O::acts(origin) and not(busy and affectsAgent(s.offer))

pure def choose(s: Provider, busy: bool, origin: O::Origin, now: int): Moved =
  val kind = if (s.offer == UseVoice) VoiceKey else TextKey
  if (affectsAgent(s.offer)) { state: { ...s, choice: V::confirm(s.choice), work: Waiting, removing: false, since: now }, out: List(HoldAgent) }
  else { state: { ...s, choice: V::confirm(s.choice), work: Using, kind: kind, ticket: s.ticket + 1, since: now },
    out: List(UseKey({ ticket: s.ticket + 1, kind: kind, select: false, expected: s.revision })) }

pure def lawAChangeWaitsForAReplyInFlight(offer: Offer): bool =
  val reviewing = { ...initial, offer: offer, choice: { showing: true, revision: 0, shown: 0 } }
  (canChoose(reviewing, true, O::ByOwner, 0) iff not(affectsAgent(offer))) and not(canChoose(reviewing, false, O::ByCard, 0))

pure def stepSavingAKeyNotInUseNeverHoldsTheAgent(before: Provider, via: str, after: Provider, out: List[Effect]): bool =
  (via == "choose" and not(affectsAgent(before.offer))) implies not(out.some(e => match e { | HoldAgent => true | _ => false }))

pure def stepEveryChangeFollowsAConfirmedChoice(before: Provider, via: str, after: Provider, out: List[Effect]): bool =
  ((after.work == Waiting or after.work == Using) and before.work != after.work and before.work != Waiting)
    implies ((via == "choose" and V::canConfirm(before.choice)) or (via == "removeKey" and after.removing))
```

### Once the agent is held, the phone uses the key, selects the provider, or removes the key in use, on the revision shown

The owner can back out while the agent is being stopped, and it is then
let go.

```quint
pure def canAgentHeld(s: Provider): bool = s.work == Waiting

pure def agentHeld(s: Provider, now: int): Moved =
  val h = { ...s, holding: true, ticket: s.ticket + 1, since: now }
  if (s.removing) { state: { ...h, work: Removing }, out: List(RemoveKey({ ticket: s.ticket + 1, kind: TextKey, expected: s.revision })) }
  else if (s.offer == UseText and s.candidate)
    { state: { ...h, work: Using, kind: TextKey }, out: List(UseKey({ ticket: s.ticket + 1, kind: TextKey, select: true, expected: s.revision })) }
  else { state: { ...h, work: Selecting }, out: List(SelectProvider({ ticket: s.ticket + 1, mode: if (s.offer == UseText) OwnKey else CloudAi, expected: s.revision })) }

pure def canStopWaiting(s: Provider): bool = s.work == Waiting

pure def stopWaiting(s: Provider): Moved = { state: { ...s, work: Resting, removing: false, candidate: false }, out: List(ReleaseAgent) }

pure def stepAChangeToWhatTheAgentRunsOnWaitsForIt(before: Provider, via: str, after: Provider, out: List[Effect]): bool =
  out.every(e => match e {
    | SelectProvider(x) => via == "agentHeld"
    | UseKey(x) => x.select implies via == "agentHeld"
    | RemoveKey(x) => (x.kind == TextKey and before.mode == OwnKey) implies via == "agentHeld"
    | _ => true
  })
```

### The phone's answer ends the change and lets the agent go; a refusal, or a selection of a key no longer saved, has the status read again

```quint
pure def letGo(s: Provider): List[Effect] = if (s.holding) List(ReleaseAgent) else List()

pure def canUsed(s: Provider, ticket: int): bool = s.work == Using and ticket == s.ticket

pure def used(s: Provider, ticket: int, ok: bool, revision: int): Moved =
  val done = { ...s, work: Resting, holding: false, candidate: false }
  if (ok and s.kind == TextKey) { state: { ...done, text: true, mode: if (s.offer == UseText) OwnKey else s.mode, revision: revision }, out: letGo(s) }
  else if (ok) { state: { ...done, voice: true, revision: revision }, out: letGo(s) }
  else reread(letGo(s), { ...done, trouble: NotUsed })

pure def canSelected(s: Provider, ticket: int): bool = s.work == Selecting and ticket == s.ticket

pure def selected(s: Provider, ticket: int, ok: bool, revision: int): Moved =
  val done = { ...s, work: Resting, holding: false }
  if (ok and (s.offer != UseText or s.text)) { state: { ...done, mode: if (s.offer == UseText) OwnKey else CloudAi, revision: revision }, out: letGo(s) }
  else reread(letGo(s), { ...done, trouble: NotSelected })

pure def stepTheAgentIsLetGoWhenTheChangeEnds(before: Provider, via: str, after: Provider, out: List[Effect]): bool =
  (before.holding and not(after.holding) and via != "restart" and via != "erase") implies out.some(e => match e { | ReleaseAgent => true | _ => false })

pure def stepTheAgentIsHeldOnlyOnItsWord(before: Provider, via: str, after: Provider): bool =
  (after.holding and not(before.holding)) implies via == "agentHeld"
```

### Removing a key leaves no provider chosen rather than switching to Cloud, removing the key in use waits for a reply in flight and holds the agent, and a removal the phone could not confirm keeps the key

```quint
pure def saved(s: Provider, kind: Kind): bool = if (kind == TextKey) s.text else s.voice

pure def inUse(s: Provider, kind: Kind): bool = kind == TextKey and s.mode == OwnKey

pure def canRemoveKey(s: Provider, kind: Kind, busy: bool, origin: O::Origin, now: int): bool =
  saved(s, kind) and s.work == Resting and not(s.form) and not(s.choice.showing) and O::acts(origin) and not(busy and inUse(s, kind))

pure def removeKey(s: Provider, kind: Kind, busy: bool, origin: O::Origin, now: int): Moved =
  if (inUse(s, kind)) { state: { ...s, work: Waiting, removing: true, kind: TextKey, trouble: Fine, since: now }, out: List(HoldAgent) }
  else { state: { ...s, work: Removing, kind: kind, ticket: s.ticket + 1, trouble: Fine, since: now },
    out: List(RemoveKey({ ticket: s.ticket + 1, kind: kind, expected: s.revision })) }

pure def canRemoved(s: Provider, ticket: int): bool = s.work == Removing and ticket == s.ticket

pure def removed(s: Provider, ticket: int, ok: bool, revision: int): Moved =
  val done = { ...s, work: Resting, holding: false, removing: false }
  if (ok and s.kind == TextKey)
    { state: { ...done, text: false, mode: if (s.mode == OwnKey) Undecided else s.mode, revision: revision }, out: letGo(s) }
  else if (ok) { state: { ...done, voice: false, revision: revision }, out: letGo(s) }
  else reread(letGo(s), { ...done, trouble: NotRemoved })

pure def stepRemovingTheKeyNeverSwitchesToCloud(before: Provider, via: str, after: Provider): bool =
  via == "removed" implies (after.mode == before.mode or after.mode == Undecided)
```

### A change the agent or the phone never answers is given up after two minutes: the agent is let go and the status read again

A clock that went back gives it up too.

```quint
pure val holdLimit = 120

pure def canGiveUp(s: Provider, now: int): bool =
  (s.work == Waiting or s.work == Using or s.work == Selecting or s.work == Removing) and (now < s.since or now - s.since >= holdLimit)

pure def giveUp(s: Provider, now: int): Moved =
  reread(letGo(s), { ...s, work: Resting, holding: false, removing: false, candidate: false, trouble: Unconfirmed })
```

### The agent is always let go in the end

```quint
pure def leadsToTheAgentIsLetGo(s: Provider, later: Provider): bool =
  (s.holding or s.work == Waiting) implies (not(later.holding) and later.work != Waiting)

pure val fair_giveUp = "weak"
```

### A change can be given up and the status read again

```quint
pure def sometimesAChangeIsGivenUp(s: Provider): bool = s.trouble == Unconfirmed and s.report.status == R::Loading
```

### Cloud can be chosen after seeing what it sends

```quint
pure def sometimesCloudChosen(s: Provider): bool = s.mode == CloudAi and s.offer == UseCloud and s.work == Resting and s.text
```

### A change can wait for the agent to stop

```quint
pure def sometimesWaitingForTheAgent(s: Provider): bool = s.work == Waiting and s.offer == UseText and s.candidate
```

### A choice can be refused for an older revision

```quint
pure def sometimesAChoiceIsRefused(s: Provider): bool = s.trouble == NotSelected and s.report.status == R::Loading
```

### The key in use can be removed while the agent is held, leaving no provider chosen

```quint
pure def sometimesARemovalHoldsTheAgent(s: Provider): bool = s.work == Removing and s.holding

pure def sometimesKeyRemoved(s: Provider): bool = s.mode == Undecided and not(s.text) and s.revision > 0 and s.report.status == R::Loaded
```

### A removal can fail and keep the key

```quint
pure def sometimesNotRemoved(s: Provider): bool = s.trouble == NotRemoved and s.text
```

## Story: Restart or erase

> As the owner, I want Alpha after a restart to show only what the phone
> reports, and to know nothing of my keys after erasing it.

### After a restart the provider is undecided until the phone reports it, and a change cut short is said so

The agent is reopened with Alpha, so no hold survives.

```quint
pure def cleared(trouble: Trouble, s: Provider): Provider =
  { ...s, trouble: trouble, mode: Undecided, text: false, voice: false, work: Resting, form: false, candidate: false,
    choice: V::dismiss(V::revise(s.choice)), removing: false, holding: false, report: O::retire(s.report) }

pure def restart(s: Provider): Moved =
  askReport(cleared(if (s.work == Resting) Fine else Interrupted, s))
```

### A change cut short by a restart is said so

```quint
pure def sometimesInterruptedByARestart(s: Provider): bool = s.trouble == Interrupted and s.report.status == R::Loading
```

### Erasing Alpha leaves no key and no provider, and refuses every answer still in flight

```quint
pure def erase(s: Provider): Provider = cleared(Fine, s)

pure def stepErasingLeavesNoKey(before: Provider, via: str, after: Provider): bool =
  via == "erase" implies (not(after.text) and not(after.voice) and after.mode == Undecided and after.work == Resting)
```
