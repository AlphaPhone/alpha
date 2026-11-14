import {test,expect} from '@playwright/test';
import {photosBridge} from './helpers/photos-bridge';

test('Photos keeps sharing without a separate email action or mail source read',async({page})=>{
 await photosBridge(page,'full',false);
 await page.getByRole('button',{name:'Photos',exact:true}).click();
 await page.getByRole('button',{name:/^Photo, /}).click();
 await page.getByLabel('Photo actions',{exact:true}).click();
 await expect(page.getByRole('button',{name:'Email',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Share',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).mediaFixture.calls.filter((c:any)=>c.method==='readPhotoSelected').length)).toBe(0);
});
