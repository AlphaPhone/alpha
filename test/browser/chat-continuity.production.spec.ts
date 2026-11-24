import { test, expect, type Page } from '@playwright/test';
import { flagOffAndroid, harness, button, fenceNetwork, expectNoDevelopmentSurface, residentHome, openYourAgent } from './flag-off-android';
import { residentStub, stub, setStub } from './resident-stub';

const owner = { token: 'synthetic-cloud-key', userId: '9f1dc45a-4011-4e44-947a-30d999d24fa5', email: 'owner@example.invalid', balance: 5 };
const composer = (page: Page) => page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();
const conversation = (page: Page) => page.locator('[data-alpha-layer="conversation"]');
const UNKNOWN = 'Sorry, I couldn’t finish that reply.';
const home = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
const back = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('alpha-back', { cancelable: true })));

async function connected(page: Page, options: { clock?: boolean; abortRoute?: boolean } = {}) {
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page);
  await residentStub(page, { accounts: [owner], abortRoute: options.abortRoute });
  if (options.clock) await page.clock.install();
  await residentHome(page);
  return foreign;
}
const savedDrafts = (page: Page) => harness(page, f => Object.entries(f.slots as Record<string, string>).filter(([slot]) => slot.startsWith('assistant-draft:v1:')).map(([, raw]) => JSON.parse(raw).text as string));
const savedRows = (page: Page) => harness(page, f => Object.entries(f.slots as Record<string, string>).filter(([slot]) => slot.startsWith('assistant-draft:v1:')).map(([, raw]) => { const row = JSON.parse(raw); return { text: row.text as string, sending: row.sending === true }; }));
const keptRows = async (page: Page) => (await savedRows(page)).filter(row => row.text);
const UNSETTLED = 'This message may already have been sent. Check the conversation before sending it again.';
const REVIEW_UNSETTLED = 'Review the message that may already have been sent before sending another.';
const draftStatus = (page: Page) => page.getByRole('status', { name: 'Assistant draft status', exact: true });
const settle = async (page: Page) => {
  await conversation(page).evaluate(element => Promise.all(element.getAnimations({ subtree: true }).filter(animation => animation.timeline === document.timeline && Number.isFinite(animation.effect?.getTiming().iterations)).map(animation => animation.finished.catch(() => {}))));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const frames = (page: Page) => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function noResend(page: Page, foreign: string[], streams: number) {
  await frames(page);
  expect(await harness(page, f => f.streams)).toBe(streams);
  expect(await stub(page, s => s.recoveries)).toEqual([]);
  expect(await harness(page, f => f.unexpected)).toEqual([]);
  await expectNoDevelopmentSurface(page);
  expect(foreign).toEqual([]);
}

test('the device draft survives HOME, Back, a keyboard resize and rotation with its selection, and a restart, and nothing is sent', async ({ page }) => {
  test.setTimeout(150_000);
  const foreign = await connected(page);
  const text = 'Unsent words that must outlive every layout change';
  await composer(page).fill(text);
  await expect.poll(() => savedDrafts(page), { timeout: 15_000 }).toEqual([text]);

  await home(page);
  await expect(composer(page)).toHaveValue(text);
  await back(page);
  await expect(composer(page)).toHaveValue(text);
  await button(page, 'Open conversation').click();
  await expect(composer(page)).toHaveValue(text);
  await button(page, 'Expand chat').click();
  await expect(button(page, 'Shrink chat')).toBeVisible();
  await expect(composer(page)).toHaveValue(text);

  const field = composer(page), original = await field.elementHandle();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('alpha-keyboard-visibility', {detail: {visible: true}})));
  await field.evaluate((element: HTMLTextAreaElement) => { element.focus(); element.setSelectionRange(6, 11); });
  for (const viewport of [{ width: 412, height: 520 }, { width: 915, height: 300 }, { width: 412, height: 520 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    await expect(field).toHaveValue(text);
    await expect(field).toBeInViewport({ ratio: 1 });
    await expect(field).toBeFocused();
    expect(await field.evaluate((element, previous) => element === previous, original)).toBe(true);
    expect(await field.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd])).toEqual([6, 11]);
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('alpha-keyboard-visibility', {detail: {visible: false}})));
  await expect(field).not.toBeFocused();
  await field.click();
  await expect(field).toBeFocused();
  await expect(field).toHaveValue(text);
  await back(page);
  await expect(button(page, 'Expand chat')).toBeVisible();
  await expect(composer(page)).toHaveValue(text);
  await back(page);
  await expect(composer(page)).toHaveValue(text);
  expect(await savedDrafts(page)).toEqual([text]);

  await residentHome(page);
  await expect(composer(page)).toHaveValue(text, { timeout: 30_000 });
  expect(await savedDrafts(page)).toEqual([text]);
  expect(await harness(page, f => f.posts)).toEqual([]);
  await noResend(page, foreign, 0);
});

