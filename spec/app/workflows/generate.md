# Generate

A workflow the agent drafts from the owner's description, beside the
[Builder](./builder.md): the owner describes it, the agent drafts steps,
and the owner uses the draft, discards it, cancels or asks again. The agent
drafts only within what it offers on this phone, and never a workflow that
is already on or that brings its own schedule: when a workflow runs is the
owner's to set. On the agent's side this is eliza's `workflow/authoring`
generation; Alpha refuses what that contract refuses.

Whether the builder's draft can change and its edit count are facts of
[Builder](./builder.md), passed in with the events that need them, and so
is what the agent offers ([Steps](./steps.md)).

## Story: Have the agent draft a workflow

> As the owner, I want to describe a workflow and have the agent draft its
> steps, and to cancel, discard or ask again, without the draft I was
> writing changing under me.

### Generate holds the description, the generation and its ticket, the steps drafted, the draft's edit count when it was asked for, and how the last generation ended

```quint
import read as R from "../../kit/read"
import steps as T from "./steps"

type Ending = NotAsked | Drafted | Used | Discarded | Cancelled | Unsupported | Unusable | Unreachable
type Effect = AskForDraft({ ticket: int, chars: int })
type Generate = {
  describing: bool, chars: int, generation: R::Read, baseline: int, drafted: List[T::Step], ending: Ending,
}
type Moved = { state: Generate, out: List[Effect] }

pure val maxDescription = 2000

pure val initial: Generate = {
  describing: false, chars: 0, generation: R::unread, baseline: 0, drafted: List(), ending: NotAsked,
}

pure val ticketValues = Set(1, 2, 3)
pure val charsValues = Set(0, 12, 2001)
pure val editsValues = Set(0, 1)
pure val stepsValues = Set(
  List(),
  List({ op: T::SuppliedText, id: 1, source: 0, text: 5, items: 0, span: T::FixedDates, days: 1 }),
  List({ op: T::SuppliedText, id: 1, source: 0, text: 5, items: 0, span: T::FixedDates, days: 1 },
       { op: T::ReadAloud, id: 2, source: 1, text: 0, items: 0, span: T::FixedDates, days: 1 }),
  List({ op: T::Contains, id: 1, source: 0, text: 5, items: 0, span: T::FixedDates, days: 1 }),
)
```

### Describing opens a prompt on a draft the owner can change, when the agent drafts on this phone

```quint
pure def canDescribe(g: Generate, unlocked: bool, generates: bool): bool = not(g.describing) and unlocked and generates

pure def describe(g: Generate, unlocked: bool, generates: bool): Generate = { ...g, describing: true, drafted: List() }
```

### A description of 1 to 2000 characters is sent only when it asks for a workflow the agent can build; one it cannot is refused before asking

```quint
pure def canGenerate(g: Generate, chars: int, supported: bool, edits: int): bool =
  g.describing and g.generation.status != R::Loading and 1 <= chars and chars <= maxDescription

pure def generate(g: Generate, chars: int, supported: bool, edits: int): Moved =
  val asked = R::ask(g.generation)
  if (not(supported)) { state: { ...g, chars: chars, drafted: List(), ending: Unsupported }, out: List() }
  else { state: { ...g, chars: chars, generation: asked, baseline: edits, drafted: List(), ending: NotAsked },
         out: List(AskForDraft({ ticket: asked.ticket, chars: chars })) }
```

### Only the newest generation is taken, and a draft that is on, brings a schedule, uses what is not offered, was made for another revision of the agent's steps, or is ill formed is refused

