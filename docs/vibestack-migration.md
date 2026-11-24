# Vibestack migration for Alpha Phone

This is the consumer-side worklist for the shared runtime migration. Alpha
Phone retains ownership of its renderer, package identity, service deployment
and Android admission policy. The upstream work targets Vibestack's Quint
specs, generated contracts, and VibeLang and Effect implementations.

## Source revisions for this audit

| Input | Revision |
| --- | --- |
| Alpha Phone source | `13e53cb19a4`, with local edits excluded from source history |
| Alpha Phone upstream lock | `11040b3555c9a7db51ac2104ee68dd66cdd51046` |
| elizaOS/eliza develop | `a09ea94c9dd6d8815d421844574ef23483d8e4df` |
| elizaOS/eliza Vibestack | `7bd54b6e446cadc2cab20d2415a08c2586b2b3e2` |

The later comparison uses develop `2cd448186c5e209cbfd37e421d54463957ca92d3`
and Vibestack `c793136d16160f8cf4e9f4294cfde68509c04213`. Both descend from
their earlier snapshots. Develop added 361 reachable commits, including 133
first-parent entries outside the older snapshot's history. Vibestack added
90 first-parent entries. These counts describe Git reachability. They do
not establish whether equivalent behavior is present.

The next sample is develop `cac8043196730196806b906e0a1683e1f262f982`
and Vibestack `c5096d2fb75f1660a7915c341467d63969ca780c`. Develop
added one UI screenshot merge. Vibestack added ten first-parent
changes, including Calendar authority, Maps and Workflows parity,
resident agent behavior, and verification sharding. The combined local
checkpoint is `678311573ac` in the upstream worktree. The focused results
below were taken before incorporating those ten changes. The combined checkpoint’s sequential `pnpm verify` run encountered a killed Quint process during generation. Eleven independent tasks finished successfully. Package work that depends on generation still needs a bounded-parallelism run.

Vibestack then advanced to `e47318e1f99876f59bdbea98efbbcfdc0f5317bc` with #40253. It reduces launches in agent rejection tests and preserves the positive boot and health assertion. The combined checkpoint remains on the previous base while verification runs.

The Develop source index now reaches `e94ade1efe612f06d16c583e7d5252e2b66bdf0f` and covers 395 first-parent changes, of which 247 still need behavioral review. The assembled local checkpoint is `eb0ba8027e0` on `codex/alphaphone-vibestack-integration`. Its audited Vibestack base reaches `0d743619956147f3296becd7769c1b14ad48a8d3`. Complete package verification is pending.

The next remote sample is Develop `6cfbe539d5c` and Vibestack `082828fdb07`. At that sample, Develop’s first-parent path had 397 entries from the lock. Five entries are newly observed and three previously reviewed entries moved off that path through the checkpoint merge. The source index retains those three reviewed entries, for 400 distinct changes and 236 still awaiting behavioral review. Vibestack #40357 ports the Develop delta from #40060 through #40299. Merge commit `bfe1ce9145f` resolves the 11 overlaps on `codex/alphaphone-vibestack-reconcile-40357`. The Browser adopts the new guidance shape while keeping the whole-message and sensitive-screen gates. Maps keeps typed unpriced refusals and zero-distance geometry with separate handling for malformed polylines. The planner restores bounded quoted history while preserving the original request and settled tool results. The owner resend uses the actual local hold, while the refusal reports the provider’s retry time. Replies with action results wait for the terminal frame and any prepared-navigation binding is checked there. On the merged revision, planning, model binding and Maps each passed 1,000 Quint traces. All 83, 109 and 28 Dafny obligations passed, respectively. The first Agent and Cloud package run stopped at generation when Quint was killed. The retry reached the Cloud runtime suite.

The observed Vibestack tip `12be0f2d144` records the fixed Develop
baseline and the current owners of the legacy Channel Topic Retirement,
Embedding Write Settlement, and Turn Cancellation models. The local
candidate `4c22c96ba8c` on `codex/alphaphone-vibestack-candidate-12be`
combines that tip with the speech and camera work. The merged camera
and speech model and runtime files match the respective feature
branches. Complete verification of the combined revision remains open.

The separate #40395 speech port at `a3064403385` also settles a
window during the live socket. It is outside the observed Vibestack
tip. The combined Alpha candidate retains the atomic bill-and-receipt
transaction, persisted counters, and distinct TTS close evidence.

### Develop checkpoint review

The two checkpoint merges are compared with their first parents. The
candidate owners below provide a starting point for case-by-case review.
The release gate requires a corresponding route and observed outcome for
each behavior, including changes that already have a Vibestack spec.

| Develop source | User story and remaining qualification |
| --- | --- |
| `3ef2897d983`, `2e4389b1245`, `76bdaf03a44`, `ffdce465620`, `38e8f829a2a`, `0647a8c3f83` | As the owner in Talk, I hear brief progress when work takes time and hear the final answer once even if a muted segment loses its final event. Compare Agent voice and Android speech settlement against missing final events, muted start, directly routed work, multiple actions, delivered cue history and final playback. |
| #40375 | As the owner in Talk, I can retire a speech session while keeping its final usage and avoid reopening a closed transport to settle it. Compare the Cloud speech relay and voice host using STT drain, TTS closure or nondispatch, terminal billing and replay of the original accounting basis after budget rollover. |
| #40379 | As the Wallet owner, I can reconcile an uncertain broadcast by the hash of the bytes that were signed. An RPC result qualifies only if it acknowledges that hash. Compare the Vibestack payment port against mismatched and malformed responses, a transport failure after send, and a failure before dispatch. Alpha defers Wallet under AP-13. |
| `3ef2897d983`, `ca346a5b799`, `43c5bc4d848`, `374cdacb0b4`, `8cd4ef2806a` | As the owner, I text the recipient I named. If I name alternatives I get a question before contact lookup, and if a reviewed text settles I see its result in the original conversation. The Vibestack telephony model has the alternative-recipient rule. Qualify exact name grounding, private owner routing and replay of the settled SMS receipt under the original conversation authority. |
| `3ef2897d983`, `b0d5d9ee4f9`, `7cb07b3846e`, `be396ee2485`, `bde4f769515`, `8207e3c99dd`, `8aa6ed3d995`, `7828271e4f6`, `ceec0ad9025`, `0b9a3629b69` | As the owner, I can ask for a precise availability slot and confirm a save without losing my time range or duration. Compare the Calendar read and planning implementations against the checkpoint fixtures for direct and dictated requests, index zero, trailing errands, preserved save times and registration before chat readiness. For managed Calendar, qualify discovery reuse on the feed step, expiry after completion and a fresh permission check after reading the feed. |
| `3ef2897d983`, `7e8103eb7ff`, `25a68e38fcf`, `c9b0176a2f7` | As the owner, I can open the exact saved note even when the response settles before navigation, and a new checklist is tied to the requested title. Compare Notes and claim-fenced view navigation against the saved-editor and replay fixtures, including stale revision, another active view and duplicate delivery. |
| `3ef2897d983`, `4a667ee9f20`, `a1119d28b5d` | As the owner, I can silence routine runtime notices and still receive failure alerts. Preserve the installed status channel preference. Verify starting, running, restarting and a planned stop on the status channel, and a dismissible terminal failure on the alerts channel, using Alpha’s Android service. |
| `64005b1c053`, `3ef2897d983`, `4090ad44e09`, `9551c5447c2`, #40354 | As the owner, I can dictate a Browser address and keep an unreadable page from reloading unless I request it. The candidate has separate address grounding and withheld-page reload rules. Compare the exact dictated forms, coordinated negation, same-address reopen and explicit refresh through both Browser device entry points. |
| `64005b1c053`, #40344, #40390 | As the owner, my saved bookmarks keep their titles through an update, and an older build still reads their addresses. Vibestack’s Android Browser store currently reads and writes a sealed URL list. Model and implement the optional sanitized title and its separately sealed association to the current list, then qualify title preservation, blank-title clearing, corrupt data handling and removal of stale sidecar titles after a rollback edit. |
| `64005b1c053`, #40343 | As the owner, I can select the gallery photo I just captured through its published MediaStore identity. The device contract gates disclosure by negotiated capability. Qualify the Android capture result and Media Library read of the same volume and positive image row ID, excluding the aggregate volume. Older Android and unavailable or malformed IDs must still allow a successful photo save without an ID. |

The camera reconciliation branch carries `db803c43ef7` and `b0b5835e63b`
from the existing Vibestack port. In `651a7eb2a19`, the native boundary requires one
published row matching the capture URI's row ID. The VibeLang bridge
retains a valid optional ID for a gallery capture with a saved path and
keeps the saved-photo receipt when the optional identity is malformed.
A JVM check passed 12 Camera-to-Media Library ID round trips and 10 input
refusals, including aggregate volumes and the maximum signed row ID.
`8226e64e970` extends the enrolled agent journey to use the returned
volume-qualified key for review and refuse the same row number on another
volume. Commit `2218e20b136` proves that dispatch only adds the issued
preview ticket and observation removes the matching ticket while retaining
the other issued tickets. The camera model passed 1,000 Quint traces and
all 173 Dafny obligations. The enrolled agent journey, shared capture
fixture, Android MediaStore instrumentation and Alpha's
claim-bound consumer wiring remain open. The isolated camera library and
instrumentation APK assembled with Alpha's AndroidX versions. On a
disposable Android 35 emulator, the first fixture run reached the real
MediaStore write before the primary volume attached. Android timed out
the next instrumentation process before its test started. After reboot
and a successful volume query, the same instrumentation APK passed. The
fixture published a 759-byte synthetic image, matched its volume-qualified
ID to the actual row and deleted the fixture. This covers the library's
MediaStore path. Alpha's device claim and both app distributions still
need qualification.

Cloud speech rollover commit `781606c803d` switches the provider counters
to the successor before settling the expired window. The Cloud transaction
commits both charges with the original counters and accounting basis.
PGlite applied all Cloud migrations. The receipt fixture preserved legacy
rows, accepted a complete submitted-counter receipt and rejected three
invalid changes without altering that receipt. The relay model passed
1,000 Quint traces and all 77 Dafny obligations. The socket journeys for
funded and refused third windows remain open.

Commit `94bfed459be` adds a bounded provider shutdown on retirement and
requires a peer-confirmed normal TTS close before measured final
synthesis can settle. An abnormal close or timeout leaves the final
charge conservative, independently of the submitted counters for
an earlier window. The updated relay model passed 1,000 Quint traces and
all 79 Dafny obligations. Commit `1a5c30b6662` proves that a receipt
recorded during live speech belongs to a completed predecessor window.
The companion model passed 1,000 Quint traces and all 116 Dafny
obligations. The normal and abnormal provider closure fixtures and
complete retirement replay journey still need results.

