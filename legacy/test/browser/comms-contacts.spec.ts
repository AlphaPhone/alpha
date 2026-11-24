import {test, expect, type Page} from '@playwright/test';
import {setupTelephony} from './telephony-fixture';
// AP-16 Contacts (docs/agentic-comms.md AC-03, AC-22): the list filter typed in the bar or applied by
// Alpha, its clearable chip, and the contact header order. Renderer evidence only: no address book,
// device or hosted model is involved, and the AOSP block's provider is the stubbed bridge.
const field = '[data-alpha-bar-field="filter"]';
const chip = '[data-alpha-list-filter-chip]';
const row = (page: Page, name: string) => page.locator('[data-alpha-layer="app"] button.tap').filter({hasText: name});
/** Requests that leave the renderer for data (fetch, XHR, sockets) from now on. */
function requests(page: Page) {
  const seen: string[] = [];
  page.on('request', request => { if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())) seen.push(request.url()); });
  return seen;
}
/** Contrast ratio of an element's text color on its own background. */
const contrast = (page: Page, selector: string) => page.locator(selector).evaluate(el => {
  const rgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = ([r, g, b]: number[]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const style = getComputedStyle(el), [a, b] = [lum(rgb(style.color)), lum(rgb(style.backgroundColor))];
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
});
/** The listed controls in document order, by their data marker. */
const order = (page: Page, markers: string[]) => page.evaluate(markers => {
  const found = markers.map(marker => [marker, document.querySelector(`[data-alpha-contact-detail] ${marker}`)] as const).filter(([, el]) => el);
  return found.sort(([, a], [, b]) => a!.compareDocumentPosition(b!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1).map(([marker]) => marker);
}, markers);

test.describe('dev Contacts (?mode=dev&fixture=1 dev build with ELIZA_DEV_ALLOW_TEST_MOCKS=1)', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/?mode=dev&fixture=1');
    await page.getByRole('button', {name: 'Contacts', exact: true}).click();
    await expect(page.locator(field)).toHaveAttribute('placeholder', 'Search or ask');
  });

  test('typing filters the list on the device and makes no network request', async ({page}) => {
    const seen = requests(page);
    await page.locator(field).pressSequentially('lum');
    await expect(row(page, 'Maya Chen')).toBeVisible();
    await expect(row(page, 'Sam Okafor')).toHaveCount(0);
    await expect(page.locator(chip)).toHaveCount(0);
    await page.locator(field).fill('');
    await expect(row(page, 'Sam Okafor')).toBeVisible();
    expect(seen).toEqual([]);
  });

  test('a sentence is not a filter; Enter asks Alpha, whose answer filters the list behind a chip that clears it', async ({page}) => {
    // A whole sentence at once: typed word by word, its first words would filter (D9).
    await page.locator(field).fill('Who do I know at Lumen?');
    await expect(row(page, 'Sam Okafor')).toBeVisible();
    await page.locator(field).press('Enter');
    await expect(page.locator(chip)).toContainText('Lumen · 1');
    await expect(row(page, 'Maya Chen')).toBeVisible();
    await expect(row(page, 'Sam Okafor')).toHaveCount(0);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      expect(await contrast(page, chip)).toBeGreaterThanOrEqual(4.5);
    }
    await page.getByRole('button', {name: 'Clear filter Lumen', exact: true}).click();
    await expect(page.locator(chip)).toHaveCount(0);
    await expect(row(page, 'Sam Okafor')).toBeVisible();
  });

  test('a contact header keeps back, avatar, name, favorite, then call, text, mail, directions in every state', async ({page}) => {
    const markers = ['[data-alpha-contact-back]', '[data-alpha-stage-avatar]', 'h1', '[data-alpha-contact-fav]', '[data-alpha-contact-actions]'];
    await row(page, 'Maya Chen').click();
    const actions = page.locator('[data-alpha-contact-actions] button');
    const labels = ['Call Maya Chen', 'Message Maya Chen', 'Email Maya Chen', 'Directions to Maya Chen'];
    await expect(order(page, markers)).resolves.toEqual(markers);
    await expect(actions).toHaveCount(labels.length);
    for (const [index, label] of labels.entries()) await expect(actions.nth(index)).toHaveAttribute('aria-label', label);
    await page.getByRole('button', {name: 'Open Alpha', exact: true}).click();
    await expect(page.locator('[data-alpha-contact-detail]')).toHaveAttribute('data-alpha-compact', 'true');
    await expect(order(page, markers)).resolves.toEqual(markers);
    for (const [index, label] of labels.entries()) await expect(actions.nth(index)).toHaveAttribute('aria-label', label);
    const [last, sheet] = await Promise.all([page.locator('[data-alpha-stage-last]').boundingBox(), page.locator('[data-alpha-layer="conversation"]').boundingBox()]);
    expect(last!.y + last!.height).toBeLessThanOrEqual(sheet!.y + 1);
  });
});

