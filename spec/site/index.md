# Site

Alpha's public page at alphaphone.dev, in `apps/site`: what Alpha is, that
it is available for Pixel 10 and Pixel 10a, a link to its source on GitHub
as the primary action, and one phone beside them that plays what Alpha
does, over and over: Home, a question about today's calendar, a text Alpha
asks before sending, coffee found on a map, an inbox summed up, and a spoken
note. The page is that one view, with nothing under it to scroll to. Every
conversation is staged on the page; it asks no service anything. Alpha
Cloud's Terms of Service and Privacy Policy are published at addresses of
their own.

## Story: Walk through what Alpha does

> As a visitor, I want the phone to play through what Alpha does while I
> look at the page, so that I see it at work without reading a list of
> features.

### The phone plays Home, the calendar, a text, a map, the inbox and a spoken note, each staged in beats

A scene is staged in beats, each held for its own time, and its last beat
is held long enough to read. On Home a touch lands on the Ask Alpha bar and
the first question is typed there. The conversation then opens for four
questions. Each is sent, thought about and answered, and what the answer
brings arrives a part at a time; the later three are typed in the message
box first. The text is the one Alpha asks about: it shows the message, a
touch lands on Send, and only then is it sent. The inbox ends with a touch
on Draft replies and the drafts made. The conversation then closes, a touch
lands on the microphone, and Alpha hears a note and saves it. It plays for
every visitor and offers no control; one who asks for less motion sees each
part appear in its place, without the movement.

```quint
type Scene = Home | Calendar | Text | Maps | Inbox | Voice
type Demo = { started: bool, scene: Scene, beat: int, due: int }

pure val initial: Demo = { started: false, scene: Home, beat: 0, due: 0 }

pure def beats(scene: Scene): List[int] =
  if (scene == Home) List(1600, 1500)
  else if (scene == Calendar) List(500, 700, 900, 450, 260, 2600)
  else if (scene == Text) List(1300, 600, 900, 1500, 650, 600, 2400)
  else if (scene == Maps) List(1100, 600, 900, 450, 500, 220, 220, 2600)
  else if (scene == Inbox) List(1200, 600, 1000, 400, 260, 260, 260, 1300, 650, 2600)
  else List(900, 800, 450, 450, 450, 900, 2600)

pure def hold(d: Demo): int = beats(d.scene).nthOr(d.beat, 0)

pure def begun(now: int, d: Demo): Demo = { ...d, due: now + hold(d) }

pure val nowValues = 0.to(40).map(i => i * 500).union(Set(1000000000))
pure val weight_tick = 8
```

### When the page opens the phone is on Home and starts to play

```quint
pure def canStart(d: Demo): bool = not(d.started)

pure def start(d: Demo, now: int): Demo =
  begun(now, { ...d, started: true, scene: Home, beat: 0 })
```

### A beat moves on once its time has come, and a scene's last beat leads to the next scene, the spoken note back to Home

The next beat is due when this one was, plus its own time, so the phone
keeps its pace however late a beat is told. A beat told so late that the
next would already be due, after the page stalled, has its full time from
then, so the phone never runs through several beats at once.

```quint
pure def after(scene: Scene): Scene =
  if (scene == Home) Calendar
  else if (scene == Calendar) Text
  else if (scene == Text) Maps
  else if (scene == Maps) Inbox
  else if (scene == Inbox) Voice
  else Home

pure def ticking(d: Demo): bool = d.started

pure def canTick(d: Demo, now: int): bool = ticking(d) and now >= d.due

pure def tick(d: Demo, now: int): Demo =
  val ends = d.beat + 1 >= beats(d.scene).length()
  val ahead = { ...d, scene: if (ends) after(d.scene) else d.scene, beat: if (ends) 0 else d.beat + 1 }
  val paced = d.due + hold(ahead)
  { ...ahead, due: if (paced > now) paced else now + hold(ahead) }
```

### The conversation is open for the four questions and keeps what was said, a part showing from its beat on and what passes only during its beats

A question earlier in the conversation shows whole, without what passed:
the typing, the touch, the choice already made. The conversation still
holds all four while it closes for the spoken note, and is empty when it
next opens.

```quint
pure def turn(scene: Scene): int =
  if (scene == Calendar) 1
  else if (scene == Text) 2
  else if (scene == Maps) 3
  else if (scene == Inbox) 4
  else 0

pure def talking(d: Demo): bool = turn(d.scene) > 0

pure def shows(d: Demo, scene: Scene, from: int): bool =
  if (scene == d.scene) d.beat >= from
  else turn(scene) > 0 and (d.scene == Voice or turn(d.scene) > turn(scene))

pure def during(d: Demo, scene: Scene, from: int, until: int): bool =
  scene == d.scene and d.beat >= from and d.beat < until
```

### The phone is always on a beat of its scene

```quint
pure def alwaysOnABeatOfTheScene(d: Demo): bool =
  d.beat >= 0 and d.beat < beats(d.scene).length()
```

### Before the page has opened the phone rests on Home

```quint
pure def alwaysHomeUntilStarted(d: Demo): bool =
  not(d.started) implies (d.scene == Home and d.beat == 0)
```

### The text can be sent and the note saved

```quint
pure def sometimesSent(d: Demo): bool = d.scene == Text and d.beat == 6

pure def sometimesSaved(d: Demo): bool = d.scene == Voice and d.beat == 6

pure val eval_witness_sometimesSent = (("start", 0), ("tick", 3000), ("tick", 6000), ("tick", 9000), ("tick", 12000), ("tick", 15000), ("tick", 18000), ("tick", 21000), ("tick", 24000), ("tick", 27000), ("tick", 30000), ("tick", 33000), ("tick", 36000), ("tick", 39000), ("tick", 42000))
pure val eval_witness_sometimesSaved = (("start", 0), ("tick", 3000), ("tick", 6000), ("tick", 9000), ("tick", 12000), ("tick", 15000), ("tick", 18000), ("tick", 21000), ("tick", 24000), ("tick", 27000), ("tick", 30000), ("tick", 33000), ("tick", 36000), ("tick", 39000), ("tick", 42000), ("tick", 45000), ("tick", 48000), ("tick", 51000), ("tick", 54000), ("tick", 57000), ("tick", 60000), ("tick", 63000), ("tick", 66000), ("tick", 69000), ("tick", 72000), ("tick", 75000), ("tick", 78000), ("tick", 81000), ("tick", 84000), ("tick", 87000), ("tick", 90000), ("tick", 93000), ("tick", 96000), ("tick", 99000), ("tick", 102000), ("tick", 105000), ("tick", 108000), ("tick", 111000), ("tick", 114000), ("tick", 117000))
```

## Story: Read Alpha Cloud's policies

> As a visitor, I want to read Alpha Cloud's Terms of Service and Privacy
> Policy before I sign in or use the service.

### Each policy has its own public address

Their published text and links are available at their addresses without
signing in or running JavaScript. Home does not link to them.

```quint
pure val termsPath = "/terms"
pure val privacyPath = "/privacy"
```
