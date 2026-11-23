#!/usr/bin/env bash
# 02-apk.sh: build the Vibestack launcher APKs (debug and release) in $ALPHA_DIR, each stage through heavy.sh.
# Mirrors `pnpm android:build:local -- --release`, one stage at a time so a failure names its stage
# (the shape of the legacy ~/.cache/alpha-v612/image/apk.sh). Needs network: the native inputs on a
# cold cache and the pinned Android Node runtime archives in the staging stage.
#   ALPHA_DIR=/path/to/alpha VERSION_CODE=632 ./02-apk.sh
# Optional: TRIES=3 (per stage), RUN_INSTALL=yes (pnpm install --frozen-lockfile first),
#           ALLOW_POST_APK_FAILURE=yes (accept a build-android.ts failure after verify-apks passed, e.g. the SBOM step)
set -euo pipefail
. "$(dirname "$0")/env.sh"
TRIES=${TRIES:-3}
mkdir -p "$WORK"
LOG=$WORK/apk.log; SUM=$WORK/apk.sum
: > "$LOG"; : > "$SUM"

for v in ELIZAOS_KEYSTORE_PATH ELIZAOS_KEYSTORE_PASSWORD ELIZAOS_KEY_ALIAS ELIZAOS_KEY_PASSWORD; do
  [ -z "${!v:-}" ] || die "$v is set. Leave release signing to step 3: a debug-key signature fails verify-apks against android/release-signer.json."
done
[ -e "$ALPHA_DIR/vendor/eliza/.git" ] || die "vendor/eliza is not checked out in $ALPHA_DIR"

# stage <name> <memGB> <cmd...>: run under heavy.sh, retry up to $TRIES, record in $SUM.
stage() {
  local name=$1 mem=$2 i rc; shift 2
  for i in $(seq 1 "$TRIES"); do
    say "[$name] try $i/$TRIES: $* (heavy.sh, ${mem} GB cap, E-cores; waits for a slot and free memory)"
    rc=0; heavy "$mem" "$@" >> "$LOG" 2>&1 || rc=$?
    if [ "$rc" = 0 ]; then echo "$name ok try$i $(date +%T)" | tee -a "$SUM"; sync; return 0; fi
    echo "$name fail try$i rc=$rc $(date +%T)" | tee -a "$SUM"
    # Exit 2 from the input preflight is a missing prerequisite, not a flaky crash: do not retry it.
    if [ "$name" = preflight ] && [ "$rc" = 2 ]; then break; fi
  done
  echo "---- last 40 log lines ($LOG) ----"; tail -40 "$LOG"
  return 1
}

say "Recording the source being built"
{ echo "alpha $(git -C "$ALPHA_DIR" rev-parse HEAD) $(git -C "$ALPHA_DIR" rev-parse --abbrev-ref HEAD)"
  echo "eliza $(git -C "$ALPHA_DIR/vendor/eliza" rev-parse HEAD)"
  echo "dirty $(git -C "$ALPHA_DIR" status --short | wc -l)"
  echo "versionCode $VERSION_CODE"; date -Is; } | tee "$WORK/source.txt"

if [ "${RUN_INSTALL:-no}" = yes ]; then
  stage install 10 pnpm install --frozen-lockfile || die "pnpm install failed"
fi

