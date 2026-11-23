import { expect, test, type Page } from '@playwright/test';
import {
  button,
  fenceNetwork,
  flagOffAndroid,
  harness,
  residentHome,
} from './flag-off-android';

import { openRetainedNativeNotes } from './helpers/native-notes';

for (const decision of [
  'send',
  'discard',
  'restore',
  'rejected',
  'uncertain',
  'revoked',
] as const)
  test(
    'a draft from Notes uses its reviewed recipient and contents on ' +
      decision,
    async ({ page }) => {
      const foreign = await fenceNetwork(page);
      await flagOffAndroid(page, {
        accounts: [
          {
            connectionId: 'owned-grant',
            email: 'owner@example.invalid',
            connected: true,
            messages: [],
          },
        ],
        emailDraft: {
          to: decision === 'discard' ? ['self'] : ['crew@example.invalid'],
          subject: 'Tomorrow’s shoot',
          body: 'Bring the tripod.',
        },
      });
      await residentHome(page);
      await openRetainedNativeNotes(page);
      await button(page, 'Open conversation').click();
      const composer = page.getByRole('textbox', {
        name: 'Message Alpha',
        exact: true,
      });
      await composer.fill('Draft an email to myself with the shoot plan.');
      await composer.press('Enter');
      const draft = page.getByRole('region', {
        name: 'Email draft',
        exact: true,
      });
      await expect(
        draft.getByRole('textbox', { name: 'Email recipients' }),
      ).toHaveValue(
        decision === 'discard'
          ? 'owner@example.invalid'
          : 'crew@example.invalid',
        { timeout: 15000 },
      );
      await expect(
        draft.getByRole('textbox', { name: 'Email subject' }),
      ).toHaveValue('Tomorrow’s shoot');
      await expect(
        page.getByRole('button', { name: 'Use in email' }),
      ).toHaveCount(0);
      if (decision === 'send')
        await page.screenshot({
          path: test.info().outputPath('in-chat-email.png'),
          animations: 'disabled',
        });
      await draft
        .getByRole('textbox', { name: 'Email recipients' })
        .fill('owner@example.invalid');
      await draft
        .getByRole('textbox', { name: 'Email body' })
        .fill('Please bring the blue notebook.');
      expect(
        await harness(page, (f) => [
          f.mail.prepares.length,
          f.mail.dispatches.length,
        ]),
      ).toEqual([0, 0]);
      if (decision === 'discard') {
        await draft.getByRole('button', { name: 'Don’t send' }).click();
        await expect(draft.getByRole('status')).toHaveText('Not sent.');
        await expect(draft).toContainText('Please bring the blue notebook.');
        await expect(draft.getByRole('button', { name: 'Send email' })).toHaveCount(0);
        expect(
          await harness(page, (f) => [
            f.mail.prepares.length,
            f.mail.dispatches.length,
          ]),
        ).toEqual([0, 0]);
        await page.reload();
        await residentHome(page);
        await button(page, 'Open conversation').click();
        await expect(draft.getByRole('status')).toHaveText('Not sent.');
        await expect(draft).toContainText('Please bring the blue notebook.');
        await expect(draft.getByRole('button', { name: 'Send email' })).toHaveCount(0);
        expect(await harness(page, (f) => f.mail.dispatches.length)).toBe(0);
      } else if (decision === 'restore') {
        await composer.fill('Draft a second email about the shoot plan.');
        await composer.press('Enter');
        await expect(draft).toHaveCount(2);
        await page.reload();
        await residentHome(page);
        await button(page, 'Open conversation').click();
        await expect(draft).toHaveCount(2);
        await expect(draft.first().getByRole('textbox', { name: 'Email body' })).toHaveValue('Please bring the blue notebook.');
        await expect(draft.last().getByRole('textbox', { name: 'Email body' })).toHaveValue('Bring the tripod.');
        expect(await harness(page, (f) => [f.mail.prepares.length, f.mail.dispatches.length])).toEqual([0, 0]);
      } else if (decision === 'revoked') {
        await harness(page, (f) => {
          f.mail.accounts[0].connected = false;
        });
        await draft.getByRole('button', { name: 'Send email' }).click();
        await expect(draft.getByRole('status')).toContainText(
          /Gmail no longer allows this change/,
        );
        expect(await harness(page, (f) => f.mail.dispatches.length)).toBe(0);
      } else if (decision === 'rejected' || decision === 'uncertain') {
        await page.evaluate(
          (outcome) => {
            (window as any).flagOff.mail.sendOutcome = outcome;
          },
          decision === 'rejected' ? 'rejected' : 'outcome-unknown',
        );
        await draft.getByRole('button', { name: 'Send email' }).dblclick();
        await expect(draft.getByRole('status')).toContainText(
          decision === 'rejected'
            ? 'Gmail rejected'
            : 'Delivery is unconfirmed',
        );
        await expect(
          draft.getByRole('button', { name: 'Send email' }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('dialog', { name: 'Review mail operation' }),
        ).toHaveCount(0);
        expect(await harness(page, (f) => f.mail.dispatches.length)).toBe(1);
      } else {
        await draft.getByRole('button', { name: 'Send email' }).dblclick();
        await expect(draft.getByRole('status')).toHaveText('Sent.');
        await expect(
          page.getByRole('dialog', { name: 'Review mail operation' }),
        ).toHaveCount(0);
        const proof = await harness(page, (f) => ({
          prepares: f.mail.prepares,
          dispatches: f.mail.dispatches,
          sent: f.mail.sent,
        }));
        expect(proof.prepares).toHaveLength(1);
        expect(proof.dispatches).toHaveLength(1);
        expect(proof.sent).toEqual([
          'Tomorrow’s shoot | Please bring the blue notebook.',
        ]);
        expect(proof.prepares[0].to).toEqual(['owner@example.invalid']);
        await composer.fill('Open Inbox.');
        await composer.press('Enter');
        await expect(page.locator('html')).toHaveAttribute(
          'data-active-view',
          'inbox',
        );
        await expect(
          page.getByRole('button').filter({
            has: page.getByText('Tomorrow’s shoot', { exact: true }),
          }),
        ).toBeVisible();
      }
      expect(foreign).toEqual([]);
    },
  );

const crew = [
  'lighting.crew@example.invalid',
  'camera.operator@example.invalid',
  'location.manager@example.invalid',
];
// What the owner leaves on screen after the edits below, and so what Send must store and dispatch.
const shown = {
  to: [...crew, 'owner@example.invalid'],
  subject: 'Tomorrow’s shoot',
  bodyText: 'Bring the tripod. And the blue notebook.',
};
/** The chat draft cards as written to their encrypted slot. */
const storedCards = (page: Page) =>
  harness(page, (f) =>
    Object.entries(f.slots as Record<string, string>)
      .filter(([slot]) => slot.startsWith('inbox-drafts:v1:chat:'))
      .flatMap(([, raw]) => JSON.parse(raw) as Record<string, unknown>[]),
  );

/** Opens the agent's three-recipient draft, then types one more recipient and a body line. */
async function editCrewDraft(page: Page) {
  await flagOffAndroid(page, {
    accounts: [
      {
        connectionId: 'owned-grant',
        email: 'owner@example.invalid',
        connected: true,
        messages: [],
      },
    ],
    emailDraft: { to: crew, subject: 'Tomorrow’s shoot', body: 'Bring the tripod.' },
  });
  await residentHome(page);
  await openRetainedNativeNotes(page);
  await button(page, 'Open conversation').click();
  const composer = page.getByRole('textbox', { name: 'Message Alpha', exact: true });
  await composer.fill('Draft an email to the crew with the shoot plan.');
  await composer.press('Enter');
  const draft = page.getByRole('region', { name: 'Email draft', exact: true });
  const to = draft.getByRole('textbox', { name: 'Email recipients' });
  await expect(to).toHaveValue(crew.join(', '), { timeout: 15000 });
  await expect(to).toBeEnabled();
  // The single-line field shows only the start of this list at phone width; the inline Send has
  // no review sheet, so each address is listed in full under the field.
  const listed = draft.getByRole('list', { name: 'Email recipient list' });
  await expect(draft.getByText('3 recipients', { exact: true })).toBeVisible();
  await expect(listed.getByRole('listitem')).toHaveText(crew);
  await listed.scrollIntoViewIfNeeded();
  for (const row of await listed.getByRole('listitem').all()) {
    await expect(row).toBeInViewport({ ratio: 1 });
    expect(await row.evaluate((item) => item.scrollWidth <= item.clientWidth)).toBe(true);
  }
  // Place the caret explicitly because End moves differently across platforms.
  // Each keystroke must still survive the draft's save and rerender.
  await to.focus();
  await to.evaluate((field: HTMLInputElement) => {
    field.setSelectionRange(field.value.length, field.value.length);
  });
  await to.pressSequentially(', owner@example.invalid');
  await expect(to).toHaveValue(shown.to.join(', '));
  await expect(listed.getByRole('listitem')).toHaveText(shown.to);
  await expect(draft.getByText('4 recipients', { exact: true })).toBeVisible();
  const body = draft.getByRole('textbox', { name: 'Email body' });
  await body.focus();
  await body.evaluate((field: HTMLTextAreaElement) => {
    field.setSelectionRange(field.value.length, field.value.length);
  });
  await body.pressSequentially(' And the blue notebook.');
  await expect(body).toHaveValue(shown.bodyText);
  return draft;
}

test('every recipient of a chat draft is on screen before Send, and edits keep each typed character', async ({ page }) => {
  const foreign = await fenceNetwork(page);
  const draft = await editCrewDraft(page);
  // The edits are written as shown, and nothing reaches Gmail before Send.
  await expect.poll(() => storedCards(page)).toEqual([
    expect.objectContaining({ to: shown.to.join(', '), subject: shown.subject, body: shown.bodyText, state: 'draft' }),
  ]);
  await expect(draft.getByRole('status')).toHaveCount(0);
  expect(await harness(page, (f) => [f.mail.prepares.length, f.mail.dispatches.length])).toEqual([0, 0]);
  expect(foreign).toEqual([]);
});

// The inline Send dispatches only because the pinned Inbox journal keeps the request ID the draft
// names (review-controller.ts refuses it otherwise with "Update Alpha before sending this email.").
// A journal that named its own ID would fail this case on that refusal; it is never an outcome.
test('Send of an edited chat draft stores and dispatches exactly the email on screen, once', async ({ page }) => {
  const foreign = await fenceNetwork(page);
  const draft = await editCrewDraft(page);
  await draft.getByRole('button', { name: 'Send email' }).click();
  await expect(draft.getByRole('status')).toHaveText('Sent.', { timeout: 15000 });
  await expect(draft.getByRole('button', { name: 'Send email' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Review mail operation' })).toHaveCount(0);
  // Read after the card settled, so a late or repeated dispatch would be counted.
  const proof = await harness(page, (f) => ({ prepares: f.mail.prepares, dispatches: f.mail.dispatches, sent: f.mail.sent }));
  expect(proof.prepares).toHaveLength(1);
  expect(proof.dispatches).toHaveLength(1);
  expect(proof.prepares[0]).toMatchObject(shown);
  expect(proof.dispatches[0]).toMatchObject({ ...shown, requestId: proof.prepares[0].requestId, digest: proof.prepares[0].digest });
  expect(proof.sent).toEqual([shown.subject + ' | ' + shown.bodyText]);
  expect(await storedCards(page)).toEqual([
    expect.objectContaining({ to: shown.to.join(', '), subject: shown.subject, body: shown.bodyText, state: 'sent' }),
  ]);
  expect(foreign).toEqual([]);
});
