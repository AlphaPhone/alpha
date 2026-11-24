# android/aosp/branding/secure-camera-inputs.json
- Lines: 12 | Role: Provenance: the two `alpha-secure-camera.xml` overlay files are copies of `vendor/alphaphone/secure-camera/overlay/.../config.xml` with recorded sha256. | Verdict: DELETE
- Importers: `scripts/stage-alpha-os-branding.py:103` copies the file verbatim into `vendor/alphaphone/branding/` (bytes only, never parsed). Nothing in `Android.bp`, `branding.mk`, scripts, tests or specs reads its fields (grep `secure-camera-inputs`: only that line). Hashes do match the two overlay files today.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-12 | B5 | Provenance record with no consumer; staging it into the AOSP tree gives AOSP an unused JSON file. | Delete the file and `'secure-camera-inputs.json'` from the list at `stage-alpha-os-branding.py:103`. If the overlay duplicates are kept, a one-line comment in each `alpha-secure-camera.xml` naming its source is enough. | None; Quint OSSourceStaging uses two representative files, not this list (re-run it). |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
Quint OSSourceStaging; stage dry run.
