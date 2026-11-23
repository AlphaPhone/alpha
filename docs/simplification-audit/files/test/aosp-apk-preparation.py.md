# test/aosp-apk-preparation.py
- Lines: 97 | Kind: tooling (Python unittest of `scripts/prepare-aosp-apk.py`, `subprocess.run` patched) | Verdict: DELETE (with `scripts/prepare-aosp-apk.py`; owner confirm)
- Covers: ZIP re-store/zipalign wrapper preserves payload bytes, stores `.so`/`.dex` uncompressed, refuses v1-signed, duplicate, path-traversal and signing-block input, and never publishes a receipt after aligner corruption. Duplicates: none. Callers/importers: only `test/aosp-apk-preparation.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | A7 | The script under test, `scripts/prepare-aosp-apk.py`, has no caller other than this test (`git grep prepare-aosp` outside vendor/docs returns only the test and its wrapper; `files/scripts/prepare-aosp-apk.py.md` and `research/scripts.md:630` agree: "test-only caller"). `stage-aosp.ts` admits APKs through upstream `image-apk-admission.mjs` instead. | Delete the script and this test together. | Low: if an operator runs the script by hand outside the repo docs, they lose it; restorable from git. |
| 2 | 33-43 | T3 | `subprocess.run` is mocked, so zipalign behaviour is simulated; the docstring itself says real alignment is checked elsewhere. | n/a once deleted. | none |

## Proposed end state
File removed with `scripts/prepare-aosp-apk.py`. If the owner keeps the script, keep this suite but run it from the single
Python runner (`test/tooling/python.test.mjs`) and delete the one-line wrapper.
