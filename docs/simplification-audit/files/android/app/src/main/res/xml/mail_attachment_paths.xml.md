# android/app/src/main/res/xml/mail_attachment_paths.xml
- Lines: 1 | Role: FileProvider paths for `AlphaMailFileProvider`: cache sub-folder `mail-attachments/`. | Verdict: KEEP
- Importers: `AndroidManifest.xml:105`. Text/path pins: `specs/quint/native/manifest.json:1888`, `specs/quint/refinement/native/reviewed-copies.mjs:17` (reviewed-copy file list).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | C6 | `mail-attachments` literal also in `AlphaMailAttachmentsPlugin.java:53` (`new File(getCacheDir(),"mail-attachments")`) and `AlphaMailFileProvider.java:9`. | Optional: one Java constant for the two Java uses; XML must stay literal. | Low |

## Proposed end state
Unchanged.

## Verification
Mail attachment open/share instrumentation; Quint reviewed-copies refinement.
