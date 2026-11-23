# eliza-browser-maps: develop → vibestack parity findings

Slice: develop `plugins/plugin-browser`, `plugin-native-browser-surface`, `plugin-web-search`, `plugin-maps`,
`plugin-native-location` against vibestack `packages/browser`, `packages/maps`, `spec/{browser,maps}`.
Trees: `eliza-develop` at 7a124190a1, `eliza-vs` at 769b4f00d (branch vibestack-dp), `alpha-vs` at 3d7ca9727,
`alpha-develop` at dd63c6bc6. Read-only; nothing was built, generated or run. Paths below are relative to
`/home/shaw/.cache/vibeaudit/` (`dev:` = eliza-develop, `vs:` = eliza-vs, `port:` = alpha-vs, `legacy:` = alpha-develop).

## Summary

| Class | Count |
| --- | --- |
| OK | 23 |
| NOT_APPLICABLE | 12 |
| UNIMPLEMENTED | 3 |
| MISSING | 10 |
| CHANGED | 8 |
| UNMODELED | 1 |
| UNVERIFIED | 1 |

Verdict: **not at parity**. The Browser half is a faithful port (address grounding constants are identical to
develop's, the control contract and review cards match, history is dispatch-only). The Maps half is a much
smaller rewrite (440 lines of actions against develop's 2,362) and three integration faults make its headline
phone behaviours unreachable in the tree as it stands:

1. the agent looks up the phone's navigation offer by room id while the phone opens it under the conversation
   id, so chat never drives Maps on the phone (gap 01);
2. Maps reads the phone's reported position from `metadata.clientDevice.context.location` while the vibestack
   turn contract (and Alpha's port) carries it at `metadata.observation.location`, so "near me" never uses it
   (gap 02);
3. the vibestack agent reads the open Browser page at `metadata.browserPage` while Alpha's port still sends
   develop's `metadata.clientDevice.browserPage`, so page context and page links never arrive (gap 03).

Beyond those, the Maps routing rules that four ledger rows record as "ported" are registered but never read
(gap 04), and several develop Maps behaviours have no counterpart: the "where am I" lookup, a kind of place near
a named place, a destination searched around its start, a route continued across turns, distance ranking, share
and coverage. Wave 3 names only #40190 of these. The unmerged worktree `~/.cache/vibecut/w3-agentcore`
(commits 2f0c6c5804f, 9f72b29138d, 84a91b77f65) appears to be working on gaps 02, 05, 06, 07 and 08; it is not
in the audited tree and was not audited.

## Gaps

### eliza-browser-maps-01 · CHANGED · high · Chat never reaches Maps on the phone: the relay offer is matched by room id, the phone opens it by conversation id
- Behaviour: during an owner turn the phone offers its Maps navigation; MAPS_NAVIGATION_START / MAPS_SELECT /
  reroute / stop run on the phone while that offer is live for the turn's conversation.
- develop: `dev:packages/agent/src/api/maps-navigation-relay.ts:101-105` (`offer.conversationId === turn.replyConversation.id`),
  client `dev:plugins/plugin-maps/src/client/navigation-relay.ts` (sends `conversationId`).
- vibestack: `vs:packages/maps/src/index.vibe:46` binds `conversationNavigation(relay, message.roomId, () => true)`;
  `vs:packages/maps/src/relay.vibe:271-274,314-317` finds the scope whose `offer.conversationId` equals that value.
  A conversation's id and its room id are two different random UUIDs (`vs:packages/agent/src/conversation/turns.vibe:196-197`,
  message `roomId: room.id` at `:189`). Alpha's port opens the offer with the conversation id
  (`port:apps/app/src/assistant/composer.vibe:371`, `port:apps/app/src/maps/agent.vibe:243-249`) and does not
  replace the default binding (`port:scripts/resident/entry.vibe:24-31`).
- Impact: `navigation` is always undefined for the turn. "Take me to Coit Tower" answers with a directions link
  instead of planning the route on the phone; "show it on the map" returns a card only; reroute and stop answer
  "Your phone isn't connected for navigation right now".
- Smallest fix: upstream binds by the conversation id of the message's room (`deviceConversation(room).id`), or
  Alpha sends `roomId` (it keeps both, `composer.vibe:198`). Add a journey that goes through the real turn route.
- Also: the default binding passes `turnActive = () => true`, so the rule "An accepted agent request belongs to
  the active authenticated turn" (`vs:spec/maps/navigation.md:13`) is not enforced by the bundled plugin; develop
  dropped a pending command once `turn.active` was false (`maps-navigation-relay.ts:102,326,350`).
- Wave 3: not listed.

### eliza-browser-maps-02 · UNIMPLEMENTED · high · "Near me" never uses the position the phone reported (#39989)
- Behaviour: a nearby search uses the position sent with the message when it is recent; only without one does
  the phone get a locate card.
- develop: `dev:plugins/plugin-maps/src/action.ts:391-414` (`observedPosition` via `readClientTurnObservation`), `:1229-1236`; PR #39989.
- vibestack: rule `vs:spec/maps/phonePosition.md:15`; code `vs:packages/maps/src/client/location.vibe:44,57-60`
  reads `metadata.clientDevice.context.location`. The agent's turn route keeps the observation at
  `metadata.observation` (`vs:packages/agent/src/conversation/turns.vibe:99-110`, `turn-context.schema.vibe:42,337-344`)
  and nothing writes `clientDevice.context`. The package test builds that envelope by hand
  (`vs:packages/maps/test/maps.test.vibe:459-461`). Alpha's port sends `observation.location`
  (`port:apps/app/src/assistant/composer.vibe:349-351,372`).
- Impact: every "coffee near me" / "nearest pharmacy" asks the phone for its location; `MAPS_PHONE_POSITION`
  always says the phone reported none.
- Smallest fix: `messageLocation` reads `readTurnContext(message).observation?.location`; test through `parseTurn`.
- Wave 3: not listed (ledger row 39989 says `already_present`).

### eliza-browser-maps-03 · CHANGED · high · The open Browser page never reaches the agent: wire path moved from `clientDevice.browserPage` to `browserPage` (#40067, #40193)
- develop: `dev:packages/contracts/src/client-turn-observation.ts:59-60,457` (carried as `clientDevice.browserPage`),
  `dev:plugins/plugin-browser/src/providers/workspace.ts:27`.
- vibestack: `vs:packages/agent/src/conversation/turns.vibe:99-110` and `message-service.vibe:119` read top-level
  `metadata.browserPage`; `vs:packages/browser/src/proposal.vibe:98` reads the page links from the same key
  (rule `vs:spec/browser/requestGrounding.md:55`). Alpha's port sends `clientDevice: { browserPage }`
  (`port:apps/app/src/assistant/composer.vibe:372`, `port:apps/app/src/assistant/ports.vibe:130`).
- Impact: "summarize this page" has no page; "open the second story" is refused as `DEVICE_BROWSER_NOT_REQUESTED`.
- Smallest fix: Alpha passes `browserPage` through `encodeTurnContext` and drops `clientDevice` (one line), or
  upstream also accepts the develop path.
- Wave 3: A names #40193's final shape, not this path. Not listed.

### eliza-browser-maps-04 · UNIMPLEMENTED · medium · Maps turn-routing rules are registered and never read (#39882, #39898, #39900, #39930, #39955)
- develop: rules `dev:plugins/plugin-maps/src/plugin.ts:511-595`, read by
  `dev:plugins/plugin-assistant/src/services/message/stage1-evaluators.ts:130,348,380`.
- vibestack: rule `vs:spec/maps/routing.md:15`; `vs:packages/maps/src/routing.vibe:172-185` registers them;
  `getDirectActionRoutingRules` has no caller anywhere in `vs:packages` (only its definition,
  `core/src/runtime/direct-action-routing.vibe:52`, and the `protocol.vibe:1035` export).
- Impact: the go-to/get-to/near grammar that ledger rows 39898, 39900, 39955 and 39903 record as ported is dead
  code. Vibestack has no Stage 1 gate (`vs:spec/agent/conversation/planning.md:32`), so the planner still sees
  every MAPS_* tool; whether "directions to Coit Tower" opens the Maps view without a route again, or "the
  first one" reaches the action that asked, now depends on the model alone. Not observed.
- Inside the dead code, three develop shapes are also absent: bare "pharmacy near the Ferry Building" and a
  lowercase spoken anchor (`plugin.ts:395-434` vs `routing.vibe:49`), "go to 1 Infinite Loop"
  (`plugin.ts:282-283` vs `routing.vibe:22`), and a shorter not-a-place-kind list (`routing.vibe:35`).
- Smallest fix: read the rules in turn planning (the unmerged `w3-surfaces/packages/agent/src/conversation/planning.vibe:98-107`
  reads them only for whole-request owners, which Maps rules are not), or delete the rules and the spec rule.
- Wave 3: not listed.

### eliza-browser-maps-05 · MISSING · medium · "Where am I" has no lookup at the phone's position (#39989)
- develop: `dev:plugins/plugin-maps/src/action.ts:1088-1196` (MAPS_PLACE with latitude/longitude and no query
  reverse geocodes), prompt `dev:plugins/plugin-assistant/src/services/message/client-observation-context.ts:18`
  ("Never guess a street, neighborhood or city from coordinates: ... call MAPS_PLACE with these latitude and longitude").
- vibestack: MAPS_PLACE takes `query`, `useCurrentLocation`, `limit` only (`vs:packages/maps/src/plugin.vibe:313-325`);
  the service has no reverse call (`service.vibe:130`) though Cloud serves one (`vs:packages/cloud/src/services/maps.vibe:267,324`);
  the screen note shows the model the raw coordinates with no instruction (`vs:packages/agent/src/conversation/message-service.vibe:118-123`).
- Impact: the model can only recite coordinates or guess a city from them.
- Smallest fix: a point lookup on MAPS_PLACE over `/api/v1/maps/reverse`, plus the instruction sentence.
- Wave 3: E names only the #40190 refinement; the lookup it refines is not listed.

### eliza-browser-maps-06 · MISSING · medium · A rough phone position should name only the area (#40190)
- develop: `dev:plugins/plugin-maps/src/action.ts:416-470,1108-1140` (`COARSE_POSITION_METERS`, `addressArea`).
- vibestack: no counterpart (depends on gap 05).
- Wave 3: listed (E).

### eliza-browser-maps-07 · MISSING · medium · A kind of place near a named place is not searched around that place (#39930, #39990)
- develop: `dev:plugins/plugin-maps/src/action.ts:732-797` (`anchoredPlaceQuery`, `searchAnchor`), `:1217-1262`,
  card `near` at `:1318`; "the nearest pharmacy to the Ferry Building" is not a near-me request (`:689-700`).
- vibestack: `vs:packages/maps/src/plugin.vibe:108-125` searches the whole phrase, or asks for the phone's
  location when the planner sets `useCurrentLocation`; `plugin.vibe:48` reads "nearest pharmacy to the Ferry
  Building" as near-me; `cards.vibe:49` keeps `near` but nothing sets it.
- Impact: "pharmacy near the Ferry Building" returns whatever the provider ranks for that sentence, or a locate card.
- Wave 3: not listed.

### eliza-browser-maps-08 · CHANGED · medium · Place resolution asks "which one?" more often and never looks for a destination around its start (#39898, #39925)
- develop: `dev:plugins/plugin-maps/src/place-choice.ts:118-170` (`dominantPlace`: a matching top result wins when
  the rest are the same site or mostly nearby), `dev:plugins/plugin-maps/src/action.ts:503-527` (search biased
  around the other endpoint, fallback on unsupported region), `:1447-1460`.
- vibestack: `vs:spec/maps/routing.md:61` takes a place only when exactly one result fits or the search ran near
  a point; `vs:packages/maps/src/plugin.vibe:152-177,189-191` searches both endpoints with no bias. Only the
  exact-name landmark case of #39925 is kept (`:161-164`, `spec/maps/routing.md:107`).
- Impact: "Ferry Building" answered by "Ferry Building Marketplace" plus four others asks a question develop
  did not; "from Coit Tower to Starbucks" may offer branches in other cities.
- Wave 3: not listed (ledger rows 39898/39925 note it as missing).

### eliza-browser-maps-09 · MISSING · medium · A route is not continued across turns, and a route "from here" is refused instead of handed to the phone (#39990, #39842)
- develop: `dev:plugins/plugin-maps/src/action.ts:1334-1500`: a settled endpoint is kept for the next turn
  ("from Chicago"), a picked option is named back, and "from here" returns a `route-origin` locate card
  (`:801-815,1478-1493`).
- vibestack: `vs:packages/maps/src/plugin.vibe:183-185` answers "Ask me to start directions instead"; a missing
  endpoint is "Which destination should I use?" with nothing kept (`:157`).
- Wave 3: not listed.

### eliza-browser-maps-10 · CHANGED · medium · An open "which one?" question stays answerable for ten minutes and only by position (#39903)
- develop: `dev:plugins/plugin-maps/src/place-choice.ts:298-340` (keyed by room and sender; only the next owner
  turn may answer, any later turn closes it), `:359-378` (a reply naming the place or its label also answers).
- vibestack: `vs:spec/maps/routing.md:86`, `vs:packages/maps/src/routing.vibe:74-106` (keyed by room; open for
  ten minutes whatever is said in between; ordinals only).
- Impact: "the second one" about an inbox list, minutes later, still binds to the Maps question once gap 04 is
  fixed; "the one on Market Street" by name does not bind.
- Wave 3: not listed.

### eliza-browser-maps-11 · MISSING · medium · "Nearest" is the closest of the provider's most relevant results, not the closest (#39842)
- develop: `dev:plugins/plugin-maps/src/action.ts:1262-1275` (`rank: "distance"`), `dev:plugins/plugin-maps/src/cloud-adapter.ts:452-470`
  (sent when Cloud reports `distanceRank`; asks for 20).
- vibestack: `vs:packages/maps/src/service.vibe:100-110` sends `query`, `near`, `limit`; `plugin.vibe:121` sorts
  that page. No `rank` in `vs:packages/cloud/src/services/maps.schema.ts`.
- Wave 3: not listed.

### eliza-browser-maps-12 · MISSING · low · No MAPS_SHARE
- develop: `dev:plugins/plugin-maps/src/action.ts:215-243,1812-1920` (owner confirms, then a share link card).
- vibestack: no action (`vs:packages/maps/src/plugin.vibe:311-408`); `cards.vibe:57` still accepts `handoffKind: "share"`.

### eliza-browser-maps-13 · MISSING · low · No MAPS_COVERAGE
- develop: `dev:plugins/plugin-maps/src/action.ts:1782-1811`, `dev:plugins/plugin-maps/src/coverage.ts`.
- vibestack: none; `service.offer()` is used only to refuse a travel mode (`plugin.vibe:186-188`).

### eliza-browser-maps-14 · MISSING · low · A saved place or a coordinate cannot be a destination; MAPS_SAVED no longer says the phone's own list is left out
- develop: `dev:plugins/plugin-maps/src/action.ts:300-356` (`savedPlaceId`, latitude/longitude/name), `:1742-1780`
  ("Places saved only on the phone's Maps screen aren't included.").
- vibestack: `vs:packages/maps/src/plugin.vibe:280-286,332-398` (query and placeId only).
- Legacy Alpha registered no saved-places host, so only the destination and the sentence are lost.

### eliza-browser-maps-15 · CHANGED · low · Travel-mode parameter lost its everyday words (#39829)
- develop: `dev:plugins/plugin-maps/src/action.ts:2114,2342` ("walk (walking, on foot), bicycle (bike, cycling), transit (train, subway, bus...) or drive").
- vibestack: `vs:packages/maps/src/plugin.vibe:296` ("drive, walk, bicycle or transit; drive when the owner named none.").
  The ledger cites `plugin.vibe:260-298` for these words; they are not there.

### eliza-browser-maps-16 · CHANGED · low · Maps replies are no longer the tool's own verified text
- develop: every result sets `userFacingText` and `verifiedUserFacing: true` (`dev:plugins/plugin-maps/src/action.ts:161,200,945-1000`),
  missing input is a form block (`:142-173`), failures carry `retryable`/`retryAfterMs` (`:917-940`), the route
  card carries provider warnings.
- vibestack: `reply()` returns `text` and `data.card` only (`vs:packages/maps/src/plugin.vibe:90-92`); only
  MAPS_SAVE is verified (`:277`); `warnings: []` always (`:205`); failures carry `code` only (`:288-293`).
  Wording differs throughout ("Confirm on the phone to start navigation" → "Press Start on the phone to begin guidance").

### eliza-browser-maps-17 · CHANGED · low · Own-position words and trailing courtesy are read more narrowly (#39990)
- develop: `dev:plugins/plugin-maps/src/action.ts:643-680` ("right here", "where I am right now", "my phone",
  "near me please", "that's open now").
- vibestack: `vs:packages/maps/src/plugin.vibe:47-54`. #39939's "near by" is present (`:49`, vibestack #40201).

### eliza-browser-maps-18 · CHANGED · low · A reported position worse than 5 km is ignored
- develop: no accuracy bound for a nearby search (`dev:plugins/plugin-maps/src/action.ts:391-414`).
- vibestack: `vs:spec/maps/phonePosition.md:15-30` (`nearbyMaxAccuracy = 5000`). Deliberate and specified; noted
  because a network-only fix now leads to a locate card.

### eliza-browser-maps-19 · MISSING · low · No "maps" context is registered and no Maps action declares one (#39882)
- develop: `dev:plugins/plugin-maps/src/plugin.ts:89-99,505`, `action.ts` `contexts: ["maps", ...]`.
- vibestack: `routing.vibe:174` and `plugin.vibe:416` name `contexts: ["maps"]`; nothing registers it and the
  eight actions declare none. Effect on the vibestack planner not verified.

### eliza-browser-maps-20 · UNMODELED · low · Agent-side Maps action behaviour has code and no rule
- `vs:packages/maps/src/plugin.vibe`: result ordering and distances (`:121-122`), the awaiting-location and
  confirmation replies (`:219-230`), the directions-link fallback (`:208-217,249`), the travel-mode offer check
  (`:186-188`), the action catalogue and parameters (`:311-408`); `relay.vibe:84-98` failure sentences;
  `cards.vibe` card shapes. `spec/maps/*.md` has no rule for any of them.

### eliza-browser-maps-21 · UNIMPLEMENTED · low · Six browser specs have rules and no code
- `vs:spec/browser/{arbitration,clipboardLease,inference,manualActivity,paymentControl,websiteGoal}.md` (25 rules)
  and the second story of `remoteControl.md:46`: no file in `vs:packages` imports their generated modules;
  `packages/browser/src` holds only `contract`, `grounding`, `native-browser`, `native-command`, `proposal`.
- develop counterparts (`dev:plugins/plugin-browser/src/{task-actuator,credential-clipboard,browser-command-authority}.ts`,
  `remote-control/`) were not in the phone's mobile entry and legacy Alpha imported none of them, so no phone behaviour is lost.
  `spec/browser/index.md` describes a package that does not exist.

### eliza-browser-maps-22 · MISSING · low · Native browser history no longer keeps visit times (#39942)
- develop: `dev:plugins/plugin-native-browser-surface/android/src/main/java/ai/eliza/plugins/browsersurface/BrowserSessionStore.java:34-70`.
- vibestack: `vs:packages/os/android/browser-surface/src/main/java/ai/eliza/plugins/browsersurface/BrowserSessionStore.java:34-56`
  drops `visitTimes`. Legacy Alpha kept visit times in memory only (`legacy:apps/app/src/prototype/browser-adapter.ts:130`),
  so nothing the phone shipped depends on it. In `packages/os`, outside this slice; reported for the os owner.

### eliza-browser-maps-23 · UNVERIFIED · low · Formal state of the two packages
- Every `###` rule in `spec/maps` (27) and `spec/browser` (41) has a Quint block.
- `vs:spec/lock.json` records only `spec/app/*.md` and `spec/index.md`; no maps or browser rule is accepted there.
- Proof files: `spec/browser/requestGrounding.proof.dfy` only; none under `spec/maps`.
- Conformance drivers: ten under `packages/maps/test/drivers` (none for `phonePosition`, `routing`, `savedPlaces`,
  which are pure definitions); none under `packages/browser/test`. `maps.test.vibe` and `browser.test.vibe` are
  hand-written journeys. Whether `check` passes was not run.

## Contract mismatches with Alpha's port

1. **Relay conversation id** (gap 01): `port:apps/app/src/assistant/composer.vibe:371` opens the offer with the
   conversation id; `vs:packages/maps/src/index.vibe:46` looks it up by `message.roomId`.
2. **Phone position path** (gap 02): port sends `metadata.observation.location`; `vs:packages/maps/src/client/location.vibe:44,57-60`
   reads `metadata.clientDevice.context.location`.
3. **Browser page path** (gap 03): port sends `metadata.clientDevice.browserPage`; `vs:packages/agent/src/conversation/turns.vibe:99`
   and `vs:packages/browser/src/proposal.vibe:98` read `metadata.browserPage`.
4. Outside this slice, same envelope: `vs:packages/agent/src/device-actions/agenda.vibe:15` expects
   `metadata.clientDevice.{context, calendarAgendaSource}`; the port sends neither.
5. Names: all 50 names the port imports from `@elizaos/plugin-browser{,/contract,/grounding,/native-command}` and
   `@elizaos/plugin-maps{,/cards,/client/contracts,/client/device-navigation,/client/guidance,/client/location,/client/route-distance,/client/saved-places}`
   are exported by the matching `eliza-source` entry in `eliza-vs`. None missing. Shapes were checked for the
   relay messages, the Maps card and the Browser control operations only.
6. A new conversation's first turn sends `conversationId: ""` (`composer.vibe:371`), which the relay refuses as not a
   UUID (`relay.vibe:22-25`); the client then sends without a relay. Same on develop.

## Confirmed OK

| Behaviour | develop | vibestack rule | vibestack code |
| --- | --- | --- | --- |
| History dispatch is not completion (#40019) | `plugin-browser/src/mobile.ts:400-460` | `spec/browser/control.md:139` | `browser/src/native-browser.vibe:147-177` |
| Phone offers only back, forward, reload (#39842; Alpha set `ELIZA_NATIVE_BROWSER_COMMANDS`) | `mobile.ts:74-91`, `legacy:android/.../AlphaLocalAgentPlugin.java:614` | `spec/browser/remoteControl.md:16` | `browser/src/native-command.vibe:5` |
| History bound to the observed tab and revision | `plugin-browser/src/native-client-command.ts` | `spec/browser/remoteControl.md:16` | `native-command.vibe:81-110` |
| History has one home (control or BROWSER) | `browser-contract.ts:25` | `spec/browser/control.md:114` | `native-browser.vibe:202`, `proposal.vibe:81-82` |
| Typed-address grounding, negation veto, rank order | `packages/contracts/src/browser-request-grounding.ts:383-452` | `spec/browser/requestGrounding.md:12` | `browser/src/grounding.vibe:422-454` (constants identical) |
| Direct open only for a whole-message request | `browser-request-grounding.ts:283-336` | `spec/browser/requestGrounding.md:86` | `grounding.vibe:204-229`, `proposal.vibe:113-114` |
| Spoken "dot" addresses are reviewed | `browser-request-grounding.ts:338-378` | `spec/browser/requestGrounding.md:86` | `grounding.vibe:232-250` |
| Page links ground an open, always reviewed (#40193) | `browser-request-grounding.ts:386,450-452` | `spec/browser/requestGrounding.md:55` | `grounding.vibe:443-454`, `proposal.vibe:97-115` |
| Open in a new tab only where negotiated | `browser-contract.ts:28` | `spec/browser/requestGrounding.md:102` | `proposal.vibe:63-74,109-112` |
| Refused proposal copy "Tell me the address, like example.com." (#40106) | `plugin-assistant/.../device-actions/action.ts` | `spec/browser/control.md:244` | `proposal.vibe:44-49` |
| Controls need their capability; close-all is its own form | `browser-contract.ts:85-102` | `spec/browser/control.md:16,60,219` | `contract.vibe:87-146`, `proposal.vibe:142-143` |
| Control parsing refuses, never truncates | `browser-contract.ts:119-195` | `spec/browser/control.md:16` | `contract.vibe:183-224` |
| Review card text per control, tab list for close-all | `browser-contract.ts:197-263` | `spec/browser/control.md:60,90` | `contract.vibe:245-282` (text identical) |
| Search carries only typed words | `browser-request-grounding.ts:471-537` | `spec/browser/control.md:178,195` | `grounding.vibe:462-502` |
| Agent prepares a route, owner starts guidance | `plugin-maps/src/client/device-navigation.ts` | `spec/maps/navigation.md:13` | `maps/src/client/device-navigation.vibe:240-340` |
| Route time and length in the phone's answer (#39943) | `navigation.ts:17-35` | `spec/maps/navigation.md:13` | `device-navigation.vibe:269`, `relay.vibe:178-184` |
| Stale or future fix skipped, watch kept (#39943) | `client/native-location.ts` | `spec/maps/navigationService.md:166` | `client/location.vibe:190-196` |
| Phone refusal codes and its own sentence (#39923, #39990) | `client/navigation-relay.ts:103-112`, `device-navigation.ts` | `spec/maps/relay.md:14` | `device-navigation.vibe:69,87-89,559`, `relay.vibe:84-98` |
| Relay: one command, at most once, 30 s, owner-only route | `packages/agent/src/api/maps-navigation-relay.ts` | `spec/maps/relay.md:14,48`, `navigation.md:104` | `relay.vibe:111-311` |
| Locality-qualified place (#39903) | `place-choice.ts:63-93` | `spec/maps/routing.md:61` | `plugin.vibe:136-150,159-168` |
| Same-named nearby areas are one place (#39925) | `place-choice.ts:146-156` | `spec/maps/routing.md:107` | `plugin.vibe:161-164` |
| Idempotent assistant save with receipt | `action.ts:1620-1740`, `store.ts` | `spec/maps/savedPlaces.md:43` | `saves.vibe:79-131`, `plugin.vibe:267-278` |
| Place categories bounded to 32 (#39946) | `client/contracts.ts` | `spec/maps/cloudConnection.md:79` (schema only) | `client/contracts.vibe:74,175-194` |

Present in `packages/os`, not audited in depth: #39841 (`BrowserSplitResize.java`), #39859 manual sign-in surface
(`BrowserSurfacePlugin.kt:434-459,1116-1121`), #39998 (`os/browser/src/page-command.mjs` `fromDocumentStart`),
the five `plugin-native-browser-surface/src` modules legacy Alpha imported (`os/src/bridges/{browsing-session,page-reading,page-source,tab-host}.vibe`,
`os/src/browser/address.ts`), and native location (`LocationFixReader.kt`, `LocationPlugin.kt` byte-identical).

## Not applicable (12)

| Item | Why |
| --- | --- |
| #40211 workspace provider note | vibestack has no browser workspace provider; the phone entry (`mobile.ts`) never had one |
| #39788 Parallel web-search endpoint | `plugin-web-search` was not in the phone agent; no vibestack counterpart by design |
| #39715 package metadata in native-location / browser-surface | SSH/desktop shell cleanup, no behaviour |
| #39737 `desktopTabEnabled` | desktop only |
| #39984 Maps view `responseContext: "maps"` | upstream Maps view; vibestack opens views as a device operation (also wave 3 B) |
| Maps view capabilities and `serverInteract` (`capabilities.ts`, `interact.ts`) | upstream MapsView; Alpha owns its Maps screen |
| `client/regional-provider.ts` | development prototype behind test mocks (`legacy:apps/app/src/maps/regional-provider.ts:6-12`) |
| `client/{maps-screen,map-plane,map-layout,state,share}.ts` | Alpha's own renderer and controller |
| BROWSER commands other than back/forward/reload | Alpha restricted them (`AlphaLocalAgentPlugin.java:614`) |
| Desktop workspace, Stagehand, remote-control, task actuator, autofill login | not in the mobile entry |
| Native `captureSurface`, `clearSurfaceStorage`, `setTaskOrigins`, `setTextZoom`, stoppable host saves (#39775) | Grace host only; no caller in either Alpha tree |
| MAPS_NAVIGATE as its own action | folded into MAPS_NAVIGATION_START's link fallback (`plugin.vibe:248-249`) |

## Not covered

- `packages/os` browser surface (Android and `os/browser/src`) beyond the spot checks above; 12 Android files differ from develop.
- `packages/cloud` Maps service and provider (sharp tiles, credits, coverage, metering) and Alpha's own Cloud.
- The Browser proposal family's prompts against `dev:plugins/plugin-assistant/src/services/device-actions/tools.ts`
  (only the refusal copy and the grounding were compared).
- `packages/maps/src/client/{cloud-provider,guidance,route-distance,saved-places,observation,navigation-fix}.vibe`
  line by line against develop; only PR-touched behaviour and exported names were checked.
- `packages/agent` device operations for Maps and Browser (`maps_read_selected`, `open_view`, capability negotiation,
  the header gap wave 3 G names).
- Whether a conversation id ever equals its room id on a path other than `createConversation`.
- Nothing was run: no typecheck, generation, Quint, Dafny or tests.
- Unmerged wave 3 worktrees (`w3-agentcore`, `w3-browser`, `w3-surfaces`) were read only to see whether they touch a gap.
