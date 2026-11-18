import {test,expect} from '@playwright/test';


test('healthy stores show no recovery entry',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));await page.goto('/?tools=1');
 await page.getByRole('button',{name:'Browser',exact:true}).click();await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bookmarks and history',exact:true}).click();
 await expect(page.getByText('Empty',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Recover saved bookmarks',exact:true})).toHaveCount(0);
 await page.goto('/?tools=1');await page.getByRole('button',{name:'Photos',exact:true}).click();await page.getByRole('button',{name:'Albums',exact:true}).click();
 await expect(page.getByRole('button',{name:'Favorites',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Recover$/})).toHaveCount(0);
});
