import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {test,expect,type Page} from '@playwright/test';
import {returnToApps} from './app-navigation';

// Browser controls proposed from chat: search, new tab, switch (one match and several), close,
// find in page, back and reload, each checked by what Browser then shows.
// Real shell, connection controller, device-action coordinator, action journal binding and web
// Browser. The agent's HTTP answers and the websites are synthetic. The web Browser cannot search
// a page, so find in page is checked as not offered here; native find is not exercised.
// Evidence class: browser test of the web renderer; not a device, WebView, agent or model run.
// `plan`: what the synthetic agent proposes for each message. `bound`: the server tied it to that
// message, as it does for a direct request; closing a tab is never bound. `offered`: what it offers.
const installAgent=(page:Page,plan:Record<string,{operation:any;bound:boolean}>,offered:string[])=>page.addInitScript(({plan,offered})=>{
  // Init scripts also run in each website frame; the fixture belongs to the host document only.
  if(window!==window.top)return;
  const w=window as any,store=new Map(),agentId='12345678-1234-4234-8234-123456789abc';
  const f=w.browserControlFixture={posts:[] as any[],proposals:[] as any[],receipts:[] as any[],decisions:[] as string[],entries:new Map<string,any>(),capabilities:''};
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  w.Capacitor={PluginHeaders:[{name:'AlphaConnection',methods:methods(['request','cancel','secureRead','secureWrite','secureCompareExchange','secureRemove'])},{name:'AlphaActionJournal',methods:methods(['reserve','markApplying','finish','get','list'])}],nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin==='AlphaActionJournal'){
    if(method==='reserve'){const entry={...input,phase:'reserved'};f.entries.set(input.proposalId,entry);return{created:true,entry};}
    if(method==='markApplying'){Object.assign(f.entries.get(input.proposalId),{phase:'applying',attemptId:input.attemptId});return{};}
    if(method==='finish'){Object.assign(f.entries.get(input.proposalId),input,{phase:'terminal'});return{};}
    if(method==='get')return{entry:f.entries.get(input.proposalId)};
    if(method==='list')return{entries:[...f.entries.values()]};
   }
   if(plugin!=='AlphaConnection')throw Error('Unexpected native effect');
   if(method==='secureRead')return{value:store.get(input.slot)??null};
   if(method==='secureWrite'){store.set(input.slot,input.value);return{};}
   if(method==='secureRemove'){store.delete(input.slot);return{};}
   if(method==='secureCompareExchange'){if((store.get(input.slot)??null)!==input.expectedValue)return{status:'conflict'};if(input.value===null)store.delete(input.slot);else store.set(input.slot,input.value);return{status:'saved'};}
   if(method==='cancel')return{};
   const path=new URL(input.url).pathname,body=input.body?JSON.parse(input.body):{},ok=(data:any)=>({status:200,data});
   if(path==='/api/auth/status')return ok({required:true,authenticated:false,pairingEnabled:true,bootstrapRequired:false,instanceId:'browser-fixture',expiresAt:Date.now()+60000});
   if(path==='/api/auth/pair')return ok({token:'synthetic-session',identityId:'fixture-owner',access:'owner',instanceId:'browser-fixture'});
   if(path==='/api/auth/me')return ok({identity:{id:'fixture-owner',displayName:'Fixture',kind:'owner'},session:{id:'synthetic-session',kind:'machine',expiresAt:Date.now()+600000},access:{role:'OWNER',mode:'session'}});
   if(path==='/api/agents')return ok({agents:[{id:agentId,name:'Browser fixture',status:'running'}]});
   // The agent offers all four groups; this web build must not take find in page.
   if(path==='/api/client-devices/register'){w.browserInstallation=input.headers['X-Eliza-Device-Id'];return ok({installationId:w.browserInstallation,enrollmentId:'browser-enrollment',capabilities:offered});}
   if(path==='/api/workflow/status')return ok({});
   if(path==='/api/conversations'&&input.method==='POST')return ok({conversation:{id:'browser-chat',title:'Fixture'}});
   if(path==='/api/conversations/browser-chat/messages'&&input.method==='POST'){
    // This fixture agent negotiates no text format, so the development build prefixes the screen observation.
    const text=Object.keys(plan).find(key=>String(body.text).endsWith(key));if(!text)throw Error('Unplanned message '+body.text);const planned=plan[text];
    const userMessageId=crypto.randomUUID(),id='proposal-'+(f.proposals.length+1);
    f.capabilities=input.headers['X-Eliza-Device-Capabilities']??'';
    f.posts.push({text,mode:body.metadata?.agentActionMode??null});
    f.proposals.push({id,digest:String(f.proposals.length+1).repeat(64).slice(0,64),state:'pending',expiresAt:new Date(Date.now()+600000).toISOString(),subjectUserId:'fixture-owner',requestedBy:agentId,action:'device_action',payload:{action:'device_action',version:1,installationId:w.browserInstallation,enrollmentId:'browser-enrollment',operation:planned.operation,...(planned.bound?{requestMessageId:userMessageId}:{})}});
    return ok({text:planned.bound?'Doing that in Browser.':'Review this on your phone.',agentName:'Browser fixture',userMessageId});
   }
   if(path==='/api/client-devices/proposals')return ok({proposals:f.proposals});
   const step=/^\/api\/client-devices\/proposals\/(proposal-\d+)\/(decision|claim|receipt)$/.exec(path);
   if(step){
    const proposal=f.proposals.find((row:any)=>row.id===step[1]);if(body.digest!==proposal.digest)throw Error('Digest changed');
    if(step[2]==='decision'){f.decisions.push(proposal.id);proposal.state='approved';}
    if(step[2]==='claim'){proposal.state='executing';proposal.execution={attemptId:'attempt-'+proposal.id};}
    if(step[2]==='receipt'){f.receipts.push({id:proposal.id,...body.receipt});proposal.state=body.receipt.outcome==='applied'?'succeeded':'failed';}
    return ok({proposal,digest:proposal.digest});
   }
   throw Error('Unexpected fixture route '+path);
  }};
},{plan,offered});
async function connect(page:Page){
 await page.goto('/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByText('Local development agent',{exact:true}).click();
 const local=page.locator('.alpha-connection details').filter({has:page.getByText('Local development agent',{exact:true})});
 await local.getByLabel('Local agent address').fill('http://127.0.0.1:47842');
 await local.getByLabel('Pairing code',{exact:true}).fill('synthetic-code');
 await local.getByRole('button',{name:'Connect local agent',exact:true}).click();
 await page.locator('.alpha-connection-scrim').waitFor({state:'detached'});
 await returnToApps(page);
}
function controls(page:Page){
 const fixture=()=>page.evaluate(()=>{const f=(window as any).browserControlFixture;return {posts:f.posts,receipts:f.receipts,decisions:f.decisions,capabilities:f.capabilities};});
 const ask=async(text:string)=>{const input=page.getByRole('textbox',{name:/^(Ask Alpha|Message Alpha|Ask about this page)$/});await input.fill(text);await input.press('Enter');await expect.poll(async()=>(await fixture()).posts.at(-1)?.text).toBe(text);await expect(page.getByRole('button',{name:'Stop reply',exact:true})).toHaveCount(0);};
 const receipts=async(count:number)=>{await expect.poll(async()=>(await fixture()).receipts.length).toBe(count);return (await fixture()).receipts;};
 // The website the selected tab shows, by the heading its fixture page carries.
 const showing=(name:string)=>expect(page.locator('[data-browser-surface]:visible').frameLocator('iframe').getByRole('heading',{name,exact:true})).toBeVisible();
 const tabs=page.getByRole('button',{name:'Tabs',exact:true});
 const browserShown=()=>expect(page.locator('html')).toHaveAttribute('data-active-view','browser');
 // The open chat sheet covers Browser's own controls; the owner minimizes it to use them.
 const minimizeChat=async()=>{const minimize=page.getByRole('button',{name:'Minimize chat',exact:true});if(await minimize.isVisible())await minimize.click();await expect(page.locator('[data-alpha-chat-scrim]')).toHaveCSS('pointer-events','none');};
 const type=async(address:string)=>{await minimizeChat();await page.getByRole('button',{name:/^(Edit address|Search or type address)$/}).click();const box=page.getByRole('textbox',{name:'Address',exact:true});await box.fill(address);await box.press('Enter');};
 return {fixture,ask,receipts,showing,tabs,browserShown,minimizeChat,type};
}

test('Browser controls proposed from chat act on Browser, and the agent learns only the outcome',async({page})=>{
 test.setTimeout(120_000);
 const plan:Record<string,{operation:any;bound:boolean}>={
  'Search the web for harbour tides':{operation:{type:'browser_search',query:'harbour tides'},bound:true},
  'Open a new tab':{operation:{type:'browser_tab_new'},bound:true},
  'Switch to the news tab':{operation:{type:'browser_tab_switch',target:'news'},bound:true},
  'Switch to the shop tab':{operation:{type:'browser_tab_switch',target:'shop'},bound:true},
  'Close the news tab':{operation:{type:'browser_tab_close',target:'news'},bound:false},
  'Go back':{operation:{type:'browser_history',action:'back'},bound:true},
  'Reload this page':{operation:{type:'browser_history',action:'reload'},bound:true},
  'Find harbour on this page':{operation:{type:'browser_find',text:'harbour'},bound:true},
 };
 await installAgent(page,plan,['browser.search.v1','browser.tabs.v1','browser.find.v1','browser.history.v1']);
 const loads:Record<string,number>={};
 await page.route(/^https:\/\/(www\.google\.com|news\.example|shop\.example)\//,route=>{
  const url=new URL(route.request().url()),name=url.hostname==='www.google.com'?'Results for '+url.searchParams.get('q'):url.hostname+url.pathname;
  loads[name]=(loads[name]??0)+1;return route.fulfill({contentType:'text/html',body:`<h1>${name}</h1>`});
 });
 await connect(page);
 const {fixture,ask,receipts,showing,tabs,browserShown,minimizeChat,type}=controls(page);

 // Search, asked from Home: runs without a card and Browser opens on the phone's own search address.
 await ask('Search the web for harbour tides');
 await receipts(1);await browserShown();await showing('Results for harbour tides');
 const first=await fixture();
 expect(first.posts[0].mode).toBe('direct-request-v1');expect(first.decisions).toEqual(['proposal-1']);
 expect(first.capabilities.split(',').sort()).toEqual(expect.arrayContaining(['browser.history.v1','browser.search.v1','browser.tabs.v1']));
 expect(first.capabilities).not.toContain('browser.find.v1');

 // New tab: a second, empty tab is selected with its address field open.
 await ask('Open a new tab');
 await receipts(2);await expect(page.getByRole('textbox',{name:'Address',exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Address',exact:true})).toHaveValue('');

 // Three pages the owner opens by hand: the news site in this tab and two shop pages in new tabs.
 const box=page.getByRole('textbox',{name:'Address',exact:true});await box.fill('https://news.example/today');await box.press('Enter');await showing('news.example/today');await expect(tabs).toHaveText('2');
 await minimizeChat();
 for(const path of ['hats','shoes']){await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'New tab',exact:true}).click();const address=page.getByRole('textbox',{name:'Address',exact:true});await address.fill('https://shop.example/'+path);await address.press('Enter');await showing('shop.example/'+path);}
 await expect(tabs).toHaveText('4');

 // Switch, one match: runs without a card and shows the news tab.
 await ask('Switch to the news tab');
 await receipts(3);await showing('news.example/today');

 // Switch, several matches: never run unseen. The card lists the two shop tabs; the owner picks one.
 await ask('Switch to the shop tab');
 const switchCard=page.getByRole('button',{name:/^Switch tab\b.*Approve$/s});
 await expect(switchCard).toHaveCount(1);expect((await fixture()).receipts).toHaveLength(3);await showing('news.example/today');
 await switchCard.click();
 const choices=page.getByRole('button',{name:/Switch to tab https:\/\/shop\.example\//});
 await expect(choices).toHaveCount(2);
 await expect(page.getByRole('button',{name:/Switch to tab .*news\.example/})).toHaveCount(0);
 await page.getByRole('button',{name:/Switch to tab https:\/\/shop\.example\/hats$/}).click();
 await receipts(4);await showing('shop.example/hats');

 // Close: always reviewed, even with "Ask before Alpha acts" off. Approving closes the news tab only.
 await ask('Close the news tab');
 const closeCard=page.getByRole('button',{name:/^Close tab\b.*Approve$/s});
 await expect(closeCard).toHaveCount(1);await expect(tabs).toHaveText('4');
 await closeCard.click();
 await receipts(5);await expect(tabs).toHaveText('3');await showing('shop.example/hats');
 await minimizeChat();await tabs.click();
 await expect(page.getByRole('button',{name:/^Switch to .*news\.example/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/^Switch to .*shop\.example\/shoes/})).toHaveCount(1);
 await page.getByRole('button',{name:/^Switch to .*shop\.example\/hats/}).click();

 // Back and reload act on the showing tab.
 await type('https://shop.example/scarves');await showing('shop.example/scarves');
 await ask('Go back');
 await receipts(6);await showing('shop.example/hats');
 const before=loads['shop.example/hats'];
 await ask('Reload this page');
 await receipts(7);await expect.poll(()=>loads['shop.example/hats']).toBe(before+1);await showing('shop.example/hats');

 // Find in page: this web Browser cannot search a page, so the proposal is not offered and nothing runs.
 await ask('Find harbour on this page');
 await expect(page.getByText('This action isn\'t available on this phone.',{exact:false}).first()).toBeVisible();
 await expect(page.getByRole('search',{name:'Find in page'})).toHaveCount(0);

 // The agent received outcomes only: no result, tab title, address or search words.
 const done=await fixture();
 expect(done.receipts.map((receipt:any)=>[receipt.id,receipt.outcome])).toEqual([['proposal-1','applied'],['proposal-2','applied'],['proposal-3','applied'],['proposal-4','applied'],['proposal-5','applied'],['proposal-6','applied'],['proposal-7','applied']]);
 for(const receipt of done.receipts)expect(Object.keys(receipt).sort()).toEqual(['id','operationId','outcome']);
 expect(JSON.stringify(done.receipts)).not.toMatch(/example|google|harbour|shop|news/);
});

// The owner's v610 turns (Pixel), in their words. The plan is what the elizaOS route and device
// service store for each: "open wikipedia.org in a new tab" is browser_navigate {url, newTab: true}
// even when the model proposed an empty browser_tab_new. The phone must open Wikipedia in a second
// tab, keep example.com in the first, and then switch, go back and forward, reload and close.
test('an address opened in a new tab from chat loads there, and the tab controls asked next act on it',async({page})=>{
 test.setTimeout(120_000);
 const plan:Record<string,{operation:any;bound:boolean}>={
  'open example.com in the browser':{operation:{type:'browser_navigate',url:'https://example.com/'},bound:true},
  'open wikipedia.org in a new tab':{operation:{type:'browser_navigate',url:'https://wikipedia.org/',newTab:true},bound:true},
  'switch to the example tab':{operation:{type:'browser_tab_switch',target:'example'},bound:true},
  'go back':{operation:{type:'browser_history',action:'back'},bound:true},
  'go forward':{operation:{type:'browser_history',action:'forward'},bound:true},
  'reload':{operation:{type:'browser_history',action:'reload'},bound:true},
  'close this tab':{operation:{type:'browser_tab_close'},bound:false},
 };
 await installAgent(page,plan,['browser.search.v1','browser.tabs.v1','browser.history.v1','browser.open-new-tab.v1']);
 const loads:Record<string,number>={};
 await page.route(/^https:\/\/(example\.com|wikipedia\.org)\//,route=>{
  const url=new URL(route.request().url()),name=url.hostname+url.pathname;
  loads[name]=(loads[name]??0)+1;return route.fulfill({contentType:'text/html',body:`<title>${url.hostname==='example.com'?'Example Domain':'Wikipedia'}</title><h1>${name}</h1>`});
 });
 await connect(page);
 const {fixture,ask,receipts,showing,tabs,browserShown,minimizeChat,type}=controls(page);

 await ask('open example.com in the browser');
 await receipts(1);await browserShown();await showing('example.com/');await expect(tabs).toHaveText('1');
 expect((await fixture()).capabilities.split(',')).toContain('browser.open-new-tab.v1');

 // The v610 failure was a blank "Search or type address" tab here.
 await ask('open wikipedia.org in a new tab');
 await receipts(2);await showing('wikipedia.org/');await expect(tabs).toHaveText('2');
 await expect(page.getByText('Opened a new tab.',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Search or type address',exact:true})).toHaveCount(0);

 await ask('switch to the example tab');
 await receipts(3);await showing('example.com/');await expect(tabs).toHaveText('2');

 // The owner opens a second page in the example tab, so it has a page to go back to.
 await type('https://example.com/more');await showing('example.com/more');
 await ask('go back');
 await receipts(4);await showing('example.com/');
 await ask('go forward');
 await receipts(5);await showing('example.com/more');
 const before=loads['example.com/more'];
 await ask('reload');
 await receipts(6);await expect.poll(()=>loads['example.com/more']).toBe(before+1);await showing('example.com/more');

 // Closing is reviewed; approving closes the example tab and leaves Wikipedia showing.
 await ask('close this tab');
 const closeCard=page.getByRole('button',{name:/^Close tab\b.*Approve$/s});
 await expect(closeCard).toHaveCount(1);await expect(tabs).toHaveText('2');
 await closeCard.click();
 await receipts(7);await expect(tabs).toHaveText('1');await showing('wikipedia.org/');
 await minimizeChat();await tabs.click();
 await expect(page.getByRole('button',{name:/^Switch to .*example\.com/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/^Switch to .*wikipedia\.org/})).toHaveCount(1);

 const done=await fixture();
 expect(done.receipts.map((receipt:any)=>receipt.outcome)).toEqual(Array(7).fill('applied'));
 expect(done.decisions).toEqual(['proposal-1','proposal-2','proposal-3','proposal-4','proposal-5','proposal-6','proposal-7']);
 expect(JSON.stringify(done.receipts)).not.toMatch(/example|wikipedia/);
});
