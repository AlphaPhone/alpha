import {test,expect} from '@playwright/test';
test('a document excerpt with a verification code is refused until it is edited',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/?mode=dev');
 await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').importFile(new File(['Pick up the bikes on Friday.\nYour verification code is 482913'],'errands.txt',{type:'text/plain'}));});
 await page.getByRole('button',{name:'Files',exact:true}).click();await page.getByRole('button',{name:'Internal storage',exact:true}).click();
 await page.getByRole('button',{name:'Open errands.txt',exact:true}).click();
 await page.getByRole('button',{name:'Ask Alpha',exact:true}).click();
 const review=page.getByRole('dialog',{name:'Ask about selected content'}),excerpt=review.getByRole('textbox',{name:'Content excerpt'});
 await expect(excerpt).toHaveValue('Pick up the bikes on Friday.\nYour verification code is 482913');
 const composer=page.getByRole('textbox',{name:'Message Alpha',exact:true});
 await review.getByRole('button',{name:'Use in conversation'}).click();
 await expect(review.getByRole('status')).toHaveText('Remove secrets first');
 await expect(review).toBeVisible();
 await excerpt.fill('Pick up the bikes on Friday.');
 await review.getByRole('button',{name:'Use in conversation'}).click();
 await expect(review).toHaveCount(0);
 await expect(composer).toHaveValue('Summarize this excerpt.\n\nSource: errands.txt\n\nPick up the bikes on Friday.');
});
