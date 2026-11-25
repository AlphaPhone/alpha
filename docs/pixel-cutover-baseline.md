# Capture the Pixel baseline

Record this baseline while the previous image is still available. A
November 23, 2026 read-only snapshot found Alpha v630 holding HOME,
DIALER and SMS on the test Pixel. Its build summary did not identify
the exact Alpha source commit, and the snapshot did not exercise the
app's integrations.

## Build and device identity

If a baseline APK needs rebuilding, use the
[developer guide](development.md#android-builds) to verify the pinned
Node 26 / pnpm toolchain and upstream Eliza checkout. Run the release build
and verifier:

```sh
pnpm --filter @repo/app android inputs
pnpm --filter @repo/app android build --release
pnpm --filter @repo/app android verify
```

Keep the APK build record, launcher digest, signer identity and image
build receipt together. Identify the device explicitly by setting
`ALPHA_SERIAL` to the selected Pixel's adb serial. Record the running
image fingerprint and slot, launcher version and exact system APK
digest, HOME/DIALER/SMS role holders and privileged grants. Check
whether a data-partition update shadows the staged system launcher.

The release operator verifies that the rollback image and its launcher
match the running baseline's build record. Keep that artifact and
the corresponding AOSP staging inputs. A system-partition rollback
that keeps `/data` does not establish that the old runtime can read
state written by the new one.

## Behavior to compare

- Record whether Alpha opens to the expected signed-in screen and
  whether the account and plan are retained. Capture outcomes without
  recording credentials, account identifiers or conversation text.
- Verify HOME and app library navigation, existing conversations,
  workflows and reminders. Compare the presence of Notes, Files,
  Calendar and Inbox content without copying private data.
- Check Maps, Browser and Camera navigation and permissions. In
  image telephony, compare the Phone, Contacts and Messages views and
  the target shown on approval cards. Decline test proposals.
- Leave actual calls, sends, spoken acceptance and any lasting
  changes to an authorized owner check. Recheck image identity and
  roles after an authorized reboot.

Record app behavior separately from APK verification, AOSP boot and
owner acceptance. Capture any missing baseline observations before
an update of the test Pixel.
