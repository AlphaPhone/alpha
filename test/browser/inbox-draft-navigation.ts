import type {Page} from '@playwright/test';
export async function localDraftRow(page:Page,name:string|RegExp=/^Local draft,/){
 await page.getByRole('button',{name:'Other mail folders',exact:true}).click();await page.getByRole('menuitemradio',{name:'Drafts',exact:true}).click();
 return page.getByRole('button',{name}).first();
}
