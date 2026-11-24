#!/usr/bin/env bash
set -euo pipefail

git fetch --no-tags --no-recurse-submodules --depth=1 origin \
  '+refs/heads/main:refs/remotes/origin/main' \
  '+refs/heads/vibestack:refs/remotes/origin/vibestack'

state=$(node --input-type=module <<'JS'
import {releasePinStatus} from './scripts/android-build-preflight.ts';
import {pinnedCommit} from './scripts/upstream-pin.ts';
const root = process.cwd();
console.log(releasePinStatus(root, pinnedCommit(root)).state);
JS
)

case "$state" in
  unknown|shallow)
    if [[ $(git -C vendor/eliza rev-parse --is-shallow-repository) == true ]]; then
      pin=$(git -C vendor/eliza rev-parse HEAD)
      git -C vendor/eliza fetch --unshallow --no-tags --filter=blob:none origin "$pin"
    fi
    ;;
esac
