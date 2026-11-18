# specs/quint/application/ChatDock.qnt
- Lines: 159 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT test
- Covers: Chat dock pointer gesture: one effect per gesture, detents, swallowed compatibility click within the suppression window. Duplicates: `test/browser/full-chat-grabber.spec.ts` (pointer/suppression in a browser); `test/chat-release.test.mjs` (unit, T3). Callers/importers: `test/quint-chat-dock.test.mjs` (no refinement harness); `specs/quint/application/README.md`; 14 manifest symbol pins in `chat-overlay-motion-adapter.ts`, `model.js`, `main.tsx`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 11-16 | T2/T1 | Test slices `chat-overlay-motion-adapter.ts` between `// chat-release:begin` / `:end` comment markers, imports the fragment as a data: URL, and regex-asserts a line of source (`chat: next.chat === "hidden" && !collapsed ? this.rest() : next.chat,`). | Export `chatRelease` from a module (it is already a pure function) and import it; delete the regex assertion and the marker comments (D7). | None functional. |
| 2 | manifest symbols | T10 | 14 pins incl. `swallowed()`, `rest()`, `retire` in `model.js` and `main.tsx`; they block the model.js split and formatter. | Delete symbol pins; keep `sources` as file paths only. | None. |
| 3 | — | T4 | `test/chat-release.test.mjs` re-tests chatRelease cases. | Delete the unit test once the trace replay imports chatRelease. | Combinations not reached by traces (test comment says not all 48): add them as scenario runs in the model, not as a unit test. |

## Proposed end state
Model unchanged; replay imports `chatRelease`; no marker comments or symbol pins; the browser journey covers pointer timing.
