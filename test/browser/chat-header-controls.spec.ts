import {test,expect,type Page} from '@playwright/test';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';
import {setTextScale} from './accessibility-states';
import {settled} from './helpers/settled';
import {guardCalendarFixture as guardNoMedia} from './calendar-draft-readiness';

async function conversations(page:Page){return page.evaluate(async()=>{
 const {developmentIdentity}=await import('/src/browser/development-identity.ts');
 const {readDevelopmentAgent}=await import('/src/browser/development-agent-document.ts');
 const data=await readDevelopmentAgent(developmentIdentity('local'));
 return {ids:data.conversations.map((item:any)=>item.id),messages:data.conversations.reduce((sum:number,item:any)=>sum+item.messages.length,0)};
});}
async function currentConversation(page:Page){return page.evaluate(async()=>{
 const snapshot=(await import('/src/runtime/connection-ui.tsx')).connectionController.getSnapshot();
 return snapshot.busy?'':snapshot.history?.conversationId||'';
});}
async function usableHeader(page:Page){
 const header=page.locator('[data-alpha-chat-header]');
 for(const name of ['Go Home']){
  const button=header.getByRole('button',{name,exact:true});await expect(button).toBeVisible();await expect(button).toBeInViewport();
  await expect(async()=>{const usable=await button.evaluate(element=>{
   const bounds=element.getBoundingClientRect(),header=element.closest('[data-alpha-chat-header]')!.getBoundingClientRect(),pane=element.closest('[data-alpha-layer="conversation"]')!.getBoundingClientRect();
   const hit=document.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   return bounds.left>=header.left-1&&bounds.right<=header.right+1&&bounds.top>=header.top-1&&bounds.bottom<=header.bottom+1&&bounds.left>=pane.left-1&&bounds.right<=pane.right+1&&(hit===element||element.contains(hit));
  });expect(usable).toBe(true);}).toPass();
 }
 await expect(header.getByRole('button',{name:'New chat',exact:true})).toHaveCount(0);
 await expect(header.getByRole('button',{name:'Chat history',exact:true})).toHaveCount(0);
 const home=header.getByRole('button',{name:'Go Home',exact:true});
 await home.focus();await expect(home).toBeFocused();
 const boxes=await header.locator('button').evaluateAll(elements=>elements.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';}).map(el=>{const r=el.getBoundingClientRect();return {name:el.getAttribute('aria-label'),left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
 for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++)expect(Math.min(boxes[a].right,boxes[b].right)-Math.max(boxes[a].left,boxes[b].left)>1&&Math.min(boxes[a].bottom,boxes[b].bottom)-Math.max(boxes[a].top,boxes[b].top)>1,`${boxes[a].name} overlaps ${boxes[b].name}`).toBe(false);
}
for(const shell of ['standalone','launcher'])for(const theme of ['light','dark'])test(`connected chat header stays minimal and preserves history at 640x360 and 300% text: ${shell} ${theme}`,async({context,page},info)=>{
 await guardNoMedia(context);const foreign:string[]=[];await page.route(/^https?:\/\/(?!127\.0\.0\.1:|localhost:)/,async route=>{foreign.push(route.request().url());await route.abort();});
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.setViewportSize({width:412,height:915});await page.goto(`/?mode=dev&theme=${theme}${shell==='launcher'?'&shell=launcher':''}`);
 await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);
 await page.getByRole('button',{name:'Connect development profile',exact:true}).click();await returnToApps(page);
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await expect(page.locator('[data-alpha-chat-header]')).toBeVisible();
 await usableHeader(page);await page.screenshot({path:info.outputPath('header-portrait.png')});
 await page.setViewportSize({width:640,height:360});await setTextScale(page,3);await settled(page);
 await usableHeader(page);await page.screenshot({path:info.outputPath('header-landscape-300.png')});
 const before=await conversations(page),room=await currentConversation(page);
 await page.locator('[data-alpha-chat-header]').getByRole('button',{name:'Go Home',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);
 const dialog=page.getByRole('dialog',{name:'Development connections',exact:true});await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Load conversations',exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Load conversations',exact:true}).click();
 expect(await conversations(page)).toEqual(before);expect(await currentConversation(page)).toBe(room);expect(foreign).toEqual([]);
});
