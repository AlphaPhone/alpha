# Relay delivery and redelivery

The agent reaches the phone's Maps through two deliveries, and both run each
effect at most once. Relay commands (`POST /api/client-devices/maps-navigation`,
protocol 1) follow `@elizaos/plugin-maps` relay delivery: a command the phone
never received carries over to its next offer, a lapsed lease redelivers it at
most three times, and the phone runs it only the first time it sees its id and
sends one receipt that is never retried. This spec is which turn's offer the
phone advertises, and the view navigation. A view navigation
the agent asks for (bringing Maps forward with a place or route) arrives as a
grant the renderer claims within 5 seconds; an effect runs only under a claim
the host returned, a failure before the effect sends one negative result
within 1.5 seconds, and a claim whose answer was lost stays unknown and is
never replayed. When the renderer never received the grant, the host's
10-second lease expires and the agent may deliver again: the renderer runs
the effect of a redelivery only if it never ran that effect, so recovery
cannot duplicate it.

## Domain

### Delivery holds the relay offer and the navigation claim in progress

`effectKey` identifies what a navigation does, the same across a redelivery;
`request` identifies one delivery of it.

```quint
type ClaimPhase = NoClaim | Claiming | Claimed | Acknowledged | CleanedUp | ClaimUnknown
type Delivery = {
  offer: int, accepted: int, connected: bool, relay: bool,
  claimPhase: ClaimPhase, request: int, effectKey: int, claim: int, applied: List[int], negatives: int,
}
type DeliveryEffect = ApplyNavigation({ effectKey: int })
  | SendPositive({ claim: int }) | SendNegative({ claim: int })
type DeliveryStep = { state: Delivery, out: List[DeliveryEffect] }
pure val initial: Delivery = {
  offer: 0, accepted: 0, connected: false, relay: false,
  claimPhase: NoClaim, request: 0, effectKey: 0, claim: 0, applied: List(), negatives: 0,
}
pure val claimDeadlineMs = 5000
pure val negativeCleanupMs = 1500
pure val hostLeaseMs = 10000
pure val turnValues = Set(1, 2, 3)
pure val requestValues = Set(1, 2, 3)
pure val effectKeyValues = Set(1, 2)
pure val claimValues = Set(0, 7, 8)
```

## Story: Carry my agent's Maps requests to the phone once

> As the owner, I want each Maps request of my agent to act on the phone at
> most once, even when an answer is lost or a request is sent again.

### The relay belongs to the last accepted turn, and only that turn's end clears it

A turn opens its offer; the server must acknowledge protocol 1 with no command
outstanding before the relay is connected. A refused or failed open falls
back to a plain chat turn.

```quint
pure def canOpenOffer(s: Delivery, turn: int): bool = turn == s.offer + 1
pure def openOffer(s: Delivery, turn: int): Delivery = { ...s, offer: turn }
pure def canOfferSettles(s: Delivery, turn: int, acknowledged: bool): bool = turn == s.offer and turn != s.accepted
pure def offerSettles(s: Delivery, turn: int, acknowledged: bool): Delivery =
  if (acknowledged) { ...s, accepted: turn, connected: true, relay: true } else s
pure def canEndTurn(s: Delivery, turn: int): bool = turn >= 1 and turn <= s.offer
pure def endTurn(s: Delivery, turn: int): Delivery = if (turn == s.accepted) { ...s, connected: false, relay: false } else s
pure def alwaysTheRelayIsTheAcceptedTurns(s: Delivery): bool = (s.relay iff s.connected) and (s.connected implies s.accepted >= 1)
```

### A navigation effect runs only under a returned claim, and a redelivery never runs it twice

A claim that returned no id within 5 seconds is unknown and never retried.

```quint
pure def canGrantArrives(s: Delivery, request: int, effectKey: int): bool =
  request > s.request and (s.claimPhase == NoClaim or s.claimPhase == Acknowledged or s.claimPhase == CleanedUp or s.claimPhase == ClaimUnknown)
pure def grantArrives(s: Delivery, request: int, effectKey: int): Delivery =
  { ...s, claimPhase: Claiming, request: request, effectKey: effectKey, claim: 0 }
pure def canClaimSettles(s: Delivery, request: int, claim: int): bool = s.claimPhase == Claiming and request == s.request
pure def claimSettles(s: Delivery, request: int, claim: int): Delivery =
  if (claim > 0) { ...s, claimPhase: Claimed, claim: claim } else { ...s, claimPhase: ClaimUnknown }
pure def canApplyClaimed(s: Delivery, request: int): bool = s.claimPhase == Claimed and request == s.request
pure def applyClaimed(s: Delivery, request: int): DeliveryStep =
  if (s.applied.includes(s.effectKey)) { state: { ...s, claimPhase: Acknowledged }, out: List(SendPositive({ claim: s.claim })) }
  else {
    state: { ...s, claimPhase: Acknowledged, applied: s.applied.append(s.effectKey) },
    out: List(ApplyNavigation({ effectKey: s.effectKey }), SendPositive({ claim: s.claim })),
  }
pure def canFailBeforeEffect(s: Delivery, request: int): bool = s.claimPhase == Claimed and request == s.request
pure def failBeforeEffect(s: Delivery, request: int): DeliveryStep =
  { state: { ...s, claimPhase: CleanedUp, negatives: s.negatives + 1 }, out: List(SendNegative({ claim: s.claim })) }
pure def alwaysAnEffectIsAppliedOnce(s: Delivery): bool = s.applied.every(k => s.applied.select(j => j == k).length() == 1)
pure def stepAnEffectNeedsAClaim(before: Delivery, via: str, after: Delivery, out: List[DeliveryEffect]): bool =
  out.some(e => match e { | ApplyNavigation(x) => true | _ => false }) implies via == "applyClaimed" and before.claimPhase == Claimed and before.claim > 0
pure def stepAnUnknownClaimIsNeverReplayed(before: Delivery, via: str, after: Delivery): bool =
  (before.claimPhase == ClaimUnknown and after.request == before.request) implies after.claimPhase == ClaimUnknown
pure def sometimesRedeliveredWithoutDuplicate(s: Delivery): bool = s.claimPhase == Acknowledged and s.request >= 2 and s.applied.length() == 1
pure def sometimesCleanedUp(s: Delivery): bool = s.negatives >= 1
```
