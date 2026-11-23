#!/usr/bin/env bash
# Common settings for the device-lane steps. Sourced by 01..07, never run on its own.
# Written 2026-11-23 from reading only: nothing here has been executed.
#
# Required:  ALPHA_DIR     the alpha vibestack checkout to build (absolute path)
#            VERSION_CODE  integer, must exceed the versionCode installed on the phone (630 on 2026-11-23)
# Optional:  WORK          per-version work directory (default device/work/v$VERSION_CODE)
#            ALPHA_SERIAL  adb serial (default 67091JEA313850)

: "${ALPHA_DIR:?set ALPHA_DIR to the alpha vibestack checkout to build}"
: "${VERSION_CODE:?set VERSION_CODE (an integer above the installed versionCode)}"
case "$VERSION_CODE" in ''|*[!0-9]*) echo "VERSION_CODE must be an integer, got '$VERSION_CODE'" >&2; exit 2 ;; esac
case "$ALPHA_DIR" in /*) ;; *) echo "ALPHA_DIR must be an absolute path" >&2; exit 2 ;; esac

DEVICE_DIR=/home/shaw/.cache/vibeaudit/device
WORK=${WORK:-$DEVICE_DIR/work/v$VERSION_CODE}
ROLLBACK_DIR=$DEVICE_DIR/rollback
SERIAL=${ALPHA_SERIAL:-67091JEA313850}
PKG=ai.alphacompute.alphaphone

# Resource wrapper: one of three machine-wide slots, E-cores only (AllowedCPUs=8-15,18-23), memory capped.
# heavy.sh clamps the cap to 10 GB and waits for MemAvailable >= cap + 3 GB before it starts.
HEAVY=/home/shaw/.cache/vibecut/heavy.sh

# Toolchain (all present on 2026-11-23).
TOOLS_BIN=/home/shaw/.cache/vibecut/tools/node_modules/.bin          # pnpm 10.24.0
NODE_BIN=/home/shaw/.local/share/mise/installs/node/26.13.1/bin      # Node 26.13.1
JAVA_HOME_21=/usr/lib/jvm/java-21-openjdk                             # JDK 21.0.13
SDK=/home/shaw/Android/Sdk
BT=$SDK/build-tools/36.0.0                                            # aapt aapt2 apksigner zipalign
NDK=$SDK/ndk/28.2.13676358                                            # android/embedding-host/build-toolchain.json
ADB=$SDK/platform-tools/adb
FASTBOOT=$SDK/platform-tools/fastboot

# AOSP tree, product and image.
AOSP=/home/shaw/Android/pixel10a-preparation/eliza-source
VENDOR=$AOSP/vendor/alphaphone
LUNCH=alpha_stallion_phone-cp2a-userdebug
PRODUCT_OUT=$AOSP/out/target/product/stallion
IMG_ZIP=$PRODUCT_OUT/alpha_stallion_phone-img.zip
FACTORY_ZIP=/home/shaw/Android/pixel10a-preparation/recovery/stallion-cp3a.261005.005-factory-d1d25502.zip

# Signing: the repository debug key, the same key every local image since v93 used.
KEYSTORE=/home/shaw/.config/.android/debug.keystore
EXPECT_CERT=2242994d2d237f98d01927999157067df4e2495a8f980451ac3de5d40642584a

# Legacy artifacts (the build being replaced).
LEGACY_IMAGE_DIR=/home/shaw/.cache/alpha-v612/image
LEGACY_APK=${LEGACY_APK:-$LEGACY_IMAGE_DIR/Launcher630.apk}

# Light steps run directly with this PATH. heavy.sh sets its own PATH (same node and pnpm) and passes
# NO other environment, so every heavy command is started through `env ...` with BUILD_ENV below.
export PATH=$TOOLS_BIN:$NODE_BIN:$SDK/platform-tools:/usr/local/bin:/usr/bin:/bin:$JAVA_HOME_21/bin
BUILD_ENV=(
  "ANDROID_HOME=$SDK" "ANDROID_SDK_ROOT=$SDK" "ANDROID_NDK_HOME=$NDK" "JAVA_HOME=$JAVA_HOME_21"
  "GRADLE_OPTS=-Dorg.gradle.jvmargs=-Xmx4096m"       # CI: a clean release R8 pass exhausted 2 GiB
  "ELIZAOS_VERSION_CODE=$VERSION_CODE"
  "ELIZA_DEV_ALLOW_TEST_MOCKS="                      # APK builds are always flag-off
  "ALPHA_TIMEOUT_SCALE=3"                            # docs/development.md: lengthen subprocess deadlines on a loaded machine
)

say() { printf '\n==> %s\n' "$*"; }
die() { printf 'STOP: %s\n' "$*" >&2; exit 1; }
need() { [ -e "$1" ] || die "missing: $1"; }

# heavy <memGB> <cmd...>: run <cmd> in $ALPHA_DIR under heavy.sh with the build environment.
heavy() { local mem=$1; shift; "$HEAVY" "$ALPHA_DIR" "$mem" env "${BUILD_ENV[@]}" "$@"; }

# adbsh <args...>: read-only shell on the phone, carriage returns stripped.
adbsh() { timeout 20 "$ADB" -s "$SERIAL" shell "$@" | tr -d '\r'; }

sha256_of() { sha256sum "$1" | cut -d' ' -f1; }
