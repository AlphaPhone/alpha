# AI provider

Where the agent's requests for AI go: to Alpha Cloud, under the owner's
[plan](./plan.md), or straight to Cerebras with a key the owner saved on
the phone. The phone's secure store keeps the key and checks it; this
page only knows whether one is saved, which provider is selected, and
the revision of that choice the phone last reported. Replacing the
provider stops the agent first ([Account](./index.md), "Change what the
agent runs on").

## Story: See where my requests go

> As the owner, I want to know where Alpha sends what I ask, and what it
> sends, before I choose.

### The provider is undecided, Cloud or the owner's own key, with the phone's revision of that choice

It holds whether a key is saved, the read of the phone's provider status,
the request in flight with its number, whether the key form is open, the
review of a choice with the provider it offers, and what went wrong.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"

type Mode = Undecided | CloudAi | OwnKey
type Work = Resting | CheckingKey | Selecting | Removing
type Trouble = Fine | KeyRefused | KeyUnchecked | NotSelected | NotRemoved
type Provider = {
  mode: Mode, saved: bool, revision: int, report: R::Read,
  work: Work, ticket: int, form: bool, choice: V::Review, offer: Mode, trouble: Trouble,
}

pure val initial: Provider = {
  mode: Undecided, saved: false, revision: 0, report: R::unread,
  work: Resting, ticket: 0, form: false, choice: V::unreviewed, offer: Undecided, trouble: Fine,
}

pure val ticketValues = Set(1, 2, 3)
pure val revisionValues = Set(1, 2)
pure val keyValues = Set("csk-test")
pure val weight_reported = 5
```

### A key is secret, and what the page asks of the phone is a status read, a key to check, a choice, or a removal

Each names the revision it was made on, so the phone refuses one made on
a choice that has since changed.

```quint
type SecretKey = str
type Effect = ReadProvider({ check: int }) | CheckKey({ ticket: int, key: SecretKey, expected: int }) | SelectProvider({ ticket: int, mode: Mode, expected: int }) | RemoveKey({ ticket: int, expected: int })
type Moved = { state: Provider, out: List[Effect] }
```

### A request sends the message, the conversation it continues and the context the owner allowed, to Alpha Cloud or to Cerebras, and only Cerebras ever receives the owner's key

With no provider chosen, nothing is sent.

```quint
type Recipient = NoOne | AlphaCloud | Cerebras
type Sends = { recipient: Recipient, conversation: bool, ownKey: bool }

pure def sends(mode: Mode): Sends =
  if (mode == CloudAi) { recipient: AlphaCloud, conversation: true, ownKey: false }
  else if (mode == OwnKey) { recipient: Cerebras, conversation: true, ownKey: true }
  else { recipient: NoOne, conversation: false, ownKey: false }

pure def lawOnlyCerebrasReceivesTheOwnKey(mode: Mode): bool =
  (sends(mode).ownKey implies sends(mode).recipient == Cerebras) and (sends(mode).conversation iff mode != Undecided)
```

### The agent answers with the owner's key, with Cloud while the plan allows, or not at all

```quint
pure def answersWith(planAllows: bool, s: Provider): Recipient =
  if (s.mode == OwnKey) Cerebras else if (s.mode == CloudAi and planAllows) AlphaCloud else NoOne

pure def lawNoPlanStillAnswersWithTheOwnKey(saved: bool): bool =
  answersWith(false, { ...initial, mode: OwnKey, saved: true }) == Cerebras
    and answersWith(false, { ...initial, mode: CloudAi, saved: saved }) == NoOne
```

### The phone says which provider is selected; only the newest asking is answered

A choice under review when the phone reports another revision is no
longer the one shown.

```quint
pure def canAskReport(s: Provider): bool = s.report.status != R::Loading

pure def askReport(s: Provider): Moved =
  { state: { ...s, report: R::ask(s.report) }, out: List(ReadProvider({ check: s.report.ticket + 1 })) }

pure def canReported(s: Provider, ticket: int, mode: Mode, saved: bool, revision: int): bool =
  R::canAnswer(s.report, ticket) and (mode == OwnKey implies saved)

pure def reported(s: Provider, ticket: int, ok: bool, mode: Mode, saved: bool, revision: int): Provider =
  if (not(ok)) { ...s, report: R::answer(s.report, false) }
  else { ...s, report: R::answer(s.report, true), mode: mode, saved: saved, revision: revision,
    choice: if (revision != s.revision) V::revise(s.choice) else s.choice }
```

### The owner's own key is selected only while one is saved

```quint
pure def alwaysOwnKeyNeedsASavedKey(s: Provider): bool = s.mode == OwnKey implies s.saved
```

### Where requests go changes only on the phone's word

```quint
pure def stepTheProviderChangesOnlyOnThePhonesWord(before: Provider, via: str, after: Provider): bool =
  (after.mode != before.mode or after.saved != before.saved)
    implies (via == "reported" or via == "keyChecked" or via == "selected" or via == "removed")
```

### Every request to the phone takes the next number and names the revision it was made on

```quint
pure def stepEveryRequestTakesTheNextNumber(before: Provider, after: Provider, out: List[Effect]): bool =
  after.ticket >= before.ticket and out.every(e => match e {
    | CheckKey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1 and x.expected == before.revision
    | SelectProvider(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1 and x.expected == before.revision
    | RemoveKey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1 and x.expected == before.revision
    | _ => true
  })
```

### What is in flight fits what the owner started

```quint
pure def alwaysTheRequestFitsItsForm(s: Provider): bool = and {
  s.work == CheckingKey implies s.form,
  s.work == Selecting implies s.offer != Undecided,
  s.choice.showing implies (s.offer != Undecided and s.work == Resting),
}
```

### The key form and a choice under review are never open at once

Discovered by the proof: without it, a key sent from the form could
leave a choice showing while the key is being checked.

```quint
pure def alwaysOneFormAtATime(s: Provider): bool = s.form implies not(s.choice.showing)
```

### A provider the phone reports can be the owner's key

```quint
pure def sometimesOwnKeySelected(s: Provider): bool = s.mode == OwnKey and s.work == Resting and s.revision > 0
```

## Story: Use my own key

> As the owner, I want to give Alpha my Cerebras key, have it checked
> before it is used, and never lose the key I had to one that did not
> work.

### The key form shows what a request sends to Cerebras, and a key typed there is sent to the phone to be checked

```quint
pure def canOpenKeyForm(s: Provider): bool = not(s.form) and s.work == Resting

pure def openKeyForm(s: Provider): Provider = { ...s, form: true, trouble: Fine, choice: V::dismiss(s.choice) }

pure def canCloseKeyForm(s: Provider): bool = s.form and s.work == Resting

pure def closeKeyForm(s: Provider): Provider = { ...s, form: false }

pure def canEnterKey(s: Provider): bool = s.form and s.work == Resting

pure def enterKey(s: Provider, key: SecretKey): Moved =
  { state: { ...s, work: CheckingKey, ticket: s.ticket + 1, trouble: Fine },
    out: List(CheckKey({ ticket: s.ticket + 1, key: key, expected: s.revision })) }
```

### A key Cerebras accepts is saved and selected; one it refuses, or that could not be checked, changes nothing

```quint
type Verdict = Accepted | Refused | Unchecked

pure def canKeyChecked(s: Provider, ticket: int): bool = s.work == CheckingKey and ticket == s.ticket

pure def keyChecked(s: Provider, ticket: int, verdict: Verdict, revision: int): Provider =
  if (verdict == Accepted) { ...s, work: Resting, form: false, saved: true, mode: OwnKey, revision: revision, trouble: Fine }
  else { ...s, work: Resting, trouble: if (verdict == Refused) KeyRefused else KeyUnchecked }

pure def stepAKeyThatFailsChangesNothing(before: Provider, via: str, after: Provider): bool =
  (via == "keyChecked" and after.trouble != Fine)
    implies (after.mode == before.mode and after.saved == before.saved and after.revision == before.revision and after.form)
```

### A key can be refused while another stays saved

```quint
pure def sometimesARefusedKeyKeepsTheOldOne(s: Provider): bool = s.trouble == KeyRefused and s.saved
```

## Story: Choose Cloud or my key

> As the owner, I want to switch between Cloud and my own key after
> seeing what each sends, and to remove my key without Alpha quietly
> sending my requests elsewhere.

### Choosing shows what that provider sends, and only a choice shown and confirmed for the provider as it is now is sent to the phone

```quint
pure def canOffer(s: Provider, mode: Mode): bool =
  s.work == Resting and mode != Undecided and mode != s.mode and (mode == OwnKey implies s.saved) and s.report.status == R::Loaded

pure def offer(s: Provider, mode: Mode): Provider = { ...s, offer: mode, choice: V::present(s.choice), form: false, trouble: Fine }

pure def canDecline(s: Provider): bool = s.choice.showing

pure def decline(s: Provider): Provider = { ...s, choice: V::dismiss(s.choice) }

pure def canChoose(s: Provider): bool = V::canConfirm(s.choice) and s.work == Resting and (s.offer == OwnKey implies s.saved) and s.offer != s.mode

pure def choose(s: Provider): Moved =
  { state: { ...s, choice: V::confirm(s.choice), work: Selecting, ticket: s.ticket + 1 },
    out: List(SelectProvider({ ticket: s.ticket + 1, mode: s.offer, expected: s.revision })) }

pure def stepOnlyTheChoiceShownIsSent(before: Provider, after: Provider, out: List[Effect]): bool =
  out.every(e => match e { | SelectProvider(x) => x.mode == before.offer and V::canConfirm(before.choice) | _ => true })
```

### The phone selects what was chosen, or refuses a choice made on an older revision and Alpha reads the status again

```quint
pure def canSelected(s: Provider, ticket: int): bool = s.work == Selecting and ticket == s.ticket

pure def selected(s: Provider, ticket: int, ok: bool, revision: int): Moved =
  if (ok) { state: { ...s, work: Resting, mode: s.offer, saved: s.saved or s.offer == OwnKey, revision: revision }, out: List() }
  else askReport({ ...s, work: Resting, trouble: NotSelected })
```

### Removing the key leaves no provider chosen rather than switching to Cloud, and a removal the phone could not confirm keeps the key

```quint
pure def canRemoveKey(s: Provider): bool = s.saved and s.work == Resting and not(s.choice.showing)

pure def removeKey(s: Provider): Moved =
  { state: { ...s, work: Removing, ticket: s.ticket + 1, trouble: Fine }, out: List(RemoveKey({ ticket: s.ticket + 1, expected: s.revision })) }

pure def canRemoved(s: Provider, ticket: int): bool = s.work == Removing and ticket == s.ticket

pure def removed(s: Provider, ticket: int, ok: bool, revision: int): Provider =
  if (ok) { ...s, work: Resting, saved: false, mode: if (s.mode == OwnKey) Undecided else s.mode, revision: revision }
  else { ...s, work: Resting, trouble: NotRemoved }

pure def stepRemovingTheKeyNeverSwitchesToCloud(before: Provider, via: str, after: Provider): bool =
  via == "removed" implies (after.mode == before.mode or after.mode == Undecided)
```

### Cloud can be chosen after seeing what it sends

```quint
pure def sometimesCloudChosen(s: Provider): bool = s.mode == CloudAi and s.offer == CloudAi and s.work == Resting and s.saved
```

### A choice can be refused for an older revision

```quint
pure def sometimesAChoiceIsRefused(s: Provider): bool = s.trouble == NotSelected and s.report.status == R::Loading
```

### The key can be removed, leaving no provider chosen

```quint
pure def sometimesKeyRemoved(s: Provider): bool = s.mode == Undecided and not(s.saved) and s.revision > 0 and s.report.status == R::Loaded
```