Develop #39875 keeps the historical ElevenLabs fallback settlement key
when no operator voice is configured. The Vibestack Cloud route already
digests the resolved synthesis. Commit `06136077237` adds a model law
and an isolated route fixture for replay under the active default and
for separate billing of an alternate selected voice. Executing the fixture,
adopting legacy settlement keys, and qualifying stored-language catalogue
publication in Alpha remain open.

### Maps and whole-message routing from Develop #39898

| User story | Qualification |
| --- | --- |
| As the owner, I can resolve a route one endpoint at a time and answer one numbered place question. | Develop accepts an exact top result only when nearby results support it and there is no competing nearby branch. It retains settled endpoints and binds a numbered answer to the previous owner turn in the same room, with a ten-minute cap. Qualify named origin then destination, nearby chains, intervening turns and a copied answer. |
| As the owner, I can open the dial pad with the number I gave and review a contact change without disclosing my address book. | A whole keypad request owns the exact authored digits and opens the dial pad without placing a call. The contact-change review receives the same owner-named lookup. Compare the keypad's direct route, the explicit Phone-view combination and an unknown contact with outcome-only readback. |
| As the owner, a whole workflow command reaches the workflow service and I still see choices for a mixed request. | Develop recognizes exact create, rename, remove and list wording. A single admitted whole-request owner can recover a conflicting plan while mixed instructions keep their individual intents. Qualify the Vibestack Workflow action, its approval rules and the matching app view. |
| As the owner, a Browser request and a resumed device read follow my own words. | Compare the strict direct Browser open to tabs and view-only handoffs. Device-read continuation must ground its response in the original host-authored text and redact it at the same boundary. |
| As the owner, the approvals I can act on reflect the current deadlines. | Develop expires lapsed pending approvals and lapsed approved execution leases within the current filtered list. Verify the active owner, action filters, paging, and races with a claim in Vibestack's approval queue. |

The newer Vibestack tip `ee9fef0f001314535557c2054d5e9eacfafc14b1` adds 11 first-parent changes after that base. The integration needs to reconcile these before moving the Alpha pin.

| Change | Behavior or qualification to carry forward |
| --- | --- |
| #40355 | Refuse an unasked reload when the phone withheld the current page. This is the Vibestack counterpart to Develop #40354. Qualify the same-address open, page-text withholding and explicit reload through Alpha. |
| #40332 | Allow an app-opening cue during other planned work. A standalone navigation gets its confirmation after opening the destination. |
| `750c5263548` | Export the reviewed Calendar read machine to clients using the Calendar client entry point. |
| #40356 | Use an empty or out-of-family device proposal as planner feedback. A corrected proposal is the only attempt reported to the owner. |
| #40372 | Send a provider-compatible tool schema with patterns removed and retain the action's own argument validation. |
| #40348 | Give the Browser page schema a valid sample generator and qualify generation accounting. This addresses a skipped generated property on the assembled base. |
| #40322, #40320 | Capture visible section headings and prove a statement row's table columns and owning region. Ambiguous and interactive structures cannot supply that evidence. |
| #40330 | Export the client peer's initial capability state. |
| #40341 | Give core journeys constructive model witnesses for rejected actions, retained commits after transport failure and acknowledged retirement. |
| #40331 | A whole-message request shows the phone's tab list before planning through the independent tab-list capability. The phone keeps the titles, addresses and count. The overlapping local implementation also gates the action on the current screen and expects an outcome-only device receipt. |

Commit `7b5a17a3744` on `codex/alphaphone-vibestack-refresh` merges the newer Vibestack tip. It gives the Browser tab list one recognizer and one admission rule, preserves the withheld-page reload check in both Browser paths, and retains the owner's review preference and the receipt that carries only the outcome. The Browser control model passed all 36 Dafny obligations and 1,000 Quint traces. The device-operation model passed 1,000 traces and left 12 of 42 obligations unproved, including the independent tab-list capability law. Package verification is running. Alpha must confirm that its tab list is visible under the active device claim before acknowledging it as applied.

The native assembly merges the next eight Vibestack first-parent changes through `350454d5a66` in `0e4bddd5d4c`. #40327 qualifies Android test fixture caching. #40335 repairs the Discord, Messages, Slack, Telegram and X connectors. #40337 and #40338 repair the model provider bridges, and #40339 declares the packed Agent dependency. #40350 restores Agent reply-stream and capability proofs. #40376 updates package verification and verified simulation receipt reuse. #40398 retains the tool call for a silent open-only request and keeps acknowledgment guidance for lookups. The combined capability model passed all 32 Dafny obligations and 1,000 Quint traces after `56af916b45d` proved that either negotiated version suffices for a suffix-only sender lookup or ordinary Clock handoff.

Calendar’s owner-route fixture passed both tests on the refresh branch and is carried into native assembly as `7f6f75277f4`. It uses the same Agent registration instance as the package. A synthetic provider asked for a 30-minute slot and then an unrequested event creation. Both calls were refused. The fixture also observed the exact requested 20-minute opening, the separate allowed action, the named Japanese deletion and its distinct conversational confirmation journey.

All seven Browser tests passed on the refresh branch. The enrolled journey is carried into native assembly as `803553094a8`. A compound request and a sensitive screen made no tab-list proposal. The ordinary request went through approval and claim. A receipt with tab data was refused and the outcome-only receipt settled. The direct request was handed off for its original message and the synthetic device used the same approve, claim and receipt protocol. Alpha’s foreground tab panel still needs to confirm actual presentation under the active claim.

The Alpha Android command stopped before Gradle because the floor object `2cd448186c5e` is missing from the shallow submodule. A separate shallow upstream checkout contains both revisions but did not establish ancestry. A qualified cutover needs a reviewed compatibility decision tied to installed-state adoption and rollback if those histories diverge. Both distribution variants still require staging and verification.

The device-operation model passed 39 of 42 Dafny obligations and 1,000 Quint traces. Commit `8bd48fcbfcc` keeps the checked capability witnesses. The remaining obligations cover selected-photo capability admission, a nonempty requirement for every operation, and clock-only devices admitting only Clock handoffs. The equivalent literal-set attempt hit an internal Dafny compiler error, so the model retains the prior set expression. The focused Browser build completed all seven tasks. Six Browser unit fixtures then passed after keeping the locked-screen observation in the fixture even when it has no page data.

Develop #39693 requires an unreadable Files Trash journal to remain intact. Refresh commit `00a6dd4b399` distinguishes a missing journal from corrupt bytes and validates the current journal inside the IndexedDB transaction that changes file and journal rows. The model passed all 10 Dafny obligations and 1,000 Quint traces. All four Files browser tests passed in Chromium using the exact changed sources and the earlier integration build of unchanged dependencies. The competing-tab fixture preserves both the selected file and unreadable bytes after the other tab corrupts the journal. Adoption of Alpha's existing `.Trash-alpha` browser data and journal still needs a verified migration.

The installed browser library has version-2 IndexedDB stores `entries` and `workflowReceipts`. Some existing entries retain a `Blob` and lack timestamps. The new library uses byte buffers and stores workflow receipts under a hidden folder in `entries`. Adoption must preserve file IDs and revisions for saved references, retain legacy operation IDs and result fingerprints for workflow replay, and reconstruct the full Trash origin from its original parent and filename. A qualified upgrade fixture should open an actual legacy database, then verify the same bytes, IDs, restore destination and workflow result after a restart.

Refresh commit `81fdbcc66fb` reuses the installed Trash lock and commits the converted rows under an IndexedDB version change. It keeps the legacy receipt store and journal bytes as recovery evidence and gives the active Files code the same receipt representation for replayed and newly saved attachments. It materializes installed Blobs before the version change and checks the source again before commit. The Files model passed all 13 Dafny obligations and 1,000 Quint traces. All eight Chromium tests passed in the isolated Files build, including legacy Blob and empty-buffer reads, Trash restore, replay after deletion, corrupt journal refusal, a blocked tab and an old writer changing a row during preparation. The exact old reader opens version 2, so an application rollback after adoption needs a build that understands version 3. The Alpha renderer must select the installed namespace and wire its saved `b1:` document links to ID-based selection before enabling the upgrade.

The refreshed base already carries the dense Calendar delete parser and conversational confirmation. It also moves all matching stored Notes copies to the destination while preserving their IDs, which matches the Develop move contract. The assembled branch uses those implementations. It retains owner-planner Notes classification, verified reply and receipt recovery, claim-fenced view navigation, deferred history restoration, bounded model resend, and the typed Maps responses still missing from that base.

The locked commit is an ancestor of the sampled develop tip. That range
contains 1,584 commits and 252 first-parent changes. The pinned behavior and earlier develop fixes remain inputs. Whole-history ancestry counts from shallow checkouts are provisional.
For the post-pin inventory, compare first-parent changes with their first
parent and retain the full SHA and changed paths:

```sh
git log --first-parent --reverse --diff-merges=first-parent --name-only \
  --format='commit %H %s' \
  11040b3555c9a7db51ac2104ee68dd66cdd51046..a09ea94c9dd6d8815d421844574ef23483d8e4df
```

For each behavior change, record its source commits and tests, the consumer
entry point, the owning Vibestack story and rule, and either parity evidence,
a gap, or the explicit product decision that excludes it. A spec path means
there is a candidate owner. Implemented parity requires the actual public
entry point and relevant conformance evidence.

## Consumer dependency inventory

The first pass found 28 pinned plugin directories named explicitly by
consumer source. It starts with the tracked client projection in
`scripts/prepare-client-features.ts`, the native host descriptor and patch
manifest under `android/`, runtime staging and build scripts, and renderer
imports. Direct references include optional or test-only code. The
Android resident is built by `scripts/build-mobile-agent.ts` using the
upstream mobile entry and its plugin manifest. Runtime registration,
transitive dependencies and per-profile reachability still need a check
against those packaged exports, the resident smoke entry point and the
Android module registration.

