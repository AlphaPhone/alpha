# scripts/generate-alpha-os-branding.ts
- Lines: 45 | Kind: manual build tool (renders boot animation frames and wallpaper from the logo, packs them with the pinned OS packer, writes a hash report) | Verdict: KEEP (documented manual AOSP-image tool), SIMPLIFY
- Covers: OS-image branding assets for the AOSP build. Duplicates: none. Callers/importers: no package script, workflow or test runs it. It is documented as the build step in `android/aosp/branding/README.md:24`, listed as a source of the branding staging model in `specs/quint/application/manifest.json:3991` and in `scripts/quint-lib.ts:10` (`runtimeScriptPaths`). Its output is consumed by `scripts/stage-alpha-os-branding.py`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37,42 | C3 | SHA-256 of a file is written twice in 6 lines (inline at 37, then as `hash` at 42). | Define `hash` once (or import the shared helper) and use it in both places. | L |
| 2 | 9-45 | D8 | Minified style: no spaces, several statements per line. | Format with the repo formatter (D9). | L |
| 3 | 43 | B5 | Report carries constant `firmwareSplashModified:false, imageBuilt:false, deviceVerified:false`. These are evidence disclaimers in the AGENTS.md sense (an asset render is not an image build); keep, but they are constants, not measurements. | Keep; say so in a comment once. | L |
| 4 | 33-34 | — | `ALPHA_OS_SOURCE_ROOT` is checked after all frames are rendered; a missing variable fails late. | Check it with the other inputs before rendering. | L |
| 5 | — | A7 | Manual tool with no runner. research/scripts.md flags it "keep only if still run by hand". It is the documented way to regenerate the committed branding and is a declared Quint source. | Keep; owner confirms it is still used. | L |

## Proposed end state
Same behaviour, formatted, about 40 lines: inputs checked first (output must not exist, `ALPHA_OS_SOURCE_ROOT` set, tool lock hashes match),
then render, pack, report. One hash helper. If the owner says AOSP branding is no longer regenerated, delete it together with
`stage-alpha-os-branding.py`'s generator input and drop it from the Quint manifest `sources` (model and code go together).
