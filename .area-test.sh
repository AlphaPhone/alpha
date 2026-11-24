#!/bin/bash
cd /home/shaw/.cache/vibecut/alpha-area-notes-files-workflows/apps/app-scratch
pnpm exec vitest run test/notes test/files test/workflows > ../../.test-area.log 2>&1; echo "test rc=$?"
grep -E "✓|×|FAIL|Test Files|Tests " ../../.test-area.log | tail -60
