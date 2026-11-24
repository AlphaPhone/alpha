#!/bin/bash
# gen, typecheck and the area's tests in one heavy slot
cd /home/shaw/.cache/vibecut/alpha-area-inbox-calendar/apps/app
D=/home/shaw/.cache/vibecut/alpha-area-inbox-calendar
pnpm gen > $D/.gen.log 2>&1; echo "EXIT $?" >> $D/.gen.log
pnpm typecheck > $D/.tc.log 2>&1; echo "EXIT $?" >> $D/.tc.log
npx vitest run --project node test/inbox test/calendar > $D/.vt.log 2>&1; echo "EXIT $?" >> $D/.vt.log
echo done > $D/.area-check.done
