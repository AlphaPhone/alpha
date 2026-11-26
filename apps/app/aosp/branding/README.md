# Alpha OS branding layer

This extends the existing Alpha identity and native Android screens. It does not replace
Settings, SystemUI, the keyguard, navigation controllers, permissions or account flows.

## Reused implementation

| Surface | Reused authority | Alpha customization |
| --- | --- | --- |
| Boot animation | Existing Alpha SVG; pinned elizaOS/os brand-independent frame packer | Alpha blue field, white mark, short reveal |
| Lock/Home wallpaper | Existing Alpha launcher mark and palette; Android WallpaperManager | True-black wallpaper with no artwork ("Ink"); native clock and notifications remain |
| Native Settings, Wi-Fi, screen security | Complete AOSP Settings activities and preference hierarchy | DeviceDefault/Material color roles and app label |
| Shade and Quick Settings | Complete AOSP SystemUI controllers, tiles and notification layouts | Shared system palette and Alpha labels |
| Navigation | Existing Android navigation overlays and security gates | Gesture navigation selected at fresh Alpha setup; three buttons remain a Settings option and recovery fallback |
| Keyboard | Complete AOSP LatinIME input engine, languages, suggestions and accessibility | Alpha light/dark colors; dark default when no theme preference has been saved |
| First-run setup | Existing Provision enterprise branch, completion and disable logic; existing Alpha account/permission onboarding | An additive welcome step links to the full native Wi-Fi/security screens and then Alpha |

The initial firmware splash and unlocked-bootloader warning belong to Google's signed
firmware. Hardware manufacturer, provider identities, legal notices, security/error colors
and truthful permission text are not relabeled as Alpha-owned services.

## Build and admission

Boot-animation generation uses the hash-pinned shared OS packer recorded in `tools.lock.json`
(pending alignment with the workspace `eliza.lock.json` pin when branding staging is ported into
`apps/app/scripts/aosp.ts`). Legacy scripts referenced in earlier revisions (`scripts/generate-alpha-os-branding.ts`,
`scripts/stage-alpha-os-branding.py`, `test/aosp-fresh-presets.test.py`) live under `legacy/` and are not
invoked by `apps/app/scripts/aosp.ts` yet.

Five explicit overlay packages use unique Alpha identities and a declared priority above
the retained factory overlays. This avoids the duplicate package names used by factory
and automatically generated framework overlays. LatinIME alone uses the static product
overlay path because its theme uses private app attributes.

Provisioning changes under `provision/` retain Android's existing device-owner branch and completion
methods. The main Alpha app remains nonprivileged. The separate existing platform provisioner owns
provisioning and default Home selection; its wallpaper action uses the normal platform API.
Existing user theme preferences are preserved during first-run completion. Applying Alpha
wallpaper/colors is an explicit user action.

Component compile, packaged image verification and physical screen checks are separate gates.
Current source/assets are preparation, not evidence that every branded screen is installed
or accepted. Verify light/dark contrast, 200% text, RTL, lock/AOD, shade/Quick Settings,
Wi-Fi, VPN, hotspot, screen security, permissions, accessibility, gestures and the Back/Home button fallback.
Never reset device provisioning or wipe the owner merely to preview the welcome screen.

## Home/Back and keyboard policy

The Alpha OS welcome selects Android's standard gestural navigation overlay before
presenting fresh primary-user setup (treating AOSP's pre-setup three-button boot default as
unselected while `USER_SETUP_COMPLETE == 0`). Setup completion retries if the overlay service
was unavailable at first. Any non-default enabled navigation mode is kept.
Completed setup, managed profiles and secondary users keep their settings. Android owns the
gesture regions and dimensions. Three-button navigation stays available in Settings
and supplies the system fallback when gesture activation is unavailable.
`home-back-keyboard.patch` keeps its default-off Launcher3 product resource
(`config_alpha_home_back_only`); Alpha's overlay leaves it `false`, so Recents and
quick-switch work as in AOSP. A separate product resource (`config_alpha_hide_taskbar_handle`,
default `false` in `hidden-navigation-handle.patch` and `true` in `AlphaNavigationOverlay`)
hides only the Launcher3 taskbar gesture handle. Standard Alpha image staging includes that
render-only change.

LatinIME's default-theme resource applies only without a saved theme choice. Input engines,
languages, predictions, correction, emoji, dictation affordances and permission behavior remain
the existing implementation. Both light and dark themes retain their existing style items.
LatinIME's overlay is compiled into its APK through the scoped
`PRODUCT_ENFORCE_RRO_EXCLUDED_OVERLAYS` entry: its private style attributes cannot be
resolved from a separately generated runtime-overlay package. Other packages retain
their normal overlay behavior.

`home-back-keyboard-inputs.json` records each edited file's base and patched SHA-256.
Note that `apps/app/scripts/aosp.ts` does not yet apply `home-back-keyboard.patch` automatically.

## Power and assistant defaults

`AlphaFrameworkOverlay` (`overlay/frameworks/base/core/res/res/values/config.xml`) sets the
default assistant package and long-press Power behavior independently of the optional offline
listener. Power + Volume Up keeps the power menu; `alpha-secure-camera.xml` overlays explicitly
enable `config_cameraDoubleTapPowerGestureEnabled=true` and set `config_cameraGesturePackage=com.android.camera2`;
emergency gestures and short-press keep factory values. Saved assistant and power preferences remain authoritative.
Framework source: `frameworks/base@94b4c163b7dfe5ce3607f7bb8456f9573f7de57d`,
`core/res/res/values/config.xml` and `PhoneWindowManager.java`.

## Keyboard dictation

The stock LatinIME microphone dispatches `CODE_SHORTCUT` to
`RichInputMethodManager.switchToShortcutIme()`, which returns silently when no auxiliary IME is
installed (`packages/inputmethods/LatinIME@afe0d5c261c3a0c88b38894981a7b332da93e7dd`). The
launcher APK is expected to supply `AlphaKeyboardDictationService` (along with `AlphaAssistActivity`,
`AlphaPowerVoiceActivity`, and `AlphaQuickSettingsTile` for the other AOSP entry points) once ported
from `legacy/android/` into `apps/app/android/`; standalone APKs do not register it.

The framework overlay `alpha-keyboard-dictation.xml` sets the system voice package. The pinned
framework's `updateDefaultVoiceImeIfNeededLocked()` (`InputMethodManagerService.java`) enables
the preinstalled service and writes `DEFAULT_VOICE_INPUT_METHOD` when its identity changes; the
selected keyboard and a later owner opt-out are preserved. There is no per-phone settings script.
Device acceptance covers Start/Stop insertion, Cancel, Back, field/account switch, lock/call
interruption, password denial, owner opt-out and IME focus while switching.
