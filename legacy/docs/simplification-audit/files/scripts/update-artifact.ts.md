# scripts/update-artifact.ts
- Lines: 16 | Kind: script helper (streaming SHA-256 + size of a file) | Verdict: MERGE into `scripts/lib/hash.ts` as `sha256File(file): {size, sha256}`
- Covers: hashing multi-hundred-MB APKs with bounded memory. Duplicates: ~40 SHA-256 helpers in `scripts/` (research C3), including `upstream-native-source.ts:5 sha`, `workflow-worker-artifact.ts:10 workerHash`, `update-channel.ts:18 digest`, `voice-host.ts:150`, `vendor-lucide-icons.ts:23`, `verify-apks.ts:130,354,407`, Python `verify-packaged-runtime.py:40`. Callers/importers: `app-update-candidate.ts`, `deliver-app-update.ts`, `provision-unit.ts`, `publish-update-manifest.ts`, `update-apk-admission.ts`; listed in `quint-lib.ts:37`, `specs/quint/services/manifest.json:2877,2936`, refinement harnesses `app-update-candidate.mjs`, `protected-app-update-promotion.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C3, D4 | A one-function file whose only reason to exist is a shared hash. | Move to `scripts/lib/hash.ts` next to `sha256Hex(bytes)`; update the 5 importers. | Low |
| 2 | — | T10 | The Quint services manifest and two refinement harnesses pin this path. | Update the manifest path in the same commit (or have harnesses import `scripts/lib/hash.ts`). | Medium: formal check fails if forgotten. |

## Proposed end state
File deleted; `sha256File` lives in `scripts/lib/hash.ts` (one readSync loop, same output shape) and is the one streaming hasher for APKs, worker artifacts and voice models.
