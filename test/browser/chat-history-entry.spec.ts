import {test,expect,type Page} from '@playwright/test';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';

// CHAT-07: chat history is reachable from the chat itself. The real controller, chat tools and
// agent adapter run against the local development profile; no message is sent and no provider is
// used. In test builds history opens the agent connection panel; on the phone it is Settings ›
// About › Agent activity, which this browser fixture cannot render.

async function connectedChat(page:Page){
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.setViewportSize({width:412,height:915});await page.goto('/?mode=dev');
 await page.getByRole('button',{name:'Settings',exact:true}).click();await openConnectionDiagnostics(page);
 await page.getByRole('button',{name:'Connect development profile',exact:true}).click();await returnToApps(page);
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await expect(page.locator('[data-alpha-chat-header]')).toBeVisible();
}
/** The mounted shell's own agentSay(), the call the agent adapter makes for a recovery reply. */
const agentSays=(page:Page,text:string)=>page.evaluate(text=>{
 const screen=document.querySelector('[data-screen]') as any;
 let fiber=screen[Object.keys(screen).find(name=>name.startsWith('__reactFiber$'))!];
 while(fiber&&!(fiber.stateNode&&typeof fiber.stateNode.agentSay==='function'))fiber=fiber.return;
 fiber.stateNode.agentSay(text);
},text);

test('the chat header Home control shows that it leads back, and keeps its name',async({page})=>{
 await connectedChat(page);
 const home=page.locator('[data-alpha-chat-header]').getByRole('button',{name:'Go Home',exact:true});
 // The back chevron is drawn before the Alpha mark (icons render as lucide masks).
 await expect(home.locator(':scope > [data-alpha-icon$="/chevron-left.svg"]')).toBeVisible();
 await expect(home).toContainText('Alpha');
});

test('Chat actions offers New chat and Chat history once an agent is connected',async({page})=>{
 await connectedChat(page);
 await page.getByRole('button',{name:'Chat actions',exact:true}).first().click();
 const menu=page.getByRole('dialog',{name:'Chat actions',exact:true});
 await expect(menu.getByRole('button',{name:'New chat',exact:true})).toBeVisible();
 await menu.getByRole('button',{name:'Chat history',exact:true}).click();
 await expect(menu).toHaveCount(0);
 await expect(page.getByRole('dialog',{name:'Development connections',exact:true})).toBeVisible();
});

test('a reply that says to check history carries a Chat history button that opens it',async({page})=>{
 await connectedChat(page);
 await agentSays(page,'The screen opened, but the conversation response was interrupted. Check history before sending again.');
 await agentSays(page,'Here is your note.');
 const links=page.locator('[data-alpha-transcript] [data-alpha-history-link]');
 await expect(links).toHaveCount(1);
 const row=page.locator('[data-alpha-transcript] [data-alpha-agent-row="true"]').filter({has:page.locator('[data-alpha-history-link]')});
 await expect(row).toContainText('Check history before sending again.');
 await links.click();
 await expect(page.getByRole('dialog',{name:'Development connections',exact:true})).toBeVisible();
});
