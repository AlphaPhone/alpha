#!/bin/bash
cd /home/shaw/.cache/vibecut/alpha-area-inbox-calendar/apps/app
D=/home/shaw/.cache/vibecut/alpha-area-inbox-calendar
npx vitest run -c vitest.area.config.ts > $D/.vt.log 2>&1; echo "EXIT $?" >> $D/.vt.log
pnpm typecheck > $D/.tc.log 2>&1; echo "EXIT $?" >> $D/.tc.log
