# Vibestack forensics and recovery plan (2026-11-24)

Evidence was collected 2026-11-24 around 07:30 UTC. It comes from:
- GitHub ref activity logs (`repos/<repo>/activity`);
- `git ls-remote` on both repositories;
- the closed and open PR lists;
- the transcript and workspace of the "Vibestack template migration" session (`~/.cache/vstpl`).

Nothing was changed on any remote while writing this.

## 1. What is wrong, in one paragraph

**Eliza is fine.** Its Vibestack line was promoted on purpose: `develop`, `main` and `staging` are now the Vibestack template repository, and the old lines are kept as `*-v3`.

**Alpha's `vibestack` branch is not a Vibestack repository.** It is Alpha `develop`'s tree (cut from develop on 2026-11-22) with a Vibestack-*style* app under `apps/app`. It borrows the Vibestack tool from the eliza submodule and still carries develop's legacy trees.

**The real Alpha Vibestack line is `vibestack-template-rebuild`.** It is built on the lalalune/vibestack template layout, but it was kept in a local worktree for a week, so the other sessions never saw it. Meanwhile about 60 PRs of migration work landed on the wrong-shaped `vibestack` branch.

**Nothing on a remote is lost**, but two things exist only on this laptop, and several eliza PRs were closed unmerged.

## 2. State of every branch now

### elizaOS/eliza

| Ref | SHA | What it is |
|---|---|---|
| `develop` (default) | e11409812b | The Vibestack line: root `vibestack/` tool, `spec/`, `packages/`, initial commit 8643eb34 (2026-11-13). Contains #40357 (develop delta through #40299) and #40395 (#40300 onward, up to #40396). |
| `main` | 586e0508d2 | The same Vibestack root. Tool synced to lalalune/vibestack@b7f1827, which is 32 commits behind the template head b06934b. |
| `staging` | 93b07caec6 | The same Vibestack root; this was the last `vibestack` head before the promotion. |
| `develop-v3` | 184150ae5d | **The old develop, preserved.** It was develop's head before the force-push. |
| `main-v3`, `staging-v3` | 5fa83b59 / 789e7204 | The old main and staging lines (root 50248dad), still receiving merges (NubsCarson, 06:42–07:10 UTC). |
| `vibestack` | — | **Deleted** 2026-11-24 05:17 UTC by lalalune. |

