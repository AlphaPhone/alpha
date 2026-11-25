# Sending

One message the owner sends from [Messages](./), as SMS or, with pictures,
as MMS. A send takes a new operation number and is written to the phone's
journal before the radio is used; the radio is then used once for each
recipient. A message is sent when the radio reports every part sent, and
delivered only when a delivery report follows for every recipient. When an
answer is lost the outcome is unknown, and Send again reads the journal
instead of sending a second copy. A send the phone denied used no radio and
can be sent again under a new number. A finished record is retired by a
tombstone, and its number is never used again.

A text the agent asks to send to a number the owner wrote is shown on its
card first, whatever the agent says about review, and only the owner's
approval there sends it: once, to that one number, on the phone's SIM for
texts, under the operation number of the agent's proposal. The agent is
told what the phone's record says, and a text it was told about is never
offered for approval again. A draft the agent asks for only fills the
conversation's draft, as in the [composer](./composer.md).

## Domain

### What a send holds

The conversation it belongs to, its operation number and outcome, its
recipients, the radio calls made, the parts reported sent or failed, the
delivery reports, whether the phone denied it, and the last number retired.

```quint
import attempt as A from "../../kit/attempt"

type Outgoing = {
  thread: int, op: A::Attempt, denied: bool,
  recipients: int, radioed: int, sent: int, failed: int, reported: int,
  retired: int,
}

pure val initial: Outgoing = {
  thread: 0, op: A::plan(0), denied: false,
  recipients: 0, radioed: 0, sent: 0, failed: 0, reported: 0,
  retired: 0,
}
```

### What a send asks of the phone

A journal entry for the operation, one radio call for one recipient, a
read of the journal for an operation whose outcome is unknown, and a
tombstone for a finished record.

```quint
type Effect =
  | Journal({ id: int, recipients: int })
  | Radio({ id: int, recipient: int })
  | ReadJournal({ id: int })
  | Tombstone({ id: int })

type Stepped = { state: Outgoing, out: List[Effect] }

pure def journalEntry(id: int, recipients: int): List[Effect] = List(Journal({ id: id, recipients: recipients }))

pure def radioCall(id: int, recipient: int): List[Effect] = List(Radio({ id: id, recipient: recipient }))

pure def radios(out: List[Effect]): bool = out.some(e => match e { | Radio(r) => true | _ => false })
```

### What the simulator tries

```quint
pure val idValues = Set(1, 2, 3, 4)
pure val threadValues = Set(1, 2)
pure val recipientsValues = Set(0, 1, 2)
pure val weight_transmit = 3
pure val weight_partSent = 4
pure val weight_reportArrived = 3
pure val weight_journaled = 3
```

## Story: Send a message once

> As the owner, I want a message I send to go once to each recipient, and
> never twice when Alpha cannot tell whether it went.

### Send journals a new operation, or reads the journal back when the last outcome is unknown

Send needs at least one recipient. Nothing is sent while another send is
under way.

```quint
pure def busy(o: Outgoing): bool = o.op.outcome == A::Recorded or o.op.outcome == A::Sent

pure def uncertain(o: Outgoing): bool = o.op.outcome == A::Unknown

pure def canSend(o: Outgoing, thread: int, recipients: int): bool =
  not(busy(o)) and thread > 0 and recipients > 0 and (uncertain(o) implies thread == o.thread)

pure def send(o: Outgoing, thread: int, recipients: int): Stepped =
  val op = A::record(A::plan(o.op.id + 1))
  if (uncertain(o)) { state: o, out: List(ReadJournal({ id: o.op.id })) }
  else { state: { ...o, thread: thread, op: op, denied: false, recipients: recipients, radioed: 0, sent: 0, failed: 0, reported: 0 },
      out: journalEntry(op.id, recipients) }
```

### The journal entry lands, or the phone denies the send before any radio is used

A denied send keeps the draft; Send again sends it under a new number.

```quint
pure def canJournaled(o: Outgoing, id: int): bool = o.op.outcome == A::Recorded and id == o.op.id

pure def journaled(o: Outgoing, id: int, allowed: bool): Outgoing =
  if (allowed) { ...o, op: A::dispatch(o.op) }
  else { ...o, op: { ...o.op, outcome: A::Refused }, denied: true }
```

### Once journaled, the radio is used once for each recipient, in turn

```quint
pure def canTransmit(o: Outgoing, id: int): bool = o.op.outcome == A::Sent and id == o.op.id and o.radioed < o.recipients

pure def transmit(o: Outgoing, id: int): Stepped =
  { state: { ...o, radioed: o.radioed + 1 }, out: radioCall(id, o.radioed + 1) }
```

### The radio reports each part sent or failed, and the send ends when every recipient has an answer

A send ends confirmed only if no part failed.

```quint
pure def canPartSent(o: Outgoing, id: int): bool = o.op.outcome == A::Sent and id == o.op.id and o.sent + o.failed < o.radioed

pure def partSent(o: Outgoing, id: int, ok: bool): Outgoing =
  val counted = if (ok) { ...o, sent: o.sent + 1 } else { ...o, failed: o.failed + 1 }
  if (counted.sent + counted.failed == counted.recipients) { ...counted, op: A::conclude(counted.op, counted.failed == 0, true) }
  else counted
```

### A delivery report counts only for a part reported sent

```quint
pure def canReportArrived(o: Outgoing, id: int): bool = id == o.op.id and o.retired < id and o.reported < o.sent

pure def reportArrived(o: Outgoing, id: int): Outgoing = { ...o, reported: o.reported + 1 }
```

### When Alpha stops waiting for the phone's answer, the outcome is unknown

```quint
pure def canLost(o: Outgoing): bool = busy(o)

pure def lost(o: Outgoing): Outgoing = { ...o, op: { ...o.op, outcome: A::Unknown } }
```

