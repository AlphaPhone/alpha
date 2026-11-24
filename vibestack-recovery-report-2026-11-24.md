# Vibestack recovery: forensics and plan

2026-11-24. This report was written from read-only investigation: GitHub ref activity logs, `git ls-remote` on both repositories, every local object store on this laptop, the transcripts of the Claude and Codex sessions involved, lalalune/vibestack and gracefultechnology/grace. Seven investigator agents gathered the facts and a final agent spot-checked 13 of their claims; all 13 held. It builds on the earlier report from the "Vibestack migration codebase" session (`vibestack-forensics-2026-11-24.md`) and corrects or extends it where noted.

Nothing on a remote was changed while investigating. The only remote writes from this session were pushes of its own local-only branches (listed in section 5).

## 1. Bottom line

- **Eliza is not broken.** `elizaOS/eliza` promoted its Vibestack line on purpose on 2026-11-24, 05:07 to 05:17 UTC. `develop`, `main` and `staging` are now the Vibestack repository, and the old lines live on as `develop-v3`, `main-v3` and `staging-v3`. The branch named `vibestack` was deleted as part of that.
- **Alpha's `vibestack` branch was never a Vibestack repository.** It was created on 2026-11-22 from alpha `develop` by the in-place migration session, which found no `vibestack` branch and made one. Everything since (#1451, the area merges, about 25 more PRs, my repin and the register fixes) built a Vibestack-*style* app inside the legacy repository layout.
- **The real Alpha Vibestack line is `vibestack-template-rebuild`.** It is lalalune's 50-commit rebuild on the lalalune/vibestack template (2026-11-17 to 11-23). It lived only in a local worktree for a week, so no session saw it. When it was finally pushed as draft PR #1470, the PR was closed and its branch deleted within hours. NubsCarson restored the branch this morning.
- **The template itself moved on 2026-11-23.** lalalune/vibestack 8f8521e restructured the repository into packages (`packages/vibestack`, `studio`, `create-vibestack`) with an `init`/`upgrade` manifest flow. Every downstream line is still on the old "the repository is the template" shape: grace, eliza `develop`, the template rebuild and the template port. The new flow cannot be installed yet: the `vibestack` npm name belongs to an unrelated package.
- **Nothing that was on a remote is lost, but a lot is now at risk.** Both GitHub repositories were pruned hard on 11-24, and that deleted the `wip/*` backup branches. Hundreds of local-only branches and dozens of dirty worktrees hold work that is on no remote, the biggest being Codex's 114-commit eliza port.
- **The way forward** is the plan the template-migration session is already running: port everything onto `vibestack-template-rebuild`, with alpha `vibestack` as the frozen behaviour reference. It needs a few decisions from you first (section 8). It also needs a firmer source list than it has today (section 6), and a guard so this does not happen again (section 9).

## 2. What "Vibestack" means, precisely

| | Old shape (what everyone uses today) | New shape (lalalune/vibestack main 3d0c81a, since 8f8521e) |
|---|---|---|
| Tool | vendored at `vibestack/` in the product repo, kept current by "Sync vibestack to &lt;sha&gt;" copy commits | the `vibestack` package (catalog `^0.2.0`), with `vibestack init` / `vibestack upgrade` |
| Procedure files | `SPEC.md`, `AGENTS.md`, `.agents/skills` copied in | managed by a hash manifest `.agents/.vibestack-manifest.json`; template text in `AGENTS.md` between `<!-- vibestack:start/end -->` markers |
| Specs | one root `spec/` with one ledger `spec/lock.json`; `spec/<name>` owned by `apps/<name>` or `packages/<name>` | the same |
| Product code | `apps/app` (React + VibeLang), `packages/ui` and `packages/design-system` | the same, from `template/` |
| Eliza | not prescribed. Grace uses a `vendor/eliza` submodule with `link:` dependencies | not prescribed |
| Rules | pnpm only, Node 26, no Bun, no new Markdown documents, never hand-edit `gen/` or `spec/lock.json` | the same |

