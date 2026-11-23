# android/app/src/main/res/xml/storage_paths.xml
- Lines: 1 | Role: FileProvider paths (`root-path` `storage/`) for the shared read-only Files provider. | Verdict: KEEP
- Importers: `AndroidManifest.xml:104` (`ai.eliza.plugins.filesystem.browser.ReadOnlyStorageFileProvider`, compiled into main via `consumer-host.json:106` `sourceSets.main.java` from patched `plugin-native-filesystem`). Text/path pins: none.

## Findings
None. Upstream ships no paths XML for this provider (grep in `.eliza/patched-native/*/plugins/plugin-native-filesystem`: 0), so the host must provide it.

## Proposed end state
Unchanged.

## Verification
Files open-with/share instrumentation.
