# Page

One page of Alpha while an update is pending. A page that opens during an
update does not mount its editors: it shows "Updating Alpha…" until the
update settles. A page already open freezes navigation, has every area save
its drafts, and answers [Install](./install.md) ready or not. Afterwards it
unfreezes, reconnects after a cancel, and explains a refusal.

## Story: Open Alpha while an update is pending

> As the owner, I want Alpha, when it opens in the middle of an update, to
> show that it is updating and let me continue, not open my editors.

### A page is opening, holding for an update, or mounted, and knows the update it last read

The update is pending under an activation number, preparing (pages are
saving) or paused (the agent is paused and the update is being committed).
`acknowledged` is the last activation the page took up and `answered` the
last one it answered.

```quint
type Mount = Opening | Holding | Mounted
type Stage = NoUpdate | Preparing | Paused
type Reply = Unanswered | Readied | Refused
type Page = {
  mount: Mount, activation: int, stage: Stage, automatic: bool, canContinue: bool,
  acknowledged: int, answered: int, reply: Reply, frozen: bool, flushing: bool, continuing: bool, notice: bool,
}
type Activation = { activation: int }
type Effect = Answer({ activation: int, ready: bool }) | Flush(Activation) | Continue(Activation) | Reconnect(Activation) | Toast
type Moved = { state: Page, out: List[Effect] }

pure val initial: Page = {
  mount: Opening, activation: 0, stage: NoUpdate, automatic: false, canContinue: false,
  acknowledged: 0, answered: 0, reply: Unanswered, frozen: false, flushing: false, continuing: false, notice: false,
}
```

### A pending update is read for this page, never an older one than the page has taken up

A page that is not mounted holds and shows the update. Having no editors, it
answers a preparing activation ready at once. A mounted page freezes its
navigation and asks every area to save its drafts.

```quint
pure def canRead(s: Page, activation: int, stage: Stage): bool =
  activation > 0 and stage != NoUpdate and activation >= s.acknowledged and activation >= s.activation

pure def read(s: Page, activation: int, stage: Stage, canContinue: bool, automatic: bool): Moved =
  val acknowledge = stage == Preparing and activation != s.acknowledged
  val shown = {
    ...s, activation: activation, stage: stage, automatic: automatic, canContinue: stage == Paused and canContinue,
    mount: if (s.mount == Mounted) Mounted else Holding, frozen: s.mount == Mounted,
    flushing: s.flushing and activation == s.activation,
  }
  if (not(acknowledge)) { state: shown, out: List() }
  else if (s.mount == Mounted)
    { state: { ...shown, acknowledged: activation, reply: Unanswered, flushing: true }, out: List(Flush({ activation: activation })) }
  else
    { state: { ...shown, acknowledged: activation, answered: activation, reply: Readied, flushing: false }, out: List(Answer({ activation: activation, ready: true })) }
```

### A page that cannot read the update state holds rather than mount

A phone or a browser without Alpha's own updater has no update to read:
that is no update pending, and the page mounts.

```quint
pure def canUnreadable(s: Page): bool = s.mount != Mounted

pure def unreadable(s: Page): Page = { ...s, mount: Holding, canContinue: false }
```

### "Updating Alpha…" shows while a page holds or an update is pending, and "Continue update" only while it is paused and Android allows

```quint
pure def dialogShown(s: Page): bool = s.mount == Holding or s.activation != 0

pure def alwaysContinueOnlyWhilePaused(s: Page): bool =
  s.canContinue implies (s.stage == Paused and s.activation != 0 and dialogShown(s))
```

### Continue update is sent once per tap, never while the last one is still going

```quint
pure def canTapContinue(s: Page): bool = s.canContinue and not(s.continuing)

pure def tapContinue(s: Page): Moved =
  { state: { ...s, continuing: true }, out: List(Continue({ activation: s.activation })) }

pure def canContinued(s: Page): bool = s.continuing

pure def continued(s: Page): Page = { ...s, continuing: false }

pure def stepContinueIsNotRepeated(before: Page, after: Page, out: List[Effect]): bool =
  out.every(e => match e { | Continue(c) => not(before.continuing) and before.canContinue | _ => true })
```

### A page that was not mounted mounts its editors only once no update is pending

Until then the page shows Home and the apps not at all, only "Updating
Alpha…".

```quint
pure def editorsMounted(s: Page): bool = s.mount == Mounted

pure def stepAFreshPageMountsOnlyWhenSettled(before: Page, via: str, after: Page): bool =
  (before.mount != Mounted and after.mount == Mounted) implies (via == "endUpdate" and after.activation == 0)
```

### A page can hold with Continue update offered

```quint
pure def sometimesContinueOffered(s: Page): bool = s.mount == Holding and s.canContinue
```

## Story: Save my work before Alpha updates

> As the owner, I want what I am writing saved before Alpha updates, my
> place frozen meanwhile, and to be told plainly if the update had to stop.

### A mounted page's navigation is frozen exactly while an update is pending

While its navigation is frozen, or while it holds, the page holds the phone
([Layers](../shell/layers.md)): Back and Home take nothing.

```quint
pure def navigationFrozen(s: Page): bool = s.frozen

pure def holdsThePhone(s: Page): bool = navigationFrozen(s) or dialogShown(s)

pure def alwaysFrozenWhilePending(s: Page): bool =
  (s.mount == Mounted implies (s.frozen == (s.activation != 0))) and (s.mount != Mounted implies not(s.frozen) and not(s.flushing))
```

### When every area has saved its drafts the page answers ready, and otherwise it refuses

