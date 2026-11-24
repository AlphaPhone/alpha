# Delivery of the agent's Maps commands

The agent reaches [Maps](./index.md) on the phone through two deliveries,
and both run each effect at most once. Relay commands, which the agent
sends while a turn's offer is open, carry over to the next offer when the
phone never received them, are delivered again at most three times when a
lease lapses, and run only the first time the phone sees their number, with
one receipt that is never retried. A view navigation the agent asks for,
bringing Maps forward with a place or a route, arrives as a grant the page
claims within 5 seconds; its effect runs only under a claim the host
returned, a failure before the effect sends one negative result within 1.5
seconds, and a claim whose answer was lost stays unknown and is never
replayed. When the page never received the grant, the host's 10-second lease
expires and the agent may deliver it again: the page runs the effect of a
redelivery only if it never ran that effect, so recovery cannot repeat it.

## Story: Carry my agent's Maps requests to the phone once

> As the owner, I want each Maps request of my agent to act on the phone at
> most once, even when an answer is lost or a request is sent again.

### Delivery holds the relay offer and the navigation claim under way

`effectKey` names what a navigation does, the same across a redelivery;
`request` names one delivery of it.

```quint
type ClaimPhase = NoClaim | Claiming | Claimed | Acknowledged | CleanedUp | ClaimUnknown
type Delivery = {
  offer: int, accepted: int, connected: bool,
  claimPhase: ClaimPhase, request: int, effectKey: int, claim: int, applied: Set[int], negatives: int,
}
type Effect = Navigate({ effectKey: int }) | Positive({ claim: int }) | Negative({ claim: int })
type Moved = { state: Delivery, out: List[Effect] }

pure val initial: Delivery = {
  offer: 0, accepted: 0, connected: false,
  claimPhase: NoClaim, request: 0, effectKey: 0, claim: 0, applied: Set(), negatives: 0,
}

pure val claimDeadlineMs = 5000
pure val negativeCleanupMs = 1500
pure val hostLeaseMs = 10000
pure val turnValues = Set(1, 2, 3)
pure val requestValues = Set(1, 2, 3)
pure val effectKeyValues = Set(1, 2)
pure val claimValues = Set(0, 7, 8)
```

### The relay belongs to the last turn whose offer was acknowledged, and only that turn's end closes it

A turn opens its offer; the agent must acknowledge with no command
outstanding before the relay is connected. A refused or failed offer falls
back to a plain chat turn.

```quint
pure def canOpenOffer(s: Delivery, turn: int): bool = turn == s.offer + 1

pure def openOffer(s: Delivery, turn: int): Delivery = { ...s, offer: turn }

pure def canOfferSettles(s: Delivery, turn: int, acknowledged: bool): bool = turn == s.offer and turn != s.accepted

pure def offerSettles(s: Delivery, turn: int, acknowledged: bool): Delivery =
  if (acknowledged) { ...s, accepted: turn, connected: true } else s

pure def canEndTurn(s: Delivery, turn: int): bool = turn >= 1 and turn <= s.offer

pure def endTurn(s: Delivery, turn: int): Delivery = if (turn == s.accepted) { ...s, connected: false } else s

pure def alwaysTheRelayIsTheAcknowledgedTurns(s: Delivery): bool = s.connected implies s.accepted >= 1
```

### A navigation runs only under a returned claim, and a redelivery never runs it twice

A claim that returned no number within 5 seconds is unknown, and never
tried again.

```quint
pure def canGrantArrives(s: Delivery, request: int, effectKey: int): bool =
  request > s.request and (s.claimPhase == NoClaim or s.claimPhase == Acknowledged or s.claimPhase == CleanedUp or s.claimPhase == ClaimUnknown)

pure def grantArrives(s: Delivery, request: int, effectKey: int): Delivery =
  { ...s, claimPhase: Claiming, request: request, effectKey: effectKey, claim: 0 }

pure def canClaimSettles(s: Delivery, request: int, claim: int): bool = s.claimPhase == Claiming and request == s.request

pure def claimSettles(s: Delivery, request: int, claim: int): Delivery =
  if (claim > 0) { ...s, claimPhase: Claimed, claim: claim } else { ...s, claimPhase: ClaimUnknown }

pure def canApplyClaimed(s: Delivery, request: int): bool = s.claimPhase == Claimed and request == s.request

pure def applyClaimed(s: Delivery, request: int): Moved =
  if (s.applied.contains(s.effectKey)) { state: { ...s, claimPhase: Acknowledged }, out: List(Positive({ claim: s.claim })) }
  else {
    state: { ...s, claimPhase: Acknowledged, applied: s.applied.union(Set(s.effectKey)) },
    out: List(Navigate({ effectKey: s.effectKey }), Positive({ claim: s.claim })),
  }

pure def canFailBeforeEffect(s: Delivery, request: int): bool = s.claimPhase == Claimed and request == s.request

pure def failBeforeEffect(s: Delivery, request: int): Moved =
  { state: { ...s, claimPhase: CleanedUp, negatives: s.negatives + 1 }, out: List(Negative({ claim: s.claim })) }

pure def alwaysAClaimedNavigationHasItsNumber(s: Delivery): bool = s.claimPhase == Claimed implies s.claim > 0

pure def stepANavigationNeedsAClaim(before: Delivery, via: str, after: Delivery, out: List[Effect]): bool =
  out.some(e => match e { | Navigate(x) => true | _ => false })
    implies (via == "applyClaimed" and before.claimPhase == Claimed and before.claim > 0 and not(before.applied.contains(before.effectKey)))

pure def stepAnUnknownClaimIsNeverReplayed(before: Delivery, via: str, after: Delivery): bool =
  (before.claimPhase == ClaimUnknown and after.request == before.request) implies after.claimPhase == ClaimUnknown

pure def sometimesRedeliveredWithoutRepeating(s: Delivery): bool = s.claimPhase == Acknowledged and s.request >= 2 and s.applied.size() == 1

pure def sometimesCleanedUp(s: Delivery): bool = s.negatives >= 1
```
