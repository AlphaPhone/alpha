#!/bin/bash
cd /home/shaw/.cache/vibecut/alpha-area-inbox-calendar/apps/app
D=/home/shaw/.cache/vibecut/alpha-area-inbox-calendar
true > $D/.gen.log; echo "EXIT 0" >> $D/.gen.log
pnpm typecheck > $D/.tc.log 2>&1; echo "EXIT $?" >> $D/.tc.log