for (const step of ['Back from full to sheet', 'HOME on Home', 'a rotation and the keyboard'] as const) {
  test(`${step} during a resident reply keeps it: the reply appears once and nothing is resent`, async ({ page }) => {
    test.setTimeout(120_000);
    const foreign = await connected(page);
    await setStub(page, { stream: 'hold' });
    const asked = `Keep replying after ${step}`;
    await composer(page).fill(asked);
    await composer(page).press('Enter');
    await expect.poll(() => stub(page, s => typeof s.release), { timeout: 15_000 }).toBe('function');
    await expect(button(page, 'Stop reply')).toBeVisible();
    if (step === 'Back from full to sheet') {
      await button(page, 'Expand chat').click();
      await expect(button(page, 'Shrink chat')).toBeVisible();
      await back(page);
      await expect(button(page, 'Expand chat')).toBeVisible();
    } else if (step === 'HOME on Home') {
      await home(page);
      await expect(conversation(page)).toHaveAttribute('aria-hidden', 'true');
    } else {
      for (const viewport of [{ width: 915, height: 412 }, { width: 412, height: 520 }, { width: 412, height: 915 }]) {
        await page.setViewportSize(viewport);
        await expect(button(page, 'Stop reply')).toBeVisible();
      }
    }
    await stub(page, s => s.release());
    await expect(conversation(page).getByText('Held reply 1', { exact: true })).toHaveCount(1);
    await expect(conversation(page).getByText(asked, { exact: true })).toHaveCount(1);
    await expect(button(page, 'Stop reply')).toHaveCount(0);
    await expect(page.getByText(UNKNOWN, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Check saved conversation/ })).toHaveCount(0);
    await expect.poll(() => savedDrafts(page)).toEqual(['']);
    const posts = await harness(page, f => f.posts as string[]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toBe(asked);
    await noResend(page, foreign, 1);
  });
}

