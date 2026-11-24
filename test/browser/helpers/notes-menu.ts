import {expect,type Page} from '@playwright/test';

export async function openNotesTrash(page:Page){
 await expect(page.getByRole('button',{name:'Recently deleted',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Notes options',exact:true}).click();
 await page.getByRole('dialog',{name:'Notes options',exact:true}).getByRole('button',{name:'Recently deleted',exact:true}).click();
}
