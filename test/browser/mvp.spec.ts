import {openRetainedDigests} from './helpers/retained-digests';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { returnToApps } from './app-navigation';
const views = ['Inbox', 'Calendar', 'Browser', 'Camera', 'Photos', 'Maps', 'Notes', 'Files', 'Workflows', 'Settings'];
for (const theme of ['light', 'dark']) {
  for (const width of [360, 412, 1440]) {
    test(`${theme} ${width}: all MVP views remain accessible`, async ({ page }, info) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: 915 });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      // One boot per test; Maps is reached through a fresh load to keep one reload case. Home must be
      // rendered before returnToApps reads it and before the deferred apps are checked absent.
      const boot = async () => { await page.goto(`/?theme=${theme}`); await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible(); };
      await boot();
      for (const name of views) {
        if (name === 'Maps') await boot();
        else await returnToApps(page);
        // The Home grid is drawn first, so a deferred tile would already be there.
        await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
        for (const deferred of ['Phone', 'Messages', 'Contacts', 'Wallet']) await expect(page.getByRole('button', {name: deferred, exact: true})).toHaveCount(0);
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.locator('html')).toHaveAttribute('data-active-view', name.toLowerCase());
        const box = await page.locator('[data-screen]').boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        expect(box!.y + box!.height).toBeLessThanOrEqual(916);
        await expect(page.getByText('Couldn’t refresh', { exact: false })).toHaveCount(0);
        if (width === 412) await page.screenshot({ path: info.outputPath(`${name}.png`) });
      }
      expect(errors).toEqual([]);
    });
  }
}
test('Mock is explicit, its banner does not cover the phone, and exit restores live mode', async ({ page }) => {
  await page.goto('/?mode=mock');
  await expect(page.getByText('Mock mode · simulated data and actions')).toBeVisible();
  const banner=await page.locator('.mock-mode-banner').boundingBox();
  const phone=await page.locator('[data-screen]').boundingBox();
  expect(phone!.y).toBeGreaterThanOrEqual(banner!.y+banner!.height);
  await Promise.all([page.waitForURL(url=>!url.searchParams.has('mode')),page.getByRole('button',{name:'Exit mock mode',exact:true}).click()]);
  await expect(page.locator('html')).toHaveAttribute('data-connection-mode','live');
  await expect(page.locator('.mock-mode-banner')).toHaveCount(0);
});
test('Retained digest panel traps focus, closes on native Back, and restores prior focus',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();
  const trigger=page.getByRole('button',{name:'General',exact:true});
  await trigger.focus();await openRetainedDigests(page);
  const dialog=page.getByRole('dialog',{name:'Scheduled digests',exact:true});
  await expect(dialog).toBeVisible();await expect(dialog).toBeFocused();
  await expect(dialog.getByRole('switch',{name:'Notifications',exact:true})).toBeVisible();
  await expect(dialog).not.toContainText('Result link is waiting for a verified connection.');
  await expect(dialog).not.toContainText('Choose where your agent runs');
  await expect(page.locator('.os')).toHaveAttribute('inert','');
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));
  await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-active-view','settings');
});
test('Display theme survives reload and mock preview does not overwrite it',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'General',exact:true}).click();
  await page.getByRole('button',{name:'Display',exact:true}).click();
  await page.getByRole('button',{name:'Theme: Dark',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('alpha.appearance.v1'))).toBe('dark');
  await page.reload();
  expect(await page.locator('.os').evaluate(el=>getComputedStyle(el).getPropertyValue('--bg').trim())).toBe('#000000');
  await page.goto('/?mode=mock&theme=light');
  expect(await page.evaluate(()=>localStorage.getItem('alpha.appearance.v1'))).toBe('dark');
  await page.goto('/');
  expect(await page.locator('.os').evaluate(el=>getComputedStyle(el).getPropertyValue('--bg').trim())).toBe('#000000');
});

test('MVP mock account and privacy journeys exclude Contacts controls', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?mode=mock&start=settings:privacy');
  await expect(page.getByRole('button',{name:'Leaves this device',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Contacts',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Microphone',exact:true}).click();
  await expect(page.getByRole('switch',{name:'Alpha microphone',exact:true})).toBeVisible();
  await expect(page.getByRole('switch',{name:/^(Phone|Messages) microphone$/})).toHaveCount(0);
  await page.goto('/?mode=mock&start=settings:accounts');
  await page.getByRole('button',{name:'you@gmail.example',exact:true}).click();
  await expect(page.getByRole('button',{name:'Calendar: Act',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/^Contacts:/})).toHaveCount(0);
  await page.goto('/?mode=mock&start=settings:adding');
  await expect(page.getByText('Gmail, Calendar',{exact:true})).toBeVisible();
  await expect(page.getByText(/CardDAV|Gmail, Calendar, Contacts/)).toHaveCount(0);
  await page.getByRole('button',{name:'Google',exact:true}).click();
  // Fixture credentials stay in the explicitly labelled mock; no account call occurs.
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('mvp-fixture@example.test');
  await page.getByRole('textbox',{name:'Password',exact:true}).fill('mock-only');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('button',{name:'Mail: Act',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/^Contacts:/})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('MVP mock digest and fallback advertise only retained views', async ({page}) => {
  await page.goto('/?mode=mock');
  const attention=page.getByRole('button',{name:'1 item needs your attention',exact:true});
  await expect(attention).toContainText('JP');
  await expect(attention).toContainText('2 unread');
  await expect(attention).toContainText('Maya Chen');
  await expect(attention).toContainText('Priya Nair');
  await expect(attention).not.toContainText(/MC|PN/);
  await attention.click();
  await expect(page.locator('[data-alpha-message-text]').filter({hasText:/^1 item needs your attention\.$/})).toBeVisible();
  await page.goto('/?mode=mock&start=sheet');
  const composer=page.getByRole('textbox',{name:'Message Alpha',exact:true});
  await composer.fill('zzzzzz unknown request');await composer.press('Enter');
  await expect(page.locator('[data-alpha-message-text]').filter({hasText:/I can't do that yet. Try opening Inbox/})).toBeVisible();
  await expect(page.getByText(/I can message, call|navigate, pay/)).toHaveCount(0);
  await composer.fill('catch me up');await composer.press('Enter');
  await expect(page.locator('[data-alpha-message-text]').filter({hasText:/^1 item needs your attention\.$/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Still on for 3|Sent you the photos from Saturday/})).toHaveCount(0);
  await page.getByRole('button',{name:/JP Jordan Park Revised term sheet attached/}).click();
  await expect(page.getByRole('heading',{name:'Revised term sheet',exact:true})).toBeVisible();
});

test('the notes:rec deep link no longer opens the old simulated clip recorder', async ({ page }) => {
  await page.goto('/?mode=mock&start=notes:rec');
  await expect(page.getByText('Recording isn’t available in this preview.', { exact: true })).toBeVisible();
  await expect(page.locator('[data-alpha-subview="notes-recording"], [data-alpha-subview="notes-recorder"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop and save', exact: true })).toHaveCount(0);
});
