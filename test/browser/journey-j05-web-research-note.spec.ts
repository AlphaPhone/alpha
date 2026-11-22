import {test, expect, type Page} from '@playwright/test';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';

// The renderer uses a synthetic public page and an explicit dev-agent reply. The sandboxed page
// frame cannot be read, so the development server's page copy (/__alpha/page-html) is answered here.
const url = 'https://public-fixture.test/harbour';
const pageCopy = '**/__alpha/page-html';
const fact = 'The ferry leaves at nine from pier four.';
const html = '<title>Harbour report</title><nav>Ferries / Timetables / Login</nav><article><h1>Harbour report</h1><p>' + 'Unrelated background. '.repeat(90) + '</p><p>' + fact + '</p></article>';
const answer = 'The ferry leaves at nine.';
const question = 'What time does the ferry leave? Use the page you just opened.';
type Turn = {text:string;attachments:{data:string;name:string}[];metadata:Record<string,any>};
const button = (page: Page, name: string) => page.getByRole('button', {name, exact: true});
const sourceHeading = (page: Page) => page.locator('iframe[title="Website"]:visible').contentFrame().getByRole('heading', {name: 'Harbour report', exact: true});
const turns = (page: Page) => page.evaluate(() => (window as any).pageTurns as Turn[]);
const composer = (page: Page) => page.locator('[data-alpha-input-bar] textarea');
// The development profile is an unnegotiated peer, so its wire text carries the legacy observation envelope.
const authored = (turn: Turn) => { const marker = '[USER MESSAGE]\n', at = turn.text.lastIndexOf(marker); return at < 0 ? turn.text : turn.text.slice(at + marker.length); };

