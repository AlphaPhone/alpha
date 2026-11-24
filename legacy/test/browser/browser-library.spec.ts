import {test,expect,type Page} from '@playwright/test';
// Browser's Bookmarks and history list: page names, day headings, the filter, and a bookmark saved
// from a private tab keeping its page name, also across a reload (the web build's cold start). As in browser-signins.spec.ts, the registered
// sandboxed BrowserSurface is a closed stand-in for the native tab host's page events. That
// stand-in cannot read a sandboxed page's title, so here it reports each page's name as the
// native host does: the fixture page's title is its decoded path.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.route('https://library.example/**',route=>{const name=decodeURIComponent(new URL(route.request().url()).pathname.slice(1));return route.fulfill({contentType:'text/html',body:`<title>${name}</title><h1>${name}</h1>`});});
 await page.goto('/');
});
const heading=(page:Page,name:string)=>page.frameLocator('[data-browser-surface]:visible iframe').getByRole('heading',{name,exact:true});
async function openBrowser(page:Page){
 await page.evaluate(async()=>{
  const {BrowserSurface}=await import('/src/browser/browser-surface.ts');
  const proto=BrowserSurface.prototype as any,notify=proto.notifyListeners;
  proto.notifyListeners=function(event:string,data:any,...rest:unknown[]){
   if(event==='stateChanged'&&typeof data?.url==='string'&&data.url.startsWith('https://library.example/'))data={...data,title:decodeURIComponent(new URL(data.url).pathname.slice(1))};
   return notify.call(this,event,data,...rest);
  };
  (window as any).Capacitor.isNativePlatform=()=>true;
 });await page.getByRole('button',{name:'Browser',exact:true}).click();await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeVisible();}
async function navigate(page:Page,path:string){
 if(!await page.getByRole('textbox',{name:'Address',exact:true}).isVisible())await page.getByRole('button',{name:'Edit address',exact:true}).click();
 await page.getByRole('textbox',{name:'Address',exact:true}).fill('https://library.example/'+path);await page.getByRole('textbox',{name:'Address',exact:true}).press('Enter');
 await expect(heading(page,path)).toBeVisible();
}
async function menu(page:Page,name:string){await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();}
const library=(page:Page)=>page.locator('[data-alpha-subview="browser-library"]');