### The journal read back settles an unknown outcome: sent, or never sent

An operation the journal shows never used the radio ends refused, and can
be sent again under a new number.

```quint
pure def canReadBack(o: Outgoing, id: int): bool = uncertain(o) and id == o.op.id

pure def readBack(o: Outgoing, id: int, wasSent: bool, known: bool): Outgoing =
  if (not(known)) o
  else if (wasSent) { ...o, op: { ...o.op, outcome: A::Confirmed }, sent: o.recipients, radioed: o.recipients, failed: 0 }
  else { ...o, op: { ...o.op, outcome: A::Refused } }
```

### A finished record is retired by a tombstone

```quint
pure def finished(o: Outgoing): bool =
  o.op.outcome == A::Refused or (o.op.outcome == A::Confirmed and o.reported == o.sent)

pure def canRetire(o: Outgoing, id: int): bool = id == o.op.id and o.retired < id and finished(o)

pure def retire(o: Outgoing, id: int): Stepped = { state: { ...o, retired: id }, out: List(Tombstone({ id: id })) }
```

### The radio is used only for a journaled operation, once for each recipient, and never for a retired one

```quint
pure def alwaysOneRadioCallPerRecipient(o: Outgoing): bool =
  0 <= o.reported and o.reported <= o.sent and 0 <= o.failed and o.sent + o.failed <= o.radioed
    and o.radioed <= o.recipients and o.retired <= o.op.id and o.op.id >= 0
    and (busy(o) implies o.retired < o.op.id) and (o.op.id > 0 implies o.recipients > 0)

pure def stepTheRadioNeedsTheJournal(before: Outgoing, via: str, after: Outgoing, out: List[Effect]): bool =
  radios(out) implies (before.op.outcome == A::Sent and before.retired < before.op.id
    and out == radioCall(before.op.id, before.radioed + 1) and after.radioed == before.radioed + 1)
```

### A denied send used no radio

```quint
pure def alwaysADeniedSendUsedNoRadio(o: Outgoing): bool =
  o.denied implies (o.op.outcome == A::Refused and o.radioed == 0)
```

### Nothing is radioed before the journal entry lands, and an operation has a number once it is recorded

Discovered by the proof: without it, a send the phone denied could be one
that had already used the radio, and a send read back as sent could have
no recipients.

```quint
pure def alwaysTheJournalComesFirst(o: Outgoing): bool =
  (o.op.outcome == A::Recorded implies (o.radioed == 0 and o.sent == 0 and o.failed == 0 and o.reported == 0))
    and (o.op.id == 0 implies o.op.outcome == A::Planned)
```

### A send belongs to the conversation it was sent from

Discovered by the proof: without it, a message reported sent could clear
the draft of no conversation, leaving the closed composer holding one.

```quint
pure def alwaysASendHasAConversation(o: Outgoing): bool = o.op.id > 0 implies o.thread > 0
```

### A send whose outcome is unknown is never sent again, only read back

```quint
pure def stepAnUnknownSendIsReadBack(before: Outgoing, via: str, after: Outgoing, out: List[Effect]): bool =
  uncertain(before) implies (after.op.id == before.op.id and not(radios(out)))
```

### A denied send can be sent again under a new number

Send is not blocked by the number of a send the phone denied, and the draft
need not change first.

```quint
pure def lawADeniedSendCanBeSentAgain(thread: int, recipients: int): bool =
  val denied = journaled(send(initial, thread, recipients).state, 1, false)
  (thread > 0 and recipients > 0) implies
    (canSend(denied, thread, recipients) and send(denied, thread, recipients).state.op.id == 2
      and send(denied, thread, recipients).out == journalEntry(2, recipients))

pure def stepARetryTakesANewNumber(before: Outgoing, via: str, after: Outgoing): bool =
  after.op.id != before.op.id implies (via == "send" and after.op.id == before.op.id + 1 and after.op.outcome == A::Recorded)
```

### A send under way ends

It ends with the phone's answers, or as unknown when Alpha stops waiting
for them.

```quint
pure def leadsToASendEnds(o: Outgoing, later: Outgoing): bool = busy(o) implies not(busy(later))

pure val fair_journaled = "weak"
pure val fair_transmit = "weak"
pure val fair_partSent = "weak"
pure val fair_lost = "weak"
```

### A send can be denied and retried, fail, end unknown, be read back, and be retired

```quint
pure def sometimesRetriedAfterDenial(o: Outgoing): bool = o.op.id >= 2 and o.op.outcome == A::Sent and o.radioed > 0
pure def sometimesDenied(o: Outgoing): bool = o.denied
pure def sometimesPartFailed(o: Outgoing): bool = o.op.outcome == A::Refused and o.failed > 0 and o.sent > 0
pure def sometimesUnknown(o: Outgoing): bool = uncertain(o) and o.radioed > 0
pure def sometimesRetired(o: Outgoing): bool = o.retired > 0 and o.retired == o.op.id
```

## Story: Know whether it arrived

> As the owner, I want a message shown as sent only when the radio says so,
> and as delivered only when every recipient's delivery report came.

### A message is sent when every recipient's part was sent, and delivered when every report came

```quint
pure def sentAll(o: Outgoing): bool = o.op.outcome == A::Confirmed

pure def delivered(o: Outgoing): bool = sentAll(o) and o.reported == o.recipients

pure def alwaysDeliveredNeedsSentAndReports(o: Outgoing): bool =
  sentAll(o) implies (o.sent == o.recipients and o.failed == 0 and o.recipients > 0)
```

### A message can be delivered

```quint
pure def sometimesDelivered(o: Outgoing): bool = delivered(o) and o.recipients == 2
```