Every area keeps its drafts on the phone with each edit
([Draft](../../kit/draft.md)), so saving them is ending the edit in the
field that has focus; the drafts are saved once no field holds one. The
answer counts only for the activation being prepared.

```quint
pure def canFlushed(s: Page, activation: int): bool = s.flushing and activation == s.activation

pure def flushed(s: Page, activation: int, saved: bool, engaged: Engaged): Moved =
  val ok = saved and readyToUpdate(engaged, s.automatic)
  {
    state: { ...s, flushing: false, answered: activation, reply: if (ok) Readied else Refused },
    out: List(Answer({ activation: activation, ready: ok })),
  }
```

### A page is ready for an update only with no voice turn, connection step, call or recording under way, and for a hands-off update only while the phone is still idle

What the phone is doing is read when the drafts are saved: a voice turn, a
step of the connection to the agent, a call, and a Notes or chat recording;
for an update Alpha started on its own, also whether the owner is still idle
and the phone still quiet, as [Updates](./index.md) decides it.

```quint
type Engaged = { voice: bool, connecting: bool, call: bool, recording: bool, idle: bool }

pure def readyToUpdate(e: Engaged, automatic: bool): bool =
  not(e.voice) and not(e.connecting) and not(e.call) and not(e.recording) and (e.idle or not(automatic))
```

### No page is ready for an update during a call

```quint
pure def lawNoActivationIsReadyOnACall(engaged: Engaged, automatic: bool): bool =
  not(readyToUpdate({ ...engaged, call: true }, automatic))
```

### No page is ready for an update while it is recording

```quint
pure def lawNoActivationIsReadyWhileRecording(engaged: Engaged, automatic: bool): bool =
  not(readyToUpdate({ ...engaged, recording: true }, automatic))
```

### A page is ready for a hands-off update only while the phone is idle

```quint
pure def lawAHandsOffActivationNeedsIdle(engaged: Engaged): bool =
  readyToUpdate(engaged, true) implies engaged.idle
```

### A page answers each activation at most once

```quint
pure def alwaysAnsweredWhatWasTakenUp(s: Page): bool =
  s.answered <= s.acknowledged and s.answered >= 0
    and (s.flushing implies (s.activation == s.acknowledged and s.answered != s.acknowledged))

pure def stepEachActivationIsAnsweredOnce(before: Page, after: Page, out: List[Effect]): bool =
  out.every(e => match e { | Answer(a) => a.activation != before.answered and after.answered == a.activation | _ => true })
```

### A mounted page says it is ready only after its drafts are saved

```quint
pure def stepReadyOnlyAfterSaving(before: Page, after: Page, out: List[Effect]): bool =
  out.every(e => match e { | Answer(a) => a.ready implies (before.mount != Mounted or before.flushing) | _ => true })
```

### Saving drafts always ends with an answer

```quint
pure def leadsToSavingEnds(s: Page, later: Page): bool = s.flushing implies not(later.flushing)

pure val fair_flushed = "weak"
```

### A mounted page can be saving its drafts

```quint
pure def sometimesSaving(s: Page): bool = s.flushing
```

## Story: Carry on after the update

> As the owner, I want my page back as it was when an update does not
> happen, and to know when it stopped because of my unsaved changes.

### The update settles for this page when nothing is pending, or with the outcome of its own activation

On a cancelled update that this page was ready for, and that Android says
may resume, the page reconnects. When a manual update fails after this page
refused, the page says "Finish your changes, then try updating again".

```quint
type Settlement = Gone | WasInstalled | WasCancelled | WasFailed

pure def canEndUpdate(s: Page, activation: int, ending: Settlement): bool =
  s.mount == Opening or (s.mount == Holding and s.activation == 0)
    or (s.activation != 0 and (ending == Gone or activation == s.activation))

pure def endUpdate(s: Page, activation: int, ending: Settlement, resume: bool): Moved =
  val exact = activation == s.activation and activation == s.acknowledged and s.mount == Mounted
  val reconnect = exact and ending == WasCancelled and resume and s.reply == Readied
  val notice = exact and ending == WasFailed and s.reply == Refused and not(s.automatic)
  {
    state: {
      ...s, mount: Mounted, activation: 0, stage: NoUpdate, canContinue: false,
      frozen: false, flushing: false, continuing: false, notice: notice,
    },
    out: (if (reconnect) List(Reconnect({ activation: activation })) else List()).concat(if (notice) List(Toast) else List()),
  }

pure def noticeText(s: Page): str = if (s.notice) "Finish your changes, then try updating again." else ""
```

### The refusal is explained only for a manual update this page itself refused

```quint
pure def stepTheNoticeIsForMyOwnRefusal(before: Page, after: Page, out: List[Effect]): bool =
  out.some(e => match e { | Toast => true | _ => false }) implies (before.reply == Refused and not(before.automatic) and before.mount == Mounted)
```

### A page reconnects only after a cancelled update it was ready for

```quint
pure def stepReconnectOnlyAfterReady(before: Page, after: Page, out: List[Effect]): bool =
  out.every(e => match e { | Reconnect(r) => before.reply == Readied and before.mount == Mounted | _ => true })
```

### A page can tell its owner to finish their changes

```quint
pure def sometimesNoticeShown(s: Page): bool = s.notice
```

### What the simulator tries

```quint
pure val activationValues = Set(1, 2, 3)
pure val calm: Engaged = { voice: false, connecting: false, call: false, recording: false, idle: true }
pure val engagedValues =
  Set(calm).union(Set({ ...calm, idle: false })).union(Set({ ...calm, call: true, idle: false }))
    .union(Set({ ...calm, voice: true, idle: false })).union(Set({ ...calm, recording: true, idle: false }))
```