| Develop dependency | Candidate Vibestack owner | Consumer journey to verify |
| --- | --- | --- |
| `plugin-assistant` | `spec/agent`, `spec/assistant` | On-device turn, proposal review, capability-scoped effect, honest reply, interruption and resume |
| `plugin-browser`, `plugin-native-browser-surface` | `spec/browser`, `spec/os` | Reuse the right tab, maintain private session isolation, and settle the reviewed action against live page identity |
| `plugin-calendar`, `plugin-native-calendar` | `spec/calendar`, `spec/os/android/calendar.md` | Read named and local calendars, create then read back, review availability and reconcile linked calendars |
| `plugin-elizacloud` | `spec/cloud`, `spec/agent` | Owner sign-in, native key renewal, entitlement, metered provider calls and service unavailability |
| `plugin-files`, `plugin-native-filesystem` | `spec/files`, `spec/os/android/files` | Browse and choose a real file, review sharing or mutation, handle empty, stale and truncated results |
| `plugin-inbox` | `spec/inbox` | Account isolation, owner-reviewed Gmail draft, attachment handoff and deliberate send |
| `plugin-local-inference` | `spec/localInference`, `spec/os/voice` | Load qualified models, route speech, handle provider failure before audio, interrupt safely |
| `plugin-maps` | `spec/maps`, `spec/cloud` | Resolve current location and exact destination, present alternatives, retain attribution and navigation freshness |
| `plugin-native-action-journal` | `spec/agent/deviceActions` | Retain exact action receipts through interruption and avoid replaying a completed effect |
| `plugin-native-agent` | `spec/agent`, `spec/os` | Install, start and recover the resident with the owner and deployment identity bound |
| `plugin-native-camera`, `plugin-native-media` | `spec/os/android/camera.md`, `spec/os/android/media` | Capture only in eligible state, query permitted media, and bind edits and shares to the selected item |
| `plugin-native-contacts`, `plugin-native-messages`, `plugin-native-phone` | Corresponding Android specs under `spec/os/android` | Require admitted AOSP capability. Bind the selected recipient or number and handle explicit stop or cancellation |
| `plugin-native-location`, `plugin-native-network-policy` | `spec/os`, `spec/maps` | Use permission-scoped freshness and observable Wi-Fi or network state |
| `plugin-native-notifications` | `spec/os/android/notificationProjection.md`, `spec/core/notifications` | Resolve an exact notification or workflow run and preserve delivery and dismissal semantics |
| `plugin-native-passwords`, `plugin-native-secure-store` | `spec/os/android/passwords`, `spec/os/android/secureStore.md` | Enforce the admitted origin, device lock and private storage boundary where the product enables it |
| `plugin-native-reminders` | `spec/assistant/reminders.md`, `spec/os/android/reminderAlarms.md` | Create and present the exact reminder, persist it and handle dismissal |
| `plugin-native-system` | `spec/os/android/system.md`, `spec/os/android/home.md` | Repeated HOME, native surfaces, app launch, reset and device state |
| `plugin-notes` | `spec/notes` | Save, query and share under review, restore or erase from Trash, confirm cleanup for exact recordings |
| `plugin-sql` | `spec/core`, `spec/agent` | Reopen owner-scoped storage and recover after a failed or uncertain write |
| `plugin-workflow` | `spec/workflow`, `spec/agent/schedule` | Run only while available, retain review and deduplication, and open the exact run from its notice |

### Resident mobile producer profiles

The pin's `packages/agent/src/runtime/core-plugins.ts` declares the
following lists. `packages/agent/scripts/build-mobile-bundle.ts` records
these in the produced plugin manifest. These are producer-declared
eligibility and packaging groups. Runtime activation requires separate
evidence from Alpha's host configuration and the running resident.

| Producer group | Entries beyond or alongside the direct consumer inventory |
| --- | --- |
| Mobile core | SQL, native filesystem, Browser, Vision, Scheduling, Personal Assistant and its reminders entry, Reminders, Goals |
| Mobile views | Agent Orchestrator UI entry, Inbox, Notes, Maps, Calendar, Todos |
| AOSP only | Native Wi-Fi, Contacts, Phone, the mobile remote-target entry, and terminal entries for Coding Tools and Agent Orchestrator |
| Optional Android | Anthropic, OpenAI, Eliza Cloud, Workflow |

Scheduling, Goals, Todos and Reminders map to the existing agent schedule
and personal assistance specs. Compare Vision and provider adapters with
the agent and cloud model and capability contracts. The product's
renderer receives its own view declarations. Verify whether any generic
view or AOSP terminal entry is reachable from Alpha before assigning it
a product story.

The candidate's `packages/agent/src/bundle/manifest.schema.vibe` requires
Node 26, the source commit, a bundle digest, the package inventory, the
action names, and optional core, views, AOSP-only and optional profile
groups. Alpha currently uses the pinned Bun builder and verifies a
`plugins-manifest.json` with UUID adapter evidence for that producer.
The cutover needs a consumer pipeline that builds the new resident,
validates its manifest against packaged bytes, and runs the owner-turn
smoke for each profile. The candidate `@elizaos/os/build` Android
boundary supports multiple variants and verifies the staged payload
before publishing. The Alpha build still needs to bind those contracts
to its product configuration, renderer and device operations.

## Initial stories from post-pin develop

