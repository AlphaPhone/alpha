import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import { returnToApps } from './app-navigation';
import {test,expect} from '@playwright/test';
test('a selected file stages a chat attachment and sends only on explicit Send',async({page})=>{
 await page.goto('/?mode=dev');await openConnectionDiagnostics(page);await page.getByRole('button',{name:'Connect development profile'}).click();await returnToApps(page);
 await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').importFile(new File(['Public excerpt\nPRIVATE OMIT'],'review.txt',{type:'text/plain'}));});
 await page.getByRole('button',{name:'Files',exact:true}).click();await page.getByRole('button',{name:'Internal storage',exact:true}).click();await page.getByRole('button',{name:'Open review.txt',exact:true}).click();
 await expect(page.getByText('PRIVATE OMIT',{exact:true})).toBeVisible();await page.getByRole('button',{name:'File actions',exact:true}).click();
 await page.getByRole('button',{name:'Ask Alpha',exact:true}).click();
 const composer=page.getByRole('textbox',{name:'Message Alpha',exact:true});
 await expect(page.getByRole('button',{name:'Remove review.txt',exact:true})).toBeVisible();
 await expect(composer).toHaveValue('Explain this file');
 await composer.fill('What does this mean?');
 await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
 expect(await page.evaluate(async()=>(await (await import('/src/browser/development-agent-document.ts')).readDevelopmentAgent((await import('/src/browser/development-identity.ts')).developmentIdentity('local'))).conversations.flatMap((c:any)=>c.messages))).toEqual([]);
 await page.getByRole('button',{name:'Send',exact:true}).click();await expect.poll(()=>page.evaluate(async()=>(await (await import('/src/browser/development-agent-document.ts')).readDevelopmentAgent((await import('/src/browser/development-identity.ts')).developmentIdentity('local'))).conversations.flatMap((c:any)=>c.messages).map((m:any)=>({...m,text:m.role==='user'?m.text.split('[USER MESSAGE]\n')[1]:m.text})))).toEqual([{id:expect.any(String),role:'user',text:'What does this mean?'},{id:expect.any(String),role:'assistant',text:'Development reply. Edit this response in Agent connection.'}]);
 await expect(page.getByText('Review summary note',{exact:true})).toHaveCount(0);
});