Where each line stands against those conventions:

| Line | One root `spec/` + ledger | Template procedure files | `packages/ui` + design system | Tool pin | Eliza pin |
|---|---|---|---|---|---|
| grace `develop` | yes | yes (identical) | yes | copy commits (33cf987d) | submodule on the deleted eliza `vibestack` branch |
| eliza `develop` | yes (~90 areas) | yes (edited) | n/a (library) | prose only: b7f1827, 34 behind main | itself |
| alpha `vibestack-template-rebuild` | yes (`spec/kit` + `spec/app`) | yes (e4e2ab3) | yes | frozen import e4e2ab3, 413 behind main | `eliza.lock.json` + `@repo/eliza-harness` (branch `vibestack` 2ac22b44, a deleted branch) |
| alpha `claude/template-port` | yes | yes | yes | e4e2ab3; lane T is refreshing it (uncommitted) | `eliza.lock.json` → eliza `develop` e11409812b |
| alpha `vibestack` (in-place) | no (`apps/app/spec`, no ledger, nothing ever accepted) | no | no (`apps/app/src/web/components/ui`) | borrows eliza's tool through the submodule (747bf8d) | `vendor/eliza` submodule + `upstream.lock.json` → eliza `develop` e11409812b |

Alpha `vibestack` is not template-shaped. It keeps develop's `specs/` (931 legacy Quint files), `test/` (1,717 files on `node:test`), `scripts/`, `docs/` and `android/` at the root.

## 3. State of every line now

### elizaOS/eliza

