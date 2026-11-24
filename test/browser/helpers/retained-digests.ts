import {expect, type Page} from '@playwright/test';

export async function openRetainedDigests(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('alpha:hosted-digests')));
  await expect(page.getByRole('dialog', {name:'Scheduled digests',exact:true})).toBeVisible();
}
