import type {Page} from '@playwright/test';

export async function chooseMailAction(page: Page, name: 'Reply' | 'Reply all' | 'Forward' | 'Archive' | 'Move to Trash' | 'Ask Alpha') {
  const menu = page.locator('.mail-message-menu');
  if (await menu.getAttribute('open') === null) await menu.getByLabel('Message actions', {exact: true}).click();
  await menu.getByRole('button', {name, exact: true}).click();
}