Promotion sequence, from the ref activity log:
- 05:05 UTC: last merge into `vibestack`.
- 05:10: **force-push of `develop`** from 184150ae (old develop) to 93b07caec6 (the vibestack head).
- 05:17: `vibestack` deleted.
- 06:28: first merge on the new develop (#40429), giving e11409812b.

### eliza-research/alpha

| Ref | SHA | What it is |
|---|---|---|
| `vibestack` | 164dbbe073 | Develop-derived, see below. Pins eliza `develop` e11409812b through `vendor/eliza`, with `vibestackSource: "vibestack"` read from the submodule. |
| `vibestack-template-rebuild` | 8eb7ea73a7 | **The true template line.** Root `vibestack/`, `SPEC.md`, `.agents/`, `spec/kit` + `spec/app`, `packages/{ui,design-system,eliza-harness,deployment}`, `apps/app`, and the old tree under `legacy/` (= develop@26e827f, 2026-11-17). |
| `claude/template-port` | 774620abec | **Local only, not pushed.** It is the template rebuild plus two commits: `legacy/` refreshed to develop 264ca621e, and eliza repinned to develop e11409812b. It is in `~/.cache/vstpl/alpha`. |
| `develop` | 264ca621e7 | The legacy app. It has 19 first-parent merges since the point where `vibestack` forked off (#1459), listed in section 5. |
| `main` | a0d453068d | 2 commits ahead of develop (the v121 private signing pin, #1484). |

#### Shape of alpha `vibestack` versus the template

| | alpha `vibestack` (164dbbe) | `vibestack-template-rebuild` (8eb7ea7) | lalalune/vibestack template |
|---|---|---|---|
| Root `vibestack/` tool, `SPEC.md`, `.agents/` | no (borrowed from `vendor/eliza`) | yes | yes |
| Specs | `apps/app/spec/<area>/` (251 files, 16 areas) | `spec/kit/` + `spec/app/<area>/` (112 files, 7 areas) | `spec/` |
| VibeLang files | 443 | 21 | — |
| Story metas | 251 | 29 | — |
| UI | `apps/app/src/web/components/ui` (local shadcn copies) | `packages/ui` + `packages/design-system` | `packages/` |
| Eliza | git submodule `vendor/eliza` | `@repo/eliza-harness` + `eliza.lock.json` (pinned process) | — |
| Legacy material still at the root | `specs/` (931 legacy Quint files), `test/` (1,717), `scripts/` (214), `docs/` (4,740), `test:browser:legacy` | all under `legacy/` (4,367 files) | none |

The content is on `vibestack`; the template shape is on `vibestack-template-rebuild`. Both are needed.

## 3. How this happened

1. **The template rebuild lived in a local worktree for a week.** Its 50 commits (2026-11-17 to 11-23) were on no remote until draft #1470 was opened on 11-23 18:51 UTC. #1470 was later closed. Every other session saw "alpha has no vibestack branch".
2. **This session created alpha `vibestack` from develop.** On 2026-11-22 22:29 UTC the "Vibestack migration codebase" session (this one) found no alpha `vibestack` branch and created it from develop 06c2098 (#1418). Its briefs put the new app inside `apps/app` of the develop tree, read the tool from `vendor/eliza`, and kept the legacy trees. That session never compared against the template's product layout (lalalune/vibestack, gracefultechnology/grace) or looked for local template work. **This is the decision that made the line the wrong shape.**
3. **Momentum made the wrong shape canonical.** The cutover, audit, Browser, Chat view, Codex and NubsCarson actors then landed about 60 PRs onto that branch on 11-23 and 11-24: #1451, the seven `vibecut-area-*` merges, #1467, #1469, #1472–#1476, #1480–#1482 and #1486–#1496, plus lalalune "sweep" merges and the landing-page and site commits.
4. **The name "vibestack" changed meaning overnight.** Eliza's `vibestack` *was* the template repository, and its promotion to `develop` removed that branch, so the only remaining branch called `vibestack` is alpha's develop-shaped one.
5. **Several actors write to the same branches at the same time.** Codex drafts #1497, #1498 and #1499, NubsCarson's self-merges, lalalune's direct pushes and several Claude sessions all change alpha `vibestack` and `develop` at once. Any snapshot drifts within hours.
6. **Batch closes on eliza.** On 2026-11-24 between 02:28 and 02:43 UTC, 10 open `vibestack` PRs were closed unmerged shortly before the promotion. At least some carry work that is not obviously on `develop` (section 4).

## 4. Is anything lost?

**Preserved on a remote:**
- **Eliza:** old develop is `develop-v3` (exactly 184150ae); old main and staging are `main-v3` and `staging-v3`.
- **Alpha:** `vibestack`, `vibestack-template-rebuild`, `develop` and `main` are all present. #1470's head branch still exists.

**At risk, local only:**
- `claude/template-port` (774620abec) in `~/.cache/vstpl/alpha`. It holds the `legacy/` refresh to develop 264ca621e and the eliza repin. **Push it now.**
- The template session's 11 lane worktrees (`~/.cache/vstpl/lanes/L1`–`L11`) are all still at 774620abec with no changes, so no lane work exists yet.

**Triage result (done after the first draft).** All 15 closures were deliberate. lalalune closed each one with a written reason during the "v4 branch cleanup" (02:28–02:43 UTC).
- **On `develop`:** #40396, #40351, #40346, #40334 and #40323 are fully on `develop` (100% of their added lines). #40407, #40406 and #40316 are mostly on `develop` and were superseded by #40417 and #40419.
- **Superseded:** #40400 by #40419. #40311 by #40417.
- **Deferred on purpose, nothing lost:**
  - #40370 Inbox Reply-To fixes (0% on `develop`; its fixes were never pushed);
  - #40358 context budget (24%; conflicts with #40364);
  - #40242 Grace WIP.
- **develop-v3 tail:** #40397, #40399 and #40411 are already in `plugin-browser/src/grounding.vibe`. #40418 doesn't apply, because the new line has no navigation evaluator. #40420 is ported as elizaOS/eliza#40440.
- **Tool sync:** `develop`'s tool was `747bf8d`/`790ef39` while `main` had `b7f1827`. `main` is now merged into `develop` (elizaOS/eliza#40441, 68468c1f0f). #40440 merged as 8e756a0808. Both merged with CI still running. lalalune/vibestack main is now b06934b, 32 commits past b7f1827.

The original list, kept for reference: eliza `vibestack` PRs closed unmerged since 2026-11-23 12:00 UTC (15).
- **Behaviour:**
  - #40370 Inbox parity (the agent's email draft reaches the phone);
  - #40323 Inbox grant recovery;
  - #40346 Camera requested lens;
  - #40388 Camera saved library ID (superseded by #40385, which merged);
  - #40396 Browser dictated addresses;
  - #40358 context-budget port.
- **Tooling and CI:** #40400 tool import through 1acbe9b (probably superseded by `main`'s b7f1827 sync, but **`develop` should be checked**), #40406, #40407, #40311, #40316, #40351.
- **Other:** #40242 Grace device mail lease, and #40308 dependabot (ignore).

**Eliza develop-v3 merges after #40395's cut-off, not yet found on the new `develop`:** #40397 (Browser authorization), #40399 (Browser client leaf), #40411 (Browser withdrawal punctuation), #40418 (Alpha Browser confirmation), #40420 (Robolectric mirror). #40375 is ported (a3064403385). #40379 and #40390 are covered by #40395.

## 4b. Work that exists only on this laptop (local branches and worktrees)

This was surveyed 2026-11-24 around 08:00 UTC.

**Scale:**
- 457 git checkouts in 15 repositories: 183 worktrees of `~/Work/eliza` (a shallow clone), 89 of `~/Work/alphaphone`, and side clones under `~/.cache` and `~/Work`.
- Branches active since 11-17 that have commits on no remote ref: 160 in Alpha and 89 in eliza.
- A line-coverage pass split off what had clearly landed. The rest, 31 eliza tips, 26 Alpha branches and the side clones, went to a read-only review by 8 agents.
- **Verdicts on 64 branches or themes:** 29 still needed, 24 superseded, 7 landed, 2 scratch and 2 unclear.

**Backups, all local, nothing pushed or deleted:** `~/.cache/vibestack-forensics-backup-2026-11-24/` (21 MB).
- Git bundles of every at-risk branch: `alpha-atrisk*.bundle`, `eliza-atrisk.bundle`, `ctx-budget-vs.bundle`, plus the side clones.
- `dirty/`, which holds `git diff HEAD` snapshots and HEADs of 29 recently edited worktrees with uncommitted changes.
- Restore a branch with: `git fetch <bundle> <branch>:<branch>`.

**The most important finding: a large unpublished eliza port by the Codex actor.**

`codex/alphaphone-vibestack-reconcile-93b` (28997af66d9, in `~/Work/eliza-alphaphone-vibestack-reconcile-93b`) is the tip of a 114-commit chain. It changes 174 files against eliza develop (+7,716/−1,103), and 172 of those files are untouched on develop. **None of it is on any remote, and none of it is in an open PR.** Its themes:
- agent planning (deferred context restore, the resend allowance, reply grounding, owner-audience attestation);
- **legacy conversation and history adoption** (`storage/legacy-*.vibe`, `spec/agent/storage/legacyAdoption.md`);
- **Android resident binding and launch** (`AgentResidentLaunch.java`, `spec/os/agentService/residentBinding.md`);
- scheduler drain;
- Calendar request routing;
- Maps cards and choices;
- Cloud speech settlement and rollover credit (migration `0125_speech_rollover.sql`), and chat inline images;
- Files adoption of installed data;
- camera receipt hardening;
- the Browser overview privacy gate;
- Notes;
- compile fixes.

`-reconcile-4a2` adds two more commits (d400007d18e, 434f9149132). The chain's intermediate branches are `port-compile`, `maps-choice`, `candidate-12be`, `camera-receipt`, `native-assembly`, `reconcile-40357` and `integration`. **Action:** rebase it onto develop, cherry-pick the two 4a2 commits, and split it into about 12 themed PRs to eliza develop.

**Other needed work, by owner:**

| Owner | Branch | Missing on the published line | Next step |
|---|---|---|---|
| Cutover session (alpha) | `vibecut-r2-cloud-routes` | **Blocker A2-001/A2-002**: Alpha's Cloud route table. Without it, account, plan, billing, Maps, Google link and Inbox are all refused. | Rebase 7df01a2a02e onto vibestack and open a PR. |
| Cutover session (alpha) | `vibecut-r2-db-adoption` | Moves the legacy agent DB aside on update (A2-003). | Open a PR, paired with your A2-003 decision. |
| Cutover session (eliza) | `vibestack-reg-blockers-os-cloud` | A native host passes the runtime client's device headers. | Open a PR to develop, then make the matching Alpha `ElizaAgentService.java` change. |
| Cutover session (eliza) | `vibestack-res-proof-headers`, `vibestack-res-proof-agent`, `vibestack-res-lint` | Dafny proofs for unproved laws, and lint/jscpd dedupes. | Rebase each and open a PR to develop. |
| Codex (eliza) | `codex/alphaphone-vibestack-speech-rollover`, `codex/alphaphone-native-feed` (6713f7d9dfd, 68b69070680) | Speech rollover pieces, and the native agent feed headers. | Small PRs. |
| Codex (eliza) | `codex/alphaphone-navigation-egress`, `codex/alphaphone-files-shown-case` | Typed prepared navigation in replies; a Files test case. | Re-port. |
| Codex (eliza) | `codex/linear-cloud-sse-2253`, `codex/attachment-history-promoted-2235`, `codex/vibestack-openai-tool-protocol`, `codex/vibestack-native-file-query`, `codex/alphaphone-browser-tabs` (f7fce39dfa7) | Cloud SSE carry, attachment history, the OpenAI tool protocol, native file-query completeness, new-tab placement. | Push and open a PR for each. |
| Codex (eliza) | `codex/maps-selection-handle` (424fe751bd9) | The log-inventory SQL projection. | One small PR. |
| Device lane (eliza) | `claude/vs-device-families-negotiated` | Spec rewrites for notes, calendar and reminders, to match the shipped code. | Port the spec parts. |
| ctx-budget session (eliza clone `~/.cache/alphaphone-ctx-budget/vs`) | `claude/vs-cb-*`, `claude/vs-context-budget-recon` | Stream refusal frames and stage logging, proposal-ends-planning, device tool JSON parse (92c07768ec). | Re-port on current develop; #40358's 23 conflicts make cherry-picking impractical. |
| Codex (alpha) | `codex/alpha-agent-parity-integration` (+ `-current-turn-context`, `-current-interrupted-effect`) | Turn-context and interrupted-reply ports into the Alpha app. | Re-port onto vibestack, or into the template lanes. |
| Codex (alpha) | `codex/alpha-parity-cutover`, `codex/alpha-saved-photo-library-receipt`, `codex/alpha-promoted-sdk-2218`, `codex/alpha-native-file-query-completeness` | The views effectSerial fix, Android build awaits, the photo receipt, the Notes owner fence, the recorder change, and the file query (which waits on the eliza PR). | Small PRs, or fold into #1497. |

**Superseded, landed or scratch:** 33 entries, retire after a final look. They include:
- `codex/alphaphone-vibestack-refresh`, `-maps-card-egress`, `-rate-resend`, `-restore-context`, `-parity-pre-*` (scratch checkpoints);
- `vibestack-gmail-broker` (superseded);
- the `-pre-rebase` copies;
- most of the legacy-era `claude/*` and `backup/*` branches, which are on `main`;
- the Alpha `codex/alpha-browser-*` set.

Unclear: `claude/directions3` and `claude/tab-switch`, both legacy browser-spec tests.

**Why so much is local:**
- Codex works in about 100 per-step worktrees and pushes only selected heads.
- The Claude sessions keep `-pre-rebase` copies and lane branches.
- The cutover session's residual lanes were cut off by the eliza promotion and the 02:42 cleanup.

**Update, around 08:15 UTC:** the cutover session is pushing all of its local branches under their own names (`vibecut-r2-*`, `vibestack-res-*`, `vibestack-reg-blockers-*`, `vibestack-gmail-broker`), with uncommitted work as `wip/<branch>`. It is holding PRs until you decide the base. That leaves the Codex branches (in eliza: the reconcile-93b chain and the small lanes; in Alpha: the `codex/alpha-*` set) and the ctx-budget clone as local-only.

**CI on the merged eliza PRs:**
- #40440: Android Node lock, simulate 1–4 and selftest a/b passed; `selftest-rest` and `verify` were cancelled.
- #40441: every job was cancelled, apparently superseded when the merges landed on `develop`.

Neither has a full CI pass yet. `develop`'s own run after the merges is the check, and the GitHub API rate limit kept me from reading it.

Nothing enforces "every active lane has a remote ref", so a crash, a cleanup or a reboot loses it. **Recommendation:** a nightly job (or a rule in every brief) that pushes every non-scratch branch with unpushed commits to `backup/<host>/<branch>` on its repository.

## 5. Develop and main changes that the Vibestack work must still absorb

**Alpha develop since the fork point (#1459), first-parent:**
- #1460 audit runbook;
- #1463 location retry (covered on `vibestack` by b0a0e72a8eb);
- #1464 Maps "directions to it" (covered by #40357 and #1467);
- f53a3af01 file search completeness (#1469);
- 23f73b6a7 sign-in probe, typed numbers, Back;
- 56a6ad2b7 Home-host browser return (#1468);
- 95992588b Pixel carrier and SIM setup;
- 208ea0ad4 v119 Android, updater, diagnostics, voice formatting, workflow guard;
- e364fd7a9 v119 release signer;
- 413437f6c address-only position;
- #1465 Browser tabs from chat;
- #1471 and #1474 (app review #855 wave 5, Notes fixtures);
- the `sweep/devnew` merges (os-gesture, #855 wave 5, #855 w6 Browser);
- 380bf0b0f v118 demo checkpoint;
- **264ca621e v121 + Codex fixes, on eliza develop 17116b70e6 (#1485).**

Codex draft **#1498** is porting most of these into alpha `vibestack` (31 commits, "complete parity still open"). Draft **#1499** finishes the legacy ports on develop before develop is archived.

**Alpha main:** #1484, the v121 private producer signing pin (152047eb6), which must reach whichever line ships.

## 6. Recovery plan

The goal: one canonical Alpha line in the lalalune/vibestack template shape, holding everything from alpha `vibestack`, `develop` and `main`, and built on eliza `develop` (the promoted Vibestack line).

### Phase 0: preserve and freeze (today, minutes)
1. Push `claude/template-port` (`~/.cache/vstpl/alpha`) to the alpha remote.
2. Tag the current heads so nothing can be lost by later force-pushes:
   - `archive/alpha-vibestack-applayout-164dbbe` for alpha `vibestack`;
   - `archive/alpha-develop-264ca621e` for alpha develop;
   - `archive/alpha-main-a0d4530` for alpha main.
3. Announce a merge freeze on alpha `vibestack`. Only #1497, #1498 and #1499 may land, so the port has one final source snapshot. Ask the Codex and NubsCarson actors to stop merging into alpha `vibestack` after that.

### Phase 1: settle the sources (hours)
1. Land #1499 on alpha develop, then archive develop as `develop-v3`, matching eliza's convention. Bring main's #1484 into develop first.
2. Land #1497 and #1498 on alpha `vibestack` (they overlap #1486–#1495, so compare first), then record the final SHA as **SOURCE A**.
3. On eliza:
   - triage the 15 closed PRs and the 5 develop-v3 tail merges from section 4: reopen against `develop` or re-port each one that is missing;
   - sync `develop`'s tool to lalalune/vibestack b06934b, as `main` already did for b7f1827.

### Phase 2: rebuild on the template (the template migration session's lanes)
The base is `claude/template-port`, after syncing its `vibestack/` to lalalune b06934b. Port SOURCE A plus legacy develop into the template's structure, lane by lane. The lanes are already briefed in `~/.cache/vstpl/briefs`:

| Lane | Area |
|---|---|
| L1 | shell |
| L2 | assistant |
| L3 | settings and account |
| L4 | inbox and notes |
| L5 | calendar, clock and workflows |
| L6 | files and camera |
| L7 | maps and browser |
| L8 | telephony |
| L9 | platform and Android |
| L10 | Alpha Cloud → `apps/cloud` |
| L11 | AOSP and release |

Conventions for every lane:
- `spec/app/<area>/`, importing shared rules from `spec/kit`;
- `apps/app/src/<area>/` on `src/runtime` and the platform services;
- `packages/ui` components with metas;
- tests over `apps/app/test/fakes`;
- eliza through `@repo/eliza-harness` at e11409812b.

Most of the content already exists on alpha `vibestack` and needs restructuring, not rewriting:
- 251 spec files;
- 443 VibeLang files;
- 251 story metas;
- the props-driven views from #1482;
- the Bombadil properties.

Delete `legacy/<area>` as each area lands.

### Phase 3: catch-up delta
Before the cutover, re-diff SOURCE A, alpha develop/main and eliza develop-v3 against what each lane ported. Port anything merged after the snapshot.

### Phase 4: cutover (owner decision)
Mirror eliza:
- the rebuilt line becomes alpha `develop`, with `main` following at release;
- the old develop and main become `develop-v3` and `main-v3`;
- `vibestack` is deleted, or kept only as the archived app-layout snapshot.

Repoint the CI, Pixel build docs and session briefs, the "alpha vibestack" references in docs, and memory.

### Phase 5: verification (the next goal)
- `pnpm verify` on the template line;
- the Android variants and the AOSP image;
- the emulator HOME role;
- Pixel acceptance.

## 7. Who should own what

| Owner | Work |
|---|---|
| **Vibestack template migration** session | Phases 0.1 and 2 (it has the lanes and briefs ready); 4 after the owner decides. |
| **Vibestack branch migration and cutover** session | Phase 1.2 (#1497/#1498), then freeze; owns SOURCE A's final SHA. |
| **Vibestack cutover validation** session | The parity register against the template line in phase 3. |
| **This session** | The eliza triage in 1.3, and the archive tags in 0.2 if approved. |
| **Owner** | The freeze, the archive naming, the cutover in phase 4, and the open-items decisions already recorded on alpha `vibestack` (`docs/vibestack-open-items.md`). |

## 8. Decisions needed from the owner

1. Confirm `vibestack-template-rebuild` (via `claude/template-port`) is the canonical base, and that alpha `vibestack` becomes the read-only source snapshot.
2. Approve the merge freeze on alpha `vibestack` after #1497/#1498, and decide whether those two land first or are ported straight into the template line.
3. Choose the final naming: follow eliza (`develop` = Vibestack, `*-v3` = old) or keep a branch named `vibestack`.
4. Decide which of the 15 closed eliza PRs to reopen.
