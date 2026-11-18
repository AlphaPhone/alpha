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
          page.getByText('Tomorrow’s shoot', { exact: true }),
        ).toBeVisible();
      }
      expect(foreign).toEqual([]);
    },
  );
