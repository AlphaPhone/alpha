# Alpha Phone parity audit brief (read-only)

## Goal (the owner's)
Alpha Phone is being hard-cut from its legacy codebase (branch `develop`) to a Vibestack rewrite
(branch `claude/vibestack-migration`, PR eliza-research/alpha#1451). The owner wants proof that
nothing on `develop` (features, fixes, recent changes, tests, formal models) was lost or regressed in
the port, and that the port really uses Vibestack conventions (stories → rules → Quint model in the
spec, generated code, VibeLang shell, conformance tests, Dafny proofs). You audit one slice and report
gaps. You fix nothing.

## Trees (all read-only for you)
- Legacy truth: `/home/shaw/.cache/vibeaudit/alpha-develop` (alpha develop dd63c6bc, through #1454).
  - renderer `apps/app/src/**` (TS/TSX; `prototype/`, `runtime/`, `native/`, `maps/`, `browser/`, `ui/`, …)
  - Android `android/**`, cloud `cloud/**`, scripts `scripts/**`
  - tests `test/**` (root `*.test.mjs`, `test/browser/*.spec.ts`), formal `specs/quint/**`, `specs/lemma/**`
- Port: `/home/shaw/.cache/vibeaudit/alpha-vs` (migration 3d7ca972).
  - spec `apps/app/spec/<area>/*.md` (stories, `###` rules, embedded Quint blocks), proofs `*.proof.dfy`
  - shell `apps/app/src/<area>/*.vibe|*.ts`, UI `apps/app/src/web/<area>/**`, tests `apps/app/test/<area>/**`
  - Android `android/**`, cloud `cloud/**`, scripts `scripts/**`
  - `scripts/legacy-retirement.json` maps each legacy test / Quint model / Lemma proof to an area. The
    mapping is coarse (area level) and was never verified: do not trust it as evidence of coverage.
  - `docs/vibestack-open-items.md`: gaps the port's authors already know. Read it first.
- Upstream eliza (vendor/eliza is NOT checked out in either alpha tree):
  - legacy pin: `/home/shaw/.cache/vibeaudit/eliza-develop` (elizaOS/eliza develop 7a124190a1)
  - vibestack integration: `/home/shaw/.cache/vibeaudit/eliza-vs` (elizaOS/eliza `vibestack-dp`)
  A behaviour that the legacy app implemented itself may now legitimately live upstream in
  `eliza-vs/packages/**` (spec in `eliza-vs/spec/**`). Check there before calling something missing.
- Per-area legacy file lists: `/home/shaw/.cache/vibeaudit/lists/<area>.{tests,quint,lemma,scripts}.txt`

## Method
1. Read `alpha-vs/docs/vibestack-open-items.md` and your area's `apps/app/spec/<area>/index.md`.
2. Build the legacy behaviour inventory for your slice from the legacy test titles
   (`grep -hoE "(test|it)\\(['\"\`][^'\"\`]+" <files>`), the Quint model names/invariants, and the legacy
   source. Weight it toward user-visible behaviour, safety/consent gates, data durability, and fixes
   landed in the last three weeks (`git -C alpha-develop log --since=2026-11-01 --format='%h %s' -- <paths>`;
   history is shallow before 2026-11-01).
3. For each behaviour find the port's counterpart and classify it:
   - `OK` — a spec rule states it AND shell/UI code implements it (cite both).
   - `UNMODELED` — implemented but no spec rule/Quint model covers it.
   - `UNIMPLEMENTED` — spec rule exists but no code calls/implements it (dead model, unwired port, TODO).
   - `MISSING` — neither spec nor code, and not upstream either.
   - `CHANGED` — present but behaves differently from legacy in a way an owner would notice.
   - `RETIRED` — deliberately removed (cite alpha #1422 or the open-items doc).
   - `KNOWN` — already listed in the open-items doc (name the bullet).
   Read the actual code on both sides. A matching name is not evidence. If you cannot verify, say
   `UNVERIFIED` and why.
4. Also check Vibestack usage in your slice: rules with no Quint block, Quint blocks with no invariant
   or `witness`, shell logic that re-implements what the generated model should decide, tests that do
   not drive the generated conformance cases, missing `.proof.dfy` where legacy had a Lemma/Dafny proof
   of the same property, UI components without `.meta.tsx`.

## Output
Write `docs/vibestack-audit-2026-11-23/<your-slug>.md`:
- `## Summary` — counts per class, and a one-paragraph verdict on whether this slice is at parity.
- `## Gaps` — every non-OK, non-RETIRED item, most severe first. Each: class, one-sentence behaviour,
  legacy evidence (`path:line`), port evidence (or where you looked), user impact, and the smallest fix
  (which spec file gets the rule, which `.vibe`/TSX file gets the code).
- `## Confirmed OK` — a compact table of what you verified (behaviour, legacy path, spec rule, code path).
- `## Not covered` — what you ran out of budget to check. Be exact; this list gets re-assigned.

Your final message: the counts, the ten most severe gaps (one line each), and the not-covered list.
Rules: no edits outside `findings/`, no installs, no builds, no network, no git writes. Use `rg`/`grep`
and read excerpts. Do not spawn subagents.
