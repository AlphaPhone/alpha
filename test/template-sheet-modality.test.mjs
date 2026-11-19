// A bottom sheet drawn over a full-screen scrim in the phone template is modal: the scrim covers
// everything behind it, so the sheet says so (aria-modal) and the screen-focus, toast, dock and
// listening rules that look for an open modal treat it as one. Menus without a scrim stay non-modal.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const lines = readFileSync(new URL('../apps/app/src/prototype/template.html', import.meta.url), 'utf8').split('\n');
/** A full-screen button that closes the sheet in front of it. */
const scrim = line => /^\s*<button\b/.test(line) && /aria-label="Close\b/.test(line) && /inset:\s*0/.test(line) && /background:\s*(var\(--scrim\)|rgba\(0,\s*0,\s*0,)/.test(line);

test('every sheet over a scrim is an aria-modal dialog', () => {
  const sheets = [], missing = [], unowned = [];
  lines.forEach((line, index) => {
    if (!/role="dialog"/.test(line)) return;
    let previous = index - 1;
    while (previous >= 0 && !lines[previous].trim()) previous--;
    if (previous < 0 || !scrim(lines[previous])) return;
    const label = line.match(/aria-label="([^"]+)"/)?.[1] ?? `line ${index + 1}`;
    sheets.push(label);
    if (!/role="dialog"[^>]*aria-modal="true"|aria-modal="true"[^>]*role="dialog"/.test(line)) missing.push(label);
    // The shell sends Back to an open aria-modal panel as a cancel event, which only an inline modal
    // (a ref wrapper such as those registered in subview-accessibility.ts) answers. Without one, Back does nothing.
    let owner = previous - 1;
    while (owner >= 0 && !lines[owner].trim()) owner--;
    if (owner < 0 || !/^\s*<div ref="\{\{[\w.]+\}\}"/.test(lines[owner])) unowned.push(label);
  });
  assert.ok(sheets.length >= 8, `found ${sheets.length} sheets over a scrim`);
  for (const label of ['Reply', 'Share page', 'Share photo', 'Move to', 'Share file', 'Step editor']) assert.ok(sheets.includes(label), label);
  assert.deepEqual(missing, []);
  assert.deepEqual(unowned, [], 'each modal sheet and its scrim sit inside an inline-modal ref');
});
