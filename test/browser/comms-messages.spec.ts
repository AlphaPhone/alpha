import {test, expect, type Page} from '@playwright/test';
import {setupTelephony} from './telephony-fixture';
import {setTextScale} from './accessibility-states';
// AP-16 Messages (docs/agentic-comms.md AC-01, AC-10, AC-13 to AC-16, AC-22, AC-24, AC-31): the one
// bottom bar, the thread's draft slot and the draft bubble in the stage. Renderer evidence only: no
// device, SIM, carrier or SMS provider is involved, and a text handed to the stub bridge proves
// nothing about a radio.
const personField = '[data-alpha-bar-field="person"]', filterField = '[data-alpha-bar-field="filter"]', alphaField = '[data-alpha-bar-field="alpha"]';
const bubble = '[data-alpha-draft-bubble]';
const barSend = (page: Page) => page.locator('[data-alpha-input-bar]').getByRole('button', {name: 'Send', exact: true});
const openAlpha = (page: Page) => page.getByRole('button', {name: 'Open Alpha', exact: true}).click();
const inputs = (page: Page, method: string) => page.evaluate(method => ((window as any).telephonyInputs as [string, any][]).filter(row => row[0] === method).map(row => row[1]), method);
const sms = (page: Page, call: string, ...args: unknown[]) => page.evaluate(async ([call, args]) => ((await import('/src/prototype/sms-adapter.ts' as string)) as any)[call as string](...(args as unknown[])), [call, args] as const);
/** Requests the page makes while `act` runs, other than the development server's own modules. */
async function requestsDuring(page: Page, act: () => Promise<void>) {
  const seen: string[] = [], record = (request: {url(): string; resourceType(): string}) => { if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())) seen.push(request.url()); };
  page.on('request', record);
  try { await act(); } finally { page.off('request', record); }
  return seen;
}
/** Every line of the draft can be brought into the stage, and Edit and Send stay on screen (AC-13). */
async function draftReachable(page: Page) {
  const draft = page.locator(bubble);
  await expect(draft).toBeVisible();
  for (const block of ['start', 'end'] as const) {
    await draft.evaluate((el, block) => el.scrollIntoView({block}), block);
    const [box, sheet] = await Promise.all([draft.boundingBox(), page.locator('[data-alpha-layer="conversation"]').boundingBox()]);
    if (!box || !sheet) throw Error('missing draft or sheet');
    if (block === 'start') expect(box.y, 'the first line can be scrolled into the stage').toBeGreaterThanOrEqual(0);
    else expect(box.y + box.height, 'the last line can be scrolled above the sheet').toBeLessThanOrEqual(sheet.y + 1);
    for (const control of ['[data-alpha-draft-edit]', '[data-alpha-draft-send]']) await expect(page.locator(control)).toBeInViewport({ratio: 1});
  }
}

