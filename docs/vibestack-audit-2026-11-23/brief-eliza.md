# eliza develop → vibestack parity audit brief (read-only)

## Goal (the owner's)
Alpha Phone is moving its upstream from elizaOS/eliza `develop` (TypeScript, pinned at 7a124190a1)
to elizaOS/eliza `vibestack` (a Vibestack rewrite with unrelated git history, started 2026-11-13).
The owner wants proof that every behaviour Alpha Phone relied on from `develop` exists on
`vibestack`: features, fixes and the PRs merged while the rewrite was in progress. You audit one
slice and report gaps. You fix nothing.

## Trees (read-only)
- Legacy: `/home/shaw/.cache/vibeaudit/eliza-develop` (develop 7a124190a1). `packages/**`, `plugins/**`.
- Vibestack integration: `/home/shaw/.cache/vibeaudit/eliza-vs` (see `git -C … log -1` for its head).
  Spec `spec/<package>/**/*.md` (stories, `###` rules, Quint blocks), code `packages/<package>/src/**/*.vibe`,
  tests `packages/<package>/test/**`, proofs `*.proof.dfy`, `spec/lock.json`.
- Consumer: Alpha's port `/home/shaw/.cache/vibeaudit/alpha-vs` (what the phone app calls) and legacy
  Alpha `/home/shaw/.cache/vibeaudit/alpha-develop` (what the phone app used to call). Use them to decide
  whether a develop behaviour matters to the phone.
- PR history: `git -C /home/shaw/.cache/vibeaudit/eliza.git log --first-parent --since=2026-11-13 develop -- <paths>`
  (shallow before 2026-11-08). `git diff <merge>^1 <merge>` shows one PR.
- Prior bookkeeping by the porting session (do not trust as proof; verify in the tree):
  `/home/shaw/.cache/vibecut/{parity-results.json,wave2-results.json,dp-results.json,family-leftovers.json,wave3.md}`
  and `docs/vibestack-audit-2026-11-23/eliza-pr-ledger.md`.

## Method
1. List the develop PRs since 2026-11-13 touching your slice's paths, and the slice's develop behaviour
   that Alpha Phone uses (routes it calls, actions the agent offers, wire shapes, prompts, timeouts).
2. For each, find the vibestack counterpart and classify: `OK` (spec rule + code, cite both),
   `UNMODELED` (code, no rule), `UNIMPLEMENTED` (rule, no code path reaches it), `MISSING`, `CHANGED`
   (differs in a way the phone or its owner would notice), `NOT_APPLICABLE` (say why: the phone never
   used it, or the package is deliberately absent), `UNVERIFIED`. Read the code on both sides; a
   matching name is not evidence.
3. Check the contract with Alpha's port: every upstream export, route, header and wire field that
   `alpha-vs/apps/app/src/**` or `alpha-vs/android/**` uses from your packages must exist in `eliza-vs`
   with that shape. List every one that does not.
4. Check Vibestack usage: rules without Quint, proofs recorded as simulated-only in `spec/lock.json`,
   tests that bypass the generated conformance cases.

## Output
Write `docs/vibestack-audit-2026-11-23/<your-slug>.md` with `## Summary` (counts, verdict),
`## Gaps` (most severe first: class, behaviour, develop evidence `path:line` or PR, vibestack evidence
or where you looked, impact on the phone, smallest fix), `## Contract mismatches with Alpha's port`,
`## Confirmed OK` (compact table), `## Not covered`.
Final message: counts, the ten most severe gaps, the not-covered list.
Rules: no edits outside `findings/`, no installs, builds, network or git writes. No subagents.
