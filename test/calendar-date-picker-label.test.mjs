// CAL-17: the Calendar title button opens a date picker, so it is named for that, not for a month view
// the phone does not have. The focus return in calendar-month-focus.ts finds the button by the same name.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the Calendar title button is named Choose date and focus returns to it by that name',()=>{
  const template=readFileSync('apps/app/src/prototype/template.html','utf8'),focus=readFileSync('apps/app/src/prototype/calendar-month-focus.ts','utf8');
  assert.match(template,/<button onClick="\{\{calendar\.toggleMonth\}\}" aria-label="Choose date"/);
  assert.doesNotMatch(template,/aria-label="Month view"/);
  assert.match(focus,/button\[aria-label="Choose date"\]/);
});
