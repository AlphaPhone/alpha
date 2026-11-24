// PROD-03 on the flag-off production renderer: a chat card whose action belongs to a reference view
// (native-adapter.ts replaces those actions with one that only says "Unavailable") shows its content
// but offers no control for the action, and is never marked done. A card whose action is this
// phone's own (Notes) still offers it.
//
// Evidence boundary: the shipped renderer with the cards placed in the transcript directly and the
// Android bridge stubbed (flag-off-android.ts); it does not show which replies produce such cards.
import {test, expect, type Page} from '@playwright/test';
import {flagOffAndroid, fenceNetwork, residentHome} from './flag-off-android';
import {residentStub} from './resident-stub';

const shell = (page: Page, run: string) => page.evaluate(`(() => {
  const screen = document.querySelector('[data-screen]'), key = Object.keys(screen).find(name => name.startsWith('__reactFiber$'));
  let fiber = screen[key];
  while (fiber && !(fiber.stateNode && typeof fiber.stateNode.S === 'function' && typeof fiber.stateNode.cardAct === 'function')) fiber = fiber.return;
  return (${run})(fiber.stateNode);
})()`);

test('a chat card offers no control for an action that could only say it is unavailable', async ({page}) => {
  test.setTimeout(120_000);
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page);
  await residentStub(page);
  await residentHome(page);
  await shell(page, `shell => {
    const seen = window.__toasts = [], toast = shell.toast;
    shell.toast = function (message, ...rest) { seen.push(String(message)); return toast.call(this, message, ...rest); };
    shell.setState({chat: 'sheet', msgs: shell.S().msgs.concat([
      {id: 9001, from: 'agent', text: 'Reference draft', card: {type: 'draft', to: 'Maya Chen', subject: 'Re: Plans', body: 'Running ten minutes late.', act: {mod: 'inbox', fn: 'sendDraft'}}},
      {id: 9002, from: 'agent', text: 'Own summary', card: {type: 'summary', bullets: ['Bring the slides'], act: {mod: 'notes', fn: 'save'}}},
      {id: 9003, from: 'agent', text: 'Reference summary', card: {type: 'summary', bullets: ['Book a table'], act: {mod: 'calendar', fn: 'savePrep'}}},
      {id: 9004, from: 'agent', text: 'Reference proposal', card: {type: 'proposal', kind: 'screen', state: 'open', title: 'Screen it', detail: 'Incoming call', button: 'Screen it', acts: true, act: {mod: 'phone', fn: 'screenIncoming'}, args: {ring: 'r1'}}},
    ])});
  }`);
  const draft = page.locator('[data-alpha-message-id="9001"]');
  await expect(draft.getByText('Running ten minutes late.', {exact: true})).toBeVisible();
  await expect(draft.getByRole('button', {name: 'Send', exact: true})).toHaveCount(0);
  await expect(draft.getByRole('button', {name: 'Edit draft', exact: true})).toHaveCount(0);
  // The Calendar summary's Save could only say Unavailable; the Notes summary's Save is real.
  await expect(page.locator('[data-alpha-message-id="9003"]').getByText('Book a table', {exact: true})).toBeVisible();
  await expect(page.locator('[data-alpha-message-id="9003"]').getByRole('button')).toHaveCount(0);
  await expect(page.locator('[data-alpha-message-id="9002"]').getByRole('button', {name: 'Save to Notes', exact: true})).toBeVisible();
  // A view's own proposal goes to the shell's dispatcher; its button would only say Unavailable.
  await expect(page.locator('[data-alpha-message-id="9004"]').getByText('Incoming call', {exact: true})).toBeVisible();
  await expect(page.locator('[data-alpha-message-id="9004"]').getByRole('button')).toHaveCount(0);
  // Reached any other way (the composer's edited-draft send), the card is not marked done.
  const done = await shell(page, `shell => { shell.cardAct(shell.S().msgs.find(x => x.id === 9001)); return !!shell.S().msgs.find(x => x.id === 9001).card.done; }`);
  expect(done).toBe(false);
  expect((await page.evaluate(() => (window as any).__toasts as string[])).filter(text => text !== 'Unavailable')).toEqual([]);
  expect(foreign).toEqual([]);
});
