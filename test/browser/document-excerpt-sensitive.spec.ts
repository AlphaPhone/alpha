import {test,expect} from '@playwright/test';

test('a document preview with a verification code stays out of the chat draft',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/?mode=dev');
 await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').importFile(new File(['Pick up the bikes on Friday.\nYour verification code is 482913'],'errands.txt',{type:'text/plain'}));});
 await page.getByRole('button',{name:'Files',exact:true}).click();
 await page.getByRole('button',{name:'Internal storage',exact:true}).click();
 await page.getByRole('button',{name:'Open errands.txt',exact:true}).click();
 await expect(page.getByText('Your verification code is 482913',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'File actions',exact:true}).click();
 await expect(page.getByRole('button',{name:'Ask Alpha',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Use excerpt',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Remove errands.txt',exact:true})).toHaveCount(0);
 await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
});
