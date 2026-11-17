import {test,expect,type Page} from '@playwright/test';
test.use({locale:'en-GB'});
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
const place={name:'Ferry Building',latitude:37.7955,longitude:-122.3937,provider:'eliza-cloud',providerPlaceId:'osm:n1',formattedAddress:'1 Ferry Building, San Francisco',categories:[]};
const attribution='© OpenStreetMap contributors';
// The exact wire shapes plugin-maps emits (`card.ts` and core `interaction-serialize.ts`).
const card=(text:string,body:unknown)=>`${text}\n\n[MAPSCARD]\n${JSON.stringify(body)}\n[/MAPSCARD]`;
const route=card('Here is the walking route.',{kind:'route',origin:{...place,name:'Home',providerPlaceId:'osm:n0'},destination:place,travelMode:'walk',distanceMeters:1530,durationSeconds:1260,warnings:[],attribution});
const share='Share the location of Ferry Building?\n\n[CHOICE:maps-share id=maps-share-m1]\nYes, share the location of Ferry Building (confirmed).=Share location\nNo, do not share my location.=Don\'t share\n[/CHOICE]';
async function setup(page:Page,theme:string){
 await page.route('https://**/*',r=>r.abort());
 await page.addInitScript(()=>{localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));(window as any).mapsChat={sent:[]};if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{throw Error('No microphone');};});
 await page.goto('/?mode=dev&theme='+theme);
 await openConnectionDiagnostics(page);
 await page.getByRole('button',{name:'Connect development profile',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Development connections',exact:true})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(async()=>!!(await import('/src/runtime/connection-ui.tsx')).connectionController.getSnapshot().session)).toBe(true);
 await expect(page.getByRole('textbox',{name:'Ask Alpha',exact:true})).toBeVisible();
 await page.evaluate(async()=>{const {Component}=await import('/src/prototype/model.js');const render=Component.prototype.renderVals;Component.prototype.renderVals=function(){(window as any).mapsChat.shell=this;return render.call(this);};});
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).mapsChat.shell)).toBe(true);
 await page.evaluate(([route,share])=>new Promise<void>(resolve=>{const f=(window as any).mapsChat;f.shell.send=async(text:string)=>{f.sent.push(text);};f.shell.setState({chat:'full',msgs:[{id:'u1',from:'user',text:'Walk me to the Ferry Building'},{id:'a1',from:'agent',text:route},{id:'u2',from:'user',text:'Share it'},{id:'a2',from:'agent',text:share}]},resolve);}),[route,share]);
}
for(const theme of ['light','dark'])test(`agent Maps cards render without raw markup: ${theme}`,async({page},info)=>{
 await page.setViewportSize({width:412,height:915});await setup(page,theme);
 const transcript=page.locator('[data-alpha-transcript]');
 await expect(transcript).not.toContainText('[MAPSCARD]');await expect(transcript).not.toContainText('[CHOICE');await expect(transcript).not.toContainText('"kind"');
 const routeCard=page.locator('.maps-chat-card[data-maps-card-kind="route"]');
 await expect(routeCard).toContainText('Route to Ferry Building');await expect(routeCard).toContainText('Walking · 1.5 km · 21 min');await expect(routeCard.locator('small')).toHaveText(attribution);
 await expect(transcript).toContainText('Share the location of Ferry Building?');
 const choice=page.getByRole('group',{name:'Share location'});await expect(choice.getByRole('button')).toHaveText(['Share location',"Don't share"]);
 for(const button of await choice.getByRole('button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('maps-chat-'+theme+'.png'),animations:'disabled'});
 await choice.getByRole('button',{name:"Don't share"}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mapsChat.sent)).toEqual(['No, do not share my location.']);
 await expect(page.getByRole('group',{name:'Share location'})).toHaveCount(0);
});

// A chat card opens the phone's own map with the request already entered. The provider is a closed
// fixture and the position is the development simulation; this qualifies no real provider or device.
test('route and near-me cards open the map with the route planned and the search around the phone',async({page},info)=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:412,height:915});
 await page.route('https://tiles.openfreemap.org/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e7ebed'}}]}}));
 await setup(page,'light');
 await page.evaluate(async()=>{
  const {saveLocationSimulation}=await import('/src/browser/location-simulation.ts');
  saveLocationSimulation({mode:'coordinates',latitude:37.79,longitude:-122.4,accuracy:5,homeId:'',radius:200});
  const {configureMapsProvider}=await import('/src/maps/runtime.ts');
  const providerId='fixture-maps',connectionId='conn_fixture_maps_0001',attribution='Fixture maps',calls=((window as any).mapsCalls={search:[] as unknown[],route:[] as unknown[]});
  const cafe={providerId,id:'cafe-1',name:'Fixture Cafe',coordinate:{latitude:37.791,longitude:-122.401},attribution,fetchedAt:Date.now()};
  const provider={providerId,connectionId,
   search:async(query:string,_signal:AbortSignal,options?:{near?:unknown})=>{calls.search.push({query,near:options?.near??null});return [cafe];},
   detail:async()=>cafe,
   route:async(from:any,to:any,mode:string)=>{calls.route.push({from,to,mode});return {providerId,id:'fixture-route-'+calls.route.length,from,to,mode,geometry:[from,to],distanceMeters:1530,durationSeconds:1260,steps:[{instruction:'Head to the water',coordinate:from,distanceMeters:1530,maneuver:'depart'},{instruction:'Arrive',coordinate:to,distanceMeters:0,maneuver:'arrive'}],attribution,fetchedAt:Date.now(),traffic:'none'};},
  };
  (window as any).useFixtureMaps=()=>configureMapsProvider({status:'configured',providerId,connectionId,revision:'fixture',capabilities:{map:false,search:true,placeDetails:true,modes:['drive','walk','bicycle','transit'],traffic:'none',transit:'scheduled',offline:{map:false,search:false,routing:false},alternatives:false}} as any,provider as any);
  (window as any).useFixtureMaps();
 });
 const newest=(text:string)=>page.evaluate(text=>{(window as any).mapsChat.shell.setState({chat:'full',msgs:[{id:'u9',from:'user',text:'Maps'},{id:'a9'+text.length,from:'agent',text}]});},text);
 // A to B, walking: both ends and the travel mode reach the map; nothing reads the phone's position.
 await newest(card('Here is the walking route.',{kind:'route',origin:{...place,name:'Home',latitude:37.78,longitude:-122.41,providerPlaceId:'osm:n0'},destination:place,travelMode:'walk',distanceMeters:1530,durationSeconds:1260,warnings:[],attribution}));
 await page.locator('.maps-chat-card[data-maps-card-kind="route"]').getByRole('button',{name:'Show on map',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mapsCalls.route)).toEqual([{from:{latitude:37.78,longitude:-122.41},to:{latitude:37.7955,longitude:-122.3937},mode:'walk'}]);
 await expect(page.getByRole('textbox',{name:'Starting point'})).toHaveValue('37.78, -122.41');
 await expect(page.getByText('Ferry Building',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('button',{name:'Start',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('maps-card-route.png'),animations:'disabled'});
 // Choosing another way to travel plans the same two ends again.
 await page.getByRole('button',{name:/^(Transit|Train)/}).first().click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mapsCalls.route.map((call:any)=>call.mode))).toEqual(['walk','transit']);
 // "Near me": the map asks this phone for its position after the tap, then searches around it.
 await newest(card('I need your precise location to search near you for “coffee shop”.',{kind:'locate',intent:'place-near',prompt:'I need your precise location to search near you for “coffee shop”.'}));
 const near=page.locator('.maps-chat-card[data-maps-card-kind="locate"]');
 await expect(near).toContainText('“coffee shop” near you');
 await near.getByRole('button',{name:'Show on map',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mapsCalls.search.filter((call:any)=>call.query==='coffee shop'))).toEqual([{query:'coffee shop',near:{latitude:37.79,longitude:-122.4}}]);
 await expect(page.getByRole('button',{name:/^Fixture Cafe/}).first()).toBeVisible();
 await page.screenshot({path:info.outputPath('maps-card-near.png'),animations:'disabled'});
});