| Source PR | Story | Vibestack follow-through |
| --- | --- | --- |
| #40296 | As the owner, I can ask for directions to the place we just discussed without repeating its name. | The current candidate prevents phone selection handles from reaching provider details and returns a planner correction when a lookup, route, navigation start, place selection or save needs a name. The owner planner gives this receiptless correction another planning step when a reply arrives with it. The Maps routing and owner-planning models each passed 1,000 Quint traces. All nine routing and all 19 planning obligations passed in the initial port. The Maps plugin's 13 tests and the planner correction journey passed before the Google refusal and reply-grounding changes. The combined candidate passed all 14 Maps plugin tests and the owner planner correction journey. |
| #40265 | As the owner, I get directions to a selected Maps place or a clear request to identify it. | The candidate reconstructs valid zero-distance Google route geometry and classifies completed Google 400s. Place Details can reject a place ID explicitly, letting the planner use its known name. Provider configuration and malformed responses remain provider failures. The metered response keeps a typed refusal for replay and settles a completed Google 400 at its quote. Local invalid IDs make no outbound call and settle zero observed charge. The expanded Cloud Maps model passed 1,000 Quint traces and all 20 obligations. All four Cloud Maps route tests passed, including refusal replay, conflicting keys, provider faults, Google 404 and the zero-charge local validation case. The connected Maps action journey also passed. |
| #40234 | As the owner, I can distinguish an action that failed from one that succeeded on a different target. | The candidate shares receipt identity across the owner planner and assistant. Reports use active receipt IDs, exact operations and resources, and retry keys. Unrelated failures remain reportable and unknown acceptance produces an uncertainty notice. The shared receipt model passed 37 obligations and the assistant reply model passed eight, with 1,000 traces each. All 38 assistant package tests passed. The owner planner now holds recovery prose for an evidence review and one possible rewrite. A failed review leaves the deterministic outcome notices and action-authored text. All 24 updated planning proof obligations and 1,000 traces passed. All 11 owner turn and stream tests passed, including the case that removes unsupported claims before they are streamed. The same resident owner-route run passed all nine Notes tests. |
| #40250 | As the owner, I can continue a request using deferred context without replaying tools or restoring the same evidence repeatedly. | The assembled candidate restores only deferred original history from the owner turn’s bounded snapshot. It keeps settled action results, refuses mixed restores, keeps the system prompt stable and allows one correction per planning round. The isolated prior model passed 1,000 traces and all 28 proof obligations. The assembled model and route need a fresh run. |
| #40249 | As the owner, I want one bounded provider resend after a transient rate limit so my turn cannot repeatedly wait or dispatch. | A short temporary 429 can qualify for a resend with the same idempotency key under current account admission and the same turn deadline. Quota, funding, period limits, a hold beyond the deadline, output or cancellation prevent it. The model with the shared planner allowance passed 1,000 Quint traces and all 108 Dafny obligations. The parser-error-then-429 owner route fixture still needs execution. Develop's retry during an unconfigured hold longer than five seconds remains open. |
| #40321 | As the owner, I can bring up the phone’s open tabs without giving the agent their count, titles or addresses. | Integration commit `35b7770c688` adds a dedicated capability, precise whole-message routing, zero-argument device operation and outcome-only receipt. Its model passed 1,000 Quint traces and all 29 Dafny obligations on the Browser checkpoint. The enrolled-device fixture rejects tab data in the receipt and still needs runtime execution. Alpha’s real tab sheet must commit under the same live claim before it reports success. |
| #39919, #39932 | As the owner, I can speak an exact hostname and review it before Browser opens it. If I ask for a new tab and the phone supports it, the review keeps that placement. | Integration commit `206b017b383` carries the spoken new-tab request into a proposed navigation even when the model omits the placement. The grounding model passed all 18 Dafny obligations and 1,000 Quint traces. Thirteen source-level grounding and placement assertions passed. The complete proposal and enrolled-device suites still need execution. |
| #39936 | As the owner, I can request a Calendar event change while another view is open. Calendar context is available without dropping any other actions I asked for. | The candidate uses Core's stored-room audience check and adds Calendar context for the matching create, update or delete operation from the original request. The planner keeps the admitted tools and the note carries no event data. The audience and relevance models each passed three Dafny obligations and 1,000 Quint traces. The owner route fixtures cover a private room, a shared room with a forged audience label, and a mixed create request from Contacts. Runtime and active-account qualification remain open. |
| #39945 | As the owner, I can pause the workflow version I reviewed, retry a Notes creation by its exact key, manage Notes Trash and page through a PDF using the same unchanged source. | The candidate has version-checked workflow pause, a Notes creation-key ledger, Trash routes, and an Android PDF copy policy tied to selection, source size and edit time. The PDF copy policy passed nine JVM cases, including stale selection and partial copy. The installed viewer, workflow pause and Notes Trash journeys still need qualification. |
| #40317 | As a Wallet owner, I can reconcile a transfer or swap by the signed transaction hash when the RPC answer is lost. | The Develop source model passed 1,000 Quint traces over its five invariants. Vibestack's transfer path already persists the signed operation reference before broadcast and returns an unresolved outcome on transport failure. EVM swap and transfer parity still need qualification. Alpha defers Wallet under AP-13. |
| #40290 | As the owner, I hear a short acknowledgment while work begins and an actual result once work finishes. | The candidate has a modeled cue grammar and stream restart. Compare the develop cue cases, including a bare “Sure” and mixed text that makes a premature success claim. |
| #40213 | As the owner, I can resend what I said without the agent mistaking duplicate source context for its own answer. | Compare the source-repair retry with the candidate's message identity and history selection. Test that user text and stored replies keep their separate authorship. |
| #40190 | As the owner, I hear the approximate area when my phone only has a coarse position. | The refreshed Vibestack base includes #40289. Its Maps action has separate precise, rough and unavailable outcomes. The rough path projects an area without street details, with a resident plugin test for all three. Alpha’s native fix-to-renderer journey remains open. |
| #39853 | As the owner, I can name the exact calendar event to delete in Chinese, Japanese or Korean without inserting artificial spaces and answer a follow-up about the proposed occurrence. | Dense delete commands keep whole-title and unique-occurrence admission. Short answers in the private owner conversation require the immediately preceding stored question and use its account, source, revision, recurrence scope and notification choice. Reported voice playback limits which part of the preceding reply can authorize an answer. Older unbound questions require a fresh ask. All six routing and 62 action Dafny obligations passed, with 1,000 Quint traces for each model. The synthetic owner-route fixture is awaiting package verification. |
| #39856, #39865 | As the owner, I can find a short opening within tomorrow morning, end at noon, or include another date or period when I ask for it. | The planner and Calendar action use the bound request timestamp for relative dates. The previous planner and Calendar action models passed 72 and 63 Dafny obligations, respectively. The availability routing model passed all nine obligations. Each passed 1,000 Quint traces. A private resident availability read now resolves a named Calendar against the active account or checks the current Calendar selection's ID, grant and source fingerprint. Unknown or ambiguous scopes refuse before reading events. A fixture gives distinct grants the same calendar ID and checks the event-read log. In the combined Calendar run, 10 tests passed and the owner-chat route failed because its first planner prompt lacked the Calendar create cue. The producer's request-window receipt and the installed renderer selection journey remain open. |
| #39873 | As the owner, I can ask to preview a resident Calendar event and keep the review requirement when I supply missing details. | The creation action defaults to review and keeps an explicit review flag even when the planner also requests immediate creation. The host fixture stages an approval, verifies no event exists yet, then approves and reads the event back. The follow-up conversation and the ordinary-create policy difference from Develop still need qualification. |
| #39871 | As the owner, I can recover once when the model returns no Calendar creation fields and get a clarification if details are still missing. | Develop retries one schema-bound extraction before any write. Vibestack fails an incomplete create call before writing. Its provider retry covers parser and rate-limit failures. A schema-valid Calendar call with empty creation fields still needs a bounded repair path or equivalent verified behavior. |
| #39876 | As the owner, I can ask about a date and receive a Calendar answer based on the verified feed window even if the planner leaves both bounds blank. | Develop requires a current producer-bound window, with omitted details, an empty object or a matching zone standing in for absent bounds. Vibestack Calendar search currently derives a rolling default from processing time when bounds are absent. The migration needs to verify the requested window before relying on that default. |
| #39855 | As the owner, after I move a note I no longer see an identical stored copy in the source folder. | The refreshed Notes collection moves identical saved copies as one revision and preserves their IDs. Exact-ID moves still affect just one record. The owner planner uses the original owner message and visible dialogue to bind its Notes operation before dispatch. The older candidate’s nine passing Notes tests covered the owner-route admission and persistence, using an alternate consolidation implementation. The current route needs a fresh joined test. |
| #39872 | As the owner, I can speak an ambiguous fragment beside a note title and keep my checklist unchanged. | The Notes classifier carries the Develop wording for stray words, completed requests, unsupported sharing and detail-only answers. The first owner-route run refused the append at argument validation because the tool schema declared an object with no allowed fields. Commit `eb0ba8027e0` passes the edit fields through to the request guard and the collection's strict edit schema. All 10 Notes tests passed. The owner-route case checks for an unresolved refusal, an identical persisted snapshot, and a successful explicit append at the same revision. |
| #39860 | As a release reviewer, I can see the NOTE-14 journey delete the note the owner's command actually names. | Develop changed the fixture utterance to include the title while still selecting by exact body. Vibestack enforces the title for content-based deletion and has a direct mismatch test. The joined note-to-Calendar stale-source journey still needs the final named deletion case. |
| #39632 | As the owner, I can state the year before a month and day in Korean or Chinese and have Calendar keep it. | Vibestack carries the leading-year parser and a read-clock model. Existing fixtures cover explicit years, this year and next year, numeric dates, and precedence when the date has its own year. Package execution is pending. |
| #39800 | As the owner, I can say “next year” or name a year before a date like 12/25 and have Calendar keep it. | The current parser applies the same leading-year rule to slash and hyphen dates. The reviewed Calendar fixture includes explicit and relative Korean and Chinese qualifiers and a token that only resembles a qualifier. Package execution is pending. |
| #39881 | As the owner, I can ask about tomorrow morning through 12:30 or 13:00 and have Calendar include the later time. | The action treats 12:01–12:59 without an AM marker and 13:00–23:59 as later periods. Both source examples appear in the Calendar fixture. The earlier cutoff still applies to a morning-only request. Package execution is pending. |
| #39951 | As the owner, I can say “push it back” or “move it up” and have the agent resolve what I meant from the conversation. | A particle after a bare pronoun no longer routes the request as a named Calendar mutation. A named request such as “push the standup back” still takes that route. All four focused English parser cases passed. Joined referent resolution needs package verification. |
| #39639 | As the owner, I can ask for the current time and hear my true local date and time, including in a GMT offset zone. | Vibestack carries whole-hour clock parsing and whole and fractional GMT or UTC labels. Both fixed-clock cases passed against the generated planner law. The agent journey now includes Tokyo and Kolkata, and its runtime execution is pending. |
| #40059 | As the owner, I can review closing every Browser tab on a capable phone, or hear why a phone can only close one tab at a time. | Vibestack models the separately negotiated close-all capability and preserves the request's breadth through proposal admission. Alpha does not currently advertise this capability. The supported device's confirm, cancel and readback journey remains open. |
| #39828 | As the owner, my event's travel buffer moves with its new start and keeps the same duration. | Develop moves a parent-linked travel reservation using its existing idempotency key after built-in, connected and native event changes. No corresponding reservation update was found on the candidate Calendar mutation path. Model the parent relation and exact replay before qualifying it. |
| #39824 | As the owner, I can say I am back today and have travel mode end today. | Vibestack's assistant travel model compares civil dates and has a same-day return fixture. The candidate still needs the joined owner-route check in Alpha's effective timezone. |
| #39467 | As the owner, I can refresh connected Calendar without changing a record's provider edit time. | The managed feed distinguishes provider change time from refresh time and the duplicate resolver uses the provider timestamp. The feed fixture checks changed and unchanged provider times. Qualify the managed broker and Android consumer together. |
| #39885 | As the owner, I can read a monthly recurrence as “the last day” or “the second-to-last day.” | Develop labels negative month-day offsets in standard recurrence lines. The resident creation schema in Vibestack currently accepts daily, weekdays and weekly. Preserve the existing-provider monthly semantics and qualify both a negative offset and a mixed positive/negative rule before claiming parity. |
| #39884 | As the owner, I can see Outlook “Working elsewhere” events without having that time marked busy. | Develop normalizes the Microsoft source's `workingElsewhere` to transparent. Vibestack's shared availability excludes transparent events, but the Calendar plugin has no Microsoft provider adapter to supply that classification. The provider normalization and end-to-end availability evidence remain open. |
| #39507 | As the owner, I can recover a reviewed Calendar change after a restart without repeating a settled provider write. | Vibestack models claim, receipt, restart, reconciliation and retry in `spec/calendar/mutationLedger.md`. Preserve Develop's specifically named cases for orphan quarantine, exact replay without dispatch, stale tokens and both legacy retry invalidations in the package verification evidence. |
| #39501 | As the owner, I can stop Calendar sync or replace a watch and keep a stale result from changing the active sync state. | Vibestack has separate foreground-generation and watch-attempt rules in `spec/calendar/syncSettlement.md`, an application driver, and fixtures for late callbacks and foreground retirement. The connected-provider watch and Alpha foreground lifecycle still need qualification. |
| #39636 | As the owner, saying that an already completed item is complete preserves its state and avoids another applied mutation. | The candidate’s Todo action returns an unchanged receipt when the resolved item already has that status. The assistant package’s passing suite includes the repeated-completion and idempotency-key replay cases. The full Alpha task journey still needs qualification. |
| #40030 | As the owner, I can use a Maps card in the reply and still read the answer to my follow-up question. | The owner planner has a composition model for verified cards and grounded prose. The Maps producer returns successful card text as ordinary result data, which the planner does not admit as verified copy. The assembled branch admits valid producer-authored card copy and adds buffered, streamed and replayed owner journeys. Its isolated Maps card model passed all three Dafny obligations and 1,000 Quint traces. All 10 Alpha markup tests passed. The assembled resident journey still needs execution. |
| #40034 | As a release reviewer, I can verify that photo, Notes and Files evidence covers the newly required cases. | Carry the mandatory case identities from `2344fb20be9` into the equivalent contract and journey evidence. A passing model for a different case cannot substitute for one of the required cases. |
| #40028 | As the owner, I hear a brief acknowledgment during pending work and still hear a duration answer in full. | The shared tool schema now uses the develop cue examples. Model and rebuild planning, routing, and final reply delivery, including duration answers. |
| #40026 | As the owner, I hear that an action failed when this turn proves it failed, and hear the later success when it supersedes a failure. | Model proposal and receipt attribution through recovery, then verify the final reply against the authoritative turn. |
| #40025 | As the owner, I can navigate again if the renderer never receives its previous grant. | The candidate adds a lease and bounded retry to the existing Views machine and Effect host. Four resident route tests passed on the earlier base. All 102 Views proof obligations also passed on the refreshed base. The isolated upstream checkpoint `85a498716c5` adds a typed prepared binding on the originating settled owner reply. The matching renderer adapter preserves claim and confirmation. All 13 focused Alpha stream and navigation tests passed. Upstream runtime and the packaged resident-to-renderer journey remain open. |
| #39949, #39952 | As the owner, I can safely pick the exact photo or capture I mean while retaining the task context. | Trace camera and media changes separately through Android custody, agent contracts and foreground review. |
| #39950 | As the owner, I can complete pending recording cleanup when the device host registers after the Notes service starts. | The current upstream Notes package implements the owner route, exact receipt retirement and the late verifier lookup. Its test covers precedence, refusal and literal true. Verify the packaged route and Alpha's native proof provider together. |
| #39954 | As the owner, I can use a workflow notice to reopen the exact run it refers to. | Trace notification target, retained run identity and unlock/resume behavior. |
| #39953 | As the owner, I can inspect and act on current notifications with trustworthy results. | Confirm notification custody, identities and stale-event handling at the Android boundary. |
| #39948 | As the owner, I can opt into seeing hidden files without exposing Trash, move or copy reviewed items between volumes, see category totals, and see document size and modification time when the provider supplies them. | The refreshed Android implementations have the hidden-entry filter, destination-volume transfer, count and byte totals, and independent reads for optional document columns. The Files plugin still calls the default hidden filter for folder search and sends transfers to the source volume. The renderer, agent contracts and installed journey need to carry the explicit choices and verify that a cross-volume failure preserves the source. |
| #39925 | As the owner, I can route to a landmark whose nearby same-named area entries describe the same place, and choose between separate street addresses. | The Maps routing model covers this distinction and the resident fixture includes Golden Gate Park. Confirm the combined candidate with both positive and ambiguous cases. |
| #39923 | As the owner, I can provide a starting place when my phone lacks a precise position and hear the specific reason when my phone refuses the route. | The resident plugin asks for a starting point on an awaiting-location result. Device navigation distinguishes missing permission, stale and approximate fixes, and typed refusals. The exact refusal-copy journey through the installed phone and owner reply remains open. |
| #39926 | As a release reviewer, I can verify that opening the keypad affects only the requesting message, requires no review, and never places a call. | The device telephony specification and fixture cover keypad admission. Match the Develop conformance case to the current journey and verify the no-call outcome on the enrolled device. |
| #39935, #39906 | As the owner, I can speak a phone number with a bare or hyphenated tens word and have its digits retained. | Vibestack's spoken-number parser checks neighboring words and uses explicit number dictionaries. Develop #39906 reformats a routing assertion without changing behavior. The exact malformed and edge-of-input cases still need combined telephony qualification. |
| #39887 | As the owner, I can ask who sent my latest text and see the approved sender form when the phone advertises that lookup. | Vibestack conditionally includes planner guidance for the older suffix-only or newer full-address capabilities. Match the unavailable, suffix-only and new-address cases to device execution and the owner-facing reply. |
| #39883 | As the owner, I can review a latest-sender lookup that returns only the last four digits. | The suffix-only protocol appears in the device admission model and is independent from a full-address read. Verify the installed Android provider query selects the latest incoming SMS and projects only the approved suffix. |
| #39866 | As the owner, I can ask for my latest sent email with the exact filters I named. | Vibestack's Gmail reader accepts `in:sent` and its typed request limit. The whole-message owner router and exact forwarding of combined sender and subject filters still need qualification. |
| #39852 | As the owner, I can save and fill passwords for the verified HTTPS origin and authorize encrypted backup independently. | This is upstream product scope. The Alpha PRD excludes a user-facing backup or import/export workflow, so package parity and Alpha exposure require separate qualification. |
| #39857 | As a release reviewer, I can verify isolated credentials, Calendar routing and the exact Browser conformance cases. | Preserve credential isolation between tests, require the normal Calendar action for creation without a selected phone calendar, and verify negotiated Browser controls, closed-tab review and locked-phone refusal. |
| #39869 | As the owner, I can see the current caller’s saved contact name and thumbnail, and a late lookup cannot change a different call or a screen I have left. | `spec/os/android/contacts.md` models publication for the current screen visit, call, number and permission. The Android call screen cancels reads, rechecks authority before publishing and limits thumbnail sources to the Contacts provider. The refreshed package includes lifecycle fixtures. Their execution and real Android display remain to be qualified. |
| #39841 | As the owner, I can resize the current Browser dock on a supported device and receive a typed refusal when its Window SDK lacks that operation. | Vibestack already gates the AndroidX update through `BrowserSplitResize` and rechecks the actual split and host session before using it. Exact Android lint and device behavior remain to be qualified. |
| #39835 | As a release reviewer, I can parse the generated Home, Assistant and Autofill provisioning XML and retain the intended defaults. | The Effect writer emits the resource XML without comments. The separate JavaScript writer’s resource and preferred-activity XML both parsed with `xmllint`, with and without Assistant. Full image build and first boot remain separate gates. |
| #39877, #39880 | As a release reviewer, I can prune unlinked plugins in the Node-only image stage with the same executable that runs its linker and verify that shipped plugins still resolve. | Develop switches the prune child to `process.execPath` and tests it without Bun on PATH. #39880 formats the new fixture. The audited Vibestack revision has no tracked Dockerfile or equivalent linker, so this belongs to deployed image verification if that build is carried over. |
| #39868 | As a release reviewer, I can discover all shipped runtime dependencies from the image stage’s manifest-only context, including Cloud service manifests. | Develop copies nested Cloud service manifests and runs its closure fixture against the copied manifest set. The audited Vibestack deployment needs equivalent closure evidence if that image stage is carried over. |
| #39789 | As the owner, I can sign in to the native app and connect Gmail through the same Google flow, see the connection result independently, and sign out of the native session. | Vibestack models the separate sign-in and Google connection outcomes, one-use code lifetime, registered scopes and reuse after second factor in `spec/os/signIn/flow.md`. Android has distinct sign-in and native-connect endpoints. The integrated sign-out journey and capability retirement still need verification. |
| #39713 | As a maintainer, I can ship Vision and Cloud without the unused Vision config reader, Cloud R2 adapter and Brighter Storage S3 build aliases. | This Develop commit removes unreachable code and deployment declarations. A source search of the candidate found none of the retired adapter paths. Keep the supported Vision entry and storage behavior in package and deployment verification. |
| #39795 | As an Android consumer, I can package a cloud-inference resident from product-supplied assets, expose only its declared routes, and see which child failed to start. | Vibestack specifies the data-configured Android host and private transport in `spec/os/agentService/config.md` and `spec/agent/access/transport.md`. Verify the render-to-native stream abort, authenticated route refusal and restart failure through both Alpha distribution variants. |
| #39732 | As an operator, I get one name for each setting and a startup refusal when an old name would otherwise silently remove a restriction. | The new resident uses a launch document and framed native credentials for core host policy. Keep the named refusal coverage where a legacy env or vault-backed plugin setting remains an input, particularly for permissions, authentication, approval and sandbox settings. |
| #39738 | As a maintainer, I can recover and inspect complete trajectory records without a late stage changing a closed turn. | Develop moved capture, completion and recovery onto the trajectory service and makes file export a projection. Vibestack has `spec/core/trajectories.md` and a separate logger plugin. Compare the exact interrupted recovery, retained export and closed-turn behavior before accepting recorder parity. |
| #39784 | As the owner, I can hear cloud speech with the microphone closed and settle a playback interruption when another app briefly takes audio focus. | Compare the scoped microphone and audio-focus transitions in `spec/os/voice/cloudSpeech.md` and `spec/os/voice/speechOutput.md` to Develop’s muted start, permission-gated unmute and interrupted utterance. The packaged Alpha audio session and Android focus behavior require validation. |
| #39847 | As the owner, I retain a working built-in speech choice when a preset retires, and I can still use a supported custom voice. | Develop updates its built-in registry, server default and persisted character preset resolution together. The candidate’s provider allowlist, persisted setting migration and effective Alpha speech profile must agree before shipping this change. |
| #39812 | As a release reviewer, I can install the Redis prerequisite for Develop’s protocol conformance through the runner’s retrying package installer. | Vibestack’s base CI has no Redis installation step. If a migrated protocol conformance suite requires Redis, keep the dependency explicit and qualify the retrying installer in the job that owns it. |
| #39912 | As the owner, I receive the exact organization and account authorized by native password-backup approval so my local vault stays scoped. | The current Cloud response includes the authenticated native owner and organization, and the database query uses both. The Alpha renderer and native vault still need qualification with account and organization changes. |
| #39903 | As the owner, I can choose from the Maps alternatives I was actually offered, keep explicit route endpoints, and have workflow writes and approval expiry honor my original request and filters. | Maps models a bounded choice tied to the open question and locality near an explicit endpoint. Workflow lifecycle models request conflicts. The exact cross-plugin fixtures, including expiration under all listing filters, still need parity review. |
| #39947, #40017 | As the owner, I can review and publish the intended calendar change without losing its exact fields. | Trace the reviewed write and extraction cases through the Calendar and Android specs. |
| #39943, #39946, #39989 | As the owner, I can look up and navigate to the intended place using current, permissible location when available. | Trace Maps and Cloud requests through location freshness, route choice, delivery and guidance. |
| #40019 | As the owner, I can tell when a browser request was dispatched and when it actually completed. | The current Browser control model and native handler distinguish dispatched work from completed work. The package test checks the dispatched-only envelope and the disabled completion claim. The Alpha renderer and native launcher still need a joined journey. |
| #39984 | As the owner, I can continue a task after a long turn without unrelated context crowding out relevant facts. | Compare the legacy context budget with Vibestack's selection, truncation and reply boundaries. |
| #39982 | As the owner, I can find a calendar event again after the agent reports creating it. | Exercise provider write and durable readback through the same scoped calendar. |
| #39980 | As the owner, I can retry navigation when the renderer did not receive it. | Compare redelivery conditions with #40025 so one model governs recovery and protects against duplicate effects. |
| #39965 | As the owner, I can hear an assistant reply on the admitted speech route. | Compare the release conformance evidence with device voice and cloud speech models. |
| #39942 | As the owner, I can reach phone actions through the admitted native capability. | The current upstream base carries the registry and the #40276 telephony parity changes. Trace each action through Android and qualify its returned proof. |
| #39920 | As the owner, my SMS reply goes to the sender I selected, including the full addressing identity. | Verify sender identity through ongoing thread, presentation, foreground review and native send. |
| #39921 | As the owner, I can continue a Gmail draft in the composer with its reviewed intent intact. | Compare the provider draft story, handoff and failure receipts. |
| #39929 | As a subscriber in staging, I can use Clef under the applicable quota. | Trace the entitled speech route and limit handling in the cloud proof and isolated service tests. |
| #39990, #39994 | As the owner, I receive results from the active account when using Notes or Calendar through an assistant turn. | Compare the bound owner text rules and test account changes at the host boundary. |

