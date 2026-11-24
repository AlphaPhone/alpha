# Site

Alpha's public page at alphaphone.dev, in `apps/site`: Alpha's name, a
link to its source and to Alpha Compute, and a phone that plays what Alpha
does: Home, a chat that asks about today's calendar and is answered, and
the Calendar app. The conversation is staged on the page; it asks no
service anything.

## Story: Watch Alpha at work

> As a visitor, I want to see Alpha on a phone, a scene at a time, and to
> stop it or pick a scene myself.

### The phone shows Home, then the chat, then the Calendar, and starts over, each for its own time

Home holds for 2.7 seconds, the chat for 7.5 and the Calendar for 3.9. The
chat is staged in beats: the question, the agent typing, its answer, the
first event and the second, which then holds.

```quint
type Scene = Home | Chat | Calendar
type Demo = { started: bool, scene: Scene, beat: int, whole: bool, playing: bool, hidden: bool, still: bool, due: int, left: int }

pure val initial: Demo = { started: false, scene: Home, beat: 0, whole: false, playing: false, hidden: false, still: false, due: 0, left: 0 }

pure def beats(scene: Scene): List[int] =
  if (scene == Home) List(2700) else if (scene == Chat) List(410, 410, 1350, 290, 220, 4820) else List(3900)

pure def wholeTime(scene: Scene): int = if (scene == Home) 2700 else if (scene == Chat) 7500 else 3900

pure def following(scene: Scene): Scene = if (scene == Home) Chat else if (scene == Chat) Calendar else Home

pure def hold(d: Demo): int = if (d.whole) wholeTime(d.scene) else beats(d.scene).nthOr(d.beat, 0)

pure def running(d: Demo): bool = d.started and d.playing and not(d.hidden)

pure def begun(now: int, d: Demo): Demo = { ...d, due: now + hold(d), left: hold(d) }

pure val nowValues = 0.to(12).map(i => i * 5000).union(Set(1000000000))
pure val weight_tick = 5
```

### When the page opens it plays from Home, unless the visitor asks for less motion

```quint
pure def canStart(d: Demo): bool = not(d.started)

pure def start(d: Demo, now: int, still: bool, hidden: bool): Demo =
  begun(now, { ...d, started: true, scene: Home, beat: 0, whole: still, playing: not(still), hidden: hidden, still: still })
```

### A beat moves on only while the demo plays in sight, once its time has come

The next beat is due when this one was, plus its own time, so the demo
keeps its pace however late a beat is told. A beat told so late that the
next would already be due, after the page stalled, has its full time from
then, so the demo never runs through several beats at once.

```quint
pure def canTick(d: Demo, now: int): bool = running(d) and now >= d.due

pure def tick(d: Demo, now: int): Demo =
  val staged = not(d.whole) and d.beat + 1 < beats(d.scene).length()
  val ahead = if (staged) { ...d, beat: d.beat + 1 } else { ...d, scene: following(d.scene), beat: 0, whole: d.still }
  val paced = d.due + hold(ahead)
  { ...ahead, due: if (paced > now) paced else now + hold(ahead), left: hold(ahead) }
```

### A scene the visitor picks is shown from its start, and whole where the demo is not playing or the visitor asks for less motion

```quint
pure def canPick(d: Demo, scene: Scene): bool = d.started and scene != d.scene

pure def pick(d: Demo, scene: Scene, now: int): Demo =
  begun(now, { ...d, scene: scene, beat: 0, whole: d.still or not(d.playing) })
```

### Pausing keeps the time the beat has left, and playing again goes on from it

A page out of sight pauses the same way, and shown again goes on.

```quint
pure def timed(now: int, before: Demo, after: Demo): Demo =
  val rest = before.due - now
  val kept = if (rest < 0) 0 else if (rest > hold(after)) hold(after) else rest
  if (running(before) and not(running(after))) { ...after, left: kept }
  else if (running(after) and not(running(before))) { ...after, due: now + after.left }
  else after

pure def canToggle(d: Demo): bool = d.started

pure def toggle(d: Demo, now: int): Demo = timed(now, d, { ...d, playing: not(d.playing) })

pure def canSight(d: Demo, hidden: bool): bool = d.started and hidden != d.hidden

pure def sight(d: Demo, hidden: bool, now: int): Demo = timed(now, d, { ...d, hidden: hidden })
```

### A visitor who comes to ask for less motion has the demo paused and the scene shown whole

```quint
pure def canCalm(d: Demo, still: bool): bool = d.started and still != d.still

pure def calm(d: Demo, still: bool, now: int): Demo =
  if (still) timed(now, d, { ...d, still: true, playing: false, whole: true, beat: 0 }) else { ...d, still: false }
```

### The chat shows the question, the agent typing, its answer and the two events, each from its beat, and all but the typing when shown whole

```quint
type Part = Asked | Typing | Answered | FirstEvent | SecondEvent

pure def shown(d: Demo, part: Part): bool =
  val from = if (part == Asked) 1 else if (part == Typing) 2 else if (part == Answered) 3 else if (part == FirstEvent) 4 else 5
  d.scene == Chat and (if (part == Typing) not(d.whole) and d.beat == 2 else d.whole or d.beat >= from)
```

### The demo is always on a beat of its scene, and a scene shown whole has one beat

```quint
pure def alwaysOnABeatOfTheScene(d: Demo): bool =
  d.beat >= 0 and d.beat < beats(d.scene).length() and (d.whole implies d.beat == 0)
```

### The time a beat has left is never more than the beat's own time

```quint
pure def alwaysLeftWithinTheBeat(d: Demo): bool = d.left >= 0 and d.left <= hold(d)
```

### Under less motion every scene is shown whole

```quint
pure def alwaysStillShowsWhole(d: Demo): bool = d.still implies d.whole
```

### Nothing plays before the page has opened

```quint
pure def alwaysQuietUntilStarted(d: Demo): bool = not(d.started) implies not(d.playing)
```

### The chat can be answered, the Calendar reached, and the demo paused by the visitor or under less motion

```quint
pure def sometimesAnswered(d: Demo): bool = shown(d, SecondEvent) and not(d.whole)

pure def sometimesCalendar(d: Demo): bool = d.scene == Calendar and running(d)

pure def sometimesPausedByTheVisitor(d: Demo): bool = d.started and not(d.playing) and not(d.still)

pure def sometimesStill(d: Demo): bool = d.still
```