```quint
pure def usable(steps: List[T::Step], active: bool, scheduled: bool, fresh: bool, speaks: bool, reminders: bool, runDay: bool): bool =
  steps.length() >= 1 and not(active) and not(scheduled) and fresh
    and T::wellFormed(steps, { speaks: speaks, reminders: reminders, runDay: runDay })

pure def canDraftGenerated(g: Generate, ticket: int): bool = R::canAnswer(g.generation, ticket)

pure def draftGenerated(g: Generate, ticket: int, ok: bool, steps: List[T::Step], active: bool, scheduled: bool,
                        revised: bool, speaks: bool, reminders: bool, runDay: bool): Generate =
  val good = ok and usable(steps, active, scheduled, not(revised), speaks, reminders, runDay)
  { ...g, generation: R::answer(g.generation, good), drafted: if (good) steps else List(),
    ending: if (good) Drafted else if (ok) Unusable else Unreachable }
```

### Cancelling stops waiting for the agent, and discarding drops what it drafted and keeps the prompt open

A late answer to a generation that was cancelled is refused.

```quint
pure def canCancelGeneration(g: Generate): bool = g.describing

pure def cancelGeneration(g: Generate): Generate =
  { ...g, describing: false, drafted: List(), ending: Cancelled,
    generation: if (g.generation.status == R::Loading) R::answer(g.generation, false) else g.generation }

pure def canDiscardGenerated(g: Generate): bool = g.describing and g.drafted.length() >= 1

pure def discardGenerated(g: Generate): Generate = { ...g, drafted: List(), ending: Discarded }
```

### The steps drafted are used only on the draft they were asked for

The builder takes the same steps and baseline, and refuses them when its
draft changed since.

```quint
pure def canUseGenerated(g: Generate, edits: int): bool = g.describing and g.drafted.length() >= 1 and g.baseline == edits

pure def useGenerated(g: Generate, edits: int): Generate = { ...g, describing: false, drafted: List(), ending: Used }
```

### Steps drafted are always well shaped, and are held only while the prompt is open

```quint
pure def alwaysWhatWasDraftedIsUsable(g: Generate): bool = and {
  T::shaped(g.drafted), g.drafted.length() >= 1 implies (g.describing and g.ending == Drafted),
  g.generation.status == R::Loading implies g.describing,
  g.chars >= 0, g.chars <= maxDescription,
}
```

### Nothing is asked of the agent but a description that may be built, and a draft is taken only from the newest asking

```quint
pure def stepOnlyASupportedDescriptionIsSent(before: Generate, via: str, after: Generate, out: List[Effect]): bool =
  and {
    out.every(e => match e { | AskForDraft(a) => via == "generate" and a.ticket == after.generation.ticket and a.chars == after.chars }),
    (after.drafted.length() >= 1 and after.drafted != before.drafted) implies via == "draftGenerated",
  }
```

### A draft can be used, discarded, cancelled, refused as unbuildable or unusable, or fail to arrive

```quint
pure def sometimesADraftIsUsed(g: Generate): bool = g.ending == Used and not(g.describing)

pure def sometimesADraftIsDiscarded(g: Generate): bool = g.ending == Discarded and g.describing

pure def sometimesAGenerationIsCancelled(g: Generate): bool = g.ending == Cancelled and g.generation.status == R::Failed

pure def sometimesADescriptionIsNotSupported(g: Generate): bool = g.ending == Unsupported

pure def sometimesADraftIsUnusable(g: Generate): bool = g.ending == Unusable

pure def sometimesADraftDoesNotArrive(g: Generate): bool = g.ending == Unreachable
```

## Story: Close the prompt

> As the owner, I want the prompt to close with the builder, after a
> restart, or when another owner signs in, and never a late draft to land.

### Closing, a restart or another owner signing in closes the prompt and refuses any late draft

```quint
pure def canCloseBuilder(g: Generate): bool = g.describing

pure def closeBuilder(g: Generate): Generate = cancelGeneration(g)

pure def restart(g: Generate): Generate = { ...initial, generation: { ...g.generation, status: R::Idle } }

pure def ownerChanged(g: Generate, owner: int): Generate = { ...initial, generation: { ...g.generation, status: R::Idle } }
```
