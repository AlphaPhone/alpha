# Speech route

Which speech every voice surface uses: the phone's own recognizer and voice, Eliza Cloud speech, or
the owner's Cartesia key. The route itself, its holds after a network failure and its fallback to
the phone are the local inference package's (`spec/localInference/speechRoute.md`): the owner's
Cartesia key first, then a usable Cloud account, then the phone; a network failure before any audio
falls back to the phone once and holds that key off the network for a minute, ten minutes, or the
server's wait up to an hour; audio from a route the turn has left is refused; a cancel never falls
back. This spec states what Alpha feeds it and what Alpha tells the owner: which key an account
has, which Cloud limit a refusal names, what each route sends and how the privacy row names it.
One build ships the on-device models, so the route is decided at run time and never by a setting.

## Story: Use Cloud speech when I have it, and my phone otherwise

> As the owner, I want my voice handled by Eliza Cloud while I am signed in to it, by Cartesia when
> I installed my own key, and by my phone otherwise, so that voice always works and I choose where
> it goes by how I set up my account.

### A Cloud account speaks under its credential, own keys under their revision only with a Cartesia key, and no account has no network key

Own keys without a Cartesia key stay on the phone: the owner chose not to use Cloud.

```quint
type Account = NoAccount | CloudAccount({ credential: int }) | OwnKeys({ revision: int, cartesia: bool })
type NetworkKey = NoNetworkKey | CloudKey({ ofCredential: int }) | DirectKey({ ofRevision: int })
pure def keyOf(a: Account): NetworkKey = match a {
  | CloudAccount(c) => CloudKey({ ofCredential: c.credential })
  | OwnKeys(o) => if (o.cartesia) DirectKey({ ofRevision: o.revision }) else NoNetworkKey
  | NoAccount => NoNetworkKey
}
pure def lawOwnKeysWithoutCartesiaHaveNoNetworkKey(revision: int): bool =
  keyOf(OwnKeys({ revision: revision, cartesia: false })) == NoNetworkKey
pure def lawASignedInAccountSpeaksUnderItsCredential(credential: int): bool =
  keyOf(CloudAccount({ credential: credential })) == CloudKey({ ofCredential: credential })
```

## Story: Stay within my plan's voice limits

> As a Cloud member, I want voice to move to my phone when my plan's per-minute or allowance limit
> is reached, and to be told when Cloud voice is back, so that I never pay for speech my plan does
> not cover.

### A Cloud refusal's limit is a rate limit, a used allowance, a missing plan or a billing refusal, with a wait of one second to a day

The catalog's per-minute limits answer 429 with a wait; a wait below zero or above 86,400 seconds
is no wait, a reset more than 400 days away is no reset, and only a short lower-case limit code is
read, from a body of at most 16 KiB. The limit goes to the route as the account reports it; the
message names the plan and when to try again, and a recording is kept for an explicit retry.

```quint
type LimitKind = RateLimit | AllowanceUsed | PlanRequired | BillingRefused
pure val maxWaitSeconds = 86400
pure val maxResetDays = 400
pure def boundedWaitSeconds(seconds: int): int = if (seconds < 0 or seconds > maxWaitSeconds) 0 else if (seconds < 1) 1 else seconds
pure val secondsValues = Set(-1, 0, 1, 86400, 86401)
pure def lawAStatedWaitIsBounded(seconds: int): bool = {
  val w = boundedWaitSeconds(seconds)
  w == 0 or (w >= 1 and w <= maxWaitSeconds)
}
pure def limitTellsAWait(kind: LimitKind, waitSeconds: int): bool = kind == RateLimit and boundedWaitSeconds(waitSeconds) >= 1
pure def lawOnlyARateLimitTellsItsWait(kind: LimitKind, waitSeconds: int): bool = limitTellsAWait(kind, waitSeconds) implies kind == RateLimit
```

## Story: Know what leaves my phone when I talk

> As the owner, I want to know, where I start voice and in Settings, what Cloud or Cartesia speech
> receives, so that nothing leaves my phone without my knowing.

### Network speech receives my audio, the words used to decide my turn has ended, and the reply text; the phone sends nothing

Cloud also receives the transcript Clef reads to end a turn; Cartesia never does, since Clef runs
in Cloud.

```quint
type Route = Device | Cloud | Direct
type Sends = { audio: bool, endOfTurnWords: bool, replyText: bool, recipient: Route }
pure def sendsOf(route: Route): Sends =
  { audio: route != Device, endOfTurnWords: route == Cloud, replyText: route != Device, recipient: route }
pure def lawOnThePhoneNothingLeaves(route: Route): bool = {
  val s = sendsOf(route)
  (route == Device) iff not(s.audio or s.endOfTurnWords or s.replyText)
}
```

### The privacy row names the route in use now, and says no speech is available when the phone's own is not and nothing else is

```quint
type PrivacyRoute = OnPhone | ViaCloud | ViaCartesia | RouteUnavailable
pure def privacyOf(route: Route, onDevice: bool): PrivacyRoute =
  if (route == Cloud) ViaCloud else if (route == Direct) ViaCartesia else if (onDevice) OnPhone else RouteUnavailable
pure def lawTheRowLeavesThePhoneExactlyWhenSpeechDoes(route: Route, onDevice: bool): bool =
  (privacyOf(route, onDevice) == ViaCloud or privacyOf(route, onDevice) == ViaCartesia) iff sendsOf(route).audio
```