The Alpha flag-off navigation protocol fixture expects HTTP 409 for a
refused interaction result. The Vibestack handler replies HTTP 200 with
`accepted: false`. The renderer tests confirm neither response verifies
navigation or triggers another result post. The transport and renderer still
need an integrated test against the candidate host before replacing the producer.

### Required evidence added by develop #40034

| Changed receipt | Required journeys to carry forward | Candidate evidence to locate or add |
| --- | --- | --- |
| `telephony-action-conformance.json` | Refuse browser-control review on a locked device. Disclose a photo's library ID only after negotiating the capability. Record a voice note with recording capability alone. Cover shown-position file review and path execution, share without binding identities, unresolved positions, and unnegotiated shown items. | Device capability, review and receipt models plus the resident-to-device coordinator tests. |
| `workflow-device-admission-conformance.json` | Cover the same seven journeys. For Notes, also verify the unlocked Home and Notes review contexts, the Notes-only recording context, and advertising recording with `notes.record.v1` alone. | Agent admission, Notes context and workflow composition tests exercised through the owner boundary. |
| `files-view-conformance.json` | Resolve shown filter results to exact paths for reviewed share, move and trash. Advertise `files.browser.v1` to peers that negotiate it, and offer shown-position forms only with `files.shown-target.v1`. | Files browser and owner-renderer tests backed by exact path and capability assertions. |

The candidate's owner planner now runs the Notes field once before its
first planned Notes write. It uses the original owner text and that owner's
visible dialogue with the agent. The binding ends with the live planning
lease. It preserves the launch allowlist and owner role gate. The Notes
plugin's conversation-route test covers an admitted named move, keyed
replay, read-only and invalid classifications, and cancellation while the
classification is pending. All nine Notes tests passed on the prior base, including the owner-route journey and its persisted revision. The expanded planning model passed 1,000 Quint traces and all 24 proof obligations.
The existing core restriction distinguishes writes from reads. It does
not currently compare every requested operation against each dispatched
write. Keep that distinction visible while auditing develop parity.

