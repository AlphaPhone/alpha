# Site

Alpha's public page at alphaphone.dev, in `apps/site`: what Alpha is, that
it is available for Pixel 10 and Pixel 10a, a link to its source on GitHub
as the one thing to do, and a phone that stays in view while the visitor
reads. The page has a passage for each thing the phone shows: Home, a
question about today's calendar, a text Alpha asks before sending, coffee
found on a map, an inbox summed up, and a spoken note. Every conversation is
staged on the page; it asks no service anything.

## Story: Walk through what Alpha does

> As a visitor, I want the phone to show what the passage I am reading
> describes, so that I see Alpha do each thing as I read about it.

### The phone shows Home, the calendar, a text, a map, the inbox and a spoken note, each staged in beats

A scene is staged in beats, each held for its own time. On Home the Ask
Alpha bar rests, then shows four questions a visitor might ask, and starts
over. Each other scene plays once to its last beat and rests there: the
question, the agent typing, its answer, and then what the answer brings.
The text is the one the visitor answers: Alpha shows the message, a touch
lands on Send, and only then is it sent.

```quint
type Scene = Home | Calendar | Text | Maps | Inbox | Voice
type Demo = { started: bool, scene: Scene, beat: int, whole: bool, still: bool, due: int }

pure val initial: Demo = { started: false, scene: Home, beat: 0, whole: false, still: false, due: 0 }

pure def beats(scene: Scene): List[int] =
  if (scene == Home) List(1600, 3000, 3000, 3000, 3000)
  else if (scene == Calendar) List(730, 650, 1100, 260, 220, 0)
  else if (scene == Text) List(730, 650, 1100, 1500, 650, 500, 0)
  else if (scene == Maps) List(730, 650, 1100, 420, 200, 200, 200, 0)
  else if (scene == Inbox) List(730, 650, 1200, 300, 260, 260, 500, 0)
  else List(880, 450, 450, 450, 450, 900, 0)

pure def hold(d: Demo): int = beats(d.scene).nthOr(d.beat, 0)

pure def begun(now: int, d: Demo): Demo = { ...d, due: now + hold(d) }

pure val nowValues = 0.to(40).map(i => i * 500).union(Set(1000000000))
pure val weight_tick = 8
```

### When the page opens the phone is on Home, shown whole for a visitor who asks for less motion

```quint
pure def canStart(d: Demo): bool = not(d.started)

pure def start(d: Demo, now: int, still: bool): Demo =
  begun(now, { ...d, started: true, scene: Home, beat: 0, whole: still, still: still })
```

### The phone shows the scene of the passage the visitor has reached, from its start

```quint
pure def canShow(d: Demo, scene: Scene): bool = d.started and scene != d.scene

pure def show(d: Demo, scene: Scene, now: int): Demo =
  begun(now, { ...d, scene: scene, beat: 0, whole: d.still })
```

### A beat moves on once its time has come, Home starting over and every other scene resting on its last beat

The next beat is due when this one was, plus its own time, so a scene
keeps its pace however late a beat is told. A beat told so late that the
next would already be due, after the page stalled, has its full time from
then, so a scene never runs through several beats at once.

```quint
pure def ticking(d: Demo): bool =
  d.started and not(d.whole) and (d.scene == Home or d.beat + 1 < beats(d.scene).length())

pure def canTick(d: Demo, now: int): bool = ticking(d) and now >= d.due

pure def tick(d: Demo, now: int): Demo =
  val ahead = { ...d, beat: if (d.beat + 1 < beats(d.scene).length()) d.beat + 1 else 0 }
  val paced = d.due + hold(ahead)
  { ...ahead, due: if (paced > now) paced else now + hold(ahead) }
```

### A visitor who comes to ask for less motion has the scene shown whole, and one who stops asking sees it play from its start

```quint
pure def canCalm(d: Demo, still: bool): bool = d.started and still != d.still

pure def calm(d: Demo, still: bool, now: int): Demo =
  begun(now, { ...d, still: still, whole: still, beat: 0 })
```

### A part of a scene shows from its beat on, the typing only during its own, and all but the typing when shown whole

```quint
pure def reached(d: Demo, from: int): bool = d.whole or d.beat >= from

pure def during(d: Demo, at: int): bool = not(d.whole) and d.beat == at
```

### The phone is always on a beat of its scene, and a scene shown whole is on its first

```quint
pure def alwaysOnABeatOfTheScene(d: Demo): bool =
  d.beat >= 0 and d.beat < beats(d.scene).length() and (d.whole implies d.beat == 0)
```

### Under less motion every scene is shown whole

```quint
pure def alwaysStillShowsWhole(d: Demo): bool = d.still == d.whole
```

### Before the page has opened the phone rests on Home

```quint
pure def alwaysHomeUntilStarted(d: Demo): bool = not(d.started) implies (d.scene == Home and d.beat == 0)
```

### The text can be sent, the note saved, Home can ask its last question, and a visitor can ask for less motion

```quint
pure def sometimesSent(d: Demo): bool = d.scene == Text and d.beat == 6

pure def sometimesSaved(d: Demo): bool = d.scene == Voice and d.beat == 6

pure def sometimesLastQuestion(d: Demo): bool = d.scene == Home and d.beat == 4

pure def sometimesStill(d: Demo): bool = d.still

pure val eval_witness_sometimesSent = (("start", 0, false), ("show", Text, 0), ("tick", 1000), ("tick", 1500), ("tick", 2500), ("tick", 4000), ("tick", 5000), ("tick", 5500))
pure val eval_witness_sometimesSaved = (("start", 0, false), ("show", Voice, 0), ("tick", 1000), ("tick", 1500), ("tick", 2000), ("tick", 2500), ("tick", 3000), ("tick", 4000))
pure val eval_witness_sometimesLastQuestion = (("start", 0, false), ("tick", 2000), ("tick", 5000), ("tick", 8000), ("tick", 11000))
```
