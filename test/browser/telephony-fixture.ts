// A stubbed Capacitor bridge in the Alpha image shape with synthetic calls, voicemail, conversations
// and contacts. No device, SIM, carrier, Telecom or provider is involved: a call "placed" or a message
// "sent" here is recorded at the bridge and proves nothing about a radio.
import {expect, type Page} from '@playwright/test';

import {installTelephonyFixture,type TelephonyFixture} from '../../scripts/fixtures/native-telephony';
export type {TelephonyFixture} from '../../scripts/fixtures/native-telephony';

export async function setupTelephony(page: Page, options: TelephonyFixture = {}) {
  await page.addInitScript(installTelephonyFixture, options);
  await page.goto('/');
  if (!options.smsNoticeThread) await expect(page.getByRole('button', {name: 'Notes', exact: true})).toBeVisible();
}