test.describe('Messages on the Alpha image: the telephony stub bridge (as aosp-telephony-views.spec.ts)', () => {
  for(const scale of [1,2])test(`long-press Copy and confirmed Delete act on one provider row, never the unsent draft (text ${scale*100}%)`, async ({page,context},testInfo)=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await setupTelephony(page);
    await page.getByRole('button',{name:'Messages',exact:true}).first().click();
    await page.getByRole('button',{name:/^Ada Okafor/}).click();
    await setTextScale(page,scale);
    const target=page.locator('[data-alpha-message-id="sms:4"]');
    await target.scrollIntoViewIfNeeded();
    const text=await target.innerText();
    const box=(await target.boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await expect(page.getByRole('menu',{name:'Message actions',exact:true})).toBeVisible();
    await page.mouse.up();
    await expect(page.getByRole('menu',{name:'Message actions',exact:true})).toBeInViewport({ratio:1});
    if(scale===2)await testInfo.attach('message-menu-200-percent',{body:await page.screenshot(),contentType:'image/png'});
    await page.getByRole('menuitem',{name:'Copy',exact:true}).click();
    expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(text);
    expect(await inputs(page,'deleteMessage')).toEqual([]);
    await target.dispatchEvent('contextmenu');
    await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Delete message?',exact:true});
    await expect(dialog).toBeVisible();expect(await inputs(page,'deleteMessage')).toEqual([]);
    await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
    await expect(target).toBeVisible();expect(await inputs(page,'deleteMessage')).toEqual([]);
    await target.dispatchEvent('contextmenu');await page.getByRole('menuitem',{name:'Copy',exact:true}).press('Escape');
    await expect(page.getByRole('menu',{name:'Message actions',exact:true})).toHaveCount(0);
    await target.dispatchEvent('contextmenu');await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await dialog.getByRole('button',{name:'Delete',exact:true}).click();
    await expect(target).toHaveCount(0);
    const deleted=await inputs(page,'deleteMessage');expect(deleted).toHaveLength(1);
    expect(deleted[0]).toEqual({id:'sms:4',kind:'sms',threadId:'thread:101',date:expect.any(Number)});
    await expect(page.locator('[data-alpha-message-id]')).toHaveCount(3);
    expect(await sms(page,'placeAskedSmsDraft','Unsent owner review')).toBe('drafted');await openAlpha(page);
    await page.locator(bubble).dispatchEvent('contextmenu');
    await expect(page.getByRole('menu',{name:'Message actions',exact:true})).toHaveCount(0);
    expect(await inputs(page,'deleteMessage')).toHaveLength(1);expect(await inputs(page,'sendComposedSms')).toEqual([]);
  });

  for(const answer of ['unknown','wrong-target','unavailable'] as const)test(`unconfirmed deletion (${answer}) keeps the row and refuses a second attempt`,async({page})=>{
    await setupTelephony(page);
    await page.evaluate(answer=>{(window as any).telephonyAnswers={deleteMessage:async(input:any)=>{
      if(answer==='unavailable')throw Error('Not implemented on this host');
      return {status:answer==='unknown'?'unknown':'deleted',message:answer==='wrong-target'?{...input,id:'sms:999'}:input};
    }};},answer);
    await page.getByRole('button',{name:'Messages',exact:true}).first().click();await page.getByRole('button',{name:/^Ada Okafor/}).click();
    const target=page.locator('[data-alpha-message-id="sms:4"]');
    await target.dispatchEvent('contextmenu');await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await page.getByRole('dialog',{name:'Delete message?',exact:true}).getByRole('button',{name:'Delete',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Delete message?',exact:true})).toHaveCount(0);
    await expect(target).toBeVisible();expect(await inputs(page,'deleteMessage')).toHaveLength(1);
    await target.dispatchEvent('contextmenu');await expect(page.getByRole('menuitem',{name:'Copy',exact:true})).toBeVisible();
    await expect(page.getByRole('menuitem',{name:'Delete',exact:true})).toHaveCount(0);
    expect(await inputs(page,'deleteMessage')).toHaveLength(1);
  });

  for (const status of ['pending','failed'] as const) test(`a ${status} send is refused as not settled: nothing is deleted and Delete stays offered`,async({page})=>{
    await setupTelephony(page);
    await page.evaluate((status)=>{const row=(window as any).messages['thread:101'].find((value:any)=>value.id==='sms:4');Object.assign(row,{direction:'outgoing',status,deliveryReport:'none'});},status);
    await page.getByRole('button',{name:'Messages',exact:true}).first().click();await page.getByRole('button',{name:/^Ada Okafor/}).click();
    const target=page.locator('[data-alpha-message-id="sms:4"]');
    await target.dispatchEvent('contextmenu');await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
    await page.getByRole('dialog',{name:'Delete message?',exact:true}).getByRole('button',{name:'Delete',exact:true}).click();
    await expect(page.locator('[data-alpha-toast]')).toContainText('This message is still sending or did not send, so it was not deleted.');
    await expect(target).toBeVisible();expect(await inputs(page,'deleteMessage')).toHaveLength(1);
    expect(await page.evaluate(()=>(window as any).messages['thread:101'].some((value:any)=>value.id==='sms:4'))).toBe(true);
    await target.dispatchEvent('contextmenu');await expect(page.getByRole('menuitem',{name:'Delete',exact:true}).first()).toBeVisible();
  });

  test('message links are credential-free HTTP(S), stay inert until tapped, and open Alpha Browser', async ({page}) => {
    await setupTelephony(page);
    await page.evaluate(() => {
      const w=window as any,cap=w.Capacitor,native=cap.nativePromise;
      cap.PluginHeaders.find((h:any)=>h.name==='AlphaBrowser').methods.push({name:'navigate',rtype:'promise'});
      cap.nativePromise=async(plugin:string,method:string,input:any)=>{
        if(plugin==='AlphaBrowser'&&['create','navigate'].includes(method)){w.telephonyInputs.push(['browser.'+method,input]);return {};}
        return native(plugin,method,input);
      };
      w.messages['thread:101'][0].body='Read https://example.invalid/guide?q=a&b=c, then http://example.invalid/plain. Keep javascript:alert(1) and https://user:password@example.invalid/private as text.';
    });
    await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
    await page.getByRole('button', {name: /^Ada Okafor/}).click();
    const thread=page.locator('[data-alpha-messages-thread]');
    await expect(thread.getByRole('link')).toHaveCount(2);
    await expect(thread).toContainText('Keep javascript:alert(1) and https://user:password@example.invalid/private as text.');
    expect(await inputs(page,'browser.navigate')).toEqual([]);
    await thread.getByRole('link',{name:'http://example.invalid/plain',exact:true}).click();
    await expect.poll(()=>inputs(page,'browser.navigate')).toHaveLength(1);
    expect((await inputs(page,'browser.navigate'))[0].url).toBe('http://example.invalid/plain');
    await expect(page.getByRole('button',{name:'Edit address',exact:true})).toBeVisible();
    expect(await inputs(page,'sendComposedSms')).toEqual([]);
  });

  test('a 1,600-character Alpha draft is reachable line by line with Edit and Send on screen, at default and largest text', async ({page}) => {
    await setupTelephony(page);
    await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
    await page.getByRole('button', {name: /^Ada Okafor/}).click();
    await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Ada Okafor');
    const words = Array.from({length: 400}, (_, i) => `w${i % 100}`).join(' ').slice(0, 1600);
    expect(await sms(page, 'placeAskedSmsDraft', words)).toBe('drafted');
    await openAlpha(page);
    await expect(page.locator(bubble)).toHaveAttribute('data-alpha-draft-bubble', 'alpha');
    await expect(page.locator(bubble)).toHaveAttribute('aria-label', "Alpha's draft, not sent");
    await draftReachable(page);
    await setTextScale(page, 2);
    await draftReachable(page);
    expect(await inputs(page, 'sendComposedSms')).toEqual([]);
  });

  test('AC-19 on the image: while Telecom reports a call that may be an emergency call, no proposal acts', async ({page}) => {
    await setupTelephony(page);
    await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
    await page.getByRole('button', {name: /^Ada Okafor/}).click();
    await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Ada Okafor');
    const shell = `(() => { const el = document.querySelector('[data-screen]'); let f = el[Object.keys(el).find(k => k.startsWith('__reactFiber$'))]; while (f && !(f.stateNode && typeof f.stateNode.cardAct === 'function')) f = f.return; return f.stateNode; })()`;
    const proposal = (id: string) => `({id: "${id}", kind: "other", title: "Save Ada", detail: "Ada Okafor", button: "Save", acts: true, act: {mod: "messages", fn: "none"}, args: {}})`;
    expect(await page.evaluate(`${shell}.propose(${proposal('before')}).shown`)).toBe(true);
    await expect(page.locator('[data-alpha-proposal-act]')).toHaveCount(1);
    // Telecom reports a live call whose kind it cannot tell: AC-19 holds, through the image's own path.
    await page.evaluate(() => (window as any).setDeviceCallState({inCall: true, emergency: null, emergencyLive: true, watching: true}));
    await expect(page.locator('[data-alpha-proposal-act]')).toHaveCount(0);
    expect(await page.evaluate(`${shell}.emergencyLive()`)).toBe(true);
    expect(await page.evaluate(`JSON.stringify(${shell}.propose(${proposal('during')}))`)).toBe(JSON.stringify({shown: false, replaced: []}));
    // An ordinary call does not hold it; neither does the call ending.
    await page.evaluate(() => (window as any).setDeviceCallState({inCall: true, emergency: false, emergencyLive: false, watching: true}));
    await expect(page.locator('[data-alpha-proposal-act]')).toHaveCount(1);
    await page.evaluate(() => (window as any).setDeviceCallState({inCall: false, emergency: false, emergencyLive: false, watching: true}));
    expect(await page.evaluate(`${shell}.emergencyLive()`)).toBe(false);
  });

  test('nothing reaches the SMS bridge until Send on the bubble; a retry keeps one journal entry; Alpha notes the send quietly', async ({page}) => {
    await setupTelephony(page);
    // The first send fails in transport; the retry returns a receipt bound to the reviewed text.
    await page.addInitScript(() => { let first = true; (window as any).telephonyAnswers = {sendComposedSms: async (input: any) => {
      if (first) { first = false; throw Error('transport'); }
      const {smsBindingHash} = await import('/src/runtime/aosp-telephony.ts' as string);
      const bindingHash = await smsBindingHash({recipients: input.recipients, body: input.body, subscriptionId: input.subscriptionId});
      return {kind: 'sms-send', operationId: input.operationId, subscriptionId: input.subscriptionId, bindingHash, status: 'submitted', parts: [{index: 0, recipientIndex: 0, partIndex: 0, sent: 'unknown', delivery: 'unknown'}], createdAt: Date.now()};
    }}; });
    await page.reload();
    await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
    await page.getByRole('button', {name: /^Ada Okafor/}).click();
    expect(await sms(page, 'placeAskedSmsDraft', 'Ten minutes away')).toBe('drafted');
    await openAlpha(page);
    await expect(page.locator(bubble)).toContainText('Ten minutes away');
    expect(await inputs(page, 'sendComposedSms'), 'a pending draft sends nothing').toEqual([]);
    await page.locator('[data-alpha-draft-send]').click();
    await expect.poll(() => inputs(page, 'sendComposedSms')).toHaveLength(1);
    await page.locator('[data-alpha-draft-send]').click();
    await expect.poll(() => inputs(page, 'sendComposedSms')).toHaveLength(2);
    const sent = await inputs(page, 'sendComposedSms');
    expect(new Set(sent.map(row => row.operationId)).size, 'the retry carries the same operation, so the journal holds one send').toBe(1);
    await expect(page.getByText(/^Sent to /)).toBeVisible();
  });

  test('type to Ada, open Alpha, reload: the SMS draft returns to the thread', async ({page}) => {
    await setupTelephony(page);
    // The stub bridge keeps no secure slots; this one keeps the SMS draft slots across a reload, as the
    // phone's renderer secure store would (a stand-in, not the Android store).
    await page.addInitScript(() => {
      const cap = (window as any).Capacitor, native = cap.nativePromise, key = (slot: string) => 'fixture.secure.' + slot;
      cap.PluginHeaders.find((header: any) => header.name === 'AlphaConnection').methods.push({name: 'secureCompareExchange', rtype: 'promise'});
      cap.nativePromise = async (plugin: string, method: string, input: any) => {
        if (plugin !== 'AlphaConnection' || !String(input?.slot).startsWith('sms-draft:v1:')) return native(plugin, method, input);
        if (method === 'secureRead') return {value: localStorage.getItem(key(input.slot))};
        if (method !== 'secureCompareExchange') return native(plugin, method, input);
        if (localStorage.getItem(key(input.slot)) !== (input.expectedValue ?? null)) return {status: 'conflict'};
        if (input.value === null) localStorage.removeItem(key(input.slot)); else localStorage.setItem(key(input.slot), input.value);
        return {status: 'saved'};
      };
    });
    await page.reload();
    await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
    await page.getByRole('button', {name: /^Ada Okafor/}).click();
    await page.locator(personField).fill('Draft that survives');
    await openAlpha(page);
    await expect(page.locator(bubble)).toHaveAttribute('data-alpha-draft-bubble', 'owner');
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('fixture.secure.sms-draft:v1:')).length)).toBe(1);
    await page.reload();
    await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
    await page.getByRole('button', {name: /^Ada Okafor/}).click();
    await expect(page.locator(personField)).toHaveValue('Draft that survives');
    expect(await inputs(page, 'sendComposedSms')).toEqual([]);
  });

  test('automatic suggestions and their setting are absent; requested drafts still work',async({page})=>{
    await setupTelephony(page);
    await page.getByRole('button',{name:'Messages',exact:true}).first().click();
    await page.getByRole('button',{name:/^Ada Okafor/}).click();
    await expect(page.locator('[data-alpha-faint],[data-alpha-chat-suggestions]')).toHaveCount(0);
    expect(await sms(page,'placeAskedSmsDraft','Requested help remains')).toBe('drafted');
    await openAlpha(page);await expect(page.locator(bubble)).toContainText('Requested help remains');
    expect(await inputs(page,'sendComposedSms')).toEqual([]);
    await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    await page.getByRole('button',{name:'Apps',exact:true}).click();
    await page.getByRole('button',{name:'Messages',exact:true}).click();
    await expect(page.getByRole('switch',{name:'Suggested replies',exact:true})).toHaveCount(0);
  });

});

