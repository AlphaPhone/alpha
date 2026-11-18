# scripts/host-speech-assets.json
- Lines: 73 | Kind: data (reviewed path, SHA-256 and size of each desktop-host TTS, eSpeak NG and ASR asset) | Verdict: KEEP
- Covers: the pins `host-speech-admission.ts` enforces. Duplicates: the Paradee TTS model hash `4b2819...` also appears in `android/voice-host/qualified-voice-host.json` (the Android voice bundle pins the same file). Callers/importers: `scripts/host-speech-admission.ts`, `scripts/ci/reproduce-paradee-model.py`; tests `ci-pin-bound-scripts` (reads `tts[0]`), `font-license` (copies the file into a fixture root); Quint probe `combined-agent-launcher-probe.mjs:69` writes a replacement.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | C6 | Same model bytes pinned in two records (desktop host and Android voice host). A model update must change both. | Owner question: derive the desktop TTS/ASR pins from the Android voice-host record (one source), or keep two records deliberately because the desktop host may lag. | L |
| 2 | — | T5 | `test/font-license.test.mjs` copies this file into its fixture root, which suggests that test exercises more than font licences (a fixture root needs every file some import reads). | Check during the release-tooling test merge. | L |

## Proposed end state
Unchanged, unless the owner chooses one pin source for both hosts.
