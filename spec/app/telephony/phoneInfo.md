# Phone details

Settings → Phone on an Alpha image: the SIM, carrier, own number, network,
roaming and signal of each line, which apps hold the phone and SMS roles,
and whether the carrier's voicemail is set up. Settings shows the row and
opens the page; this spec owns the page. Everything comes from one bounded
read of the image's telephony status and lines, made only while the page is
in front, kept in memory while it stays there, and never stored, logged or
given to the agent. The launcher cannot read the IMEI or the SIM serial: those
rows appear only when the read returns them, and otherwise the page hands
off to Android's own device status screen.

## Story: See my SIM, carrier and number on the image

> As the owner, I want Settings → Phone to show my carrier, SIM, own number,
> network and signal, and which apps handle my calls and texts, read when I
> open it and forgotten when I leave.

### The page holds whether it shows, its read, the phone-state access, each line's facts, the role holders and the voicemail setup

A line keeps the carrier's name, a SIM name only when it differs from the
carrier's, the own number when Android allowed it, the network, roaming, a
signal level from 0 to 4 (`-1` when unknown), whether it is an eSIM, and the
slot.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"

type Network = NoService | Network2g | Network3g | Network4g | Network5g | WifiCalling | NetworkUnknown
type Line = { slot: int, carrier: str, simName: str, number: str, network: Network, roaming: bool, signal: int, embedded: bool, imei: str, simSerial: str }
type Holders = { phoneApp: str, phoneAlpha: bool, smsApp: str, smsAlpha: bool }
type VoicemailSetup = VoicemailOn | VoicemailNotSetUp | VoicemailNotOffered | VoicemailUnknown
type Effect = ReadInfo({ ticket: int }) | AskPhoneState({ ticket: int }) | AskRole({ sms: bool, ticket: int })
type PhoneFacts = {
  shown: bool, info: R::Read, phoneState: P::Permission,
  lines: List[Line], holders: Holders, voicemail: VoicemailSetup
}
type Moved = { state: PhoneFacts, out: List[Effect] }

pure val noHolders: Holders = { phoneApp: "", phoneAlpha: false, smsApp: "", smsAlpha: false }
pure val initial: PhoneFacts = {
  shown: false, info: R::unread, phoneState: P::unasked, lines: List(), holders: noHolders, voicemail: VoicemailUnknown
}
pure val ticketValues = Set(0, 1, 2, 3)
pure val linesValues = Set(List())
  .union(Set(List({ slot: 0, carrier: "Carrier", simName: "", number: "4155550100", network: Network5g, roaming: false, signal: 3, embedded: false, imei: "", simSerial: "" })))
  .union(Set(List(
    { slot: 0, carrier: "Carrier", simName: "Work", number: "", network: NoService, roaming: false, signal: -1, embedded: false, imei: "", simSerial: "" },
    { slot: 1, carrier: "Other", simName: "", number: "4155550111", network: Network4g, roaming: true, signal: 1, embedded: true, imei: "", simSerial: "" })))
pure val holdersValues = Set(noHolders, { phoneApp: "ai.alphacompute.alphaphone", phoneAlpha: true, smsApp: "com.android.messaging", smsAlpha: false })
```

### The page reads only while it is in front, and leaving forgets what it read

A read that answers after the page left, or after a newer read began,
changes nothing.

```quint
pure def canShow(f: PhoneFacts, showing: bool): bool = showing != f.shown

pure def show(f: PhoneFacts, showing: bool): Moved =
  if (showing) { state: { ...f, shown: true, info: R::ask(f.info) }, out: List(ReadInfo({ ticket: f.info.ticket + 1 })) }
  else { state: { ...initial, info: if (f.info.status == R::Loading) R::answer(f.info, false) else f.info, phoneState: f.phoneState }, out: List() }

pure def canRefresh(f: PhoneFacts): bool = f.shown and f.info.status != R::Loading

pure def refresh(f: PhoneFacts): Moved =
  { state: { ...f, info: R::ask(f.info), lines: List(), holders: noHolders, voicemail: VoicemailUnknown }, out: List(ReadInfo({ ticket: f.info.ticket + 1 })) }

pure def canInfoAnswered(f: PhoneFacts, ticket: int, phoneState: bool, lines: List[Line]): bool =
  f.shown and R::canAnswer(f.info, ticket) and (phoneState or lines.length() == 0)

pure def infoAnswered(f: PhoneFacts, ticket: int, phoneState: bool, lines: List[Line], holders: Holders, voicemail: VoicemailSetup): PhoneFacts =
  { ...f, info: R::answer(f.info, true), phoneState: P::observe(f.phoneState, if (phoneState) P::Granted else P::Denied),
    lines: lines, holders: holders, voicemail: voicemail }

