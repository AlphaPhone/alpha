#!/usr/bin/env bash
# 01-preflight.sh: read-only checks before any build. Builds nothing, installs nothing, changes nothing
# on the phone or in any checkout. Writes only $WORK/preflight.txt.
#   ALPHA_DIR=/path/to/alpha VERSION_CODE=632 ./01-preflight.sh
set -euo pipefail
. "$(dirname "$0")/env.sh"
mkdir -p "$WORK"
exec > >(tee "$WORK/preflight.txt") 2>&1
FAIL=0
bad() { echo "FAIL: $*"; FAIL=$((FAIL + 1)); }
ok() { echo "ok:   $*"; }
warn() { echo "WARN: $*"; }

say "Toolchain"
for f in "$HEAVY" "$TOOLS_BIN/pnpm" "$NODE_BIN/node" "$JAVA_HOME_21/bin/java" "$BT/aapt" "$BT/aapt2" "$BT/apksigner" "$BT/zipalign" \
         "$NDK/source.properties" "$ADB" "$FASTBOOT" "$KEYSTORE" "$FACTORY_ZIP" "$LEGACY_APK"; do
  [ -e "$f" ] && ok "$f" || bad "missing $f"
done
node --version | grep -q '^v26\.' && ok "node $(node --version)" || bad "node is $(node --version 2>&1), need 26"
[ "$(pnpm --version 2>/dev/null)" = 10.24.0 ] && ok "pnpm 10.24.0" || bad "pnpm is $(pnpm --version 2>&1), need 10.24.0"
"$JAVA_HOME_21/bin/java" -version 2>&1 | head -1
command -v python3 sqlite3 unzip git >/dev/null && ok "python3 sqlite3 unzip git on PATH" || bad "python3, sqlite3, unzip or git missing"
echo "note: system cmake is $(cmake --version 2>/dev/null | head -1); build-toolchain.json wants 4.0.3 (the native build uses its own isolated Python tools; see RUNBOOK step 2)"

say "Alpha checkout $ALPHA_DIR"
[ -d "$ALPHA_DIR/.git" ] || [ -f "$ALPHA_DIR/.git" ] || die "$ALPHA_DIR is not a git checkout"
echo "HEAD:   $(git -C "$ALPHA_DIR" rev-parse HEAD)  ($(git -C "$ALPHA_DIR" log -1 --format=%s | cut -c1-80))"
echo "branch: $(git -C "$ALPHA_DIR" rev-parse --abbrev-ref HEAD)"
echo "dirty files: $(git -C "$ALPHA_DIR" status --short | wc -l)"
grep -q '"packageManager": "pnpm@10.24.0"' "$ALPHA_DIR/package.json" && ok "pnpm workspace (vibestack line)" || bad "package.json is not the pnpm vibestack line"
grep -q '"appId": "ai.alphacompute.alphaphone"' "$ALPHA_DIR/app.config.json" && ok "appId $PKG" || bad "app.config.json appId is not $PKG (never build another id)"
[ -d "$ALPHA_DIR/node_modules" ] && ok "node_modules present" || bad "node_modules missing: run pnpm install --frozen-lockfile (heavy, network) first"
PIN=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1]))["commit"])' "$ALPHA_DIR/upstream.lock.json")
if [ -e "$ALPHA_DIR/vendor/eliza/.git" ]; then
  VHEAD=$(git -C "$ALPHA_DIR/vendor/eliza" rev-parse HEAD)
  [ "$VHEAD" = "$PIN" ] && ok "vendor/eliza at the pin $PIN" || bad "vendor/eliza at $VHEAD, pin is $PIN (git submodule update --init vendor/eliza)"
else
  # Never run git inside a missing submodule directory: it acts on the parent repository.
  bad "vendor/eliza is not checked out (pin $PIN)"; VHEAD=
fi

say "Upstream-pin ancestry guard (scripts/android-build-preflight.ts mainPinProblem)"
MAINPIN=$(git -C "$ALPHA_DIR" show refs/remotes/origin/main:upstream.lock.json 2>/dev/null | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["commit"])' 2>/dev/null || true)
if [ -z "$MAINPIN" ]; then ok "no origin/main ref in this clone: the guard only prints a note"
elif [ "$MAINPIN" = "$PIN" ]; then ok "pin equals origin/main's pin"
elif [ -z "$VHEAD" ]; then warn "cannot evaluate without vendor/eliza"
elif ! git -C "$ALPHA_DIR/vendor/eliza" cat-file -e "$MAINPIN^{commit}" 2>/dev/null; then
  bad "origin/main pins $MAINPIN, which is not in vendor/eliza: the build preflight will exit 2 ('unknown')"
elif git -C "$ALPHA_DIR/vendor/eliza" merge-base --is-ancestor "$MAINPIN" "$PIN"; then ok "pin descends from origin/main's pin $MAINPIN"
else bad "origin/main pins $MAINPIN, not an ancestor of $PIN: the build preflight will exit 2 ('older or diverged'). See OPEN-QUESTIONS Q2"
fi

say "Release signer and signing environment"
python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1])); print("release-signer.json signer", d["signerSha256"], "lastRelease", d["lastRelease"]["versionCode"])' "$ALPHA_DIR/android/release-signer.json"
for v in ELIZAOS_KEYSTORE_PATH ELIZAOS_KEYSTORE_PASSWORD ELIZAOS_KEY_ALIAS ELIZAOS_KEY_PASSWORD; do
  [ -z "${!v:-}" ] || bad "$v is set: the device build must stay unsigned in Gradle (a debug-key signature fails release admission) and is signed in step 3"
