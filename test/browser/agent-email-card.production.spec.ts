import { expect, test } from '@playwright/test';
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

test('every recipient of a chat draft is on screen before Send, and edits keep each typed character', async ({ page }) => {
  const foreign = await fenceNetwork(page);
  const crew = [
    'lighting.crew@example.invalid',
    'camera.operator@example.invalid',
    'location.manager@example.invalid',
  ];
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
  // Each keystroke shows at once and is kept: nothing is dropped while the edit is saved.
  await to.press('End');
  await to.pressSequentially(', owner@example.invalid');
  await expect(to).toHaveValue(crew.join(', ') + ', owner@example.invalid');
  await expect(listed.getByRole('listitem')).toHaveText([...crew, 'owner@example.invalid']);
  await expect(draft.getByText('4 recipients', { exact: true })).toBeVisible();
  const body = draft.getByRole('textbox', { name: 'Email body' });
  await body.press('ControlOrMeta+End');
  await body.pressSequentially(' And the blue notebook.');
  await expect(body).toHaveValue('Bring the tripod. And the blue notebook.');
  expect(await harness(page, (f) => [f.mail.prepares.length, f.mail.dispatches.length])).toEqual([0, 0]);
  // Send prepares exactly the email on screen.
  await draft.getByRole('button', { name: 'Send email' }).click();
  await expect.poll(() => harness(page, (f) => f.mail.prepares.length)).toBe(1);
  const proof = await harness(page, (f) => ({ prepares: f.mail.prepares, dispatches: f.mail.dispatches }));
  expect(proof.prepares[0]).toMatchObject({
    to: [...crew, 'owner@example.invalid'],
    subject: 'Tomorrow’s shoot',
    bodyText: 'Bring the tripod. And the blue notebook.',
  });
  expect(proof.dispatches.length).toBeLessThanOrEqual(1);
  for (const dispatch of proof.dispatches)
    expect(dispatch.bodyText).toBe('Bring the tripod. And the blue notebook.');
  await expect(draft.getByRole('status')).toBeVisible();
  expect(foreign).toEqual([]);
});
