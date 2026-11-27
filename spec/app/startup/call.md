# Call

A call to Ask Alpha that the assistant surface has noted and not yet
taken: how it came, whether its caller can be believed, whether the phone
was locked, whether it had to start Alpha, when it arrived and under which
account. [Startup](./index.md) holds one and takes it once Home takes
input; whether the call may listen is decided here, and the voice area
listens or not as the call says. The Quick Settings tile reaches Alpha
through Android's own unlock, so a tile call arrives unlocked. Asking for
the notes area's own access to the microphone is the notes area's.

## Story: Listen only when I just asked for it

> As the owner, I want the wake word or the power button to bring up Ask
> Alpha listening, but only when I just asked, on my unlocked Alpha phone,
> and never because some other app or an old call said so.

### A call holds its origin, its caller's trust, the lock, whether it started Alpha, when it arrived and its account

Android says whether the caller is the phone's own system or Alpha's own
signed listener; any other caller is not trusted.

```quint
type Origin = Gesture | WakeWord | PowerButton | Tile
type Call = { called: bool, origin: Origin, trusted: bool, locked: bool, cold: bool, at: int, account: int }

pure val noCall: Call = { called: false, origin: Gesture, trusted: false, locked: true, cold: false, at: 0, account: 0 }

pure def note(origin: Origin, trusted: bool, locked: bool, cold: bool, at: int, account: int): Call =
  { called: true, origin: origin, trusted: trusted, locked: locked, cold: cold, at: at, account: account }
```

### A call listens only from the wake word or the power button, from a trusted caller on an Alpha image, unlocked, under the same account, and soon enough

Soon enough is five seconds, or fifteen when the call had to start Alpha.
The assist gesture and the tile open Ask Alpha without listening.

```quint
pure def freshFor(cold: bool): int = if (cold) 15000 else 5000

pure def listens(c: Call, image: bool, account: int, now: int): bool =
  (c.origin == WakeWord or c.origin == PowerButton) and c.trusted and image and not(c.locked)
    and c.account == account and now >= c.at and now - c.at <= freshFor(c.cold)
```

### A stale call never listens

```quint
pure def lawAStaleCallDoesNotListen(origin: Origin, trusted: bool, locked: bool, cold: bool, at: int, account: int, now: int): bool =
  (now - at > 15000 or now < at) implies not(listens(note(origin, trusted, locked, cold, at, account), true, account, now))
```

### The gesture and the tile never listen, nor an untrusted caller, a locked phone, a phone that is not an Alpha image, or a call from another account

```quint
pure def lawOnlyAFreshTrustedCallListens(origin: Origin, trusted: bool, locked: bool, cold: bool, at: int, account: int, image: bool, signedIn: int, now: int): bool =
  val c = note(origin, trusted, locked, cold, at, account)
  listens(c, image, signedIn, now) implies
    (origin != Gesture and origin != Tile and trusted and not(locked) and image and account == signedIn)
```
