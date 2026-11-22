# Workflow simulator

With test mocks only, the browser build runs simulated workflows against its own simulated apps
(messages, inbox, notes, Calendar, wallet, location), so a developer can walk a workflow end to end
without a phone. Nothing it does leaves the page: a local send saves a simulated message, a receipt
records a simulated expense, and developer review stands in for the agent where none answers. A
production build never loads it (legacy `simulated-workflows`, `development-workflows`,
`development-digests`, `workflow-*` browser modules, `DevelopmentDigestPending`).

## Story: Walk a workflow end to end in the browser without touching anything real

> As a developer, I run a workflow against simulated apps in the browser build, and I want each step
> bounded, recorded once, and never mistaken for the agent's work or a real send or payment.

### The simulator exists only with test mocks

```quint
pure def simulatorLoads(testMocks: bool, browser: bool): bool = testMocks and browser
pure def lawAProductionBuildHasNoSimulator(browser: bool): bool = not(simulatorLoads(false, browser))
```

### A local send goes only to a simulated destination, once per step, and a reply needs exactly one sender

A saved message id is the step's receipt; a second run of the step must find the same text.

```quint
type Destination = MessageToMaya | ReplyToSender | EmailToMe | UnknownDestination
pure def sendAllowed(d: Destination, senders: int, text: str): bool =
  text != "" and d != UnknownDestination and (d != ReplyToSender or senders == 1)
pure def receiptMatches(saved: bool, sameText: bool, sameRecipient: bool): bool = not(saved) or (sameText and sameRecipient)
pure val sendersValues = Set(0, 1, 2)
pure def lawAReplyNeedsOneSender(senders: int, text: str): bool = sendAllowed(ReplyToSender, senders, text) implies senders == 1
```

### A receipt records a simulated expense of a named merchant and a positive amount, and never pays

```quint
pure def expenseValid(merchantLength: int, cents: int, cardChosen: bool): bool =
  merchantLength >= 1 and merchantLength <= 120 and cents >= 1 and cents <= 999999999 and cardChosen
pure val centsValues = Set(0, 1, 999999999, 1000000000)
pure def lawNoExpenseWithoutAnAmount(merchantLength: int, cardChosen: bool): bool = not(expenseValid(merchantLength, 0, cardChosen))
```

### Urgency is the agent's exact decision, or a developer's review where no agent answers

The decision is one object with exactly `urgent` and a reason of 1 to 500 characters, over input of
1 to 16000 characters.

```quint
pure def urgencyInputValid(length: int): bool = length >= 1 and length <= 16000
pure def urgencyDecisionValid(exactFields: bool, reasonLength: int): bool = exactFields and reasonLength >= 1 and reasonLength <= 500
pure val lengthValues = Set(0, 1, 16000, 16001)
pure def lawAnOversizedInputIsNeverAssessed(length: int): bool = length > 16000 implies not(urgencyInputValid(length))
```

### A developer's step result is test data of 1 to 16000 characters, never shown as the model's output

```quint
type ResultSource = ModelResult | DeveloperResult
pure def resultAccepted(length: int): bool = length >= 1 and length <= 16000
pure def presentedAsModel(source: ResultSource): bool = source == ModelResult
pure def lawADeveloperResultIsNeverTheModels(length: int): bool = not(presentedAsModel(DeveloperResult))
```

### A focus block summarizes at most 100 arrivals over 10000 seen items in 15000 characters, or releases focus

```quint
pure def focusFits(seen: int, arrivals: int, chars: int): bool = seen <= 10000 and arrivals <= 100 and chars <= 15000
pure val arrivalsValues = Set(100, 101)
pure def lawTooManyArrivalsReleaseFocus(seen: int, chars: int): bool = not(focusFits(seen, 101, chars))
```

### Away from Home is decided only when the accuracy does not straddle the boundary

```quint
type Where = AwayFromHome | AtHome | Straddles
pure def whereFrom(distance: int, accuracy: int, radius: int): Where =
  if (distance - accuracy <= radius and distance + accuracy > radius) Straddles
  else if (distance - accuracy > radius) AwayFromHome else AtHome
pure val distanceValues = Set(50, 150, 300)
pure val accuracyValues = Set(10, 100)
pure val radiusValues = Set(100)
pure def lawAwayNeedsTheWholeAccuracyOutside(distance: int, accuracy: int, radius: int): bool =
  whereFrom(distance, accuracy, radius) == AwayFromHome implies distance - accuracy > radius
```

### "Overnight" is 18:00 the day before to 09:00 today, and never past now

```quint
pure def overnightEnd(nine: int, now: int): int = if (now < nine) now else nine
pure val nineValues = Set(32400000)
pure def lawOvernightNeverReadsTheFuture(nine: int, now: int): bool = overnightEnd(nine, now) <= now or overnightEnd(nine, now) == nine
```

### Removing run history removes only finished runs, and nothing while a run is going

```quint
pure def removableRun(status: str): bool = status == "ok" or status == "fail" or status == "skip" or status == "cancelled"
pure def historyRemovable(running: bool, finished: int): bool = not(running) and finished > 0
pure val statusValues = Set("ok", "running", "uncertain")
pure def lawARunningRunIsNeverRemoved(status: str): bool = status == "running" implies not(removableRun(status))
```

### The simulated notice ledger holds at most 200 notices of 1 to 16000 characters with a title of 1 to 200

```quint
pure def noticeFits(rows: int, textLength: int, titleLength: int): bool =
  rows < 200 and textLength >= 1 and textLength <= 16000 and titleLength >= 1 and titleLength <= 200
pure val rowsValues = Set(199, 200)
pure def lawAFullLedgerTakesNoNotice(textLength: int, titleLength: int): bool = not(noticeFits(200, textLength, titleLength))
```

### A simulated trigger reuses a Calendar answer for at most a minute, and one failing flow never stops the others

```quint
pure val calendarCacheMs = 60000
pure def cacheFresh(readAt: int, now: int, changed: bool): bool = not(changed) and now >= readAt and now - readAt <= calendarCacheMs
pure def lawAChangedCalendarIsReadAgain(readAt: int, now: int): bool = not(cacheFresh(readAt, now, true))
```

### A draft slot holds at most 100000 bytes, and a saved digest request only moves from review to sent

```quint
pure def draftFits(bytes: int): bool = bytes >= 0 and bytes <= 100000
type SavedPhase = NoSaved | SavedReview | SavedLegacy | SavedSent
pure def phaseMayAdvance(before: SavedPhase, after: SavedPhase, samePayload: bool): bool =
  before == NoSaved or before == after or (samePayload and (before == SavedReview or before == SavedLegacy) and after == SavedSent)
pure val bytesValues = Set(100000, 100001)
pure def lawASentRequestNeverReturnsToReview(samePayload: bool): bool = not(phaseMayAdvance(SavedSent, SavedReview, samePayload))
```