async function restartDuringSend(page: Page, asked: string) {
  const foreign = await connected(page);
  await composer(page).fill('Start the conversation');
  await composer(page).press('Enter');
  await expect(conversation(page).getByText('Resident reply 1', { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await expect(button(page, 'Stop reply')).toHaveCount(0);
  await setStub(page, { stream: 'hold' });
  await composer(page).fill(asked);
  await composer(page).press('Enter');
  await expect.poll(() => stub(page, s => typeof s.release), { timeout: 15_000 }).toBe('function');
  await expect.poll(() => keptRows(page)).toEqual([{ text: asked, sending: true }]);
  expect(await harness(page, f => f.posts)).toHaveLength(2);
  await setStub(page, { stream: null });
  await residentHome(page);
  await expect(draftStatus(page)).toHaveText(UNSETTLED, { timeout: 30_000 });
  await expect(composer(page)).toHaveValue('');
  await expect(page.getByText(`Saved: ${asked}`, { exact: true })).toBeVisible();
  await expect(button(page, 'Restore saved draft')).toBeInViewport({ratio:1});
  return foreign;
}

test('a restart during a send offers the message for review, never as a draft; restoring it makes it a draft again', async ({ page }) => {
  test.setTimeout(180_000);
  const asked = 'Sent just before the app stopped';
  const foreign = await restartDuringSend(page, asked);
  await button(page, 'Open conversation').click();
  await expect(conversation(page).getByText(asked, { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await composer(page).fill('A different question');
  await composer(page).press('Enter');
  await expect(page.getByText(REVIEW_UNSETTLED, { exact: true })).toBeVisible();
  expect(await harness(page, f => f.posts)).toEqual([]);
  expect(await keptRows(page)).toEqual([{ text: asked, sending: true }]);

  await button(page, 'Restore saved draft').click();
  await expect(composer(page)).toHaveValue(asked);
  await expect.poll(() => keptRows(page)).toEqual([{ text: asked, sending: false }]);
  await residentHome(page);
  await expect(composer(page)).toHaveValue(asked, { timeout: 30_000 });
  await expect(draftStatus(page)).toHaveCount(0);
  expect(await harness(page, f => f.posts)).toEqual([]);
  await noResend(page, foreign, 0);
});

test('replacing the reviewed message after a restart clears only its copy, and the next message is sent once', async ({ page }) => {
  test.setTimeout(180_000);
  const foreign = await restartDuringSend(page, 'Already answered before the restart');
  await button(page, 'Replace saved draft with this text').click();
  await expect(draftStatus(page)).toHaveCount(0);
  await expect.poll(() => keptRows(page)).toEqual([]);
  const next = 'The next question';
  await composer(page).fill(next);
  await composer(page).press('Enter');
  await expect.poll(() => harness(page, f => (f.posts as string[]).length), { timeout: 30_000 }).toBe(1);
  await expect(conversation(page).getByText(next, { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await expect(button(page, 'Stop reply')).toHaveCount(0, { timeout: 30_000 });
  const posts = await harness(page, f => f.posts as string[]);
  expect(posts).toHaveLength(1);
  expect(posts[0]).toBe(next);
  await expect.poll(() => keptRows(page)).toEqual([]);
  await noResend(page, foreign, 1);
});

test('a restart during a new chat\'s first message offers it for review on the conversation it created', async ({ page }) => {
  test.setTimeout(180_000);
  const foreign = await connected(page);
  const asked = 'First message just before the app stopped';
  await setStub(page, { stream: 'hold' });
  await composer(page).fill(asked);
  await composer(page).press('Enter');
  await expect.poll(() => stub(page, s => typeof s.release), { timeout: 15_000 }).toBe('function');
  await expect.poll(() => keptRows(page)).toEqual([{ text: asked, sending: true }]);
  expect(await harness(page, f => f.posts)).toHaveLength(1);
  await setStub(page, { stream: null });
  await residentHome(page);
  await expect(draftStatus(page)).toHaveText(UNSETTLED, { timeout: 30_000 });
  await expect(composer(page)).toHaveValue('');
  await expect(page.getByText(`Saved: ${asked}`, { exact: true })).toBeVisible();
  await expect(button(page, 'Restore saved draft')).toBeInViewport({ratio:1});
  await composer(page).fill('A different question');
  await composer(page).press('Enter');
  await expect(page.getByText(REVIEW_UNSETTLED, { exact: true })).toBeVisible();
  expect(await harness(page, f => f.posts)).toEqual([]);
  await composer(page).fill('');
  await button(page, 'Replace saved draft with this text').click();
  await expect(draftStatus(page)).toHaveCount(0);
  await expect.poll(() => keptRows(page)).toEqual([]);
  expect(await harness(page, f => f.posts)).toEqual([]);
  await noResend(page, foreign, 0);
});

test('the transcript keeps its reading position through a keyboard resize, Back from full and HOME, and follows the newest message at the bottom', async ({ page }) => {
  test.setTimeout(180_000);
  const foreign = await connected(page);
  await composer(page).fill('Start a long conversation');
  await composer(page).press('Enter');
  await expect(conversation(page).getByText('Resident reply 1', { exact: true })).toHaveCount(1);
  await page.evaluate(() => {
    const agent = JSON.parse(sessionStorage.getItem('resident-stub-agent') || 'null'), id = agent.conversations[0].id;
    const older = Array.from({ length: 60 }, (_, index) => ({ id: crypto.randomUUID(), role: index % 2 ? 'assistant' : 'user', text: `Historical ${index}: synthetic text for scroll continuity. More text stays on this message.`, timestamp: 1_000 + index }));
    agent.history[id] = [...older, ...agent.history[id]];
    sessionStorage.setItem('resident-stub-agent', JSON.stringify(agent));
  });
  await residentHome(page);
  await button(page, 'Open conversation').click();
  const transcript = page.locator('[data-alpha-transcript]');
  await expect(transcript.locator('[data-alpha-message-id]')).toHaveCount(62, { timeout: 30_000 });
  await button(page, 'Expand chat').click();
  await expect(button(page, 'Shrink chat')).toBeVisible();
  await settle(page);

  const offset = (id: string) => transcript.evaluate((element, id) => element.querySelector(`[data-alpha-message-id="${id}"]`)!.getBoundingClientRect().top - element.getBoundingClientRect().top, id);
  const fromBottom = () => transcript.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop);
  const steps: Array<[string, () => Promise<unknown>]> = [
    ['keyboard resize', async () => { await page.setViewportSize({ width: 412, height: 520 }); await settle(page); }],
    ['keyboard closed', async () => { await page.setViewportSize({ width: 412, height: 915 }); await settle(page); }],
    ['Back from full', async () => { await back(page); await expect(button(page, 'Expand chat')).toBeVisible(); await settle(page); }],
    ['HOME then reopen', async () => { await home(page); await expect(conversation(page)).toHaveAttribute('aria-hidden', 'true'); await settle(page); await button(page, 'Open conversation').click(); await expect(conversation(page)).not.toHaveAttribute('aria-hidden', 'true'); await settle(page); }],
  ];
  const before = await transcript.evaluate(element => {
    element.scrollTop = element.scrollHeight / 3;
    const top = element.getBoundingClientRect().top;
    const anchor = Array.from(element.querySelectorAll('[data-alpha-message-id]')).find(row => row.getBoundingClientRect().bottom > top)!;
    return { id: anchor.getAttribute('data-alpha-message-id')!, y: anchor.getBoundingClientRect().top - top };
  });
  for (const [name, step] of steps) { await step(); expect(Math.abs(await offset(before.id) - before.y), name).toBeLessThan(2); }
  await button(page, 'Expand chat').click();
  await settle(page);
  await transcript.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await settle(page);
  for (const [name, step] of steps) { await step(); expect(await fromBottom(), name).toBeLessThan(2); }
  await noResend(page, foreign, 0);
});

const MAY_FINISH = 'May still finish';
const LOAD_TO_SEE = 'Outcome unknown';
const pastStopCheck = (page: Page) => page.clock.runFor(16_000);
async function heldSend(page: Page, text: string) {
  await setStub(page, { stream: 'hold' });
  await composer(page).fill(text);
  await composer(page).press('Enter');
  await expect.poll(() => stub(page, s => typeof s.release), { timeout: 15_000 }).toBe('function');
}
async function finishAfterStop(page: Page) {
  await stub(page, s => s.release());
  await expect.poll(() => stub(page, s => s.release === null && s.held === null)).toBe(true);
  await frames(page);
}
async function stopReply(page: Page) {
  const lists = await stub(page, s => s.lists);
  await button(page, 'Stop reply').click();
  await expect(conversation(page).getByText(MAY_FINISH, { exact: true })).toBeVisible();
  await expect(button(page, 'Stop reply')).toHaveCount(0);
  await expect.poll(() => stub(page, s => s.lists)).toBeGreaterThan(lists);
}
const conversationCount = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('resident-stub-agent') || 'null')?.conversations.length ?? 0);

test('Stop says the agent may still finish, discards the late reply and reconciles once without resending', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await connected(page, { clock: true });
  const asked = 'Please finish anyway';
  await heldSend(page, asked);
  const reads = await stub(page, s => s.reads);
  await stopReply(page);
  await expect(page.getByText(UNKNOWN, { exact: true })).toHaveCount(0);
  await expect(composer(page)).toHaveValue('');
  await expect.poll(() => savedDrafts(page)).toEqual(['']);
  await finishAfterStop(page);
  await expect(conversation(page).getByText('Held reply 1', { exact: true })).toHaveCount(0);
  expect(await stub(page, s => s.reads)).toBe(reads);
  await pastStopCheck(page);
  await expect(conversation(page).getByText('Held reply 1', { exact: true })).toHaveCount(1);
  await expect(conversation(page).getByText(MAY_FINISH, { exact: true })).toHaveCount(0);
  await expect(conversation(page).getByText(asked, { exact: true })).toHaveCount(1);
  expect(await stub(page, s => s.reads)).toBe(reads + 1);
  expect(await harness(page, f => f.posts)).toEqual([asked]);
  await noResend(page, foreign, 1);
});

test('a message is sent even when the local draft copy cannot be saved', async ({ page }) => {
  test.setTimeout(90_000);
  const foreign = await connected(page);
  await harness(page, f => { f.draftSlotsFail = true; });
  const asked = 'Send without a saved copy';
  await composer(page).fill(asked);
  await composer(page).press('Enter');
  await expect.poll(() => harness(page, f => f.posts), { timeout: 30_000 }).toEqual([asked]);
  await expect(conversation(page).getByText(asked, { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByText('Review local draft storage before sending.', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Nothing was sent/)).toHaveCount(0);
  await noResend(page, foreign, 1);
});

test('a refused send without a saved copy goes back ahead of text typed while it was pending', async ({ page }) => {
  test.setTimeout(90_000);
  await connected(page);
  await harness(page, f => { f.draftSlotsFail = true; });
  await setStub(page, { stream: 'busyHeld' });
  await composer(page).fill('First question');
  await composer(page).press('Enter');
  await expect.poll(() => stub(page, s => typeof s.release), { timeout: 30_000 }).toBe('function');
  await expect(composer(page)).toHaveValue('');
  await composer(page).fill('Typed meanwhile');
  await stub(page, s => s.release());
  await expect(composer(page)).toHaveValue('First question\nTyped meanwhile', { timeout: 15_000 });
  expect(await harness(page, f => f.posts)).toEqual([]);
  await expect(conversation(page).getByText('First question', { exact: true })).toHaveCount(0);
});

test('a refused send without a saved copy never restores into another conversation', async ({ page }) => {
  await connected(page);
  await harness(page, f => { f.draftSlotsFail = true; });
  await setStub(page, { stream: 'busyHeld' });
  await composer(page).fill('Keep this with the original conversation');
  await composer(page).press('Enter');
  await expect.poll(() => stub(page, s => typeof s.release)).toBe('function');
  const panel=await openYourAgent(page);
  await panel.getByRole('button',{name:'New conversation',exact:true}).click();
  await composer(page).fill('Different conversation text');
  await stub(page, s => s.release?.());
  await frames(page);
  await expect(composer(page)).toHaveValue('Different conversation text');
  expect(await harness(page, f => f.posts)).toEqual([]);
});

test('a refused new-chat send without a saved copy never lands in a conversation chosen meanwhile', async ({ page }) => {
  test.setTimeout(90_000);
  await connected(page);
  await harness(page, f => { f.draftSlotsFail = true; });
  await setStub(page, { stream: 'busyHeld' });
  await composer(page).fill('First question');
  await composer(page).press('Enter');
  await expect.poll(() => stub(page, s => typeof s.release), { timeout: 30_000 }).toBe('function');
  const conversations = await conversationCount(page);
  const panel = await openYourAgent(page);
  await panel.getByRole('button', { name: 'New conversation', exact: true }).click();
  await expect.poll(() => conversationCount(page), { timeout: 15_000 }).toBe(conversations + 1);
  await stub(page, s => s.release());
  await page.waitForTimeout(1_500);
  await expect(composer(page)).toHaveValue('');
  expect(await harness(page, f => f.posts)).toEqual([]);
});

test('pressing Send twice dispatches one message', async ({ page }) => {
  test.setTimeout(90_000);
  const foreign = await connected(page);
  const asked = 'Only once please';
  await setStub(page, { stream: 'hold' });
  await composer(page).fill(asked);
  await expect.poll(() => savedDrafts(page), { timeout: 15_000 }).toEqual([asked]);
  await composer(page).focus();
  await Promise.all([page.keyboard.press('Enter'), page.keyboard.press('Enter')]);
  await expect.poll(() => stub(page, s => typeof s.release), { timeout: 15_000 }).toBe('function');
  await expect(page.getByText('Review local draft storage before sending.', { exact: true })).toHaveCount(0);
  await stub(page, s => s.release());
  await expect(conversation(page).getByText('Held reply 1', { exact: true })).toHaveCount(1);
  await expect(conversation(page).getByText(asked, { exact: true })).toHaveCount(1);
  expect(await harness(page, f => f.posts)).toEqual([asked]);
  await noResend(page, foreign, 1);
});

test('a new message after Stop retires the pending check and stale notice; nothing is resent', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await connected(page, { clock: true });
  await heldSend(page, 'First question');
  const reads = await stub(page, s => s.reads);
  await stopReply(page);
  await setStub(page, { stream: null });
  await composer(page).fill('Second question');
  await composer(page).press('Enter');
  await expect(conversation(page).getByText('Resident reply 2', { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await expect(conversation(page).getByText(MAY_FINISH, { exact: true })).toHaveCount(0);
  await expect(conversation(page).getByText(LOAD_TO_SEE, { exact: true })).toHaveCount(0);
  await pastStopCheck(page);
  await frames(page);
  expect(await stub(page, s => s.reads)).toBe(reads);
  await expect(conversation(page).getByText('First question', { exact: true })).toHaveCount(1);
  expect(await harness(page, f => f.posts)).toEqual(['First question', 'Second question']);
  const ids = await stub(page, s => (s.bodies as any[]).map(body => body.clientMessageId));
  expect(new Set(ids).size).toBe(2);
  await noResend(page, foreign, 2);
});

test('a refused new message after Stop keeps the earlier unknown outcome', async ({ page }) => {
  const foreign = await connected(page, { clock: true });
  await heldSend(page, 'First question');
  await stopReply(page);
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
  await composer(page).fill('Second question');
  await composer(page).press('Enter');
  await expect(conversation(page).getByText(LOAD_TO_SEE, { exact: true })).toHaveCount(1);
  await expect(composer(page)).toHaveValue('Second question');
  expect(await harness(page, f => f.posts)).toEqual(['First question']);
  await noResend(page, foreign, 1);
});

test('selecting an earlier chat after Stop retires the check and keeps the late reply in its original chat', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await connected(page, { clock: true });
  const asked = 'Asked in the first conversation';
  await heldSend(page, asked);
  const reads = await stub(page, s => s.reads);
  await stopReply(page);
  const target=await stub(page,s=>s.seedConversation('retained-chat','Earlier conversation marker'));
  await button(page,'Chat actions').click();
  await button(page,'Search chat').click();
  const search=page.getByRole('dialog',{name:'Search chats',exact:true});
  await search.getByRole('textbox',{name:'Search messages',exact:true}).fill('conversation marker');
  await search.getByRole('button',{name:/Earlier conversation marker/}).click();
  await expect(search).toHaveCount(0);
  await expect(conversation(page).getByText('Earlier conversation marker',{exact:true})).toBeVisible();
  expect(await stub(page,s=>s.chatSearchQueries)).toEqual(['conversation marker']);
  expect(await stub(page,s=>s.chatSearchWindows)).toEqual([{conversationId:'retained-chat',messageId:target}]);
  expect(await conversationCount(page)).toBe(2);
  await finishAfterStop(page);
  await pastStopCheck(page);
  await frames(page);
  expect(await stub(page, s => s.reads)).toBe(reads);
  await home(page);
  await button(page, 'Open conversation').click();
  await expect(conversation(page)).not.toHaveAttribute('aria-hidden', 'true');
  await frames(page);
  for (const text of ['Held reply 1', asked, MAY_FINISH]) await expect(conversation(page).getByText(text, { exact: true })).toHaveCount(0);
  expect(await harness(page, f => f.posts)).toEqual([asked]);
  await noResend(page, foreign, 1);
});

test('HOME from another app during a reply is a Stop: one cancel, the reconciliation statement, and no resend', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await connected(page, { clock: true, abortRoute: true });
  await button(page, 'Notes').click();
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'notes');
  if (!await composer(page).isVisible()) await button(page, 'Open conversation').click();
  const asked = 'Asked from Notes';
  await heldSend(page, asked);
  const reads = await stub(page, s => s.reads);
  await home(page);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  await button(page, 'Open conversation').click();
  await expect(conversation(page).getByText(MAY_FINISH, { exact: true })).toBeVisible();
  await expect(button(page, 'Stop reply')).toHaveCount(0);
  await expect.poll(() => stub(page, s => s.aborts)).toBe(1);
  await finishAfterStop(page);
  await expect(conversation(page).getByText('Held reply 1', { exact: true })).toHaveCount(0);
  expect(await stub(page, s => s.reads)).toBe(reads);
  await pastStopCheck(page);
  await expect(conversation(page).getByText('Held reply 1', { exact: true })).toHaveCount(1);
  await expect(conversation(page).getByText(asked, { exact: true })).toHaveCount(1);
  expect(await stub(page, s => ({ reads: s.reads, aborts: s.aborts }))).toEqual({ reads: reads + 1, aborts: 1 });
  expect(await harness(page, f => f.posts)).toEqual([asked]);
  await noResend(page, foreign, 1);
});

test('a check overtaken by another connection operation says so instead of promising a check forever', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await connected(page, { clock: true });
  await heldSend(page, 'Overtaken check');
  const reads = await stub(page, s => s.reads);
  await stopReply(page);
  await setStub(page, { holdReads: true });
  await pastStopCheck(page);
  await expect.poll(() => stub(page, s => s.reads), { timeout: 15_000 }).toBe(reads + 1);
  const lists = await stub(page, s => s.lists);
  const panel = await openYourAgent(page);
  await panel.getByRole('button', { name: 'Load conversations', exact: true }).click();
  await expect.poll(() => stub(page, s => s.lists), { timeout: 15_000 }).toBeGreaterThan(lists);
  await stub(page, s => { s.holdReads = false; s.heldRead(); });
  await frames(page);
  await stub(page, s => s.heldList?.());
  await home(page);
  await button(page, 'Open conversation').click();
  await expect(conversation(page).getByText(LOAD_TO_SEE, { exact: true })).toHaveCount(1, { timeout: 15_000 });
  await expect(conversation(page).getByText(MAY_FINISH, { exact: true })).toHaveCount(0);
  expect(await stub(page, s => s.reads)).toBe(reads + 1);
  expect(await harness(page, f => f.posts)).toEqual(['Overtaken check']);
  await noResend(page, foreign, 1);
});
