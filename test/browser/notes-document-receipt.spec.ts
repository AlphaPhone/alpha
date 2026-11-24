import { expect, test } from '@playwright/test';
import { openLegacyNotes } from './helpers/legacy-notes';

test('A document receipt that arrives while the page is hidden is shown once the page is visible', async ({ page }) => {
  await page.goto('/');
  await openLegacyNotes(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import text note', exact: true }).click();
  await (await chooser).setFiles({ name: 'Receipt note.txt', mimeType: 'text/plain', buffer: Buffer.from('Receipt body\n') });
  await expect(page.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('Receipt body\n');
  await page.getByRole('button',{name:'More',exact:true}).click();
  await page.getByRole('dialog',{name:'Note actions',exact:true}).getByRole('button',{name:'Share note',exact:true}).click();
  const exportButton = page.getByRole('button', { name: 'Save file', exact: true });
  await expect(exportButton).toBeVisible();
  const receipt = page.locator('[data-alpha-toast]').getByText('Download requested. Check your browser downloads.', { exact: true });
  await page.evaluate(() => {
    const state = window as unknown as { __receiptHidden: boolean };
    state.__receiptHidden = false;
    const original=URL.createObjectURL;URL.createObjectURL=(...args)=>{state.__receiptHidden=true;return original(...args);};
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state.__receiptHidden });
  });
  const download = page.waitForEvent('download');
  await exportButton.click();
  await download;
  await page.waitForTimeout(2300);
  await expect(receipt).toHaveCount(0);
  await expect(page.getByRole('dialog',{name:'Share',exact:true})).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as { __receiptHidden: boolean }).__receiptHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(receipt).toBeVisible();
});

test('A visible page shows a document receipt at once', async ({ page }) => {
  await page.goto('/');
  await openLegacyNotes(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import text note', exact: true }).click();
  await (await chooser).setFiles({ name: 'Receipt note.txt', mimeType: 'text/plain', buffer: Buffer.from('Receipt body\n') });
  await expect(page.locator('[data-alpha-toast]').getByText('Imported', { exact: true })).toBeVisible();
});

test('A document failure that arrives while the page is hidden is shown once the page is visible', async ({ page }) => {
  await page.goto('/');
  await openLegacyNotes(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import text note', exact: true }).click();
  await (await chooser).setFiles({ name: 'Failure note.txt', mimeType: 'text/plain', buffer: Buffer.from('Failure body\n') });
  await expect(page.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('Failure body\n');
  await page.getByRole('button',{name:'More',exact:true}).click();
  await page.getByRole('dialog',{name:'Note actions',exact:true}).getByRole('button',{name:'Share note',exact:true}).click();
  const exportButton = page.getByRole('button', { name: 'Save file', exact: true });
  await expect(exportButton).toBeVisible();
  const failure = page.locator('[data-alpha-toast]').getByText('Import failed', { exact: true });
  await page.evaluate(() => {
    const state = window as unknown as { __receiptHidden: boolean; __exportAttempts: number };
    state.__receiptHidden = false; state.__exportAttempts = 0;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state.__receiptHidden });
    URL.createObjectURL = () => { if(!state.__exportAttempts)state.__receiptHidden=true;state.__exportAttempts++; throw new Error('Synthetic export failure'); };
  });
  await exportButton.click();
  await page.waitForFunction(() => (window as unknown as { __exportAttempts: number }).__exportAttempts === 1);
  await expect(page.getByRole('dialog',{name:'Share',exact:true})).toHaveCount(0);
  await page.waitForTimeout(2300);
  await expect(failure).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as { __receiptHidden: boolean }).__receiptHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(failure).toBeVisible();
  await expect(failure).toHaveCount(0, { timeout: 5000 });
  if(!await page.getByRole('button',{name:'Share note',exact:true}).isVisible())await page.getByRole('button',{name:'More',exact:true}).click();
  await page.getByRole('dialog',{name:'Note actions',exact:true}).getByRole('button',{name:'Share note',exact:true}).click();
  await exportButton.click();
  await page.waitForFunction(() => (window as unknown as { __exportAttempts: number }).__exportAttempts === 2);
  await expect(failure).toBeVisible();
});
