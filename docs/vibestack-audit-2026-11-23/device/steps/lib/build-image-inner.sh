#!/usr/bin/env bash
# build-image-inner.sh <versionCode> <log file> [GOMEMLIMIT, default 8GiB] [jobs, default 4]
# The image recipe of /home/shaw/Android/pixel10a-preparation/build-v631/build-image.sh (template: build-v99),
# with the log path and Go memory limit as arguments. Started by 05-image.sh through heavy.sh; never run it bare.
# It always exits 0: the result is the `exit=N` line in the log.
set -euo pipefail
N=$1; LOG=$2; MEMLIMIT=${3:-8GiB}; JOBS=${4:-4}
cd /home/shaw/Android/pixel10a-preparation/eliza-source
# A new BUILD_NUMBER gives a new fingerprint; with an unchanged fingerprint PackageManager keeps stale package-cache metadata.
export BUILD_NUMBER=alpha.v$N OUT_DIR=out ANDROID_QUIET_BUILD=true
export SISO_EXPERIMENTS=ignore-missing-targets GOMAXPROCS=4 GOMEMLIMIT=$MEMLIMIT NINJA_HIGHMEM_NUM_JOBS=1
unset NINJA_ARGS NINJA_EXTRA_ARGS
set +u; source build/envsetup.sh; lunch alpha_stallion_phone-cp2a-userdebug; set -u
start=$(date +%s)
{ m -j"$JOBS" droid && m -j"$JOBS" target-files-package updatepackage; echo "exit=$?"; } > "$LOG" 2>&1 || echo "exit=$?" >> "$LOG"
echo "seconds=$(( $(date +%s) - start ))" >> "$LOG"
