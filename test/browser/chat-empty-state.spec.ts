import { test, expect } from '@playwright/test';
// An empty chat with no agent says so before anything is sent (VIS-13). The line comes from
// agentAvailabilityNotice() through emptyChatNotice(); test-mocks builds name the connection step.

test('an empty chat with no agent says how to connect one', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' })));
  await page.goto('/');
  await page.getByRole('button', { name: 'Open conversation', exact: true }).click();
  const empty = page.locator('[data-alpha-transcript] [data-alpha-chat-empty]');
  await expect(empty).toBeVisible();
  await expect(empty).toHaveText('Connect your remote agent in Settings.');
  await expect(empty).toHaveAttribute('role', 'status');
  // The line sits inside the transcript, not over the composer.
  const line = await empty.boundingBox(), transcript = await page.locator('[data-alpha-transcript]').boundingBox();
  expect(line && transcript && line.y >= transcript.y && line.y + line.height <= transcript.y + transcript.height).toBe(true);
});
