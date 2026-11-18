# android/aosp/branding/tools.lock.json
- Lines: 8 | Role: pins the elizaOS/os commit and SHA-256 of the two shared boot-animation scripts that `scripts/generate-alpha-os-branding.ts` imports from `ALPHA_OS_SOURCE_ROOT`. | Verdict: KEEP
- Importers: `scripts/generate-alpha-os-branding.ts:35` (reads `files` map); README `android/aosp/branding/README.md:25`. `scripts/quint-lib.ts:10` lists the generator in `runtimeScriptPaths` (path pin of the generator, not this file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | C7 (note) | Pins an *external* repository (`https://github.com/elizaOS/os`) instead of the already-pinned `vendor/eliza` submodule (which carries `packages/os/scripts/android/build-bootanimation.ts`, `generate-eliza-bootanimation.ts`). Two sources for the same OS tooling. | Owner question: if `vendor/eliza/packages/os` ships an equivalent packer, import it from the submodule and delete this lock plus the `ALPHA_OS_SOURCE_ROOT` requirement. Otherwise keep. | Medium (boot animation bytes must stay identical) |

## Local types and helpers
None.

## Proposed end state
Unchanged, or deleted if the owner moves the generator onto `vendor/eliza/packages/os`.

## Verification
`node scripts/generate-alpha-os-branding.ts` with `ALPHA_OS_SOURCE_ROOT`; compare generated boot animation digest.
