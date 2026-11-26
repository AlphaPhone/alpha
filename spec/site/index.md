# Site

Alpha's public page at alphaphone.dev, in `apps/site`: what Alpha is, that
it is available for Pixel 10 and Pixel 10a, a link to its source on GitHub
as the primary action, and one phone beside them that plays what Alpha
does, over and over, moving between Home, the conversation and the apps as
a person would: a question about the day, coffee found and opened in Maps,
a menu opened in the Browser, the Inbox summed up and a reply sent, and a
spoken note. The page is that one view, with nothing under it to scroll to.
Everything the phone shows is staged on the page; it asks no service
anything. Alpha Cloud's Terms of Service and Privacy Policy are published
at addresses of their own.

## Story: Walk through what Alpha does

> As a visitor, I want the phone to play through what Alpha does while I
> look at the page, moving between its apps and its conversation, so that I
> see it at work without reading a list of features.

### The phone plays nine scenes, each staged in beats

A scene is staged in beats, each held for its own time, and its last beat
is held long enough to read. On Home a touch lands on the Ask Alpha bar and
a question about the day is typed. The conversation opens over Home and
answers with the day's events. Coffee near lunch is asked there, three
places are found, and a touch lands on the first. Maps opens on that place,
and Alpha is asked for its menu from the bar. The Browser opens on the
menu. Back on Home a touch lands on the Inbox. The Inbox opens on its mail,
and Alpha is asked what needs an answer. The conversation opens over the
Inbox: three messages need one, a touch lands on Draft replies, Alpha shows
the first reply, a touch lands on Send, and only then is it sent. The
conversation closes, a touch lands on the microphone, and Alpha hears a
note and saves it. The phone plays for every visitor and offers no control;
one who asks for less motion sees each part appear in its place, without
the movement.

```quint
type Scene = Home | Day | Coffee | Maps | Menu | Apps | Inbox | Mail | Note
type Demo = { started: bool, scene: Scene, beat: int, due: int }

pure val initial: Demo = { started: false, scene: Home, beat: 0, due: 0 }

pure def beats(scene: Scene): List[int] =
  if (scene == Home) List(1400, 1300)
  else if (scene == Day) List(600, 900, 450, 260, 2000)
  else if (scene == Coffee) List(1100, 600, 900, 450, 220, 220, 1300, 700)
  else if (scene == Maps) List(700, 2200, 1200, 800)
  else if (scene == Menu) List(800, 2600)
  else if (scene == Apps) List(1000, 700)
  else if (scene == Inbox) List(900, 1400, 1200)
  else if (scene == Mail) List(600, 1000, 400, 260, 260, 1200, 650, 900, 1700, 650, 2200)
  else List(900, 800, 450, 450, 450, 900, 2400)

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
  if (scene == Home) Day
  else if (scene == Day) Coffee
  else if (scene == Coffee) Maps
  else if (scene == Maps) Menu
  else if (scene == Menu) Apps
  else if (scene == Apps) Inbox
  else if (scene == Inbox) Mail
  else if (scene == Mail) Note
  else Home

pure def ticking(d: Demo): bool = d.started

pure def canTick(d: Demo, now: int): bool = ticking(d) and now >= d.due

pure def tick(d: Demo, now: int): Demo =
  val ends = d.beat + 1 >= beats(d.scene).length()
  val ahead = { ...d, scene: if (ends) after(d.scene) else d.scene, beat: if (ends) 0 else d.beat + 1 }
  val paced = d.due + hold(ahead)
  { ...ahead, due: if (paced > now) paced else now + hold(ahead) }
```

### Each scene plays on Home, in Maps, in the Browser or in the Inbox

The day and the coffee are asked over Home, and Home is where the Inbox is
opened from. The mail is asked about over the Inbox, and the note is spoken
there. A screen is named here by the scene that opens it.

```quint
pure def screen(scene: Scene): Scene =
  if (scene == Maps) Maps
  else if (scene == Menu) Menu
  else if (scene == Inbox or scene == Mail or scene == Note) Inbox
  else Home
```

### The conversation is open for the day, the coffee and the mail, and keeps what was said while it is open and as it closes

The day stays above the coffee. As Maps opens the conversation closes with
both still in it, and as the note begins it closes with the mail in it. A
conversation that opens again starts empty.

```quint
pure def talking(d: Demo): bool = d.scene == Day or d.scene == Coffee or d.scene == Mail

pure def kept(scene: Scene, past: Scene): bool =
  (past == Day and (scene == Coffee or scene == Maps))
  or (past == Coffee and scene == Maps)
  or (past == Mail and scene == Note)
```

### A part of a scene shows from its beat on, a part of a kept scene whole, and what passes only during its beats

What passes is the typing, a touch, a question still in the bar and a
choice not yet made.

```quint
pure def shows(d: Demo, scene: Scene, from: int): bool =
  if (scene == d.scene) d.beat >= from else kept(d.scene, scene)

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

### The reply can be sent and the note saved

```quint
pure def sometimesSent(d: Demo): bool = d.scene == Mail and d.beat == 10

pure def sometimesSaved(d: Demo): bool = d.scene == Note and d.beat == 6

pure val eval_witness_sometimesSent = (("start", 0), ("tick", 3000), ("tick", 6000), ("tick", 9000), ("tick", 12000), ("tick", 15000), ("tick", 18000), ("tick", 21000), ("tick", 24000), ("tick", 27000), ("tick", 30000), ("tick", 33000), ("tick", 36000), ("tick", 39000), ("tick", 42000), ("tick", 45000), ("tick", 48000), ("tick", 51000), ("tick", 54000), ("tick", 57000), ("tick", 60000), ("tick", 63000), ("tick", 66000), ("tick", 69000), ("tick", 72000), ("tick", 75000), ("tick", 78000), ("tick", 81000), ("tick", 84000), ("tick", 87000), ("tick", 90000), ("tick", 93000), ("tick", 96000), ("tick", 99000), ("tick", 102000), ("tick", 105000), ("tick", 108000))
pure val eval_witness_sometimesSaved = (("start", 0), ("tick", 3000), ("tick", 6000), ("tick", 9000), ("tick", 12000), ("tick", 15000), ("tick", 18000), ("tick", 21000), ("tick", 24000), ("tick", 27000), ("tick", 30000), ("tick", 33000), ("tick", 36000), ("tick", 39000), ("tick", 42000), ("tick", 45000), ("tick", 48000), ("tick", 51000), ("tick", 54000), ("tick", 57000), ("tick", 60000), ("tick", 63000), ("tick", 66000), ("tick", 69000), ("tick", 72000), ("tick", 75000), ("tick", 78000), ("tick", 81000), ("tick", 84000), ("tick", 87000), ("tick", 90000), ("tick", 93000), ("tick", 96000), ("tick", 99000), ("tick", 102000), ("tick", 105000), ("tick", 108000), ("tick", 111000), ("tick", 114000), ("tick", 117000), ("tick", 120000), ("tick", 123000), ("tick", 126000), ("tick", 129000))
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
