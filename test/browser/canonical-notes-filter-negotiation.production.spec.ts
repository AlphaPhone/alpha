// Contract test on the flag-off Android renderer: the resident connection negotiates
// notes.list-filter.v1 only when the agent offers it at registration, and only then does the
// canonical Notes list become a reviewable filter target.
//
// Evidence boundary: source/test evidence for the flag-off renderer only. The resident agent and
// its canonical Notes source are the bridge stub (flag-off-android.ts, resident-stub.ts); this does
// not prove what a real agent or model does with the capability, or any native view on a device.
import { test, expect, type Page } from '@playwright/test';
import { flagOffAndroid, harness, button, fenceNetwork, residentHome } from './flag-off-android';
import { residentStub, stub } from './resident-stub';

const CAPABILITY = 'notes.list-filter.v1';
const composer = (page: Page) => page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();

/** The resident agent's canonical Notes source answers one empty list at revision 0. */
async function canonicalNotesSource(page: Page) {
  await page.addInitScript(() => {
    const w = window as any, base = w.Capacitor.nativePromise;
    w.Capacitor.nativePromise = async (plugin: string, method: string, input: any) => {
      if (plugin === 'Agent' && method === 'request' && (input.method || 'GET') === 'GET' && String(input.path).split('?')[0] === '/api/notes/state') {
        w.flagOff.calls.push('Agent.request notes state');
        return { status: 200, body: JSON.stringify({ success: true, data: { notes: [], trash: [], revision: 0 } }) };
      }
      return base(plugin, method, input);
    };
  });
}

for (const offered of [true, false]) {
  test(`the resident connection negotiates the canonical Notes filter only when the agent offers it (${offered ? 'offered' : 'not offered'})`, async ({ page }) => {
    test.setTimeout(120_000);
    const foreign = await fenceNetwork(page);
    await flagOffAndroid(page);
    await residentStub(page, { offered: ['notes.query.v1', ...(offered ? [CAPABILITY] : [])] });
    await canonicalNotesSource(page);
    await residentHome(page);
    await button(page, 'Notes').click();
    await expect(page.locator('html')).toHaveAttribute('data-active-view', 'notes');
    await expect.poll(() => harness(page, f => f.calls.includes('Agent.request notes state'))).toBe(true);
    await expect(page.getByRole('button', { name: 'New note', exact: true })).toBeEnabled();
    if (!await composer(page).isVisible()) await button(page, 'Open conversation').click();
    await composer(page).fill('Which notes are here?'); await composer(page).press('Enter');
    await expect(page.getByRole('button', { name: 'Message actions: Resident reply 1', exact: true })).toHaveCount(1, { timeout: 30_000 });
    // The registered offer reached the real resident negotiation: the stream header and the
    // enrolled credential (read by canonicalNotesFilterAvailable) carry the same list.
    const advertised = (await stub(page, s => s.capabilities) as string).split(',');
    expect(advertised.includes('notes.query.v1')).toBe(true);
    expect(advertised.includes(CAPABILITY)).toBe(offered);
    const context = (await stub(page, s => s.bodies) as any[])[0].metadata.clientDevice.context;
    expect(context).toMatchObject({ view: 'notes', sensitive: false });
    if (offered) expect(context.selectedObject).toEqual({ kind: 'canonical-note-source', id: 'notes', revision: '0' });
    else expect(context.selectedObject?.kind).not.toBe('canonical-note-source');
    expect(await harness(page, f => f.unexpected)).toEqual([]);
    expect(foreign).toEqual([]);
  });
}
