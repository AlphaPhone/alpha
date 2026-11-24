# Steps

What a workflow does, one typed step after another. A step reads (text the
owner supplied, chosen notes, reminders due, a calendar range), checks
whether what an earlier step read contains a text, writes (a draft from a
prefix and a suffix, a draft the agent's model writes from an instruction,
a new note), notifies the phone, or reads aloud. Every step but a read
works on what one earlier step gave it. These are eliza's step kinds and
device operations (`workflow/authoring`); a workflow never sends a message
or acts on the phone in any other way.

## Story: Describe a step

> As the owner, I want each step to say exactly what it reads, checks,
> writes or tells me, within limits the agent can run, using only what the
> agent offers on this phone.

### A step has a kind and an operation, a number, the earlier step it reads, a text, a count of chosen items, and a calendar span

The text is counted in characters: the text supplied, the text to match,
the prefix and suffix, the instruction or the title. The chosen items are
the notes, the most reminders read, or the calendars.

```quint
type StepKind = ReadStep | IfStep | WriteStep | NotifyStep | SpeakStep
type Operation =
  | SuppliedText | SelectedNotes | SelectedReminders | CalendarRange
  | Contains | ComposeDraft | ModelDraft | SaveNote | AppNotification | ReadAloud
type Span = FixedDates | FromRunDay
type Step = { op: Operation, id: int, source: int, text: int, items: int, span: Span, days: int }

pure val maxSteps = 32
pure val maxText = 4000
pure val maxItems = 16
pure val maxReminders = 50

pure val sValues = Set(
  { op: SuppliedText, id: 1, source: 0, text: 5, items: 0, span: FixedDates, days: 1 },
  { op: ReadAloud, id: 2, source: 1, text: 0, items: 0, span: FixedDates, days: 1 },
  { op: Contains, id: 2, source: 2, text: 3, items: 0, span: FixedDates, days: 1 },
  { op: CalendarRange, id: 1, source: 0, text: 0, items: 2, span: FromRunDay, days: 7 },
)
pure val oValues = Set({ speaks: true, reminders: true, runDay: true }, { speaks: false, reminders: false, runDay: false })

pure def kindOf(op: Operation): StepKind =
  if (op == SuppliedText or op == SelectedNotes or op == SelectedReminders or op == CalendarRange) ReadStep
  else if (op == Contains) IfStep
  else if (op == ComposeDraft or op == ModelDraft or op == SaveNote) WriteStep
  else if (op == AppNotification) NotifyStep
  else SpeakStep
```

### The agent offers notifications and reading aloud, reminders, and a range from the run day, each only where this phone can carry it

```quint
type Offer = { speaks: bool, reminders: bool, runDay: bool }

pure def offered(op: Operation, o: Offer): bool =
  if (op == AppNotification or op == ReadAloud) o.speaks
  else if (op == SelectedReminders) o.reminders
  else true
```

### A read step reads nothing earlier; every other step reads one earlier step

```quint
pure def readsEarlier(s: Step): bool =
  if (kindOf(s.op) == ReadStep) s.source == 0 else (1 <= s.source and s.source < s.id)
```

### Each operation keeps its own limits

Supplied text, a match, an instruction and a title are 1 to 4000
characters; a prefix and a suffix together at most 4000. Up to 16 notes or
calendars are chosen, at least one note; up to 50 reminders are read. A
calendar range covers 1 to 7 days, from fixed dates or from the day the
workflow runs. Reading aloud and composing take no text of their own
beyond these.

```quint
pure def withinLimits(s: Step): bool =
  if (s.op == SuppliedText or s.op == Contains or s.op == ModelDraft or s.op == SaveNote or s.op == AppNotification)
    1 <= s.text and s.text <= maxText and s.items == 0
  else if (s.op == ComposeDraft) 0 <= s.text and s.text <= maxText and s.items == 0
  else if (s.op == SelectedNotes) s.text == 0 and 1 <= s.items and s.items <= maxItems
  else if (s.op == SelectedReminders) s.text == 0 and 1 <= s.items and s.items <= maxReminders
  else if (s.op == CalendarRange) s.text == 0 and 0 <= s.items and s.items <= maxItems and 1 <= s.days and s.days <= 7
  else s.text == 0 and s.items == 0
```

### A step is well formed when it reads what it may, keeps its limits, and spans the run day only where offered

```quint
pure def fits(s: Step, o: Offer): bool =
  s.id >= 1 and readsEarlier(s) and withinLimits(s) and offered(s.op, o) and (s.span == FromRunDay implies (s.op == CalendarRange and o.runDay))
```

### A workflow starts with a read and has at most 32 steps, each reading what it may within its limits

Whether each step is offered is asked again when it is saved, since what
the agent offers can change.

```quint
pure def shaped(steps: List[Step]): bool =
  steps.length() <= maxSteps and steps.every(s => s.id >= 1 and readsEarlier(s) and withinLimits(s))
    and (steps.length() == 0 or kindOf(steps.head().op) == ReadStep)

pure def wellFormed(steps: List[Step], o: Offer): bool = shaped(steps) and steps.every(s => fits(s, o))

pure def holds(steps: List[Step], id: int): bool = steps.some(s => s.id == id)
```

### A step needs what the agent offers, and a step that is not a read always reads an earlier step

```quint
pure def lawAStepNeedsItsOffer(s: Step, o: Offer): bool =
  (fits(s, o) and (s.op == AppNotification or s.op == ReadAloud)) implies o.speaks

pure def lawEveryLaterStepReadsAnEarlierOne(s: Step): bool =
  (readsEarlier(s) and kindOf(s.op) != ReadStep) implies (s.source >= 1 and s.source < s.id)
```