test.describe('AOSP Contacts (stubbed Alpha image bridge, as aosp-telephony-views.spec.ts)', () => {
  // v610: a change or deletion for a name nobody in Contacts has was carded anyway. The installed
  // review lookup reads the stubbed address book; the proposals are a stubbed agent list.
  test('a contact change or deletion is carded only for contacts in the address book, and only approval runs it', async ({page}) => {
    await setupTelephony(page);
    const review = (operation: Record<string, unknown>) => page.evaluate(async operation => {
      const {DeviceActions} = await import('/src/runtime/device-actions.ts' as string);
      const posts: string[] = [];
      const proposal = {id: '5d1f0d2a-7f0e-4c8a-9a51-0e6c1c1f9b20', digest: 'd'.repeat(64), state: 'pending', subjectUserId: 'owner', requestedBy: 'agent', action: 'device_action',
        expiresAt: new Date(Date.now() + 600000).toISOString(), execution: null,
        payload: {action: 'device_action', version: 1, installationId: 'device', enrollmentId: 'enrollment', operation}};
      const request = async (path: string, body: unknown) => { if (body !== undefined) posts.push(path); return {proposals: [proposal]}; };
      const journal = {reserve: async () => { throw Error('no journal'); }, markApplying: async () => {}, finish: async () => {}, get: async () => ({}), list: async () => ({entries: []})};
      let effects = 0;
      const client = new DeviceActions({ownerId: 'owner', agentId: 'agent', origin: 'https://agent.example', sessionId: 'session'},
        {installationId: 'device', enrollmentId: 'enrollment', key: 'a'.repeat(64), capabilities: ['contacts.write.v1', 'contacts.write.v2']}, 'c'.repeat(64), request, journal, async () => { effects++; return {status: 'succeeded', summary: 'done'}; });
      const items = await client.pendingReview({view: 'home', revision: 1, sensitive: false}, new AbortController().signal);
      return {items: items.map((item: any) => item.proposal ? `${item.proposal.title}\n${item.proposal.description}` : `notice ${item.notice}`), posts, effects};
    }, operation);
    const missing = await review({type: 'contact_delete', query: 'Test Alpha'});
    // The owner was told nothing was changed, so the only post is the refusal the agent records.
    expect(missing).toEqual({items: ['notice Delete contact: No contact matching “Test Alpha” is on this phone. Nothing was changed.'], posts: [expect.stringMatching(/\/decision$/)], effects: 0});
    expect((await review({type: 'contact_update', query: 'Test Alpha', set: {phoneNumbers: ['+14155550101']}})).items).toEqual(['notice Change contact: No contact matching “Test Alpha” is on this phone. Nothing was changed.']);
    const one = await review({type: 'contact_update', query: 'Ada', add: {phoneNumbers: ['+14155550101']}});
    expect(one.items).toHaveLength(1);
    expect(one.items[0]).toMatch(/^Change contact\nContact: Ada Okafor\nAdd: \+14155550101\n/);
    expect(one).toMatchObject({posts: [], effects: 0});
    // "ra" matches two people: the card names both and the owner picks one on the phone.
    const several = await review({type: 'contact_delete', query: 'Ra'});
    expect(several.items).toEqual(['Delete contact\n2 contacts match “Ra”: Bao Tran, Grace Lindqvist\n\nAfter you confirm, you choose which one to delete on your phone.']);
    expect(await page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).map(([method]) => method).filter(method => ['contacts.save', 'contacts.remove'].includes(method)))).toEqual([]);
  });
  test('immediate fields save structured names and Notes while unrelated provider rows stay unchanged', async ({page}) => {
    await setupTelephony(page);
    await page.evaluate(()=>{
      const w=window as any,cap=w.Capacitor,native=cap.nativePromise;
      w.providerContact={id:'13',lookup:'lookup-13',displayName:'Carmen Middle Ruiz',givenName:'Carmen',familyName:'Ruiz',notes:'Original notes',middleName:'Middle',photo:'synthetic-photo-row',otherRows:['birthday'],starred:false,phoneNumbers:[{number:'+15550100103',type:'mobile'},{number:'+15550100999',type:'work'}],emailAddresses:[{address:'carmen@example.invalid',type:'home'},{address:'work@example.invalid',type:'work'}],version:'a'.repeat(64)};
      cap.nativePromise=async(plugin:string,method:string,input:any)=>{
        if(plugin==='AlphaContacts'&&method==='get'&&input.id==='13'){const {middleName,photo,otherRows,...detail}=w.providerContact;return structuredClone(detail);}
        if(plugin==='AlphaContacts'&&method==='save'){
          w.telephonyInputs.push(['contacts.save',input]);
          w.providerContact={...w.providerContact,...input,version:'b'.repeat(64)};
          return {status:'saved',id:'13',version:w.providerContact.version};
        }
        return native(plugin,method,input);
      };
    });
    await page.getByRole('button',{name:'Contacts',exact:true}).first().click();
    await page.getByRole('button',{name:/Carmen Ruiz/}).first().click();
    await expect(page.getByRole('button',{name:'Back to apps',exact:true})).not.toBeVisible();
    await expect(page.getByText('Original notes',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Edit contact',exact:true}).click();
    for(const name of ['First name','Last name','Phone','Email','Notes'])await expect(page.getByRole('textbox',{name,exact:true})).toBeVisible();
    await expect(page.getByRole('textbox',{name:'First name',exact:true})).toHaveValue('Carmen');
    await expect(page.getByRole('textbox',{name:'Last name',exact:true})).toHaveValue('Ruiz');
    await page.getByRole('textbox',{name:'Notes',exact:true}).fill('Owner updated notes');
    await page.locator('[data-alpha-contact-save]').click();
    await expect(page.getByText('Owner updated notes',{exact:true})).toBeVisible();
    const result=await page.evaluate(()=>({saved:(window as any).telephonyInputs.filter(([method]:any)=>method==='contacts.save').map(([,input]:any)=>input),record:(window as any).providerContact}));
    expect(result.saved).toHaveLength(1);
    expect(result.saved[0]).toEqual({id:'13',version:'a'.repeat(64),displayName:'Carmen Middle Ruiz',notes:'Owner updated notes',phoneNumbers:result.record.phoneNumbers,emailAddresses:result.record.emailAddresses});
    expect(result.record).toMatchObject({givenName:'Carmen',familyName:'Ruiz',middleName:'Middle',photo:'synthetic-photo-row',otherRows:['birthday']});
    expect(result.record.phoneNumbers).toHaveLength(2);expect(result.record.emailAddresses).toHaveLength(2);
  });

  test('a contact whose notes Android omits shows Notes as unavailable and saves without touching them', async ({page}) => {
    await setupTelephony(page);
    await page.evaluate(()=>{
      const w=window as any,cap=w.Capacitor,native=cap.nativePromise;
      // Android leaves notes out of get() when they are ambiguous (several rows, too long, control characters).
      w.providerContact={id:'13',lookup:'lookup-13',displayName:'Carmen Ruiz',givenName:'Carmen',familyName:'Ruiz',storedNotes:['first note','second note'],starred:false,phoneNumbers:[{number:'+15550100103',type:'mobile'}],emailAddresses:[{address:'carmen@example.invalid',type:'home'}],version:'a'.repeat(64)};
      cap.nativePromise=async(plugin:string,method:string,input:any)=>{
        if(plugin==='AlphaContacts'&&method==='get'&&input.id==='13'){const {storedNotes,...detail}=w.providerContact;return structuredClone(detail);}
        if(plugin==='AlphaContacts'&&method==='save'){
          w.telephonyInputs.push(['contacts.save',input]);
          w.providerContact={...w.providerContact,...input,version:'b'.repeat(64)};
          return {status:'saved',id:'13',version:w.providerContact.version};
        }
        return native(plugin,method,input);
      };
    });
    await page.getByRole('button',{name:'Contacts',exact:true}).first().click();
    await page.getByRole('button',{name:/Carmen Ruiz/}).first().click();
    await page.getByRole('button',{name:'Edit contact',exact:true}).click();
    for(const name of ['First name','Last name','Phone','Email'])await expect(page.getByRole('textbox',{name,exact:true})).toBeVisible();
    await expect(page.getByRole('textbox',{name:'Notes',exact:true})).toHaveCount(0);
    await expect(page.locator('[data-alpha-contact-notes-unavailable]')).toBeVisible();
    await expect(page.locator('[data-alpha-contact-notes-unavailable]')).toContainText('Notes can’t be edited here');
    await page.getByRole('textbox',{name:'Phone',exact:true}).fill('+15550100777');
    await page.locator('[data-alpha-contact-save]').click();
    const result=await page.evaluate(()=>({saved:(window as any).telephonyInputs.filter(([method]:any)=>method==='contacts.save').map(([,input]:any)=>input),record:(window as any).providerContact}));
    expect(result.saved).toHaveLength(1);
    expect(Object.keys(result.saved[0])).not.toContain('notes');
    expect(result.record.storedNotes).toEqual(['first note','second note']);
  });

  test('new contact offers all five fields immediately and submits the entered names and Notes', async ({page})=>{
    await setupTelephony(page);
    await page.getByRole('button',{name:'Contacts',exact:true}).first().click();
    await page.getByRole('button',{name:'New contact',exact:true}).click();
    await expect(page.getByRole('button',{name:'Back to apps',exact:true})).not.toBeVisible();
    const fields={'First name':'Review','Last name':'Person','Phone':'+15550100888','Email':'review@example.invalid','Notes':'Entered by owner'};
    for(const [name,value] of Object.entries(fields)){await expect(page.getByRole('textbox',{name,exact:true})).toBeVisible();await page.getByRole('textbox',{name,exact:true}).fill(value);}
    await page.locator('[data-alpha-contact-save]').click();
    await expect.poll(()=>page.evaluate(()=>(window as any).telephonyInputs.filter(([method]:any)=>method==='contacts.save').length)).toBe(1);
    expect(await page.evaluate(()=>(window as any).telephonyInputs.find(([method]:any)=>method==='contacts.save')[1])).toEqual({displayName:'Review Person',givenName:'Review',familyName:'Person',notes:'Entered by owner',phoneNumbers:[{number:'+15550100888',type:'mobile'}],emailAddresses:[{address:'review@example.invalid',type:'home'}]});
  });
  test('a contact saved in the in-app editor joins the open list without leaving Contacts', async ({page}) => {
    await setupTelephony(page, {preview: true});
    await page.getByRole('button', {name: 'Contacts', exact: true}).first().click();
    await expect(page.getByRole('button', {name: /Carmen Ruiz/}).first()).toBeVisible();
    await page.getByRole('button', {name: 'New contact', exact: true}).click();
    await page.getByRole('textbox', {name: 'First name', exact: true}).fill('Nia');
    await page.getByRole('textbox', {name: 'Last name', exact: true}).fill('Brooks');
    await page.getByRole('textbox', {name: 'Phone', exact: true}).fill('+15550100199');
    await page.locator('[data-alpha-contact-save]').click();
    await expect.poll(() => page.evaluate(() => (window as any).telephonyInputs.filter(([method]: any) => method === 'contacts.save').length)).toBe(1);
    // Back from the new contact's detail lands on the list, which already holds it.
    await page.locator('[data-alpha-contact-back]').click();
    await expect(row(page, 'Nia Brooks')).toBeVisible();
  });

  test('a contact an approved Alpha action adds appears in the open list without leaving Contacts', async ({page}) => {
    await page.route(/\/src\/runtime\/connection-ui\.tsx/, async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/setDeviceExecutor\(executor\)\s*\{\s*deviceExecutor = executor;/, match => `${match} globalThis.__installedDeviceExecutor = executor;`);
      if (!body.includes('__installedDeviceExecutor')) throw Error('setDeviceExecutor not found in connection-ui');
      await route.fulfill({response, body});
    });
    await setupTelephony(page, {preview: true});
    await page.getByRole('button', {name: 'Contacts', exact: true}).first().click();
    await expect(page.getByRole('button', {name: /Carmen Ruiz/}).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => typeof (window as any).__installedDeviceExecutor)).toBe('function');
    const reads = () => page.evaluate(() => (window as any).telephonyInputs.filter(([method]: any) => method === 'contacts.list').length);
    const before = await reads();
    // The review fence compares the agent session and screen context; hold both steady as a live review would.
    const status = await page.evaluate(async () => {
      const {connectionController} = await import('/src/runtime/connection-ui.tsx' as string);
      const {alphaClient} = await import('/src/runtime/alpha-client.ts' as string);
      const session = {ownerId: 'owner', agentId: 'agent', origin: 'https://agent.example', sessionId: 'session'};
      const snapshot = connectionController.getSnapshot.bind(connectionController);
      connectionController.getSnapshot = () => ({...snapshot(), session});
      const target = {installationId: 'device'};
      connectionController.getWorkflowDeviceTarget = () => target;
      const state = alphaClient.getState.bind(alphaClient), context = {...state().context, view: 'contacts', sensitive: false};
      alphaClient.getState = () => ({...state(), context});
      const result = await (window as any).__installedDeviceExecutor({type: 'contact_create', contact: {displayName: 'Nia Brooks', phoneNumbers: ['+15550100199'], emailAddresses: []}}, crypto.randomUUID(), context, new AbortController().signal);
      return result.status;
    });
    expect(status).toBe('succeeded');
    await expect(row(page, 'Nia Brooks')).toBeVisible();
    // One provider read answers the write; nothing polls.
    expect(await reads()).toBe(before + 1);
  });

  test('typing reads the device address book with the query and nothing else', async ({page}) => {
    await setupTelephony(page);
    await page.getByRole('button', {name: 'Contacts', exact: true}).first().click();
    await expect(page.getByRole('button', {name: /Carmen Ruiz/}).first()).toBeVisible();
    const seen = requests(page);
    await page.locator(field).pressSequentially('carm');
    await expect.poll(() => page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).filter(entry => entry[0] === 'contacts.list').at(-1)?.[1]?.query)).toBe('carm');
    await expect(page.getByRole('button', {name: /Ada Okafor/})).toHaveCount(0);
    await expect(page.locator(chip)).toHaveCount(0);
    expect(seen).toEqual([]);
  });
});
