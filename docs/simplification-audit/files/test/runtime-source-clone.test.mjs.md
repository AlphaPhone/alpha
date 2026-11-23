# test/runtime-source-clone.test.mjs
- Lines: 210 | Kind: tooling integration (real `scripts/prepare-local-agent.ts` spawned against a git-initialised cache; real `scripts/copy-file-clone.ts`) | Verdict: KEEP, SIMPLIFY
- Covers: runtime source preparation seeds an independent copy of the pinned upstream from a verified cache, refuses tampered caches, resumes neither silently after interruption nor with a changed helper, and runs Bun 1.4.2 `install --frozen-lockfile`. Duplicates: none. Callers/importers: `npm test` glob. Research said "runs a Python unittest": wrong; it spawns Node, with one inline Python `ctypes` probe.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-69 | B5 | Darwin-only `ctypes.getattrlist` proof that APFS clone IDs match: performance evidence, not behaviour. | Delete. | Low |
| 2 | 119-124, 136-156 | B5 | `t.diagnostic` resource/timing metrics and process-count assertions; the batch planner is already covered deterministically at 158-177. | Delete the measured test; keep the fallback-copy correctness assertion. | Low |
| 3 | 88, 121, 141 | T3 | Monkey-patches `fs`/`child_process` via preload modules with `syncBuiltinESMExports`. Acceptable for disk-full and no-clone simulation; keep the interrupt case only. | Simplify. | Low |
| 4 | 188-198 | keep | Three Bun selection modes (override, `npm_execpath`, bare) and the version refusal are real release-build inputs. | Keep. | Low |
| 5 | 13-42 | cost | Each case `git init`s a cache with 1 MiB data and spawns the preparer (~15 spawns). | Reuse one fixture cache per file where a case does not mutate it. | Low |

## Proposed end state
~9 cases: seed + independence, three tamper refusals (one parameterised test), umask, interrupted clone, HEAD
mismatch fallback, sparse fallback, helper provenance, planner bounds, full prepare with Bun selection/version. No
timing or clone-id evidence. Stays in the scripts/tooling lane (path filter `scripts/prepare-local-agent.ts`,
`scripts/local-agent-source.ts`, `scripts/copy-file-clone.ts`, `upstream.lock.json`).
