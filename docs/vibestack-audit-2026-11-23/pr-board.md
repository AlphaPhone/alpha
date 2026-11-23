# Open PRs at 2026-11-23 ~05:50Z (state moves; re-query before acting)

Phone baseline: Pixel 10a, image alpha.v625 userdebug, app ai.alphacompute.alphaphone versionCode 625
(updated 2026-11-22 18:04), holds HOME, DIALER and SMS.

## eliza-research/alpha
- #1452 → develop, docs only, CI pending; cutover session has a watcher that squash-merges it when green.
- #1451 → vibestack, draft, `build` and `Repository verification` FAIL. The port. Never generated or built.

## elizaOS/eliza → vibestack
- #40251 draft, tool sync (#211/#212), CI pending.
- #40247 draft, ReplyStream proof, CI pending. #40245 draft, port of develop #40234, CI pending.
- #40242 ready, device mail/calendar lease, CONFLICTING.
- #40233, #40228, #40221 drafts (external proofs), `verify` fails. #40232 draft, pending.
- #40231 draft CONFLICTING, `verify` fails. #40226 draft, `verify` fails. #40224 draft CONFLICTING.
- #40218 draft CONFLICTING, +41.8k lines, "Port remaining develop plugins to Vibestack".
- Not PRs yet: origin/vibestack-dp (118 ahead, 118 behind vibestack) and seven local wave-3 branches.

## elizaOS/eliza → develop (legacy line; each needs a vibestack disposition if merged)
- #40250 restore-context-once, #40249 turn-resend-bound: ready, CI pending (context-budget session).
- #40248, #40236 drafts, `Source checks` fail.

## lalalune/vibestack
- #216 ready, CI pending.