The candidate now models recording-only admission through `notes.record.v1`
and preserves the legacy pair of `notes.organize.v1` and `notes.local-record.v1`.
The focused operation tests verified both paths. The shipped recorder and its native device path still need end-to-end
evidence. The Files plugin already models shown positions under the
additional `files.shown-target.v1` capability. Its focused test resolves
shown positions to exact share and trash paths, binds trash identities,
and refuses missing and unnegotiated positions. The isolated Files checkpoint `eab383c2ab9` adds a shown-position move with a changed filter between review and approval. All six focused Files tests passed on the prior base, including this move. The Alpha renderer and native device coordinator still need to negotiate the shown-position forms and exercise the exact path journey.

## Consumer cutover boundaries

Alpha’s current preparation projects pinned legacy source files, uses Bun
with the legacy lock, and stages `agent-bundle.js`, its plugin and UUID
receipts, `libeliza_bun.so`, and a separately inventoried workflow worker.
Several imported upstream preparation and APK-inspection helpers are absent
from the candidate. The candidate's bundle and OS build APIs produce
`agent.mjs`, `manifest.json`, and an ABI-specific runtime inventory with
`libeliza_node.so`. Its Android Node lock pins 26.13.1 for ARM64 and x86-64.
The workflow worker has its own compiled dependency closure, checked by
the payload stager against the digest in the agent manifest.

The current schema-1 Alpha Android profile includes generation inputs and
preservation fields rejected by the candidate schema-2 generator. Adopt a
candidate profile that keeps Alpha's package identity, launcher HOME and
standalone permissions. An isolated generator run with Alpha’s manifest inputs and 19 candidate modules emitted both profiles, preserving the package identity and launcher HOME declaration. This qualifies the generated inputs. Qualify the Node launch frame, service, socket,
and embedding and voice support separately. Stock Android flavor and AOSP
capability are different dimensions of the test matrix.

The current native bridge exchanges the pinned agent's root credential
for a paired owner session. The candidate authenticates its private
launch bearer directly. Alpha needs a native-owned facade with an
explicit route allowlist, owner and launch-epoch binding, and a typed
request and response adapter. Keep the bearer in the native process.
Confirm auth denial, status and agent identity, conversation and stream
replay, cancellation, views, Notes and Calendar reads, and reviewed
device and workflow actions through the actual facade and renderer.
The renderer translates known Vibestack activity and tool frames
into display status and reads prepared navigation only from the typed
settled action. An explicit acknowledgment can enter the request-bound
voice cue path once, before the reply begins. It never changes reply text
or action results. All 13 focused stream and navigation contract tests
passed after adding this case. The current legacy turn protocol sends an explicit
`streamProtocol` value rejected by the candidate. The candidate facade
needs to select the turn wire format and stamp the native-owned renderer
identity consistently across the turn, view feed, claim and result.

Alpha starts the resident before provider sign-in. The candidate’s Android
launch policy requires an active credential before spawn and uses its account
for the state directory even when inference is disabled. Model a durable local
owner and storage binding independently of the optional inference credential.
Keep account or backend transitions bound to exact launch retirement. Confirm
the resulting owner binding, agent identity and service epoch before accepting
non-bootstrap renderer calls. The candidate reports agent identity from
`/api/auth/me` and verifies the launch subject separately on enrollment. The
enrollment installation ID is the agent ID. The native facade needs to verify
both and retain the scoped enrollment proof in native custody.

The native branch's resident-binding model gives opted-in consumers a
readable local vault, a stable local principal and an optional verified
Cloud link. The first link needs explicit approval. An origin, subject
or organization mismatch cannot reuse that link. Sign-out and expiry
keep the vault and drop inference. Changing the resulting backend
retires the serving launch, while a newer credential for the same
account and binding can rotate in place.

The resident-binding model passed all nine Dafny obligations and 1,000
Quint traces. The assembled Node host checkpoint `110fdce6578` accepts
both the installation and retained-account resident modes. It uses the
stored principal for the database, conversations, durable tasks and
enrolled device identity. The agent launch model passed all 18 Dafny
obligations and 1,000 Quint traces. All three focused launch fixtures
passed through the Node host, including offline startup, inference
change on the same store and refusal of an invalid owner binding. The
same run passed the owner clock and provider resend fixtures.
Native branch commit `4cdf57ec729` adds a default-off, owner-only
`residentWithoutInference` host setting and projects the stored owner
separately from the backend. The JVM launch projector and built Node
host accepted four valid launch cases and refused five invalid cases.
The configuration model passed all nine Dafny obligations and 1,000
Quint traces. Commit `632c6e57e81` models replacing a pending launch,
retiring a child and rotating a serving key. That model passed all 15
Dafny obligations and 1,000 Quint traces.
Native commit `d6f534153e0` wires the opted-in Android service to a native
owner and vault snapshot. It selects the backend, sends the storage key in
the private launch frame, retires the prior child when the backend changes,
and fences key rotation by launch epoch and credential version. The Java
sources compiled against Android SDK 36. A JVM trace passed 18 policy
transitions and a separate JVM fixture checked origin and organization
mismatches, expiry, unlinked startup, rotation and vault replacement.
Branch `codex/alphaphone-vibestack-native-assembly` brings these changes
onto the refreshed Vibestack base at `49d0f88c5e2`. Its Android service
also compiled against SDK 36. Commit `8486c585122` adds the Files browser
adoption to that same branch.
Alpha still needs the durable native binding provider. Its old vault needs
a verified adoption path that preserves its
stored agent identity, embedding dimensions and owner-scoped task and
enrollment identities. Develop selects the runtime PGlite location from
its installed config or environment, with `workspace/.elizadb` as the
generic default beneath the native `files/.eliza` state root. A native
handover needs to verify the exact installed selection. The encrypted
vault uses a separate `.vault-pglite` and Keystore-backed or legacy
device-derived passphrase.
Vibestack instead opens `store-v4` with `device_owner` and `device_records`.
Its `openDeviceStorage` call receives the owner and embedding size, while
the native frame's storage key serves separate sealed consumers. Import
runtime rows under the exact legacy identity and preserve encrypted custody
for any adopted vault entries before switching the installed resident.
Native assembly commit `5b997762ab1` projects owned legacy conversation
and message identifiers and reserves installed send keys under their
original fingerprint protocol. The model passed all four Dafny
obligations and 1,000 Quint traces. Commit `a7fbd7d18f9` stores that
projection in one transaction in a private history-only staging directory.
Two synthetic PGlite journeys passed, including close and reopen, exact
receipt reservation, a different-organization refusal, and cleanup after
a failed write. The history stage has no launch or publication authority.
Retired snapshot capture, account handover and migration of active task,
approval, device and vault records remain open.

Native assembly commit `d32c3d31bae` implements the catalogue reader
using the pinned Develop selection rules.
Its read transaction joins the agent’s participation, client-chat room
and channel-derived conversation identity. It admits ordinary chats with
no optional metadata, checks metadata when it does identify the
conversation, honors the captured deletion ledger and keeps UTC
millisecond timestamps. A copied source can be opened by an offline
compatibility worker. Native code owns the retirement lease, exact
installed path and independent legacy account binding. The regular
Vibestack resident should receive only the worker’s typed history
projection. A direct source-path migration would put the entire legacy
database inside the ordinary resident’s authority. The catalogue model
passed all six Dafny obligations and 1,000 Quint traces. The synthetic
on-disk fixture used PGlite with the pinned extension set, staged the
projected history, and confirmed byte-for-byte preservation of the
original after the copied store was read and modified for refusal cases.

The native lease, offline worker launch and complete-generation
publication still require implementation. The newer host derives its
ordinary conversation owner and world differently. Publication must
explicitly admit the legacy scope or the preserved room IDs will remain
invisible to the live conversation routes. It also needs the installed
transcript visibility and receipt rules so historical internal records
and old callbacks cannot become visible or executable.

Alpha’s current updater proves shutdown in `UpdatePause.stop()` before
marking the installer session committing. Its settlement releases that
shutdown hold. Capture must bind the old owner and the retired writer
generation while that hold is still active, then persist its own
handover evidence through successor startup. A current Cloud session
alone does not establish ownership of the installation-shared old store.

Extend the flag-off, offline installed journey
through the native channel to the authenticated `/api/status` result,
then verify a local record survives service restart. A HOME-role test
can independently verify launcher admission.

For visual actions, tie the renderer’s readiness to the current feed
acknowledgment from the agent. Native feed checkpoint `68b69070680` adds an acknowledgment
callback after the first socket confirmation and keeps queue admission
separate from readiness. Java policy coverage checks duplicate confirmation,
early events and retirement. Three JVM wire traces through the actual
channel and socket decoder check callback order. Two focused VibeLang OS
bridge tests also passed. The Alpha facade still needs to give the
foreground owner the one view-feed lease and close it when its surface
retires. Route ordinary visual turns and the view feed through the same
renderer binding.

Build the candidate in an isolated workspace and boot it against fresh,
synthetic state first. A separate interrupted in-place upgrade of the existing Alpha Phone package needs to
show that the same package and signer retain Keystore binding, Notes,
Calendar, approvals, workflow state and effect receipts without redoing
work. Reuse the two-variant installed-upgrade harness for its signed APK and
isolated emulator-user admission, and extend its fixtures to cover the
resident database, store ownership and interruption. This is continuity for
an installed package under the same identity. Alpha's current upstream floor
is an ancestor of the audited Develop tip. A complete commit-graph fetch
found no common ancestor between that floor and Vibestack or the assembled
candidate `f1613e43c40`. The production pin needs a reviewed lineage transition
with the installed-state and rollback evidence above.

## Maps choices across owner turns

The current source inventory follows Develop `d3af0f0f2f2`. It contains
399 first-parent entries from the lock and three previously reviewed
entries retained from the earlier path. Of the 402 distinct entries, 161
still need behavioral review. The Browser client-leaf change separates client
history parsing from resident reload policy. Vibestack has the same
boundary at the Browser package's native-command export. AlphaPhone's
replacement import and production bundle still need to be tested. Develop
#40397 also requires a fresh explicit open command to reopen a withheld
page and recognizes a withdrawal in its own request clause.

