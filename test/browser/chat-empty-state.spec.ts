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
  // The sheet is still moving after the empty state first appears. Measure both
  // rectangles together and wait for the line to sit within the transcript.
  await expect.poll(() => empty.evaluate(element => {
    const line = element.getBoundingClientRect();
    const transcript = element.closest('[data-alpha-transcript]')?.getBoundingClientRect();
    return !!transcript && line.height > 0 && line.top >= transcript.top && line.bottom <= transcript.bottom;
  })).toBe(true);
});
