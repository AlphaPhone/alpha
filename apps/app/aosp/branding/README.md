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

`scripts/generate-alpha-os-branding.ts` renders the existing vector with the established
Sharp toolchain, then uses the hash-pinned shared OS packer in `tools.lock.json`. Set
`ALPHA_BRANDING_RENDER_PACKAGE` to a prepared package.json that resolves Sharp, and
`ALPHA_OS_SOURCE_ROOT` to the pinned OS checkout. Render into a new output directory.

Five explicit overlay packages use unique Alpha identities and a declared priority above
the retained factory overlays. This avoids the duplicate package names used by factory
and automatically generated framework overlays. LatinIME alone uses the static product
overlay path because its theme uses private app attributes.

`scripts/stage-alpha-os-branding.py` records exact base hashes before the two small
Provision edits. It retains Android's existing device-owner branch and completion methods.
The main Alpha app remains nonprivileged. The separate existing platform provisioner owns
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
completing fresh primary-user setup. An enabled navigation mode is kept. Completed
setup, managed profiles and secondary users keep their settings. Android owns the
gesture regions and dimensions. Three-button navigation stays available in Settings
and supplies the system fallback before setup or when gesture activation is unavailable.
`home-back-keyboard.patch` keeps its default-off Launcher3 product resource
(`config_alpha_home_back_only`); Alpha's overlay now leaves it off, so Recents and
quick-switch work as in AOSP. The hidden gesture handle draw guard follows the same flag.

LatinIME's default-theme resource applies only without a saved theme choice. Input engines,
languages, predictions, correction, emoji, dictation affordances and permission behavior remain
the existing implementation. Both light and dark themes retain their existing style items.
LatinIME's overlay is compiled into its APK through the scoped
`PRODUCT_ENFORCE_RRO_EXCLUDED_OVERLAYS` entry: its private style attributes cannot be
resolved from a separately generated runtime-overlay package. Other packages retain
their normal overlay behavior.

`home-back-keyboard-inputs.json` records each edited file's base and patched SHA-256.
`scripts/stage-alpha-os-branding.py` stages the Launcher3 and LatinIME overlays but does not
apply `home-back-keyboard.patch` or read its inputs file.

## Power and assistant defaults

`AlphaFrameworkOverlay` (`overlay/frameworks/base/core/res/res/values/config.xml`) sets the
default assistant package and long-press Power behavior independently of the optional offline
listener. Power + Volume Up keeps the power menu; camera double-press, emergency gestures and
short-press keep factory values. Saved assistant and power preferences remain authoritative.
Framework source: `frameworks/base@94b4c163b7dfe5ce3607f7bb8456f9573f7de57d`,
`core/res/res/values/config.xml` and `PhoneWindowManager.java`.

## Keyboard dictation

The stock LatinIME microphone dispatches `CODE_SHORTCUT` to
`RichInputMethodManager.switchToShortcutIme()`, which returns silently when no auxiliary IME is
installed (`packages/inputmethods/LatinIME@afe0d5c261c3a0c88b38894981a7b332da93e7dd`). The
launcher APK supplies `AlphaKeyboardDictationService`, an auxiliary `voice` subtype using the
selected Alpha Cloud or Direct voice provider; standalone APKs do not register it.

The framework overlay `alpha-keyboard-dictation.xml` sets the system voice package. The pinned
framework's `updateDefaultVoiceImeIfNeededLocked()` (`InputMethodManagerService.java`) enables
the preinstalled service and writes `DEFAULT_VOICE_INPUT_METHOD` when its identity changes; the
selected keyboard and a later owner opt-out are preserved. There is no per-phone settings script.
`test/aosp-fresh-presets.test.py`, with `ALPHA_DICTATION_APP_ROOT`, `ALPHA_FRESH_PRESET_INPUTS`
and `ALPHA_BRANDING_ASSETS` set, checks the staged overlay against the launcher manifest and
voice subtype. Device acceptance covers Start/Stop insertion, Cancel, Back, field/account
switch, lock/call interruption, password denial, owner opt-out and IME focus while switching.
