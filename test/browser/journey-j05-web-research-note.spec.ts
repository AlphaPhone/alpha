import {test, expect, type Page} from '@playwright/test';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';

// The renderer uses a synthetic public page and an explicit dev-agent reply.
const url = 'https://public-fixture.test/harbour';
const publicReader = 'https://search.parallel.ai/mcp';
const fact = 'The ferry leaves at nine from pier four.';
const html = '<article><h1>Harbour report</h1><p>' + 'Unrelated background. '.repeat(90) + '</p><p>' + fact + '</p></article>';
const answer = 'The ferry leaves at nine.';
const question = 'What time does the ferry leave? Use the page you just opened.';
const button = (page: Page, name: string) => page.getByRole('button', {name, exact: true});
const sourceHeading = (page: Page) => page.locator('iframe[title="Website"]:visible').contentFrame().getByRole('heading', {name: 'Harbour report', exact: true});
const turns = (page: Page) => page.evaluate(() => (window as any).pageTurns as {text:string;attachments:{data:string;name:string}[]}[]);
const composer = (page: Page) => page.locator('[data-alpha-input-bar] textarea');

async function begin(page: Page, external: string[], crossOriginReadable: boolean, body = html) {
  page.on('request', request => { const host = new URL(request.url()).hostname; if (/^https?:/.test(request.url()) && !['127.0.0.1', 'localhost', 'public-fixture.test'].includes(host)) external.push(request.url()); });
  // The frame navigation always loads; the renderer's credential-free re-read is a fetch, which a
  // site without CORS denies.
  await page.route(url, route => route.request().resourceType() === 'fetch' && !crossOriginReadable ? route.abort() : route.fulfill({contentType: 'text/html', headers: crossOriginReadable ? {'access-control-allow-origin': '*'} : {}, body}));
  await page.route(publicReader, route => route.abort());
  await page.goto('/?mode=dev');
  await page.evaluate(async()=>{
    const {Component}=await import('/src/prototype/model.js');
    const {alphaClient}=await import('/src/runtime/alpha-client.ts');
    const send=alphaClient.send.bind(alphaClient);
    const fixture=window as any;
    fixture.pageTurns=[];
    alphaClient.send=(...args)=>{
      fixture.pageTurns.push({text:args[0],attachments:args[4]?.images??[]});
      return send(...args);
    };
    const render=Component.prototype.renderVals;
    Component.prototype.renderVals=function(){(window as any).pageQuestionShell=this;return render.call(this);};
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
async function startSpokenPageQuestion(page:Page,question:string){
 await page.evaluate(async({question})=>{
  const w=window as any,shell=w.pageQuestionShell;
  const signal=new AbortController().signal;
  const prepared=await shell.prepareVoiceConversation(signal);
  w.spokenPageResult=shell.sendVoiceTurn({...prepared,text:question,signal,turnId:crypto.randomUUID(),assertCurrent:()=>{},
   voiceTurnSignal:{nextSpeaker:'agent',agentShouldSpeak:true,source:'fixture'}}).then(()=> 'sent',(error:Error)=>error.name);
 },{question});
}

function pageAttachment(turn:{text:string;attachments:{data:string;name:string}[]}){
  expect(turn.text).toBe(question);
  expect(turn.attachments.map(attachment=>attachment.name)).toEqual(['Browser page.txt']);
  return Buffer.from(turn.attachments[0].data,'base64').toString('utf8');
}

for(const mode of ['typed','spoken'])test(`a ${mode} page question sends one bounded passage without a popup`,async({page})=>{
  const external:string[]=[];
  await begin(page,external,true);
  await button(page,'Chat actions').click();
  await expect(button(page,'Attach page')).toHaveCount(0);
  await page.keyboard.press('Escape');
  if(mode==='typed'){
    await composer(page).fill(question);
    await button(page,'Send').click();
  }else await startSpokenPageQuestion(page,question);
  await expect.poll(async()=>(await turns(page)).length).toBe(1);
  const passage=pageAttachment((await turns(page))[0]);
  expect(passage).toContain(url);
  expect(passage).toContain(fact);
  expect(passage.length).toBeLessThan(1250);
  if(mode==='spoken'){
    await expect.poll(()=>page.evaluate(()=>(window as any).spokenPageResult)).toBe('sent');
    if(await button(page,'Open conversation').isVisible())await button(page,'Open conversation').click();
  }
  await expect(page.getByRole('button',{name:'Message actions: '+answer,exact:true})).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
  expect(external).toEqual([]);
});

for(const matches of [true,false])test(`a cross-origin page ${matches?'uses one bounded public excerpt':'rejects a mismatched public excerpt'}`,async({page})=>{
 const external:string[]=[];
 await begin(page,external,false);
 const reads:unknown[]=[];
 await page.route(publicReader,route=>{
   reads.push(route.request().postDataJSON());
   const result={results:[{url:matches?url:'https://other.test/',excerpts:[
     '- [Updates](https://public-fixture.test/ferry/time/leave)\n'+'Background. '.repeat(150),fact,
   ]}],errors:[]};
   return route.fulfill({headers:{'access-control-allow-origin':'*'},json:{id:1,jsonrpc:'2.0',result:{content:[{type:'text',text:JSON.stringify(result)}]}}});
 });
 await composer(page).fill(question);await button(page,'Send').click();
 await expect.poll(async()=>(await turns(page)).length).toBe(1);
 const passage=pageAttachment((await turns(page))[0]);
 expect(reads).toEqual([expect.objectContaining({params:{name:'web_fetch',arguments:{
   urls:[url],objective:'Return a few short excerpts from the main public page content. Omit navigation and forms.',full_content:false,
 }}})]);
 if(matches){
   expect(passage).toContain(url);
   expect(passage).toContain(fact);
   expect(passage).not.toContain('/ferry/time/leave');
   expect(passage.length).toBeLessThan(1250);
 }else{
   expect(passage).toContain('No readable public page');
   expect(passage).not.toContain(url);
   expect(passage).not.toContain(fact);
 }
 await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
 expect(external).toEqual([publicReader]);
});

test('a sign-in page shares no title, address or page text with the agent',async({page})=>{
 const external:string[]=[];
 await begin(page,external,true,'<article><h1>Harbour report</h1><p>private synthetic material</p><input type="password" /></article>');
 await composer(page).fill(question);await button(page,'Send').click();
 await expect.poll(async()=>(await turns(page)).length).toBe(1);
 const passage=pageAttachment((await turns(page))[0]);
 expect(passage).toContain('No readable public page');
 expect(passage).not.toContain(url);
 expect(passage).not.toContain('Harbour report');
 expect(passage).not.toContain('private synthetic material');
 expect(external).toEqual([]);
});

test('a question in a private tab sends no page address or excerpt',async({page})=>{
 const external:string[]=[];
 await begin(page,external,true);
 // Chrome uses the browser host fixture for private tabs in this test.
 await page.evaluate(()=>{(window as any).Capacitor.isNativePlatform=()=>true;});
 await button(page,'Menu').click();await button(page,'New private tab').click();
 const address=page.getByRole('textbox',{name:'Address',exact:true});
 await address.fill(url);await address.press('Enter');
 await expect(sourceHeading(page)).toBeVisible();
 await startSpokenPageQuestion(page,question);
 await expect.poll(async()=>(await turns(page)).length).toBe(1);
 const passage=pageAttachment((await turns(page))[0]);
 expect(passage).toContain('No readable public page');
 expect(passage).not.toContain(url);
 expect(passage).not.toContain(fact);
 expect(external).toEqual([]);
});

test('a Browser question unrelated to the page sends no page context',async({page})=>{
  const external:string[]=[];
  await begin(page,external,true);
  await composer(page).fill('What is two plus two?');await button(page,'Send').click();
  await expect.poll(async()=>(await turns(page)).length).toBe(1);
  expect((await turns(page))[0]).toEqual({text:'What is two plus two?',attachments:[]});
  expect(external).toEqual([]);
});

test('a page change while reading retires an unsent excerpt',async({page})=>{
  const external:string[]=[];
  await begin(page,external,true);
  let release!:()=>void;
  const reading=new Promise<void>(resolve=>release=resolve);
  let requested=false;
  await page.route(url,async route=>{
    if(route.request().resourceType()==='fetch'){requested=true;await reading;}
    await route.fulfill({contentType:'text/html',headers:{'access-control-allow-origin':'*'},body:html}).catch(()=>{});
  });
  await startSpokenPageQuestion(page,question);
  await expect.poll(()=>requested).toBe(true);
  const another='https://public-fixture.test/another';
  await page.route(another,route=>route.fulfill({contentType:'text/html',body:'<h1>Another page</h1>'}));
  await button(page,'Edit address').click();
  const address=page.getByRole('textbox',{name:'Address',exact:true});
  await address.fill(another);await address.press('Enter');
  await expect(page.locator('iframe[title="Website"]:visible').contentFrame().getByRole('heading',{name:'Another page'})).toBeVisible();
  release();
  await expect.poll(()=>page.evaluate(()=>(window as any).spokenPageResult)).toBe('AbortError');
  expect(await turns(page)).toEqual([]);
  expect(external).toEqual([]);
});