START=$(date +%s)
# 1. Input check. On this line it also prepares the source-bound native inputs (voice and embedding) when the pin guard passes.
stage preflight 10 node scripts/android-build-preflight.ts || die "input preflight failed (exit 2 = a prerequisite is missing; the message names the command)"
# 2. On-device voice and embedding host libraries (cache: ~/.cache/alpha/native-inputs).
stage embedding 10 pnpm -s agent:build-embedding-host || die "agent:build-embedding-host failed"
# 3. Workflow worker artifact (.eliza/workflow-worker).
stage worker 8 pnpm -s agent:build-workflow-worker || die "agent:build-workflow-worker failed"
# 4. Resident agent bundle (.eliza/agent-bundle).
stage bundle 10 pnpm -s agent:bundle || die "agent:bundle failed"
# 5. Stage Node runtime + bundle + worker into android/app/src/main/assets/agent (downloads the pinned Node archives).
stage stage 8 pnpm -s agent:stage-android || die "agent:stage-android failed"
# 6. Third-party notices regenerated with the packaged runtime.
stage licenses 6 pnpm -s licenses:packaged-runtime || die "licenses:packaged-runtime failed"
# 7. Web build, cap sync, Gradle (debug, instrumentation, release + R8), verify-apks, SBOM.
#    Called with node directly so `--release` cannot be lost in pnpm argument passing.
if ! stage gradle 10 node --conditions=eliza-source --import vibelang/register scripts/build-android.ts --release; then
  if [ "${ALLOW_POST_APK_FAILURE:-no}" = yes ] && [ -f "$ALPHA_DIR/artifacts/apk-manifest.json" ] \
     && [ "$(stat -c %Y "$ALPHA_DIR/artifacts/apk-manifest.json")" -ge "$START" ]; then
    echo "gradle stage failed AFTER verify-apks wrote a fresh apk-manifest.json; continuing because ALLOW_POST_APK_FAILURE=yes" | tee -a "$SUM"
  else
    die "android:build --release failed. If the log ends in generate-sbom.ts (BUN_ENTRY import, register row A-023) the APKs may already be verified: rerun with ALLOW_POST_APK_FAILURE=yes"
  fi
fi
# 8. Verify both artifacts again against this VERSION_CODE (the build already ran it once).
stage verify 6 pnpm -s android:verify || die "android:verify failed"

say "Checking artifacts/apk-manifest.json: one launcher flavor, debug and release rows"
python3 -I - "$ALPHA_DIR/artifacts" "$VERSION_CODE" <<'PY' | tee -a "$SUM"
import json, os, sys
d, vc = sys.argv[1], int(sys.argv[2])
m = json.load(open(os.path.join(d, 'apk-manifest.json')))
rows = m['results']
modes = sorted(r['mode'] for r in rows)
assert modes == ['debug', 'release'], f'expected a debug and a release row, got {modes}'
assert m['testMocks'] is False and m['applicationId'] == 'ai.alphacompute.alphaphone', 'wrong identity or test mocks'
assert m['version']['code'] == vc, f"manifest versionCode {m['version']['code']} != {vc}"
for r in rows:
    assert r['variant'] == 'launcher' and r['testMocks'] is False and r['bundleAudit'] == 'passed' and r.get('runtime') == 'PACKAGED', r['file']
    print(f"{r['mode']:8} {r['file']} sha256={r.get('sha256')} signed={r['signed']} versionCode={r['versionCode']}")
rel = next(r for r in rows if r['mode'] == 'release')
assert rel['signed'] is False and rel['file'].endswith('launcher-release-unsigned.apk'), 'the release must be the unsigned one (step 3 signs it)'
print('release distributable:', rel.get('distributable'), '(false is expected: unsigned, not the release signer)')
PY

say "Copying artifacts to $WORK"
cp --reflink=auto "$ALPHA_DIR/artifacts/launcher-release-unsigned.apk" "$WORK/v$VERSION_CODE-unsigned.apk"
cp --reflink=auto "$ALPHA_DIR/artifacts/launcher-debug.apk" "$WORK/v$VERSION_CODE-debug.apk"
cp "$ALPHA_DIR/artifacts/apk-manifest.json" "$ALPHA_DIR/artifacts/build-config.json" "$WORK/"
echo "done $(date +%T) seconds=$(( $(date +%s) - START ))" | tee -a "$SUM"; sync
echo "APK BUILD DONE: $WORK/v$VERSION_CODE-unsigned.apk (APK-build evidence only; not an install, image or device result)"
