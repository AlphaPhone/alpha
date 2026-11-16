import {test,expect,type Page} from '@playwright/test';
// #855 MAP-17 and MAP-02: the current-location place card keeps Rename, and the settled map
// centre biases a later search once the map is zoomed to a region.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition:()=>{throw Error('Host location must not be requested');},clearWatch:()=>{}}});});
 await page.route('https://tiles.openfreemap.org/**',route=>route.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e7ebed'}}]}}));
 await page.goto('/?mode=dev&tools=1');
});
async function provider(page:Page){await page.evaluate(async()=>{(window as any).nearSeen=[];const {configureMapsProvider}=await import('/src/maps/runtime.ts');const place={providerId:'fixture-region',id:'destination',name:'Test destination',coordinate:{latitude:43.741,longitude:7.424},attribution:'Fixture attribution',fetchedAt:Date.now()};configureMapsProvider({status:'configured',providerId:'fixture-region',connectionId:'conn_fixture_region_123456',revision:'fixture1',capabilities:{map:false,search:true,placeDetails:true,modes:[],traffic:'none',transit:'none',offline:{map:false,search:false,routing:false}}},{providerId:'fixture-region',connectionId:'conn_fixture_region_123456',search:async(_query:string,_signal:AbortSignal,options?:{near?:{latitude:number;longitude:number}})=>{(window as any).nearSeen.push(options?.near??null);return [place];},detail:async()=>place,route:async()=>{throw Error('unused');}} as any);});}
test('current location place card offers Rename',async({page})=>{
 await page.evaluate(async()=>{const {SavedPlaces}=await import('/src/maps/saved-places.ts');const home=new SavedPlaces().save({label:'My home',coordinate:{latitude:0,longitude:0}});const {saveLocationSimulation}=await import('/src/browser/location-simulation.ts');saveLocationSimulation({mode:'coordinates',latitude:43.738,longitude:7.424,accuracy:5,homeId:home.id,radius:200});const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaDevice').setSensor({field:'locationEnabled',enabled:false});});
 await page.getByRole('button',{name:'Maps',exact:true}).click();await page.getByRole('button',{name:'Recenter',exact:true}).click();
 const locate=page.getByRole('button',{name:/^(Add location|Use current location)$/});await expect(locate).toBeVisible();
 await page.evaluate(async()=>{const {registerPlugin}=await import('/src/platform-plugins.ts');await registerPlugin<any>('AlphaDevice').setSensor({field:'locationEnabled',enabled:true});});
 await locate.click();await expect(page.getByText('Your location',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Rename place',exact:true}).click();await expect(page.getByRole('button',{name:'Apply place name',exact:true})).toBeVisible();
});
test('a zoomed map centre biases the next search',async({page})=>{
 await provider(page);await page.getByRole('button',{name:'Maps',exact:true}).click();const q=page.getByRole('searchbox',{name:'Search places',exact:true});await q.fill('43.7384, 7.4246');await q.press('Enter');await expect(page.getByText('43.73840, 7.42460',{exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('[data-alpha-map-plane]').evaluate(el=>Number((el as HTMLElement).dataset.mapZoom||0))).toBeGreaterThanOrEqual(9);
 await page.getByRole('button',{name:'Close place',exact:true}).click();await q.fill('Test destination');await q.press('Enter');
 await expect.poll(()=>page.evaluate(()=>(window as any).nearSeen.length)).toBeGreaterThan(0);
 const near=await page.evaluate(()=>(window as any).nearSeen.at(-1));expect(near).not.toBeNull();expect(Math.abs(near.latitude-43.7384)).toBeLessThan(.01);expect(Math.abs(near.longitude-7.4246)).toBeLessThan(.01);
});