Develop `f17ac0ccc45` (#39898) binds a numbered answer to the next owner
turn in the same conversation. Its route continuation also retains endpoints
already resolved. The earlier Vibestack patch `75e067d0d63` scoped the
answer to an owner and keyed turn. Its registration did not dispatch the
answer before planning, and its route re-read selected places from Cloud.

Local candidate `c6351c4cca2`, based on the camera and speech integration
`4c22c96ba8c`, models scoped, distinct turns and expiry at ten minutes.
The handler retains the offered places and any settled endpoint. It
registers the numeric dispatch with the existing owner-gated action
executor. The added conversation fixture asks twice, exercises keyed
replays, and checks the single Cloud route request, its original walking
mode and the exact offered coordinates. The scoped routing proof passed 22
Dafny obligations and 1,000 Quint traces. Runtime qualification is running.
The pending choice is kept in the running Maps plugin. Verifying that the owner received the exact question, and matching
Develop's unique option names and labels, still need parity work.

The prior Cloud Maps run exposed a stale expectation for a billed Google
400. The modeled unpriced refusal keeps a replay copy and charges the quote
once. Follow-up `0d0cc2e33e1` checks the exact refusal before other requests
can enter the same fixture and asserts that replay makes one provider call
in total. Candidate `1bed9280930` also fixes the prepared-view fixture's
Effect boundary for the held Cloud reply and its stream frame parsing.
Generation, the Maps turn tests, Cloud WP7, and prepared-view journeys
are running or queued on this worktree.

The isolated camera OS bridge passed both targeted tests. The batch speech
settlement model passed 14 Dafny obligations and 1,000 Quint traces. The
combined candidate's official `pnpm verify` attempt exited 1 after Turbo
listed its scope and before any package results. Earlier, different
revisions reported broad build and runtime failures. The candidate still
needs full verification at a single revision. The official dry run on
`4c22c96ba8c` resolved 511 tasks in 84 packages, and full verification for
`1bed9280930` is queued behind the focused runs and older verification.

## First-pass package compilation and runtime checks

Candidate `0b1b122db6d` builds on Maps candidate `1bed9280930`. It fixes
the Effect 4.1.1 HTTP import for Google Workspace and the VibeLang
failure-union types in Health and SQL. The three files match the sources
that failed compilation in the earlier full run. All three packages
passed their own typecheck and build with pinned dependencies and
freshly generated owner modules.

The built-entry smoke check uses a synthetic Google HTTP client and
synthetic Health connector. It checks Google account, scope and epoch
admission and rejects publication after revocation. Health filters the
owner and observation kind and clips overlapping intervals. The SQL
case runs real PGlite in a temporary directory, checks rollback on
missing row policies, reopens the stored migration ledger and verifies
a conflicting checksum is refused. It also checks the separate
tenant-and-agent guard. Managed Google account flows and real health
and provider integrations still require their own qualification.

The speech typecheck on the rolled-over branch initially rejected two
Effect catch expressions. Commit `01ba27bd780` fixes both and is
cherry-picked into `0b1b122db6d`. The standalone Cloud typecheck passed after that fix. Batch speech and
the provider test passed, including the clean and unclean close cases.
The three realtime journeys failed. Two left the session in retirement
with unsettled receipts and one timed out. Advancing the virtual clock
reproduced the failure. Tracing the VibeLang projection showed the
retirement call ran while constructing the parallel Effect collection.
Commit `8e0e08d7b7e` keeps it as an Effect and restores the original
realtime fixtures. With that production fix, two of three realtime
journeys now pass, including the three-window accounting case and stop
during renewal. Batch and provider tests also pass. The insufficient
credit case still times out and is running with diagnostic checkpoints.

Candidate `d7cbf3b006c` also carries the existing PTY, Video, Web Search
and SQLite compile fixes. It owns a PDF.js loading task before awaiting
its document and releases it if the opening or extraction is interrupted.
All five packages passed typecheck and build. SQLite passed its native
reopen journey. A disposable PTY refused foreign input and accepted the
owner's input. The PDF fixture released each task once across native and
visual reads, load and page delivery failures, and cancellation during
opening. Video exercised early URL refusal. Web Search exercised exact
query and tab correlation and link filtering with a synthetic browser.
The last three packages used the existing compiled Core from
`bfe1ce9145f`, whose tracked Core package matches the candidate.

Google Workspace and Health passed 5 and 2 Dafny obligations respectively
and 1,000 Quint traces each. SQL initially left the identical-ledger
law open. Commit `4de6fa7af61` supplies an induction on matching
ledger prefixes. SQL then passed all four obligations and 1,000 Quint
traces. Candidate `abce57bc736` integrates the observed Vibestack
`2727090446e` proof updates and takes the speech cleanup fix. The PDF,
SQLite, PTY, Video and Web Search models passed 52 obligations and
1,000 Quint traces each. Full integrated verification is queued in the
independent exact `abce57bc736` checkout after its frozen install.

The later candidate `e1f357e6f11` implements the Develop #40397 Browser
authorization changes. Its reload parser attaches a bare withdrawal
only to the preceding reload request. A withheld same-document open
requires the full authored address, including any requested fragment.
The proposal checks both the proposed address and the final grounded
address. The native reload handler reads the owner's words through the
same envelope decoder as proposal grounding. All 38 obligations and
1,000 Quint traces passed for the focused Browser control model. The
focused Browser package process was killed while loading Agent sources.
The next exact scoped run at `320ccabb1c8` passed all seven Browser
tests, including the enrolled tab overview journey. Browser build and
Vision and Wallet builds and typechecks also completed. Browser
typecheck failed because the enrolled journey imports the sibling
Agent's real host. Commit `ae10467ad1e` puts the package-only compiler
root on the production build configuration for Browser, Calendar, Maps
and Notes. Browser, Calendar and Notes typechecks passed in the separate
checkout. Maps reached three VibeLang errors in its new fixtures.
Commit `217ba4a9428` moves those failures and the empty model response
construction into Effect boundaries. `2e655cf621e` distinguishes a
transport refusal before reading the HTTP reply status. Maps then passed
typecheck and its runtime suite started. Full
verification at `217ba4a9428` is queued behind the earlier `e26f386cc13`
run in the checkout with the frozen dependencies.

Candidate `320ccabb1c8` types the Browser withdrawal fixture and carries
the canonical-owner Vision and Wallet changes from upstream review
commit `ebdac391be2`. Wallet rechecks both the authenticated owner and
the configured owner before signing. Wallet remains deferred in the
AlphaPhone product scope. Browser, Vision and Wallet qualification is
running in the exact candidate checkout. Dependency linking completed;
the install's prepare hook reported a failure, so the scoped Turbo run
invokes generation explicitly through its normal prerequisites.
An isolated Vision generation, typecheck and build passed using the
matching compiled Core. The built action passed five owner admission
cases and two handler refusals with synthetic owners.

Candidate `e26f386cc13` also carries the Cloud account owner check,
shared Vitest registration changes, and loopback Network fixture path
from the same upstream review branch. The earlier full run reproduced
the Network suite registration failure. An exact full run is queued
behind the scoped candidate run. The Browser grounding smoke passed nine
reload and four destination cases using the matching OS address leaf.

The speech trace showed a third window was actually admitted in the
insufficient-credit fixture. Reservation admission needs the quote,
which can be smaller than the full reservation margin. Commit
`f1613e43c40` makes the first window's synthetic synthesis spend large
enough to leave insufficient credit for the third quote. The two earlier
windows are fully funded at admission. The fixture also reports an
unexpected extension promptly. The exact standalone speech rerun passed
all five selected tests across two files, including batch, all three
Cloud realtime cases and the provider fixture. The insufficient-credit
case closed at the existing deadline, and the funded case received a
third window. These journeys used synthetic providers.

The Develop source index covers 402 observed changes through
`d3af0f0f2f2`, with 102 rows still awaiting complete behavior review.
The latest source review added stories for image-only agent extraction,
the Pixel 10a project list, Android sign-in readiness and callback
repair, resident-agent recovery, subscriber funding authority, failed
fresh Cloud migration recovery, private action restoration, fitted chat
height and the short current-time question. It also covers privileged
launcher staging, on-device update behavior, multilingual refusals and
field transcript parsing with document-backed media. Release-related
stories cover retiring obsolete sign-in bindings and checkout diagnostics,
exact Stripe decimal settlement evidence, and the control-plane router tag.

Merge `2ffcebd8d11` brings in Vibestack `230dc70b780`, including the
shared Google sign-in request budget, Cloud fixture renames, and the
schema-1 Android Cloud speech profile test. A fresh dependency install
was killed. With prepared dependencies from the identical lockfile,
all five selected Cloud tests passed across Google identity and the
renamed speech-session fixture. All three Android host-profile tests
also passed.
The later upstream merge `f224479cf34` has the same source tree and is
included in local merge `af7112ea2fe`.
The complete history still shows no merge base between the new
Vibestack tip and Alpha's release floor.

Commit `98a25fcc51c` updates the #39806 runtime-payload rule to use the
installed version and the exact inventory digest together. An unavailable inventory refuses launch
even when a prior extraction is present. The resident and embedded Java
loaders already enforce that identity. Both passed a JVM test using
equal-size ZIP fixtures with the same package version and timestamps,
replacement bytes, unchanged reuse, missing and malformed inventory,
and tampering with the extracted bundle. The updated model passed 1,000
Quint traces and all 11 Dafny obligations after proving that the target
ABI list contains only the two supported values.

Commit `78780b9b439` carries the Files selection binding from Develop
#39683. A Chromium run against `af7112ea2fe` reproduced the race with a
real IndexedDB read paused after its snapshot. A forgotten selection
returned the old `memo.txt` attachment. The fix retains the original
binding for each read and rechecks it after storage access. Rename
publishes only the revision its transaction committed and cannot reopen
a forgotten handle. The Files library model passed all 13 Dafny
obligations and 1,000 Quint traces. The initial typecheck found a missing
Agent workspace dependency in the isolated checkout and required a
nonthrowing declaration for the UTF-8 decoder. With both addressed at
`e315bb0c821`, Files passed typecheck and all five Chromium tests,
including the selection race. All 12 Node tests in the two Files test
files passed on that same checkout.

The Maps owner test checkout passed typecheck and 18 of 20 Node tests
after the named-place fixture began sending distinct owner message IDs.
The numbered-choice resident test loaded two Agent modules, so its
registration and planner used different first-call registries. Test
configuration `106ebd9af45` points both at Agent source. The other
failure showed that a valid provider ID alone was rejected as a missing
destination, and that a refused ID was indistinguishable from an unknown
one. Commit `9787954f747` preserves that distinction and applies the
existing Maps routing model to decide whether to fall back to a name.
On the prepared Maps test checkout, VibeLang typecheck and all 20 Node
tests passed with both changes applied.

The Vibestack producer at `e26f386cc13` emitted an `agent.mjs` with
Browser and Vision and completed its load smoke on Node 26.13.1. Reading
the manifest back verified the bundle digest and recorded both plugin
packages and their actions. `StockAndroid` and `AospImage` load lists each
included Browser by default and added Vision only when selected in this
test profile. The Vibestack OS stager downloaded and verified both pinned
Android Node runtimes and published the inventory with eight entries for
the six bundle files and two `libeliza_node.so` binaries. Both
`arm64-v8a` and `x86_64` were staged. This qualifies the producer and
payload stager for two real packages. The complete Alpha profile,
packaged distributions and native consumer still require qualification.
The isolated x86-64 Android API 35 emulator ran the staged Node 26.13.1
binary with the expected hashes. The two plugins registered, then the
agent received `EACCES` while binding its Unix socket from the shell.
A disposable debug APK installed on the owned emulator. The app sandbox
matched the staged x86-64 payload and native binary hashes, ran Node
26.13.1, and completed the resident load smoke with exit 0. The smoke
registered Browser and Vision through the app sandbox. The interactive
task host separately reported `TASK_STORAGE_UNAVAILABLE`. The retry
reproduced the warning with a canonical absolute state path. In that app
sandbox, Node read the process identity, verified a 0700 directory
owned by the app UID, and wrote a SQLite database. The hard-link
operation used by the task writer lock failed with `EACCES`. The
Android candidate now takes a separate private SQLite write transaction
for the lifetime of the task writer and keeps the task database on its
own connection. Replacement fences the old inode and a legacy-format
lock is refused without conversion. The first Android contention
probe exited before yielding a result and the diagnostic retry is
running. All four task-store tests passed in the prepared host checkout,
including same-process and separate-process contention against the
SQLite guard, legacy format refusal, and replacement fencing. An
installed Alpha distribution has a separate qualification gate.

A fresh upstream sample has Develop at `d3af0f0f2f2` and Vibestack at
`4a2c1fd60da`. Local merge `ba5d2d3e149` resolves ten conflicts. Browser
combines the upstream dictated-address grounding with the local reload
withdrawal rules. Calendar combines exact-source, exact-version
confirmation with one-occurrence chat deletion and rejects year shifts
that cannot preserve the named local time. A stored question for the
entire series cannot authorize a chat deletion. Camera retains
volume-qualified capture receipts alongside the requested-lens tests.
The upstream delta also adds an Inbox admission check for multiple
readable Gmail grants. Package verification for the merge is pending.
Develop advanced to `8cca9468bc4` and the inventory now has 62 of 403
rows awaiting behavioral review. In #40411, all three newly reported
short withdrawals allowed reload on the previous Vibestack grounding.
Commit `7a8d1a17d31` passed the focused before-and-after comparison for
those three messages and two allowed controls. All seven Browser package
tests passed on the prepared checkout. Vibestack `206d8650c81`, including the JVM test
adapter change, is merged locally in `2bc52e3df9a`.
Candidate `acf74718b55` also merges Vibestack `32cf6608414`, including
open-mic withdrawal carryover, end-of-turn detection, speaker mute,
native speech fixtures and staged-model read diagnostics. The merged
voice changes still need combined verification. Recent source review
covers authored reply privacy, contact callback grounding, Cloud native
registration and import, staging Stripe publication and production test
grant repair. The source inventory distinguishes those deployment
operations from the product journeys exercised here.

Develop #39709 restores personal references before final credential
redaction in visible action narration. Vibestack's connector already
does that. The resident can publish planner text before its terminal
REPLY callback, while the callback gets a second restoration through
the action executor. The open resident journey covers acknowledgments,
voice-facing output, stored replies and keyed replay under the same
owner turn, with wrong-room references and synthetic credentials as
controls. Candidate `6649df28f7f` adds the audience and exact-turn
gate, one reply projection for delivery and durable replay, and a
voice-facing regression with a synthetic credential. Candidate
`d400007d18e` and `434f9149132` address the Vibe compiler failures in
the reply and scheduler changes. The focused privacy test restored the
address and failed its redaction assertion. The reconciliation stages
a subsequent scan after restoration and revises the fixture to expose a
credential-shaped value in the same turn. The revised test remains open.

A later remote fetch moved both Main and Develop to `93b07caec68`.
That commit contains Vibestack `32cf6608414`. The remote no longer
advertises the Vibestack ref. The commit is on the Vibestack code
lineage, and the prior Develop tip `8cca9468bc4` has no common ancestor
with it. The 403-row inventory retains that prior Develop history.
The first integration into the local candidate surfaced 41 conflicting
files. Local merge commit `28997af66d9` resolves them and now runs its
own verification with the pinned workspace install. It retains exact
Calendar source and event-version checks alongside explicit recurrence
scope, Cloud image limits alongside modeled output reservation, and
Android inventory identity alongside one extraction repair. Maps retains
the offered place snapshot when it accepts a name or position. Cloud
speech retains measured counters under proof that the successor started
and joins in-flight settlement before terminal settlement. A saved-note
reply exposes its protocol name and binding, while only the exact claim
returns the note ID. Alpha's renderer and installed profile still need
that saved-note claim journey.

Develop #39683 exposed a second attachment boundary. The resident accepts
up to 5 MiB of base64 per image, but Cloud completions capped the entire
HTTP request at 256 KiB. Candidate `8945c2c9eb5` models a 256 KiB ordinary
request budget plus up to four supported inline images of at most 5 MiB
each. The HTTP handler measures wire bytes and checks that budget before
reserving funds. Its route fixture exercises accepted image bytes, replay,
and oversized requests that must leave provider calls and holds untouched.
The focused wire-budget model passed 1,000 Quint traces, including the
ordinary byte limit and image count boundaries. The previous Cloud route
accepted five small inline images in the HTTP regression fixture. The
new route passed the same HTTP test. It admitted a 5 MiB inline image,
rejected replay under the same key, settled one hold, and refused the
oversized requests before settlement or provider dispatch. The legacy
native app payer uses a separate funding authority, which still needs
migration. Image requests with the selected Alpha planner model also
need an installed test.

Develop #40088 maps to the Vibestack native password-backup challenge and
one-use approval rules. Owner verification returns the owner scope without
creating a sign-in or a data grant. Read, save and delete are distinct
purposes bound to the enrolled device, owner and registered callback. The
Cloud authority fixture passed with synthetic credentials and a local
store. Android cold-start and installed Alpha readiness remain open.

The local-inference model passed 1,000 Quint traces. Commit `bfd1fd69743`
updates the stale uninstall lemma and proves that an uninstall preserves
other unreadable models. The first complete run reported 50 of 74
obligations proved. Commit `de97ea4c224` expresses the existing two slot
invariants as pointwise checks over the same ordered slot list. It passed
all 74 Dafny obligations and 1,000 Quint traces.

Develop #39500 asks the resident to retain a scheduler driver write until
it settles, including a write that committed without acknowledgement.
Candidate `2d328797316` closes the exact worker's admission, joins its
boot write, rereads eligible driver rows and serializes their cleanup
with replacement initialization. It keeps owner task definitions and
history separate from the private driver task. The resident also waits
for the driver before closing the store, even after core's fast service
wait. The focused eligibility model passed 1,000 Quint traces. The
before-and-after resident test uses a real PGlite commit with a delayed,
lost acknowledgement and checks the next startup. The generator rejected
a parameterless law in the first candidate run. Commit `092652744e6`
expresses it over registrations with the same replacement fence. The
candidate regression passed on `434f9149132`. The pre-port run
stopped without a terminal test verdict. Calendar's first prepared recheck ran 89
tests and could not load seven suites because the workspace packages
had no built declarations. A retry builds those dependencies before
running Calendar.

## Evidence required to replace the pin

The full Alpha verification exited 1 during Quint. The scenarios
passed for NativeActionRecovery and NativeGmailBackground, but each
simulation hit the runner's 120-second limit. Each passed in isolation
with the same model, seed, 1,000 samples and 80 steps. LemmaScript,
typechecking, host tests and the production bundle stages are rerunning
separately because the combined command stopped at Quint. The full
retry will run after those stages to avoid competing for the same
workspace outputs.

The latest Alpha `android:build:local` retry stopped with code 2 in
preflight. The submodule lacks the release floor `2cd448186c5e`.
The separate, complete commit graph shows that the current pin
`11040b3555c9` is an ancestor of that floor. Vibestack `2727090446e`
and candidate `f1613e43c40` share no ancestor with it. The prior
distribution verifier also rejected the existing APKs' public update
channel against the source configuration.
The floor is Develop's Maps selection-handle fix, documented in the
story table above. Its behavior is already in the local Vibestack
candidate and its release ancestry still needs qualification.

Alpha's standalone production typecheck and web build passed. The bundle
audit scanned 408 files with test mocks disabled and reported no audited
mock, fixture or developer markers. It also reported existing licence
flags. The full Alpha verification run recorded a process kill in
NotificationCollection. The isolated retry passed the simulation and
all three configured counterexample witnesses.

The latest planner check passed all 72 Dafny obligations. The focused
conversation proof verified that the heard and unheard units reconstruct
the stored reply exactly. The full conversation model passed 1,000 Quint
traces and left 24 of 70 Dafny obligations unproved, including keyed turns,
stop settlement and stored replies. The
native channel baseline left 26 of 101 Dafny obligations unproved. The
acknowledgment candidate left those same 26 and one new reply obligation
unproved out of 109. The candidate passed 1,000 Quint traces.

The unpinned standalone Alpha LemmaScript retry passed generation, the
additions-only check and all 150 Dafny conditions across 23 source files.
The earlier CPU-pinned run hit the 120-second command timeout before Dafny.

The broad upstream verification attempt on the refreshed base exited 137
during generation. The same attempt also reported failures in the docs
self-test, examples self-test and Studio tests. Standalone pinned docs
self-tests passed after generating skill links, and standalone Studio
Bombadil ran 108 actions in 60 seconds. A direct 60-second Bombadil run
against the Cloud fixture and its checked-in properties passed with 234
actions. The Cloud stage's automatic source scan hit an unreadable
external Android build directory after following a relative directory string from the built tool installer. The direct run used the same
package start command and Bombadil flags. These runs cover Studio and
Cloud return pages. The fullstack example passed its full check including
339 Bombadil actions in 60 seconds.
The assembled agent package built after fixing VibeLang resend effect
boundaries. Subsequent Calendar and agent fixtures hit effect errors at
the dense delete admission and request-clock bindings. Those call sites
now use the generated Effect entry or explicitly wrap the throwing call.
Focused package reruns are pending.

Alpha's Android command reached the upstream ancestry check after staged
voice inputs were supplied. The current pin `11040b3555c9` precedes the observed `origin/main` floor
`2cd448186c5e` in the separate upstream checkout. Alpha’s own shallow
submodule lacks the floor object, so the command exits 2 before Gradle. The candidate has
yet to be reviewed and pinned, so both distributable Android outputs
remain unqualified. A direct `npm run android:verify` on the existing
artifacts rejected their recorded public update channel because it differs
from the current source configuration.

Qualify the same candidate revision with upstream `pnpm verify`, including
Quint simulation and replay, Dafny and LemmaScript, shell journeys, and
applicable Bombadil exploration. Record which surfaces and properties ran.
Qualify the consumer with `npm run verify`, qualified staged voice inputs,
`npm run android:build:local` and `npm run android:verify` for the launcher and
standalone outputs. Separately record emulator HOME, AOSP image boot, real
provider integrations, physical device journeys and user acceptance.
