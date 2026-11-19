import {test,expect,type Page} from '@playwright/test';

// The Maps place sheet, route sheet and map controls as the launcher renders them, over a
// scripted provider installed in the page. The public basemap is a closed render fixture: its
// style is fulfilled here and no tile is fetched.
test.use({hasTouch:true});

async function setup(page:Page){
 await page.route('https://tiles.openfreemap.org/**',route=>route.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e7ebed'}}]}}));
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.goto('/');
 await page.evaluate(async()=>{
  const {configureMapsProvider}=await import('/src/maps/runtime.ts');
  const now=Date.now(),attribution='Fixture';
  const cafe={providerId:'controls-fixture',id:'cafe-1',name:'Harbour Cafe',coordinate:{latitude:43.7384,longitude:7.4246},phone:'+377 93 15 00 00',attribution,fetchedAt:now};
  const f=(window as any).mapsControls={routes:[] as any[]};
  configureMapsProvider({status:'configured',providerId:'controls-fixture',connectionId:'conn_controls_fixture_123456',revision:'fixture1',capabilities:{map:false,search:true,placeDetails:true,modes:['drive','walk'],traffic:'none',transit:'none',offline:{map:false,search:false,routing:false}}},
   {providerId:'controls-fixture',connectionId:'conn_controls_fixture_123456',search:async()=>[cafe],detail:async()=>cafe,
    route:async(from:any,to:any,mode:any)=>{const route={providerId:'controls-fixture',id:`route_fixture_${f.routes.length+1}_0123456789`,from,to,mode,geometry:[from,to],distanceMeters:900,durationSeconds:660,attribution,fetchedAt:Date.now(),traffic:'none',
     steps:[{instruction:'Head east',coordinate:from,distanceMeters:900,maneuver:'depart'},{instruction:'Arrive',coordinate:to,distanceMeters:0,maneuver:'arrive'}]};f.routes.push(route);return route;}} as any);
 });
 await page.getByRole('button',{name:'Maps',exact:true}).click();
 await expect(page.locator('[data-alpha-map-plane]')).toHaveAttribute('data-map-ready','true');
}
const search=(page:Page)=>page.getByRole('searchbox',{name:'Search places',exact:true});
async function openCafe(page:Page){
 await search(page).fill('cafe');await search(page).press('Enter');
 await page.locator('[data-alpha-maps-sheet="results"]').getByRole('button',{name:/^Harbour Cafe/}).click();
 await expect(page.locator('[data-alpha-maps-sheet="place"] h1')).toHaveText('Harbour Cafe');
}
/** The centre of the visible map, clear of the search field and the sheets. */
async function mapPoint(page:Page){
 const box=(await page.locator('[data-alpha-map-plane]').boundingBox())!;
 return {x:Math.round(box.x+box.width/2),y:Math.round(box.y+box.height*.38)};
}

test('a provider place shows its phone number in a full-height row with Copy',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copied=text;}}}));
 await setup(page);await openCafe(page);
 const row=page.locator('[data-alpha-maps-place-phone]');
 await expect(row).toBeVisible();await expect(row).toContainText('+377 93 15 00 00');
 expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(48);
 const copy=row.getByRole('button',{name:'Copy phone number',exact:true});
 expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(48);
 await copy.click();
 await expect.poll(()=>page.evaluate(()=>(window as any).copied)).toBe('+377 93 15 00 00');
});

test('holding a finger still on the map drops a pin there; a moving finger does not',async({page})=>{
 await setup(page);
 const point=await mapPoint(page),cdp=await page.context().newCDPSession(page);
 const touch=(type:string,x=point.x,y=point.y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 // A drag that leaves the press point is a pan, not a press.
 await touch('touchStart');await touch('touchMove',point.x+40,point.y);await page.waitForTimeout(700);await touch('touchEnd');
 await expect(page.locator('[data-alpha-maps-sheet="place"]')).toHaveCount(0);
 await touch('touchStart');await page.waitForTimeout(700);await touch('touchEnd');
 const sheet=page.locator('[data-alpha-maps-sheet="place"]');
 await expect(sheet.locator('h1')).toHaveText('Dropped pin');
});

test('a secondary click on the map drops a pin',async({page})=>{
 await setup(page);
 const point=await mapPoint(page);
 await page.mouse.click(point.x,point.y,{button:'right'});
 await expect(page.locator('[data-alpha-maps-sheet="place"] h1')).toHaveText('Dropped pin');
});

test('turning the map shows a compass that puts north back up',async({page})=>{
 await setup(page);
 const compass=page.getByRole('button',{name:'Turn map north up',exact:true});
 await expect(compass).toHaveCount(0);
 const point=await mapPoint(page);
 // Control-drag turns the map, as two fingers do on the phone.
 await page.keyboard.down('Control');await page.mouse.move(point.x,point.y);await page.mouse.down();
 for(let step=1;step<=8;step++)await page.mouse.move(point.x+step*15,point.y);
 await page.mouse.up();await page.keyboard.up('Control');
 await expect(compass).toBeVisible();
 expect((await compass.boundingBox())!.height).toBeGreaterThanOrEqual(48);
 await compass.click();
 await expect(compass).toHaveCount(0);
});

test('a planned route swaps its starting point and destination',async({page})=>{
 await setup(page);await openCafe(page);
 await page.getByRole('button',{name:'Directions',exact:true}).click();
 const start=page.getByRole('textbox',{name:'Starting point',exact:true});
 await start.fill('43.74000, 7.42000');await start.press('Enter');
 const sheet=page.locator('[data-alpha-maps-directions]');
 const swap=sheet.getByRole('button',{name:'Swap starting point and destination',exact:true});
 await expect(swap).toBeVisible();
 await expect(sheet).toContainText('Harbour Cafe');
 await swap.click();
 await expect(sheet).toContainText('Dropped pin');
 await expect(start).toHaveValue('Harbour Cafe');
 await expect.poll(()=>page.evaluate(()=>(window as any).mapsControls.routes.length)).toBe(2);
 expect(await page.evaluate(()=>(window as any).mapsControls.routes[1].from)).toEqual({latitude:43.7384,longitude:7.4246});
});

test('recent searches are offered with the saved places and can be cleared',async({page})=>{
 await setup(page);
 await search(page).fill('harbour');await search(page).press('Enter');
 await expect(page.locator('[data-alpha-maps-sheet="results"]').getByRole('button',{name:/^Harbour Cafe/})).toBeVisible();
 await page.getByRole('button',{name:'Clear search',exact:true}).click();
 const recent=page.locator('[data-alpha-maps-recent]');
 await expect(recent).toBeVisible();
 const row=recent.getByRole('button',{name:'Search harbour',exact:true});
 await expect(row).toBeVisible();
 expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(48);
 await row.click();
 await expect(search(page)).toHaveValue('harbour');
 await page.getByRole('button',{name:'Clear search',exact:true}).click();
 await recent.getByRole('button',{name:'Clear recent searches',exact:true}).click();
 await expect(recent).toHaveCount(0);
 // Nothing about the search was written to this browser's storage.
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('harbour');
});
