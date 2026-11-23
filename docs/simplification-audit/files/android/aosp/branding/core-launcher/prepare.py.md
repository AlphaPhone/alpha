# android/aosp/branding/core-launcher/prepare.py
- Lines: 227 | Role: fetches the four pinned frameworks/base baseline files, applies anchored text edits, adds the three policy Java files, and regenerates `alpha-core-launcher.patch` + `manifest.json` | Verdict: SIMPLIFY
- Importers: run by hand (`core-launcher/README.md:11`). Not invoked by any script, test or workflow (git grep `core-launcher/prepare`: 0). Its outputs are consumed by `scripts/stage-alpha-os-branding.py` and `os-defaults.mjs`. Text/path pins: none on this file's text.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-33 | C3 | Gitiles fetch-verify-write loop (`urllib.request.urlopen(...?format=TEXT)`, base64 decode, sha check, `open('xb')`) — third copy next to `hidden-navigation-handle/prepare.py:14-32` and `system-entry/fetch.py:17-41` (hard-wired to frameworks/base). | Extract `fetch_pinned(rows, base_url, dest)` into `system-entry/portable_tools.py` (already the shared module that `test_hidden_handle.py` imports) or a new `branding/aosp_inputs.py`; call it from all three. ~12 lines saved here, ~15 in hidden-nav prepare.py. | Low |
| 2 | 28-29 | B3 | `expected = f"https://...{PIN['revision']}/{row['path']}?format=TEXT"; assert row['url'] == expected` — validates our own pin file against itself. | Drop `url` from SOURCE-INPUTS.json and use `expected` directly. | Low |
| 3 | 16 | C3 | `sha = lambda data: hashlib.sha256(data).hexdigest()` — the ~10th Python SHA helper (also `apply.py:13`, `system-entry/apply.py:19`, `scripts/stage-alpha-os-branding.py digest`). | Use the shared helper module from finding 1. | — |
| 4 | 136, 223 | C6 | `'custom(ai.alphacompute.alphaphone/.AlphaQuickSettingsTile),'` and `'targetAppId':'ai.alphacompute.alphaphone'` literals duplicate `AlphaCoreLauncherPolicy.PACKAGE` / `AlphaQsDefaultsPolicy.ALPHA`. | Define `APP_ID = json.loads((REPO/'app.config.json').read_text())['appId']` once and derive both. | Low |
| 5 | 224-226 | B5 | Writes seven constant status booleans with no reader (see manifest.json report). | Delete. | Low |
| 6 | 220 | NEW | `''.join('\n' if line == ' \n' else line ...)` strips the space of blank context lines instead of using `.gitattributes *.patch -whitespace` like siblings. | Optional: switch to `.gitattributes`; regenerate patch. | Low |
| 7 | 17-19, whole | D8 | Top-level script with module-level side effects (argparse at import, `changes` global); fine for a one-shot tool. | None beyond the extraction above. | — |
| 8 | 48-201 | — | Anchored `replace()` edits are the product source of the patch; must stay byte-exact or the patch/manifest hashes change. | None. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `sha` | helper | 16 | `hidden-navigation-handle/apply.py:13 digest`, `system-entry/apply.py:19 digest`, `scripts/stage-alpha-os-branding.py digest`, inline hashlib in `hidden-navigation-handle/prepare.py:13,29,32,42` | shared `branding/aosp_inputs.py` (or `system-entry/portable_tools.py`) |
| fetch loop | helper | 20-33 | `hidden-navigation-handle/prepare.py:14-32`, `system-entry/fetch.py` | same shared module |
| `original` / `replace` / `edit` | helper | 35-46 | `system-entry/prepare.py` has its own anchored-replace helpers (not reviewed in this chunk) | shared module if system-entry's match |

## Proposed end state
~205 lines: fetch via shared helper, URL built not stored, app id from `app.config.json`, no status booleans; edit bodies unchanged.

## Verification
`python3 prepare.py --fetch` must regenerate byte-identical patch (apart from the deliberate manifest key removal); then `node --test test/quint-os-application-refinement.test.mjs` and `python3 test/aosp-fresh-presets.test.py`.