test.describe('Messages in the development build: ?mode=dev&fixture=1 with ELIZA_DEV_ALLOW_TEST_MOCKS=1 (scripted replies, no adapters)', () => {
  test.beforeEach(async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'})));
    await page.goto('/?mode=dev&fixture=1');
    await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
  });

  test('typing in the list filters it on the phone with no network request', async ({page}) => {
    const requests = await requestsDuring(page, async () => {
      await page.locator(filterField).fill('maya');
      await expect(page.getByRole('button', {name: /^(Unread, )?Maya Chen$/})).toBeVisible();
      await expect(page.getByRole('button', {name: /^(Unread, )?Jordan Park$/})).toHaveCount(0);
    });
    expect(requests).toEqual([]);
    await page.locator(filterField).fill('');
    await expect(page.getByRole('button', {name: /^(Unread, )?Jordan Park$/})).toBeVisible();
  });

  test('a sentence in the list bar does not filter, and only Enter sends it to Alpha, whose answer filters the list with a clearable chip', async ({page}) => {
    await page.locator(filterField).fill('find texts about the prototype');
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', {name: /^(Unread, )?Jordan Park$/}), 'a sentence is a question, not a filter').toBeVisible();
    await expect(page.locator('[data-alpha-layer="conversation"]').getByText('find texts about the prototype', {exact: true}), 'nothing is sent while typing').toHaveCount(0);
    await page.locator(filterField).press('Enter');
    await expect(page.locator('[data-alpha-layer="conversation"]').getByText('find texts about the prototype', {exact: true})).toBeVisible();
    const chip = page.locator('[data-alpha-list-filter-chip]');
    await expect(chip).toContainText('the prototype');
    await expect(page.getByRole('button', {name: /^(Unread, )?Jordan Park$/})).toHaveCount(0);
    await chip.getByRole('button', {name: 'Clear filter the prototype'}).click();
    await expect(chip).toHaveCount(0);
    await expect(page.getByRole('button', {name: /^(Unread, )?Jordan Park$/})).toBeVisible();
  });

  test('Alpha drafts into the thread\'s slot; Undo, Edit and Send act only on the owner\'s taps', async ({page}) => {
    await page.getByRole('button', {name: /^(Unread, )?Maya Chen$/}).click();
    await page.locator(personField).fill('My words');
    await openAlpha(page);
    await expect(page.locator(bubble)).toHaveAttribute('data-alpha-draft-bubble', 'owner');
    await page.locator(alphaField).fill("tell maya I'm running ten minutes late");
    await page.locator(alphaField).press('Enter');
    await expect(page.locator(bubble)).toHaveAttribute('data-alpha-draft-bubble', 'alpha');
    await expect(page.locator(bubble)).toContainText("I'm running ten minutes late.");
    await expect(page.locator(bubble)).toContainText("Alpha's draft · not sent");
    await page.locator('[data-alpha-draft-undo]').click();
    await expect(page.locator(bubble)).toHaveAttribute('data-alpha-draft-bubble', 'owner');
    await expect(page.locator(bubble)).toContainText('My words');
    await page.locator('[data-alpha-draft-edit]').click();
    await expect(page.locator(personField)).toBeFocused();
    await expect(page.locator(personField)).toHaveValue('My words');
    await openAlpha(page);
    await page.locator('[data-alpha-draft-send]').click();
    await expect(page.locator('[data-alpha-draft-sent="true"]')).toHaveText('My words');
    await expect(page.locator(bubble)).toHaveCount(0);
    await expect(page.getByText('Sent to Maya Chen', {exact: true})).toBeVisible();
  });

  test('a draft Alpha writes from outside Messages is in the thread it opens', async ({page}) => {
    await page.evaluate(() => {
      const el = document.querySelector('[data-screen]') as any;
      let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))!];
      while (fiber && !(fiber.stateNode && typeof fiber.stateNode.cardAct === 'function')) fiber = fiber.return;
      fiber.stateNode.goHome('sheet');
    });
    const composer = page.locator('[data-alpha-layer="conversation"] textarea[data-alpha-composer]');
    await expect(composer).toBeVisible();
    for (const ask of ["tell maya I'm running ten minutes late", 'reply to maya']) {
      await composer.fill(ask);
      await composer.press('Enter');
      await expect(page.locator('[data-alpha-sheet-context]')).toHaveText('Maya Chen · Messages', {timeout: 10_000});
      await expect(page.locator(bubble)).toHaveAttribute('data-alpha-draft-bubble', 'alpha');
      // Each request's own draft is in the slot: the reply replaces the first draft, kept for one Undo.
      const draft = await page.evaluate(() => {
        const el = document.querySelector('[data-screen]') as any;
        let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))!];
        while (fiber && !(fiber.stateNode && typeof fiber.stateNode.cardAct === 'function')) fiber = fiber.return;
        return fiber.stateNode.vget('messages').drafts.maya;
      });
      if (ask.startsWith('tell')) expect(draft.text).toBe("I'm running ten minutes late.");
      else {
        expect(draft.text).not.toBe("I'm running ten minutes late.");
        expect(draft.undo).toEqual({draft: 'asked', text: "I'm running ten minutes late."});
      }
      await expect(page.locator(bubble)).toContainText(draft.text.slice(0, 40));
      await page.evaluate(() => {
        const el = document.querySelector('[data-screen]') as any;
        let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))!];
        while (fiber && !(fiber.stateNode && typeof fiber.stateNode.cardAct === 'function')) fiber = fiber.return;
        fiber.stateNode.goHome('sheet');
      });
    }
  });
});
