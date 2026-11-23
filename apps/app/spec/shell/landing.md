# Landing

Cloud delegation returns the owner's browser to `delegation-return.html`, a static page locked to
its one script and sending no referrer, which removes the query from its own address and hands it,
unread, to Alpha's landing in the address fragment, which never reaches a server. The landing
removes the return from its address before it decides anything, leaving only its own mark so a
reopened page says to go back to Alpha, and hands the authorization back to Alpha through
`alphaphone://cloud-delegation`. It forwards only a code or the fact that access was denied, never
the provider's error text, and offers no link for a return it cannot vouch for. Its query is
summarised by the shell into counts and validity classes: how many `state`, `code`, `error` and
`error_description` values it holds, whether the state has the 43-character URL-safe shape, whether
the code fits 4096 characters and a description 2000, and whether any other key is present.

## Story: Come back to Alpha after authorizing a connection

> As the owner returning from a provider's consent page, I want one plain way back into Alpha
> that carries only what Alpha needs, and a clear message when the return cannot be used.

### Only a well-formed return with exactly one result is handed back, after the address is cleaned

Exactly one state of the right shape, at most one of each other key and no unknown key; a code or
an error, never both; a description only beside an error. A reopened page with an empty query says
to go back to Alpha.

```quint
type Query = {
  states: int, stateValid: bool, codes: int, codeFits: bool, errors: int,
  descriptions: int, descriptionFits: bool, knownKeys: bool, empty: bool
}
type LandingPhase = LandingNew | LandingParsed | LandingScrubbed | LandingReady | LandingRejected | LandingHandedOff
type Link = NoLink | CodeLink | DeniedLink
type Message = MessageChecking | MessageReopened | MessageInvalid | MessageCancelled | MessageContinue
type Landing = { phase: LandingPhase, query: Query, addressHasQuery: bool, link: Link, message: Message }
pure val validCode: Query = {
  states: 1, stateValid: true, codes: 1, codeFits: true, errors: 0,
  descriptions: 0, descriptionFits: true, knownKeys: true, empty: false
}
pure val initial: Landing = { phase: LandingNew, query: validCode, addressHasQuery: true, link: NoLink, message: MessageChecking }
pure val qValues = Set(validCode, { ...validCode, states: 2 }, { ...validCode, stateValid: false },
  { ...validCode, errors: 1 }, { ...validCode, codes: 0, errors: 1, descriptions: 1 }, { ...validCode, descriptions: 1 },
  { ...validCode, codeFits: false }, { ...validCode, knownKeys: false },
  { ...validCode, states: 0, codes: 0, empty: true })
pure def accepted(q: Query): bool =
  q.states == 1 and q.stateValid and q.codes <= 1 and q.errors <= 1 and q.descriptions <= 1 and
  (q.descriptions == 0 or (q.errors == 1 and q.descriptionFits)) and q.knownKeys and
  (q.codes == 1 or q.errors == 1) and not(q.codes == 1 and q.errors == 1) and (q.codes == 0 or q.codeFits)
pure def canArrive(l: Landing, q: Query): bool = l.phase == LandingNew
pure def arrive(l: Landing, q: Query): Landing = { ...l, query: q, phase: LandingParsed }
pure def canScrub(l: Landing): bool = l.phase == LandingParsed
pure def scrub(l: Landing): Landing = { ...l, addressHasQuery: false, phase: LandingScrubbed }
pure def canValidate(l: Landing): bool = l.phase == LandingScrubbed
pure def validate(l: Landing): Landing =
  if (l.query.empty) { ...l, phase: LandingRejected, link: NoLink, message: MessageReopened }
  else if (not(accepted(l.query))) { ...l, phase: LandingRejected, link: NoLink, message: MessageInvalid }
  else if (l.query.codes == 1) { ...l, phase: LandingReady, link: CodeLink, message: MessageContinue }
  else { ...l, phase: LandingReady, link: DeniedLink, message: MessageCancelled }
pure def canFollow(l: Landing): bool = l.phase == LandingReady
pure def follow(l: Landing): Landing = { ...l, phase: LandingHandedOff }
pure def alwaysTheQueryLeavesBeforeALink(l: Landing): bool = l.link != NoLink implies not(l.addressHasQuery)
pure def alwaysOnlyAcceptedReturnsAreLinked(l: Landing): bool = l.link != NoLink implies accepted(l.query)
pure def alwaysARejectedReturnHasNoLink(l: Landing): bool = l.phase == LandingRejected implies l.link == NoLink
pure def alwaysTheLinkMatchesItsKind(l: Landing): bool =
  (l.link == CodeLink implies l.query.codes == 1) and (l.link == DeniedLink implies (l.query.errors == 1 and l.query.codes == 0))
pure def sometimesCodeHandedBack(l: Landing): bool = l.phase == LandingHandedOff and l.link == CodeLink
pure def sometimesDenied(l: Landing): bool = l.link == DeniedLink
pure def sometimesReopened(l: Landing): bool = l.message == MessageReopened
pure def sometimesInvalid(l: Landing): bool = l.message == MessageInvalid
```
