# Protected native Power voice dispatch

This reviewed Android 17 patch keeps ordinary assist, Quick Settings and lock-screen
invocations surface-only. It strips the Power invocation marker at both the public search
service (`SearchManagerService.launchAssist`) for non-system callers and `LauncherProxyService.startAssistant`.
SystemUI verifies `MATCH_SYSTEM_ONLY`, `FLAG_SYSTEM`/`FLAG_UPDATED_SYSTEM_APP`, `!FLAG_SUSPENDED`,
and the enrolled Alpha release certificate digest off the main thread (`mBgHandler`) before launching
the exact protected Alpha Power component for the selected assistant on a provisioned, unlocked current user.
The dedicated Alpha Sense image feature is required. Only the protected child
launch shares Android's SystemUI caller identity. Caller text, URI and assist
context are dropped.

The manifest binds all three framework files to revision
94b4c163b7dfe5ce3607f7bb8456f9573f7de57d and the exact Pixel source inventory.
Pass `--applied-systemui-patch alpha-protected-power` after applying the patch to
the build copy. The shared generic `assist` patch touches the same file.

The patch has source checks only; compile it before image admission. That does not
establish Binder, hardware, microphone, complete image or production-release acceptance.

The app component must use the current shared Sense owner/session/generation authority.
Missing or ineligible protected app components use the existing ordinary assist path.

Before activation, qualify the matching app and native source tuple, whole source
inventory, signature/permission enforcement from a separate UID, spoofed invocation
refusal, lock/restore/visibility/cancellation, role and real Power dispatch. Cloud voice
still needs finite microphone-to-transcript-to-agent-to-playback acceptance. No offline
model, wake-word listener or additional provider stack is required by this patch.
