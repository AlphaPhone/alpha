# android/app/src/main/res/drawable/app_icon.xml
- Lines: 9 (24.8 KB) | Role: pre-API-26 launcher icon vector (blue circle + silhouette); also the byte-pinned source of the AOSP Provision setup icon. | Verdict: MOVE to `android/aosp/branding/provision/` (owner decision) and SIMPLIFY
- Importers: resolved by name `@drawable/app_icon` (manifest, splash), but at `minSdk` 29 the `drawable-v26/app_icon.xml` variant always wins, so this file is never selected on a device; aapt2 version-collapsing is expected to drop it from the APK entirely (PLAUSIBLE — confirm with `aapt2 dump resources` on a built APK).
  Text/path pins: `android/aosp/branding/provision/source-inputs.json:77-90` (`productIcon.path` + `sha256` b3d0e893… + geometry block), read by `scripts/stage-alpha-os-branding.py:133-136` (`assert digest(icon) == LOCK['productIcon']['sha256']`) and `test/aosp-fresh-presets.test.py:102`; `android/aosp/branding/provision/README.md:50` names the path.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | A7 / NEW (dead vector geometry) | The path string (24,140 bytes, identical to `notification_icon.xml`) contains the "ALPHA COMPUTE" wordmark sub-paths starting at `M226.53,99.56…` (17 sub-paths with x 156-470, 9,299 bytes = 38%) that the `<clip-path android:pathData="M0,0H120V120H0Z"/>` on line 6 removes. They are never drawn. | Cut the path at `M226.53,99.56` (drop 9,299 bytes) and delete the now-unneeded `clip-path` (line 6). Re-pin `sha256` in `provision/source-inputs.json` and re-run `test/aosp-fresh-presets.test.py`. | Medium: byte-pinned AOSP input; the AOSP image packet must be re-admitted |
| 2 | file | D11 / D6 | Lives in the app's `res/` but its only effective consumer is the AOSP Provision branding stage. | Move to `android/aosp/branding/provision/app_icon.xml`, update `productIcon.path` and README; delete from app res (the v26 adaptive icon covers every supported API). | Medium: confirm with owner that Provision must stay byte-identical to the app icon |
| 3 | 1-2 | — | Comment cites `apps/app/public/logo-mark.svg`; source-inputs also pins that SVG's SHA. Fine. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| silhouette `pathData` | const (geometry) | 7 | Byte-identical path in `drawable/notification_icon.xml:4`; derived also in `android/aosp/branding/system-entry/prepare.py:339-345` from `logo-mark.svg` | One trimmed path; Provision copy in AOSP packet |
| `#0000FF` | const | 4 | `values/alpha-launcher.xml:3`, `styles.xml:3`, `values-night/styles.xml:5`, `consumer-host.json:142` (`0xff0000ff`) | `values/colors.xml` (brand) |

## Proposed end state
Not in `android/app/src/main/res` at all; a trimmed (~15.5 KB, no clip-path) copy at `android/aosp/branding/provision/` with a new pinned SHA.
If the owner wants it kept here, keep it but trimmed (still 9 lines, ~38% smaller).

## Verification
`python3 -m unittest test/aosp-fresh-presets.test.py`; `scripts/stage-alpha-os-branding.py` admission; `aapt2 dump resources` on standalone/launcher APKs to confirm the APK content is unchanged.