| Ref | Head | What it is |
|---|---|---|
| `develop` (default) | e11409812b, then a few merges (68468c1f0f by the last check) | The Vibestack line. Contains the Alpha cutover #40258, the develop deltas #40357 (#40060 to #40299) and #40395 (#40300 onward), #40440 (#40420 port), and #40441 (tool synced to b7f1827). |
| `main` | 586e0508d2 | Same Vibestack root; tool synced to lalalune/vibestack b7f1827. |
| `staging` | 93b07caec6 | The last `vibestack` head before the promotion. |
| `develop-v3` | 184150ae5d | The old develop, exactly. No merges since the rename. |
| `main-v3`, `staging-v3` | 0bc3753de4e / c2abfe8f94d | The old main and staging. **Still taking merges** (NubsCarson's Talk/Cloud release PRs #40430 to #40443). |
| `vibestack` | (deleted) | Deleted 2026-11-24 05:17:26 UTC. |
| `barrel-unentangle` | ee7f5abba97 | **Not tracked by anyone.** 4 commits not on `develop`, including a7e51cae1e1 "Enforce single-barrel workspace exports and split browser/host packages" (862 files). No PR. |

Promotion sequence (all lalalune, UTC): 05:00 #40420 merged into old develop; 05:05 #40427 merged into `vibestack` (93b07caec68); 05:07 `develop-v3`, `main-v3` and `staging-v3` created; 05:10 `develop`, `main` and `staging` force-pushed to 93b07caec68; 05:17 `vibestack` deleted. Earlier, 02:28 to 02:43, 15 open `vibestack` PRs were closed with written reasons ("v4 branch cleanup"). The earlier report triaged them and found them landed, superseded or deliberately deferred: #40370 Inbox Reply-To, #40358 context budget and #40242 device mail lease are deferred.

### eliza-research/alpha

| Ref | Head | What it is |
|---|---|---|
| `vibestack-template-rebuild` | 8eb7ea73a7 | **The template line.** 50 commits (46 non-merge) by lalalune, 2026-11-17 to 23, on develop 26e827f064 (#1315). Old tree under `legacy/`. Specs for shell, home, startup, assistant/ask, inbox, notes, settings, account (+ `spec/kit`, 27 Dafny proofs). Code only for shell, Ask Alpha, platform and runtime (~1.9k lines); Ask Alpha runs end to end against a real eliza agent and cloud. Still pins eliza's deleted `vibestack` branch (2ac22b44). |
| `claude/template-port` | 3248c922d6 | The template-migration session's integration branch: the rebuild plus `legacy/` refreshed to develop 264ca621e, eliza repinned to `develop` e11409812b, and a harness test fix. Pushed. |
| `vibestack` | 164dbbe073 | The in-place port. 317 commits beyond develop; 16 areas with 251 spec files, 443 VibeLang files, ~27k lines of React, 87 test files (~680 cases); Android, Cloud, scripts, site, 11 CI workflows. Its own audit registers list 113 open rows and 47 blockers. It does not yet typecheck, test or build an APK. |
| `barrel-unentangle` | 7cda031dd4 | **Not tracked by anyone.** 3 lalalune commits on vibestack 14f5a614fab (231 files, +6,599/−647): "Port develop parity fixes, carrier setup, CI/preflight, and runtime blockers to vibestack" and "Enforce single-barrel workspace exports". Pins eliza `barrel-unentangle`. No PR. |
| `develop` | 264ca621e7 | The legacy app (Bun). Its pin 17116b70e6 exists only on eliza `develop-v3`. |
| `main` | a0d453068d | develop + the v121 signing pin (#1484). |
| `codex/alpha-legacy-final-20261124` (#1499) | 27357f35d2 | 13 legacy fixes not yet on develop. |
| Open drafts on `vibestack` | #1497 (4047b29a8, 94 commits, still moving), #1498 (31), #1477 (38), #1479, #1483, #1501 | Codex and NubsCarson parity work that is on neither line. |

## 4. How it happened

| When (UTC) | What |
|---|---|
| 11-13 | eliza's orphan `vibestack` branch is seeded from the lalalune/vibestack template (root 8643eb34d62). |
| 11-17 to 11-23 | lalalune builds the Alpha template rebuild in a **local worktree** (50 commits, UTC−5 clock). It is pushed nowhere. |
| 11-22 18:16 | The owner asks the code-only migration session for "PRs to the vibestack branches". It finds no alpha `vibestack` branch ("so the PR base has to be created from develop") and never compares against the template layout or looks for local template work. |
| 11-22 22:29 | That session creates alpha `vibestack` from develop 06c2098d651 (#1418) and starts the in-place port (#1451). **This is the decision that put the wrong shape on the branch named vibestack.** |
| 11-23 | My cutover session repins #1451, launches the per-area workflows and merges the area branches. The validation, Browser, Chat-view, migration, Codex and NubsCarson actors land about 25 PRs onto alpha `vibestack`. |
| 11-23 17:33 | eliza #40258 (the Alpha cutover branch `vibestack-dp`) merges into eliza `vibestack`. |
| 11-23 18:51 | The template rebuild is first pushed, as `vibestack-template-rebuild`, with draft #1470 → `vibestack` ("conflicts with vibestack throughout"). The local sessions do not merge it. |
| 11-23 22:27 / 23:54 | #1470 is closed, then its branch deleted, both by the lalalune account. No comment, no app attribution, and **no Claude or Codex transcript or shell history on this laptop contains either command.** Inference: the same off-laptop lalalune environment that wrote the template commits, merged #40258 and later promoted eliza. |
| 11-24 02:28 to 05:17 | eliza "v4 branch cleanup": 15 `vibestack` PRs closed with reasons, then the promotion (section 3). Remote branches pruned on both repos; the `wip/*` backups go with them. |
| 11-24 07:15 | NubsCarson restores `vibestack-template-rebuild`. The owner gives the "Vibestack template migration" session the goal to port everything onto it. |

Root causes:
1. **Two efforts shared one name, and only one was visible.** The template rebuild was local for a week, so "alpha has no vibestack branch" was true for every other session.
2. **No one checked the target shape.** The migration briefs built inside `apps/app` of the develop tree and borrowed the tool from eliza. They never compared that against lalalune/vibestack or grace.
3. **Momentum made the wrong shape canonical.** Dozens of actors merged onto that branch within 36 hours.
4. **The name changed meaning overnight.** Eliza's `vibestack` *was* template-shaped. After its promotion, the only branch left called `vibestack` was alpha's develop-shaped one.
5. **Several writers on the same branches with no freeze.** Codex, NubsCarson, lalalune's direct pushes and several Claude sessions changed alpha `vibestack` and `develop` concurrently. Any snapshot drifted within hours.
6. **Cleanups that do not check reachability.** The remote prunes and the #1470 close removed work-in-progress branches without a backup ref.

## 5. Is anything lost, and what is at risk

**Preserved on remotes:**
- Eliza: old develop is `develop-v3` (exactly 184150ae); old main and staging are `main-v3` and `staging-v3`.
- Alpha: `vibestack`, `vibestack-template-rebuild`, `claude/template-port` (plus `backup/template-port-774620abec1`), `develop` and `main` all exist.
- The template rebuild exists only as that remote branch. lalalune's original worktree is not on this laptop, and no other variant of that line exists anywhere locally.

**Pushed by this session today, to stop them existing only here:** the alpha blocker branches `vibecut-r2-cloud-routes` (Cloud route table, A2-001/002), `vibecut-r2-db-adoption` (A2-003), `vibecut-r2-agent-launch` and `vibecut-r2-runtime-packaging`; the eliza branches `vibestack-res-lint`, `-res-proof-headers`, `-res-proof-agent`, `vibestack-reg-blockers-os-cloud`, `-agent-core`, `-calendar-inbox` and `vibestack-gmail-broker`. Uncommitted edits went to `wip/<branch>` snapshots. **Caution:** the same pruning could delete these again.

**At risk, local only** (563 checkouts on this laptop; 256 tips from the Vibestack period hold commits on no remote branch, and 188 of those exist nowhere on GitHub):

| What | Where | Size | Notes |
|---|---|---|---|
| Codex's eliza Alpha-Vibestack port lines | `~/Work/eliza/.git`: `codex/alphaphone-vibestack-reconcile-93b` (28997af66d9) and about 14 sibling branches and detached worktrees | 50 to 115 commits each; the main tip changes 174 files (+7,716/−1,103), 172 untouched on develop | Planning, **legacy conversation/history adoption**, **Android resident binding and launch**, scheduler drain, Calendar routing, Maps cards, Cloud speech rollover, Files adoption, camera receipts. **The largest single risk.** |
| Other Codex parity branches | `~/Work/eliza-parity-*`, `~/Work/alpha-parity-*` | about 60 branches, 1 to 41 commits | Including `codex/alpha-parity-cutover` (41) and `codex/alpha-agent-parity-integration` (21). |
| Old wave branches | eliza `vibestack-w2-*`, `-w3-*`, `-dp-wp*`, `-parity-*`, `-int-*` | 37 to 128 commits each | On GitHub only as unreferenced objects. They probably landed by squash through #40258, but that is unverified. |
| Deleted `wip/*` snapshots | `~/.cache/vibeaudit/alpha.git` and `~/Work/eliza/.git` tracking refs | 14 commits | Only stale tracking refs remain. A `git fetch --prune` would drop them. |
| ctx-budget work | `~/.cache/alphaphone-ctx-budget/vs` (`claude/vs-cb-*`, `vs-context-budget-recon`) | 2 to 15 commits | #40358 was closed with 23 conflicts. |
| Uncommitted worktrees | `~/.cache/vibecut/alpha-area-*` (69 to 84 files each), `alpha-drift-*`, `alpha-reg-blockers-calendar-inbox` (with a new `sign-in-phone.ts`), the template lanes L1 to L11 and T (10 to 95 dirty files each) | | The template lanes have **no commits**, only uncommitted agent edits. One crash loses them. |
| Stashes | 23 alpha, 14 eliza, 16 vendor/eliza | | None on a remote. |

All of this is also in git bundles in `~/.cache/vibestack-forensics-backup-2026-11-24/` (21 MB), which the migration session made. Those bundles are local too.

## 6. What still has to reach the canonical line

### From alpha

1. **Alpha `vibestack` (the in-place port), as behaviour reference and parts.** It covers all 16 areas, where the rebuild covers 7. Roughly 25 to 35% carries over mechanically:
   - spec Markdown for the 10 areas the rebuild lacks (files, calendar, clock, workflows, camera, maps, browser, telephony, voice, plus platform);
   - the Android, Cloud, scripts and site trees;
   - about 142 pure helper modules;
   - 42 presentational `*View.tsx` components with stories.

   The remaining 65 to 75% must be rewritten onto the rebuild's architecture:
   - the service layer (~40k lines of Effect Layers, streams and PortCells) onto the rebuild's reactor, places and Platform services;
   - every test, as journeys over `test/fakes`;
   - kit conformance in the specs.
2. **Alpha `develop` since 26e827f** that is on neither line: 232 non-merge commits, from #1460, #1463, #1464, #1465, #1471, #1474, #1485, the v118 demo checkpoint 380bf0b0f (133 commits), the v91 to v119 signing pins and single pushes. About 93 of them are behaviour. Examples:
   - the SMS review card with spoken "Send this text";
   - Gmail draft review in chat;
   - Ask Alpha questions as attachments;
   - Talk leases;
   - agent voice notes;
   - Notes multi-select delete;
   - Camera zoom and light while recording;
   - Workflows WF-21 pause;
   - the HTTPS-timeout browser fallback;
   - ViewRequestDiagnostic.

   Alpha `vibestack`'s own drift tracking stops at f29c9cdc3 and never mentions #1471, 380bf0b0f or #1485.
3. **Alpha `main`'s v121 signing record** (152047eb685: versionCode 121, alphaCommit 6ed84c28961, sdkCommit 57588dc08a8). Every other line, including the template port's `legacy/`, is at v119.
4. **#1499** (13 legacy fixes), **#1497/#1498/#1501** (open parity drafts, still moving), and **`barrel-unentangle`** (3 commits, owner to say what it is for).
5. **The blocker fixes pushed above:** Cloud route table, DB adoption, agent launch, runtime packaging. Their content applies to whichever line ships, but they are written against the in-place layout.

### From eliza

1. **The direct push 3ef2897d983** ("Merge codex/alpha-current-checkpoint-20261123 into develop") on the old develop: 30 NubsCarson commits. 3 are ported, Talk recovery is open as #40428, and about 23 have no port: Calendar slot fast paths, SMS recipient grounding, Android runtime status alerts, voice/progress cues, Notes checklists.
2. **The pins the shipped phones use live only on `develop-v3`**: alpha develop's 17116b70e6 and v121's 57588dc08a8. A build on eliza `develop` cannot reproduce v121's agent behaviour until those changes are ported.
3. **`main-v3` and `staging-v3` are still taking merges.** Each needs a port, or the lines need to be frozen.
4. **The Codex local port lines** (section 5) and **eliza `barrel-unentangle`** (862 files).
5. **Tool currency.** eliza `develop` has b7f1827, the old shape, 34 behind. The next sync is a layout migration, not a copy.

### Cross-cutting choices still open

- **Cloud host:** develop targets alphacompute.cc; alpha `vibestack` ships against eliza.app with alphaphone.dev as Alpha's hosts; the rebuild points at eliza.app with alphacompute.cc as "cutoverCandidate". You chose alphacompute.cc yesterday. The rebuild's `packages/deployment` should record it before lane L10 ports `cloud/`.
- **Eliza dependency:** grace uses a submodule, the rebuild uses `eliza.lock.json` plus a harness, and the rebuild also still declares a dead `legacy/vendor/eliza` submodule. There should be exactly one pin.
- **Tool version skew:** the rebuild's tool (e4e2ab3) differs from eliza's (747bf8d/b7f1827) in 43 files, with 28 files on one side only. Specs moved from alpha `vibestack` were checked with eliza's tool, so they may fail under the rebuild's for tool reasons, not spec reasons.

## 7. Recovery plan

### Phase 0: preserve and freeze (now)

1. **Push every at-risk branch to a namespace the cleanups do not prune.** Use `refs/backup/2026-11-24/<branch>`, a ref outside `refs/heads` like the `refs/backup/15826-pre-rebase` that survived on eliza. The Codex and ctx-budget branches belong to other actors, so this needs your OK.
2. **Have the template lanes commit.** Make WIP commits on their `port/*` branches, pushed to the backup namespace, so a crash cannot lose the agent edits.
3. **Freeze alpha `vibestack`.** Land or close #1497, #1498 and #1501, then record the final SHA as **SOURCE A** and allow no further merges. Ask Codex and NubsCarson to stop merging there.
4. **Tag the heads:** `archive/alpha-vibestack-inplace-<sha>`, `archive/alpha-develop-<sha>` and `archive/alpha-main-<sha>`.

### Phase 1: settle the decisions that every lane depends on (hours)

These are decisions 2 to 6 in section 8: the template shape and tool version, the eliza pin mechanism, the Cloud host, the v121 signing record and the `-v3` policy. Then refresh `legacy/` once #1499 lands.

### Phase 2: eliza consolidation (in parallel with phase 3)

1. Make `develop` the only place eliza work lands. Port the 23 unported commits from 3ef2897d983 and the v121 SDK commit 57588dc08a8 (and alpha develop's 17116b70e6 changes) from `develop-v3`.
2. Rebase Codex's `reconcile-93b` chain onto `develop` and split it into about 12 themed PRs. This includes the legacy conversation adoption and the Android resident binding, which the alpha line needs.
3. Open PRs to `develop` from this session's eliza branches: native host device headers, proofs, lint.
4. Decide what `barrel-unentangle` is, then land or retire it.

### Phase 3: port Alpha onto the template (the template-migration session's 11 lanes)

The base is `claude/template-port`. The sources are SOURCE A, alpha develop/main since 26e827f, #1499, `barrel-unentangle` (alpha), the blocker branches, and both audit registers as the list of behaviour to get right, not of defects to copy.

Order matters:
1. **L9 platform first.** It settles the Platform services and the mapping of the in-place port's 16 PortCells onto places and resident machines. Every area lane depends on it.
2. **The area lanes** after that.
3. **Missing lanes:** add lanes for `apps/site`, the 11 CI workflows, `licenses/` and the runbooks, none of which the current briefs cover.
4. **Files:** for L6, start from the rebuild's own withdrawn Files spec (bd69cbe6bd9).

Delete `legacy/<area>` as each area lands. The estimate (an inference from lalalune's pace and code volume) is 1 to 2 weeks for specs and 3 to 5 weeks for code in parallel lanes, plus device and owner acceptance.

### Phase 4: catch-up, cutover, verification

1. Re-diff SOURCE A, alpha develop/main, eliza `develop-v3`, `main-v3` and `staging-v3` against what the lanes ported, and port anything merged after the snapshot.
2. Cut over the way eliza did: the template line becomes alpha `develop` (`main` at release); the old develop and main become `develop-v3` and `main-v3`; `vibestack` is deleted or kept only as the archived snapshot.
3. Repoint CI, the Pixel build docs, session briefs and memory.
4. Then verify:
   - `pnpm verify`;
   - both APK variants;
   - the emulator HOME role;
   - the AOSP image;
   - Pixel acceptance.

   Each is a separate claim: none proves another.

## 8. Decisions for the owner

1. **Base:** confirm that `vibestack-template-rebuild` (through `claude/template-port`) is the canonical Alpha line. Alpha `vibestack` is then frozen as the read-only behaviour reference.
2. **Template shape:** port onto the old shape now and match eliza's tool (b7f1827), then move eliza, grace and alpha to the new package flow together once `vibestack` 0.2.0 is installable? Or adopt the new flow in Alpha first?
3. **Eliza pin in Alpha:** keep the rebuild's `eliza.lock.json` + harness, or use grace's submodule? Either way, remove the second, dead pin.
4. **Cloud host for the template line:** confirm alphacompute.cc (your choice yesterday) over eliza.app and alphaphone.dev.
5. **Signing:** carry v121 (main 152047eb685) into the template line.
6. **Eliza `-v3` lines:** freeze `main-v3` and `staging-v3`, or keep merging there and port each change to `develop`?
7. **Other actors' local work:** may this session push Codex's and the ctx-budget session's local-only branches to `refs/backup/2026-11-24/*` on the public eliza repository and on alpha?
8. **`barrel-unentangle`** (alpha and eliza): what is it for, and does it go to eliza `develop` and the template line?
9. **Freeze:** approve the merge freeze on alpha `vibestack` after #1497, #1498 and #1501.

## 9. Keeping this from happening again

- **One canonical branch per repository, announced.** A branch name means one shape, and a promotion or rename is posted where every session reads it (a pinned note in each repo's `AGENTS.md` or memory).
- **Nothing lives only on a laptop.** Every brief requires pushing each non-scratch branch to `refs/backup/<date>/<branch>` before stopping, and a nightly job enforces it.
- **Cleanups check reachability.** Before a branch or PR is deleted or closed, its unique commits are saved to a backup ref, with the reason written on the PR.
- **Pins in data, not prose.** Record the vibestack tool SHA and the eliza commit in a lock file that CI checks.
- **Merge freezes during migrations,** with a recorded snapshot SHA that every parity diff is computed against.
- **Shape check before building.** Any "migrate to X" brief starts by comparing against the reference (lalalune/vibestack, grace) and by searching for existing local or remote work toward X.

## Appendix: key evidence

- `gh api repos/eliza-research/alpha/activity?ref=refs/heads/vibestack`: `branch_creation lalalune 00000000000->06c2098d651` at 2026-11-22T22:29:43Z; later pushes 2c2544c0df2, 009960a3cc7 and 057fdc5a2b2 are all develop commits.
- `gh api repos/eliza-research/alpha/activity?ref=refs/heads/vibestack-template-rebuild`: created 2026-11-23T18:51:15Z, deleted 23:54:00Z (lalalune), recreated 2026-11-24T07:15:29Z (NubsCarson).
- PR #1470 timeline: `closed lalalune 2026-11-23T22:27:35Z`, `head_ref_deleted 23:54:00Z`, `head_ref_restored NubsCarson 2026-11-24T07:15:29Z`.
- `git merge-base origin/vibestack-template-rebuild origin/develop` = 26e827f064f. `git log 26e827f064f..origin/vibestack-template-rebuild` starts at 3be68da9b76 "Move the alphaphone tree under legacy/".
- Migration session memory, 2026-11-22: "The alpha repo had no `vibestack` branch, so the PR base has to be created from develop."
- `git ls-remote elizaOS/eliza`: develop, develop-v3, main, main-v3, staging, staging-v3, barrel-unentangle; no `vibestack`.
- lalalune/vibestack 8f8521e "Restructure into 3-package workspace and polish Spec Studio UI" (2026-11-23 20:32 −0500); `npm view vibestack` → an unrelated 0.1.2 package.
- Full investigator output: this session's workflow `wf_53975af5-5ed` journal. The earlier report: `vibestack-forensics-2026-11-24.md`.
