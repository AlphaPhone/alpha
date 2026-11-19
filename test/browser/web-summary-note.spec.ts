import {test,expect} from '@playwright/test';
import {openLegacyNotes} from './helpers/legacy-notes';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {returnToApps} from './app-navigation';

test('a retained summary note still reopens its saved web source',async({page})=>{
 await page.route('https://public-fixture.test/garden',route=>route.fulfill({contentType:'text/html',body:'<h1>Garden report</h1>'}));
 await page.goto('/?mode=dev');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByRole('button',{name:'Connect development profile'}).click();
 await returnToApps(page);
 await openLegacyNotes(page,[{id:'garden-summary',kind:'text',title:'Garden summary',body:'Twelve raised beds.',
  webSource:{kind:'web-page',version:1,name:'Garden report',url:'https://public-fixture.test/garden'}}]);
 await page.getByRole('button',{name:'Open Garden summary',exact:true}).click();
 await page.getByRole('button',{name:'Web source linked',exact:true}).click();
 const source=page.getByRole('dialog',{name:'Note web source'});
 await expect(source).toContainText('https://public-fixture.test/garden');
 await source.getByRole('button',{name:'Open source page',exact:true}).click();
 await expect(source).toHaveCount(0);
 await expect(page.frameLocator('iframe[title="Website"]').getByRole('heading',{name:'Garden report'})).toBeVisible();
});
