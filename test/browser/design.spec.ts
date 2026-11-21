import { test, expect, type Page } from '@playwright/test';
const states = {
  inbox:['','mail','compose'], calendar:['','event','new','month','invite','add'],
  browser:['','book','tabs','agent'], camera:['','video','scan'], photos:['','viewer','albums','search'],
  maps:['','search','place','route','nav'], notes:['','editor','rec','voice'], files:['','folder','preview'],
  workflows:['','flow','run','failed','new'], settings:['','character','accounts','adding','privacy','wifi'],
};
// Each start state is its own test: one boot each, so a state's budget never depends on how many
// other states share a view, and the states spread across workers.
const errorsOn=(page:Page)=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});return errors;};
for (const theme of ['light','dark']) for(const [view,subs] of Object.entries(states)) for(const sub of subs) {
  const start=view+(sub?':'+sub:'');
  test(`design ${theme}: ${start} renders without errors`,async({page})=>{
    const errors=errorsOn(page);
    await page.goto(`/?mode=mock&theme=${theme}&start=${start}`);
    await expect(page.locator('.mock-mode-banner')).toBeVisible();
    await expect(page.locator('[data-screen]')).toBeVisible();
    if(view==='workflows'&&sub==='failed'){
      await expect(page.getByText('Failed', {exact:true})).toBeVisible();
      await page.getByText('Details', {exact:true}).click();
      await expect(page.getByText('Calendar access was revoked.', {exact:true})).toBeVisible();
    }
    expect(await page.locator('[data-screen]').innerText()).not.toContain('undefined');
    expect(errors).toEqual([]);
  });
}
for(const theme of ['light','dark'])for(const state of ['home','boot','lock','shade','sheet','full','voice','heads'])test(`design ${theme}: shell state ${state} renders without errors`,async({page})=>{
  const errors=errorsOn(page);
  await page.goto(`/?mode=mock&theme=${theme}&start=${state}`);
  await expect(page.locator('.mock-mode-banner')).toBeVisible();
  // SMS heads-up is deferred by the MVP scope and intentionally returns Home.
  if(state==='heads')await expect(page.getByRole('button',{name:'Inbox',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
