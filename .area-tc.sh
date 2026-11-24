#!/bin/bash
cd /home/shaw/.cache/vibecut/alpha-area-notes-files-workflows/apps/app-scratch
pnpm -s gen > ../../.gen-scratch.log 2>&1; echo "gen rc=$?" >> ../../.gen-scratch.log
pnpm -s typecheck > ../../.tc-scratch.log 2>&1; echo "tc rc=$?"
grep -E '^(src/(notes|files|workflows|web/(notes|files|workflows))|test/(notes|files|workflows|bombadil/(files|notes|workflows))|src/shell/compose/executors)' ../../.tc-scratch.log | grep -v warning > ../../.tc-mine.log
wc -l ../../.tc-mine.log
