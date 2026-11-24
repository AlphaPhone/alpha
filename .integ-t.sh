#!/bin/bash
cd /home/shaw/.cache/vibecut/alpha-area-notes-files-workflows/apps/app-integ
pnpm exec vitest run test/notes test/workflows > ../../.integ-test.log 2>&1; echo "test rc=$?"
