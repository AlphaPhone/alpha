#!/bin/bash
cd /home/shaw/.cache/vibecut/alpha-area-notes-files-workflows/apps/app-integ
pnpm -s gen > ../../.integ-gen.log 2>&1; echo "gen rc=$?"
pnpm -s typecheck > ../../.integ-tc.log 2>&1; echo "tc rc=$? errors=$(grep -c ': error ' ../../.integ-tc.log)"
grep -E '^(src/(notes|files|workflows|web/(notes|files|workflows))|test/(notes|files|workflows))' ../../.integ-tc.log | grep ': error ' > ../../.integ-tc-mine.log; echo "area errors=$(wc -l < ../../.integ-tc-mine.log)"
pnpm exec vitest run test/notes test/files test/workflows > ../../.integ-test.log 2>&1; echo "test rc=$?"