done
"$JAVA_HOME_21/bin/keytool" -list -v -keystore "$KEYSTORE" -storepass android -alias AndroidDebugKey 2>/dev/null | grep -i 'SHA256:' | tr -d ' :' | tr 'A-F' 'a-f' | grep -q "$EXPECT_CERT" \
  && ok "debug keystore certificate is $EXPECT_CERT" || warn "could not confirm the debug keystore digest with keytool (step 3 checks it with apksigner)"

say "Build input report (reads files only; always exits 0)"
( cd "$ALPHA_DIR" && node scripts/android-build-preflight.ts --report ) || warn "the input report could not run"

say "AOSP tree"
need "$AOSP/build/envsetup.sh"; need "$VENDOR/Android.bp"; need "$VENDOR/provisioning/alpha-telephony-components.xml"; need "$VENDOR/image-capabilities/Android.bp"
python3 -I - "$VENDOR" <<'PY'
import json, sys, os
v = sys.argv[1]
lj = json.load(open(os.path.join(v, 'launcher.json'))); nl = json.load(open(os.path.join(v, 'native-libraries.json')))
print('staged launcher apkSha256', lj['apkSha256'], 'cert', lj['certificateSha256'])
print('staged native libraries:', ', '.join(os.path.basename(l['path']) for l in nl['libraries']))
PY
find "$VENDOR" -maxdepth 2 -type f -size 0 | sed 's/^/WARN zero-byte file (crash damage?): /'
[ -f "$IMG_ZIP" ] && ls -la "$IMG_ZIP" || warn "no image zip in out/"
if pgrep -af 'soong_ui|build-image|/ninja |siso ' | grep -v pgrep; then bad "another image build appears to be running in some tree: only one session builds at a time"; else ok "no image build running"; fi
if pgrep -af 'fastboot' | grep -v pgrep; then bad "a fastboot process is running: another session may be flashing"; fi

say "Machine"
uptime; free -g | head -2; df -h /home | tail -1
echo "note: /tmp is wiped on reboot; everything for this lane lives under $DEVICE_DIR"

say "Phone $SERIAL (read-only)"
if [ -z "$SERIAL" ]; then bad "set ALPHA_SERIAL to the target phone"; elif [ "$(timeout 10 "$ADB" -s "$SERIAL" get-state 2>/dev/null)" != device ]; then bad "phone not in adb 'device' state"; else
  FP=$(adbsh getprop ro.build.fingerprint); echo "fingerprint: $FP"; echo "slot: $(adbsh getprop ro.boot.slot_suffix)  model: $(adbsh getprop ro.product.model)"
  D=$(adbsh dumpsys package "$PKG")
  CUR=$(printf '%s\n' "$D" | sed -n 's/^ *versionCode=\([0-9]*\).*/\1/p' | head -1)
  echo "installed versionCode: $CUR  codePath: $(printf '%s\n' "$D" | sed -n 's/^ *codePath=//p' | head -1)"
  printf '%s\n' "$D" | grep -m1 'signatures=' || true
  [ -n "$CUR" ] && [ "$VERSION_CODE" -gt "$CUR" ] && ok "VERSION_CODE $VERSION_CODE exceeds installed $CUR" || bad "VERSION_CODE $VERSION_CODE does not exceed installed ${CUR:-unknown}"
  [ -f "$LEGACY_IMAGE_DIR/Launcher$VERSION_CODE.apk" ] && warn "a legacy Launcher$VERSION_CODE.apk already exists in $LEGACY_IMAGE_DIR: pick a VERSION_CODE no legacy build used" || true
  grep -q 'UPDATED_SYSTEM_APP' <<<"$D" && bad "a /data update sits over the system app (pm uninstall-system-updates $PKG keeps data; decide with the owner)" || ok "no /data update over the system app"
  PKGS=$(adbsh pm list packages -f || true); grep -E "=$PKG$" <<<"$PKGS" || true
  for r in HOME DIALER SMS; do echo "$r: $(adbsh cmd role get-role-holders android.app.role.$r)"; done
  CONN=$(adbsh dumpsys connectivity || true); grep -q 'VPN CONNECTED' <<<"$CONN" && warn "a VPN is connected (gnirehtet without its relay black-holes traffic; see RUNBOOK step 1)" || ok "no VPN connected"
  INC=$(adbsh getprop ro.build.version.incremental); RB=${ROLLBACK_IMG:-$LEGACY_IMAGE_DIR/img${INC#alpha.v}.zip}
  RB_EVIDENCE=${ROLLBACK_RECEIPT:-${RB%.zip}.evidence.json}
  [ -f "$RB" ] && ok "rollback image for the running build exists: $RB" || bad "no rollback image $RB for the running build $INC: do not flash until one exists"
  [ -f "$RB_EVIDENCE" ] && ok "rollback build record exists: $RB_EVIDENCE" || bad "no verified rollback build record at $RB_EVIDENCE"
fi

say "Result"
[ "$FAIL" = 0 ] && echo "PREFLIGHT OK (read-only checks; not a build)" || { echo "PREFLIGHT: $FAIL problem(s)"; exit 1; }