async function begin(page: Page, external: string[], body = html, copies: unknown[] = []) {
  page.on('request', request => { const host = new URL(request.url()).hostname; if (/^https?:/.test(request.url()) && !['127.0.0.1', 'localhost', 'public-fixture.test'].includes(host)) external.push(request.url()); });
  await page.route(url, route => route.fulfill({contentType: 'text/html', body}));
  await page.route(pageCopy, route => { copies.push(route.request().postDataJSON()); return route.fulfill({contentType: 'text/html', body}); });
  await page.goto('/?mode=dev');
  await page.evaluate(async()=>{
    const {Component}=await import('/src/prototype/model.js');
    const {alphaClient}=await import('/src/runtime/alpha-client.ts');
    const {LocalAgentProtocol}=await import('/src/runtime/local-agent.ts');
    const fixture=window as any;
    fixture.pageTurns=[];
    // The development agent's request: the authored text, attachments and the turn's metadata.
    const send=LocalAgentProtocol.prototype.send;
    LocalAgentProtocol.prototype.send=function(id:string,text:string,options:any={}){
      fixture.pageTurns.push({text,attachments:options.images??[],metadata:structuredClone(options.metadata??{})});
      return send.call(this,id,text,options);
    };
    void alphaClient;
    const render=Component.prototype.renderVals;
    Component.prototype.renderVals=function(){(window as any).pageShell=this;return render.call(this);};
  });
  await button(page, 'Settings').click();
  await openConnectionDiagnostics(page);
  await page.getByRole('textbox', {name: 'Scripted reply'}).fill(answer);
  await page.getByRole('button', {name: 'Save development reply'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Development reply saved.'})).toBeVisible();
  await page.getByRole('button', {name: 'Connect development profile'}).click();
  await returnToApps(page);
  await button(page, 'Browser').click();
  await button(page, 'Search or type address').click();
  await page.getByRole('textbox', {name: 'Address', exact: true}).fill(url);
  await page.getByRole('textbox', {name: 'Address', exact: true}).press('Enter');
  await expect(sourceHeading(page)).toBeVisible();
}
async function startSpokenTurn(page:Page,text:string){
 await page.evaluate(async({text})=>{
  const w=window as any,shell=w.pageShell;
  const signal=new AbortController().signal;
  const prepared=await shell.prepareVoiceConversation(signal);
  w.spokenPageResult=shell.sendVoiceTurn({...prepared,text,signal,turnId:crypto.randomUUID(),assertCurrent:()=>{},
   voiceTurnSignal:{nextSpeaker:'agent',agentShouldSpeak:true,source:'fixture'}}).then(()=> 'sent',(error:Error)=>error.name);
 },{text});
}
async function sendTyped(page:Page,text:string){await composer(page).fill(text);await button(page,'Send').click();}

for(const mode of ['typed','spoken'])test(`a ${mode} turn on a Browser page carries the page text as metadata, with no attachment or popup`,async({page})=>{
  const external:string[]=[],copies:unknown[]=[];
  await begin(page,external,html,copies);
  await button(page,'Chat actions').click();
  await expect(button(page,'Attach page')).toHaveCount(0);
  await page.keyboard.press('Escape');
  if(mode==='typed')await sendTyped(page,question);
  else await startSpokenTurn(page,question);
  await expect.poll(async()=>(await turns(page)).length).toBe(1);
  const [turn]=await turns(page);
  expect(authored(turn)).toBe(question);
  expect(turn.text).not.toContain(fact);
  expect(turn.attachments).toEqual([]);
  expect(turn.metadata.browserPage).toMatchObject({v:1,onScreen:true,url,title:'Harbour report'});
  expect(turn.metadata.browserPage.text).toMatch(/^Harbour report\nUnrelated background/);
  expect(turn.metadata.browserPage.text).toContain(fact);
  expect(turn.metadata.browserPage.text).not.toContain('Timetables');
  expect(JSON.stringify(turn.metadata.browserPage).length).toBeLessThan(7000);
  expect(copies).toEqual([{url}]);
  if(mode==='spoken'){
    await expect.poll(()=>page.evaluate(()=>(window as any).spokenPageResult)).toBe('sent');
    if(await button(page,'Open conversation').isVisible())await button(page,'Open conversation').click();
  }
  await expect(page.getByRole('button',{name:'Message actions: '+answer,exact:true})).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
  expect(external).toEqual([]);
});

test('any wording gets the same page block, and the page is read once for several turns',async({page})=>{
  const external:string[]=[],copies:unknown[]=[];
  await begin(page,external,html,copies);
  await sendTyped(page,'What is two plus two?');
  await expect.poll(async()=>(await turns(page)).length).toBe(1);
  await expect(page.getByRole('button',{name:'Message actions: '+answer,exact:true}).first()).toBeVisible();
  await sendTyped(page,'summarize');
  await expect.poll(async()=>(await turns(page)).length).toBe(2);
  const [first,second]=await turns(page);
  expect(authored(first)).toBe('What is two plus two?');
  expect(second.metadata.browserPage).toEqual(first.metadata.browserPage);
  expect(first.metadata.browserPage.text).toContain(fact);
  expect(copies).toHaveLength(1);
  expect(external).toEqual([]);
});

test('a sign-in page sends its address and title but no page text',async({page})=>{
 const external:string[]=[];
 await begin(page,external,'<title>Harbour report</title><article><h1>Harbour report</h1><p>private synthetic material</p><input type="password" /></article>');
 await sendTyped(page,question);
 await expect.poll(async()=>(await turns(page)).length).toBe(1);
 const [turn]=await turns(page);
 expect(turn.metadata.browserPage).toMatchObject({url,title:'Harbour report',textUnavailable:'sign-in form on this page'});
 expect(JSON.stringify(turn)).not.toContain('private synthetic material');
 expect(external).toEqual([]);
});

test('a turn from a private tab carries no page address or text',async({page})=>{
 const external:string[]=[],copies:unknown[]=[];
 await begin(page,external,html,copies);
 // Chrome uses the browser host fixture for private tabs in this test.
 await page.evaluate(()=>{(window as any).Capacitor.isNativePlatform=()=>true;});
 await button(page,'Menu').click();await button(page,'New private tab').click();
 const address=page.getByRole('textbox',{name:'Address',exact:true});
 await address.fill(url);await address.press('Enter');
 await expect(sourceHeading(page)).toBeVisible();
 await startSpokenTurn(page,question);
 await expect.poll(async()=>(await turns(page)).length).toBe(1);
 const [turn]=await turns(page);
 expect(turn.metadata).not.toHaveProperty('browserPage');
 expect(JSON.stringify(turn)).not.toContain(url);
 expect(copies).toEqual([]);
 expect(external).toEqual([]);
});

test('a page read that does not finish in time leaves the turn on time, without the text',async({page})=>{
  const external:string[]=[];
  let requested=false;
  await begin(page,external);
  await page.unroute(pageCopy);
  await page.route(pageCopy,async route=>{requested=true;await new Promise(resolve=>setTimeout(resolve,4000));await route.fulfill({contentType:'text/html',body:html}).catch(()=>{});});
  const started=Date.now();
  await startSpokenTurn(page,question);
  await expect.poll(async()=>(await turns(page)).length).toBe(1);
  expect(Date.now()-started).toBeLessThan(3500);
  expect(requested).toBe(true);
  const [turn]=await turns(page);
  expect(turn.metadata.browserPage).toMatchObject({url,textUnavailable:'still reading'});
  expect(turn.metadata.browserPage).not.toHaveProperty('text');
  await expect.poll(()=>page.evaluate(()=>(window as any).spokenPageResult)).toBe('sent');
  expect(external).toEqual([]);
});
