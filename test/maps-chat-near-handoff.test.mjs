// A Maps chat card for "pharmacy near the Ferry Building" (v612 review, 2026-11-20). Chat listed the
// pharmacies nearest the Ferry Building, but tapping the card searched "pharmacy" around the map viewport or
// the phone and showed other places. The card now carries the Ferry Building and the hand-off search is ranked
// around it once. Provider, location and share ports are scripted; no live provider or device GPS.
import assert from 'node:assert/strict';
import test from 'node:test';
import {SavedPlaces} from '@elizaos/plugin-maps-client';
import {MapsScreenController} from '../apps/app/src/ui/maps/maps-screen.ts';
import {MapsController} from '../apps/app/src/ui/maps/state.ts';

const FERRY={latitude:37.7955,longitude:-122.3937},VIEWPORT={latitude:40.7,longitude:-74};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

function fixture({unconfigured=false}={}){
 const searched=[],now=1_760_000_000_000;
 const place={providerId:'fixture',id:'rx1',name:'Pharmacy 1',coordinate:{latitude:37.8,longitude:-122.3937},attribution:'Fixture data',fetchedAt:now};
 const provider={providerId:'fixture',connectionId:'conn_fixture_123456789',
  async search(query,_signal,options){searched.push({query,near:options?.near??null});return [place];},
  async detail(){return place;},async route(){throw Error('No routes in this test');}};
 const config={status:'configured',providerId:'fixture',connectionId:'conn_fixture_123456789',revision:'1',
  capabilities:{map:false,search:true,placeDetails:true,modes:['drive','walk'],traffic:'none',transit:'none',offline:{map:false,search:false,routing:false}}};
 const location={awaitingPermission:()=>false,async start(){},async stop(){}};
 const connection={config:unconfigured?{status:'unconfigured'}:config};let changed;
 const host={connection:()=>({config:connection.config,provider:connection.config.status==='configured'?provider:undefined}),
  onConnectionChange:listener=>{changed=listener;return ()=>{changed=undefined;};},initialize:async()=>{},
  diagnostics:()=>({configured:true,error:''}),coverage:()=>undefined,attribution:()=>'Fixture data',
  createController:(current,maps)=>new MapsController(current,maps,new SavedPlaces('near-handoff.test',memory()),location),
  navigationLocation:location,agentLocation:location,locationGranted:async()=>false,
  voice:{enabled:false,update(){},pause(){},toggle(){}},
  background:{active:()=>false,async start(){return false;},update(){},async stop(){}},
  share:async()=>'copied',openWebsite(){},active:()=>true,invalidate(){},toast(){},discardHandoff(){},handoffReturn:()=>false,
  released(){},now:()=>now,publishContext(){},clearContext(){}};
 const screen=new MapsScreenController(host);screen.ensure();
 return {screen,searched,activate:()=>{connection.config=config;changed?.();}};
}

test('a chat card hand-off searches around the named place once, then the map is the bias again',async()=>{
 const {screen,searched}=fixture();
 screen.setViewport(VIEWPORT,15);
 screen.handoff('pharmacy',false,FERRY);
 await settle();
 assert.deepEqual(searched,[{query:'pharmacy',near:FERRY}]);
 // The owner's own next search is ranked around the map they are looking at.
 screen.setQuery('coffee');screen.submit();
 await settle();
 assert.deepEqual(searched.at(-1),{query:'coffee',near:VIEWPORT});
 // A hand-off without a point (an event location, an older agent's card) keeps the viewport bias.
 screen.handoff('pharmacy',false);
 await settle();
 assert.deepEqual(searched.at(-1),{query:'pharmacy',near:VIEWPORT});
 // An invalid point is ignored, never searched around.
 screen.handoff('pharmacy',false,{latitude:200,longitude:0});
 await settle();
 assert.deepEqual(searched.at(-1),{query:'pharmacy',near:VIEWPORT});
});

test('a hand-off made before the provider is ready keeps its search point when the search resumes',async()=>{
 const {screen,searched,activate}=fixture({unconfigured:true});
 screen.setViewport(VIEWPORT,15);
 screen.handoff('pharmacy',false,FERRY);
 await settle();
 assert.deepEqual(searched,[]);
 activate();
 await settle();
 assert.deepEqual(searched,[{query:'pharmacy',near:FERRY}]);
});
