# Phone details

Settings → General → Phone on the verified Alpha image (#920): the SIM, carrier, own number,
network, roaming and signal of each line, which apps hold the phone and SMS roles, and whether the
carrier's voicemail is set up. Settings lists the row and opens Phone at its `info` route; this
spec owns the page. Everything comes from one bounded read of the image's telephony profile
(`status` and `phoneInfo`) made only while the page is in front on an unlocked phone, kept in
memory while it stays there, and never stored, logged or given to the agent. The image ships the
launcher nonprivileged, so Android does not let it read the IMEI or the SIM serial: those rows
appear only when the read returns them, and otherwise the page hands off to Android's own device
status screen.

## Domain

### The page holds its showing, the read in flight, each line's facts, the role holders and the voicemail setup

`epoch` moves with every read and every change of showing, so only the latest read answers. A line
keeps the carrier's name, a SIM name only when it differs from the carrier's, the own number when
Android allowed it, the network, roaming, a signal level from 0 to 4 (`-1` when unknown), whether it
is an eSIM, and the slot.

```quint
type InfoPhase = InfoClosed | InfoReading | InfoShown | InfoFailed
type Network = NoService | Network2g | Network3g | Network4g | Network5g | WifiCalling | NetworkUnknown
type Line = { slot: int, carrier: str, simName: str, number: str, network: Network, roaming: bool, signal: int, embedded: bool, imei: str, simSerial: str }
type Holders = { phoneApp: str, phoneAlpha: bool, smsApp: str, smsAlpha: bool }
type VoicemailSetup = VoicemailOn | VoicemailNotSetUp | VoicemailNotOffered | VoicemailUnknown
type PhoneFacts = {
  shown: bool, epoch: int, phase: InfoPhase, asking: bool, phoneState: bool,
  lines: List[Line], holders: Holders, voicemail: VoicemailSetup
}
pure val noHolders: Holders = { phoneApp: "", phoneAlpha: false, smsApp: "", smsAlpha: false }
pure val initial: PhoneFacts = {
  shown: false, epoch: 0, phase: InfoClosed, asking: false, phoneState: false,
  lines: List(), holders: noHolders, voicemail: VoicemailUnknown
}
pure val ticketValues = Set(0, 1, 2, 3)
pure val linesValues = Set(List())
  .union(Set(List({ slot: 0, carrier: "Carrier", simName: "", number: "4155550100", network: Network5g, roaming: false, signal: 3, embedded: false, imei: "", simSerial: "" })))
  .union(Set(List(
    { slot: 0, carrier: "Carrier", simName: "Work", number: "", network: NoService, roaming: false, signal: -1, embedded: false, imei: "", simSerial: "" },
    { slot: 1, carrier: "Other", simName: "", number: "4155550111", network: Network4g, roaming: true, signal: 1, embedded: true, imei: "", simSerial: "" })))
pure val holdersValues = Set(noHolders, { phoneApp: "ai.alphacompute.alphaphone", phoneAlpha: true, smsApp: "com.android.messaging", smsAlpha: false })
```

## Story: See my SIM, carrier and number on the image

> As the owner, I want Settings → Phone to show my carrier, SIM, own number, network and signal,
> and which apps handle my calls and texts, read when I open it and forgotten when I leave.

### The page reads only while it is in front, and leaving forgets what it read

A read that answers after the page left, or after a newer read began, changes nothing.

```quint
pure def canInfoShown(f: PhoneFacts): bool = not(f.shown)
pure def infoShown(f: PhoneFacts): PhoneFacts = { ...f, shown: true, epoch: f.epoch + 1, phase: InfoReading, asking: false }
pure def canInfoHidden(f: PhoneFacts): bool = f.shown
pure def infoHidden(f: PhoneFacts): PhoneFacts = { ...initial, epoch: f.epoch + 1 }
pure def canInfoAsked(f: PhoneFacts, request: bool): bool = f.shown and f.phase != InfoReading
pure def infoAsked(f: PhoneFacts, request: bool): PhoneFacts =
  { ...f, epoch: f.epoch + 1, phase: InfoReading, asking: request, lines: List(), holders: noHolders, voicemail: VoicemailUnknown }
pure def canInfoAnswered(f: PhoneFacts, ticket: int, phoneState: bool, lines: List[Line]): bool =
  f.shown and f.phase == InfoReading and ticket == f.epoch and (phoneState or lines.length() == 0)
pure def infoAnswered(f: PhoneFacts, ticket: int, phoneState: bool, lines: List[Line], holders: Holders, voicemail: VoicemailSetup): PhoneFacts =
  { ...f, phase: InfoShown, asking: false, phoneState: phoneState, lines: lines, holders: holders, voicemail: voicemail }
pure def canInfoFailed(f: PhoneFacts, ticket: int): bool = f.shown and f.phase == InfoReading and ticket == f.epoch
pure def infoFailed(f: PhoneFacts, ticket: int): PhoneFacts = { ...f, phase: InfoFailed, asking: false, lines: List(), holders: noHolders, voicemail: VoicemailUnknown }
pure def alwaysNothingIsKeptWhileClosed(f: PhoneFacts): bool =
  not(f.shown) implies (f.phase == InfoClosed and f.lines.length() == 0 and f.holders == noHolders and f.voicemail == VoicemailUnknown)
pure def alwaysOnlyAShownReadHoldsLines(f: PhoneFacts): bool = f.phase != InfoShown implies f.lines.length() == 0
pure def stepOnlyTheLatestReadAnswers(before: PhoneFacts, via: str, after: PhoneFacts): bool =
  (via == "infoAnswered" or via == "infoFailed") implies (before.phase == InfoReading and after.epoch == before.epoch)
pure def sometimesLinesShown(f: PhoneFacts): bool = f.phase == InfoShown and f.lines.length() > 1
pure def sometimesTheReadFailed(f: PhoneFacts): bool = f.phase == InfoFailed and f.shown
```

### Without phone-state access the SIM list reads as unread, never as no SIM

The page then offers Allow, which asks Android for phone-state access and reads again. With access
and no line, it says there is no SIM.

```quint
type SimSummary = SimsUnknown | SimsUnread | NoSim | SimsListed
pure def simSummary(f: PhoneFacts): SimSummary =
  if (f.phase != InfoShown) SimsUnknown
  else if (not(f.phoneState)) SimsUnread
  else if (f.lines.length() == 0) NoSim
  else SimsListed
pure def alwaysNoLinesWithoutPhoneState(f: PhoneFacts): bool = not(f.phoneState) implies f.lines.length() == 0
pure def lawAnUnreadListIsNeverNoSim(f: PhoneFacts): bool = not(f.phoneState) implies simSummary(f) != NoSim
pure def sometimesUnread(f: PhoneFacts): bool = simSummary(f) == SimsUnread
```

### An identifier the launcher cannot read is shown on Android's own status screen

When no line carries an IMEI, the page offers IMEI as a handoff to Android's device status screen,
and Mobile network as a handoff to Android's network settings. Neither reads anything into Alpha.

```quint
pure def imeiElsewhere(f: PhoneFacts): bool = f.phase == InfoShown and not(f.lines.some(l => l.imei != ""))
pure def lawAShownImeiIsNeverHandedOff(f: PhoneFacts): bool = f.lines.some(l => l.imei != "") implies not(imeiElsewhere(f))
```