pure def canInfoFailed(f: PhoneFacts, ticket: int): bool = f.shown and R::canAnswer(f.info, ticket)

pure def infoFailed(f: PhoneFacts, ticket: int): PhoneFacts = { ...f, info: R::answer(f.info, false), lines: List(), holders: noHolders, voicemail: VoicemailUnknown }

pure def alwaysNothingIsKeptWhileClosed(f: PhoneFacts): bool =
  not(f.shown) implies (f.lines.length() == 0 and f.holders == noHolders and f.voicemail == VoicemailUnknown and f.info.status != R::Loading)

pure def alwaysOnlyAShownReadHoldsLines(f: PhoneFacts): bool = f.info.status != R::Loaded implies f.lines.length() == 0

pure def sometimesLinesShown(f: PhoneFacts): bool = f.info.status == R::Loaded and f.lines.length() > 1

pure def sometimesTheReadFailed(f: PhoneFacts): bool = f.info.status == R::Failed and f.shown
```

### Without phone-state access the SIM list reads as unread, never as no SIM

The page then offers Allow, which asks Android for phone-state access once
(the kit's permission) and reads again; after that the owner is sent to
Android's settings. With access and no line, it says there is no SIM.

```quint
type SimSummary = SimsUnknown | SimsUnread | NoSim | SimsListed

pure def simSummary(f: PhoneFacts): SimSummary =
  if (f.info.status != R::Loaded) SimsUnknown
  else if (not(P::allows(f.phoneState))) SimsUnread
  else if (f.lines.length() == 0) NoSim
  else SimsListed

pure def canAllow(f: PhoneFacts): bool = f.shown and f.info.status != R::Loading and P::canAsk(f.phoneState)

pure def allow(f: PhoneFacts): Moved =
  { state: { ...f, phoneState: P::ask(f.phoneState), info: R::ask(f.info), lines: List(), holders: noHolders, voicemail: VoicemailUnknown },
    out: List(AskPhoneState({ ticket: f.info.ticket + 1 })) }

pure def alwaysNoLinesWithoutPhoneState(f: PhoneFacts): bool = not(P::allows(f.phoneState)) implies f.lines.length() == 0

pure def lawAnUnreadListIsNeverNoSim(f: PhoneFacts): bool = not(P::allows(f.phoneState)) implies simSummary(f) != NoSim

pure def sometimesUnread(f: PhoneFacts): bool = simSummary(f) == SimsUnread
```

### An identifier the launcher cannot read is shown on Android's own status screen

When no line carries an IMEI, the page offers IMEI as a handoff to Android's
device status screen, and Mobile network as a handoff to Android's network
settings. Neither reads anything into Alpha.

```quint
pure def imeiElsewhere(f: PhoneFacts): bool = f.info.status == R::Loaded and not(f.lines.some(l => l.imei != ""))

pure def lawAShownImeiIsNeverHandedOff(f: PhoneFacts): bool = f.lines.some(l => l.imei != "") implies not(imeiElsewhere(f))
```

## Story: Keep Alpha as my phone and SMS app

> As the owner, I want to see whether Alpha handles my calls and texts, and
> to make it do so again in one tap when another app took the role.

### A role Alpha does not hold is offered back once the page read it, and Android's own prompt decides

Alpha is the image's dialer and SMS app from the start; the image enables
the role handlers and never assigns a holder behind the owner's back. Asking
again opens Android's role prompt, and the page reads again when it answers.

```quint
pure def canRoleAsked(f: PhoneFacts, sms: bool): bool =
  f.shown and f.info.status == R::Loaded and (if (sms) not(f.holders.smsAlpha) else not(f.holders.phoneAlpha))

pure def roleAsked(f: PhoneFacts, sms: bool): Moved =
  { state: { ...f, info: R::ask(f.info), lines: List(), holders: noHolders, voicemail: VoicemailUnknown },
    out: List(AskRole({ sms: sms, ticket: f.info.ticket + 1 })) }

pure def stepARoleIsAskedOnlyByTheOwner(before: PhoneFacts, via: str, after: PhoneFacts, out: List[Effect]): bool =
  out.some(e => match e { | AskRole(r) => true | _ => false }) implies via == "roleAsked"

pure def sometimesAnotherAppHoldsARole(f: PhoneFacts): bool = f.info.status == R::Loaded and f.holders.phoneApp != "" and not(f.holders.phoneAlpha)
```
