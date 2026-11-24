# Voice activity

When a capture without a native segmenter hears speech, and when that speech has ended: the energy
gate the renderer runs over a browser or batch capture's level samples, and the segment gate the
native live capture runs over Silero's speech probabilities. Levels are in millionths of full scale,
probabilities in thousandths.

## Domain

### A gate holds when it started, its first and last speech, whether it buffers, and whether it stopped

`-1` is no speech yet.

```quint
type Vad = { startedAt: int, firstSpeech: int, lastSpeech: int, buffering: bool, stopped: bool, at: int, blips: int, ends: int }
pure val initial: Vad = { startedAt: 0, firstSpeech: -1, lastSpeech: -1, buffering: false, stopped: false, at: 0, blips: 0, ends: 0 }
pure val startGraceMs = 250
pure val minSpeechMs = 180
pure val silenceMs = 650
pure val maxSpeechMs = 12000
pure val rmsThresholdMicro = 3000
pure val peakThresholdMicro = 12000
pure val echoGateFactor = 4
pure val atMsValues = Set(100, 300, 500, 700, 1300, 2000, 12600)
pure val rmsMicroValues = Set(0, 3000, 12000)
pure val peakMicroValues = Set(0, 12000, 48000)
```

## Story: End my spoken turn when I stop speaking

> As the owner speaking into a capture that has no native segmenter, I want the turn to end after
> I fall silent, not on a cough or while the reply's own voice is in the room, so that it sends
> what I said and only that.

### Speech is louder than 0.003 RMS or a 0.012 peak, four times that while the reply's voice may echo

```quint
pure def isSpeech(rmsMicro: int, peakMicro: int, echoGate: bool): bool = {
  val factor = if (echoGate) echoGateFactor else 1
  rmsMicro >= rmsThresholdMicro * factor or peakMicro >= peakThresholdMicro * factor
}
pure def lawEchoNeedsLouderSpeech(rmsMicro: int, peakMicro: int): bool =
  isSpeech(rmsMicro, peakMicro, true) implies isSpeech(rmsMicro, peakMicro, false)
```

### Nothing counts in the first 250 ms; a turn ends after 180 ms of speech and 650 ms of silence, or at 12 s of speech

A blip shorter than 180 ms followed by a full silence is forgotten, so the 12 s clock starts with
real speech.

```quint
pure def canSample(v: Vad, atMs: int, rmsMicro: int, peakMicro: int, echoGate: bool): bool =
  not(v.stopped) and atMs >= v.at and atMs >= v.startedAt and rmsMicro >= 0 and peakMicro >= 0
pure def sample(v: Vad, atMs: int, rmsMicro: int, peakMicro: int, echoGate: bool): Vad = {
  val t = { ...v, at: atMs }
  val first = if (v.firstSpeech < 0) atMs else v.firstSpeech
  if (atMs - v.startedAt < startGraceMs) { ...t, buffering: false }
  else if (isSpeech(rmsMicro, peakMicro, echoGate) and atMs - first >= maxSpeechMs)
    { ...t, firstSpeech: first, lastSpeech: atMs, buffering: true, stopped: true, ends: v.ends + 1 }
  else if (isSpeech(rmsMicro, peakMicro, echoGate)) { ...t, firstSpeech: first, lastSpeech: atMs, buffering: true }
  else if (v.firstSpeech < 0) { ...t, buffering: false }
  else if (v.lastSpeech - v.firstSpeech >= minSpeechMs and atMs - v.lastSpeech >= silenceMs) { ...t, buffering: false, stopped: true, ends: v.ends + 1 }
  else if (atMs - v.lastSpeech >= silenceMs) { ...t, firstSpeech: -1, lastSpeech: -1, buffering: false, blips: v.blips + 1 }
  else { ...t, buffering: true }
}
pure def hasSpeech(v: Vad): bool = v.firstSpeech >= 0 and v.lastSpeech - v.firstSpeech >= minSpeechMs
pure def alwaysSpeechIsOrdered(v: Vad): bool =
  (v.firstSpeech < 0 iff v.lastSpeech < 0) and (v.firstSpeech >= 0 implies (v.firstSpeech <= v.lastSpeech and v.lastSpeech <= v.at))
pure def alwaysARunningTurnIsShorterThanTwelveSeconds(v: Vad): bool =
  not(v.stopped) implies (v.firstSpeech < 0 or v.lastSpeech - v.firstSpeech < maxSpeechMs)
pure def stepAStopIsFinal(before: Vad, via: str, after: Vad): bool = before.stopped implies (after.stopped or via == "restart")
pure def sometimesEndedBySilence(v: Vad): bool = v.stopped and hasSpeech(v) and v.lastSpeech - v.firstSpeech < maxSpeechMs
pure def sometimesBlipForgotten(v: Vad): bool = v.blips >= 1 and not(v.stopped)
```

### A new capture starts the gate afresh

```quint
pure def canRestart(v: Vad, atMs: int): bool = atMs >= v.at
pure def restart(v: Vad, atMs: int): Vad = { ...initial, startedAt: atMs, at: atMs, blips: v.blips, ends: v.ends }
pure def sometimesSecondTurn(v: Vad): bool = v.ends >= 1 and not(v.stopped) and v.firstSpeech >= 0
```

## Story: Segment live speech on the phone

> As the owner talking over the phone's live capture, I want a segment to open on a word and close
> after a real pause, so that the recognizer hears whole phrases.

### A segment opens after 2 windows at 0.5 or more and closes after 16 windows below 0.35

Any window at 0.35 or more keeps an open segment open. A probability that is not a number counts
as 0. A new capture starts closed. The native gate does this; the renderer only reads its edges.

```quint
type Gate = { speaking: bool, above: int, below: int }
pure val openPermille = 500
pure val closePermille = 350
pure val openWindows = 2
pure val closeWindows = 16
pure def gateWindow(g: Gate, permille: int): Gate =
  if (not(g.speaking)) (if (permille >= openPermille) (if (g.above + 1 >= openWindows) { speaking: true, above: 0, below: 0 } else { ...g, above: g.above + 1 }) else { ...g, above: 0 })
  else (if (permille < closePermille) (if (g.below + 1 >= closeWindows) { speaking: false, above: 0, below: 0 } else { ...g, below: g.below + 1 }) else { ...g, below: 0 })
pure val gValues = Set({ speaking: false, above: 0, below: 0 }, { speaking: false, above: 1, below: 0 },
  { speaking: true, above: 0, below: 14 }, { speaking: true, above: 0, below: 15 })
pure val permilleValues = Set(0, 349, 350, 499, 500, 1000)
pure def lawOneLoudWindowDoesNotOpen(permille: int): bool = not(gateWindow({ speaking: false, above: 0, below: 0 }, permille).speaking)
pure def lawTheSixteenthQuietWindowCloses(permille: int): bool =
  permille < closePermille implies not(gateWindow({ speaking: true, above: 0, below: 15 }, permille).speaking)
pure def lawAWindowAtThePauseLevelKeepsSpeech(g: Gate, permille: int): bool =
  (g.speaking and permille >= closePermille) implies gateWindow(g, permille).speaking
```