test('history shows page names under the day they were visited and can be filtered',async({page})=>{
 test.slow();
 await openBrowser(page);await navigate(page,'Morning news');await navigate(page,'Soup recipe');
 await menu(page,'Bookmarks and history');await library(page).getByRole('button',{name:'History',exact:true}).click();
 const list=library(page);
 await expect(list.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
 await expect(list.getByRole('button',{name:'https://library.example/Soup%20recipe',exact:true})).toContainText('Soup recipe');
 await expect(list.getByRole('button',{name:'https://library.example/Morning%20news',exact:true})).toContainText('Morning news');
 const search=list.getByRole('searchbox',{name:'Search history',exact:true});
 await search.fill('soup');
 await expect(list.getByRole('button',{name:'https://library.example/Soup%20recipe',exact:true})).toBeVisible();
 await expect(list.getByRole('button',{name:'https://library.example/Morning%20news',exact:true})).toHaveCount(0);
 await search.fill('nothing like this');
 await expect(list.getByRole('status')).toHaveText('No matches');
});

test('a bookmark saved in a private tab keeps the page name while the visit is not kept',async({page})=>{
 test.slow();
 await openBrowser(page);
 await menu(page,'New private tab');await navigate(page,'Lentil soup');
 await menu(page,'Bookmark');
 await menu(page,'Bookmarks and history');
 const list=library(page);
 const row=list.getByRole('button',{name:'https://library.example/Lentil%20soup',exact:true});
 await expect(row).toContainText('Lentil soup');
 await expect(row).toContainText('library.example/Lentil%20soup');
 await list.getByRole('button',{name:'History',exact:true}).click();
 await expect(list.getByRole('button',{name:'https://library.example/Lentil%20soup',exact:true})).toHaveCount(0);
});

test('a bookmark keeps its page name across a cold start; one saved before names shows its site',async({page})=>{
 test.slow();
 // A record written before bookmark titles: bare addresses only.
 await page.evaluate(async()=>{const {bookmarkDocument}=await import('/src/browser/preference-documents.ts');await bookmarkDocument.edit<string[],void>(()=>[],rows=>{rows.splice(0,rows.length,'https://library.example/Old%20page');});});
 await openBrowser(page);
 // A private tab is not restored after the restart, so only the bookmark can carry the name.
 await menu(page,'New private tab');await navigate(page,'Lentil soup');
 await menu(page,'Bookmark');
 // As the native store: the address list keeps the format previous builds read; the titles sit
 // beside it, bound to that exact list.
 const saved=()=>page.evaluate(async()=>{const {bookmarkDocument,bookmarkTitleDocument}=await import('/src/browser/preference-documents.ts');return [await bookmarkDocument.read<unknown[]>(()=>[]),await bookmarkTitleDocument.read<unknown>(()=>null)];});
 await expect.poll(saved).toEqual([['https://library.example/Lentil%20soup','https://library.example/Old%20page'],{addresses:['https://library.example/Lentil%20soup','https://library.example/Old%20page'],titles:['Lentil soup',null]}]);
 await page.reload();
 await openBrowser(page);
 await menu(page,'Bookmarks and history');
 const list=library(page);
 const named=list.getByRole('button',{name:'https://library.example/Lentil%20soup',exact:true});
 await expect(named).toContainText('Lentil soup');
 const old=list.getByRole('button',{name:'https://library.example/Old%20page',exact:true});
 await expect(old).toContainText('library.example/Old%20page');
 await expect(old).not.toContainText('Old page');
 await list.getByRole('searchbox',{name:'Search bookmarks',exact:true}).fill('lentil');
 await expect(named).toBeVisible();await expect(old).toHaveCount(0);
 // A previous build that edits the address list leaves the titles behind; they are dropped and the
 // edited list stands.
 await page.evaluate(async()=>{const {bookmarkDocument}=await import('/src/browser/preference-documents.ts');await bookmarkDocument.edit<string[],void>(()=>[],rows=>{rows.splice(1,1);});});
 await page.reload();
 await openBrowser(page);
 await menu(page,'Bookmarks and history');
 const rewritten=library(page).getByRole('button',{name:'https://library.example/Lentil%20soup',exact:true});
 await expect(rewritten).toContainText('library.example/Lentil%20soup');
 await expect(rewritten).not.toContainText('Lentil soup');
 await expect(library(page).getByRole('button',{name:'https://library.example/Old%20page',exact:true})).toHaveCount(0);
});

test('Show in Files from the Downloads list opens Files at Downloads',async({page})=>{
 test.slow();
 // The native Downloads list is an Android dialog. Its Show in Files reaches the renderer as the
 // plugin's showDownloads event for this Browser's session; the stand-in sends that event, first
 // for another Browser document, which must open nothing.
 await page.evaluate(async()=>{
  const {BrowserSurface}=await import('/src/browser/browser-surface.ts');
  (BrowserSurface.prototype as any).downloads=async function(input:{session:string}){
   await this.notifyListeners('showDownloads',{session:'another-browser'});
   (window as any).stillBrowser=!!document.querySelector('[aria-label="Menu"]');
   await this.notifyListeners('showDownloads',{session:input.session});
  };
 });
 // A finished download has created the phone's Download folder.
 await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaFiles').storageCreateFolder({parent:'',name:'Download'});});
 await openBrowser(page);await navigate(page,'Report');
 await menu(page,'Downloads');
 expect(await page.evaluate(()=>(window as any).stillBrowser)).toBe(true);
 await expect(page.getByRole('button',{name:'Menu',exact:true})).toHaveCount(0);
 const folder=page.locator('[data-alpha-subview="files-folder"]');
 await expect(folder).toBeVisible();
 await expect(folder.getByText('Download',{exact:true}).first()).toBeVisible();
 await page.screenshot({path:test.info().outputPath('files-downloads.png')});
});
