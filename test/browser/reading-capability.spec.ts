import {test,expect} from '@playwright/test';
// Chromium checks the web renderer. The native capability remains covered by the Android
// BrowserReadingNavigation test and the shared reading-capability probe.
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));await page.goto('/');});
test('Browser and Chat actions stay clear of separate page review controls',async({page})=>{
 await page.route('https://reading.example/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Public reading fixture</h1>'}));
 await page.getByRole('button',{name:'Browser',exact:true}).click();
 await page.getByRole('button',{name:'Search or type address',exact:true}).click();
 await page.getByRole('textbox',{name:'Address',exact:true}).fill('https://reading.example/article');
 await page.getByRole('textbox',{name:'Address',exact:true}).press('Enter');
 await expect(page.frameLocator('iframe[title="Website"]').getByRole('heading',{name:'Public reading fixture'})).toBeVisible();
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 const menu=page.getByRole('dialog',{name:'Browser menu'});
 await expect(menu.getByRole('button',{name:'Read aloud',exact:true})).toHaveCount(0);
 await expect(menu.getByRole('button',{name:'Ask about page',exact:true})).toHaveCount(0);
 await expect(menu.locator('[data-alpha-reading-unavailable]')).toHaveCount(0);
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Chat actions',exact:true}).click();
 await expect(page.getByRole('button',{name:'Attach page',exact:true})).toHaveCount(0);
});
