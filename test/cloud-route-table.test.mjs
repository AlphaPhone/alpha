import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fixture,jvmSkip,root,runJvm,upstreamOsModule} from './fixtures/jvm-tools.mjs';

// Plain-JVM load of the ElizaCloud route table capacitor.config.ts hands the plugin, through upstream's own
// parser and policy (RouteGate.loadWire, CloudRequestPolicy) at the vendor/eliza pin. This does not build an APK,
// run on Android or contact any Cloud. Register rows A2-001 and A2-002.

const config=(await import('../capacitor.config.ts')).default;
const table=JSON.stringify(config.plugins.ElizaCloud.routes);
const google='/api/v1/eliza/google',inbox=`${google}/gmail/inbox-v1`;

/** The managed Gmail client the Inbox sends through Cloud: each path template it builds, with its query keys. */
function inboxClientPaths(){
 const source=readFileSync(join(root,'vendor/eliza/packages/plugin-inbox/src/client/index.vibe'),'utf8');
 const paths=[];
 for(const m of source.matchAll(/`\$\{(google|inbox)\}([^`?]*)(?:\?\$\{query\((\{[^`]*?\})\)\})?`/gs)){
  const path=(m[1]==='google'?google:inbox)+m[2].replace(/\$\{encodeURIComponent\(\w+\)\}/g,'{}');
  const keys=m[3]===undefined?[]:[...m[3].matchAll(/(?:^|[{,])\s*([A-Za-z]+)(?=\s*[:,}])/g)].map(k=>k[1]);
  paths.push({path,keys:[...new Set(keys)].sort()});
 }
 return paths;
}

const q=(path,keys)=>keys.length?`${path}?${keys.map(k=>`${k}=v1`).join('&')}`:path;
/** Every request the renderer sends through ElizaCloud, with every query key it may carry. */
const requests=[
 ['GET','/api/v1/user'],['GET','/api/v1/referrals'],['POST','/api/v1/referrals/apply','{}'],
 ['GET','/api/v1/subscriptions/plans'],['POST','/api/v1/subscriptions/checkout','{}'],['POST','/api/v1/subscriptions/checkout/confirm','{}'],
 ['POST','/api/v1/subscription/redeem','{}'],['GET','/api/v1/subscription/entitlement'],['GET','/api/v1/subscription/entitlement-keys'],
 ['GET','/api/v1/billing/limits'],['GET','/api/v1/billing/invoices'],['GET','/api/v1/billing/invoices/in_1'],
 ['GET','/api/v1/maps/capabilities'],['POST','/api/v1/maps/places/search','{}'],['POST','/api/v1/maps/places/details','{}'],
 ['POST','/api/v1/maps/routes','{}'],['POST','/api/v1/maps/tiles/viewport','{}'],['GET','/api/v1/maps/tiles/3/4/5'],
 ['GET',q(`${google}/status`,['side','grantId'])],['GET',q(`${google}/accounts`,['side'])],
 ['POST',`${google}/connect/initiate`,'{}'],['POST',`${google}/disconnect`,'{}'],
 ['GET',q(`${google}/gmail/search`,['side','grantId','query','maxResults','pageToken'])],
 ['GET',q(`${google}/gmail/read`,['side','grantId','messageId'])],
 ['GET',q(`${inbox}/capabilities`,['grantId'])],
 ['GET',q(`${inbox}/thread`,['grantId','threadId','offset','historyId'])],
 ['GET',q(`${inbox}/attachment`,['grantId','messageId','partId','historyId'])],
 ['GET',q(`${inbox}/drafts`,['grantId','pageToken'])],
 ['GET',q(`${inbox}/draft`,['grantId','draftId'])],
 ['POST',`${inbox}/operations`,'{}'],['POST',`${inbox}/operations/req-1/dispatch`,'{}'],
 ['GET',q(`${inbox}/operations/req-1`,['grantId'])],
 ['GET',q(`${google}/calendar/calendars`,['grantId','side'])],
 ['GET',q(`${google}/calendar/feed`,['grantId','side','calendarId','timeMin','timeMax','timeZone'])],
 ['GET',q(`${google}/calendar/events/evt-1`,['grantId','calendarId'])],
];

function check(routes,sent=requests){
 const input=[JSON.stringify(routes),...sent.map(([m,t,b=''])=>`${m}\t${t}\t${b}`)].join('\n')+'\n';
 const out=runJvm([fixture('CloudRouteTableCheck.java')],'CloudRouteTableCheck',{input,release:'21',sourcepath:[upstreamOsModule('sign-in'),upstreamOsModule('agent-service')]});
 const lines=out.trim().split('\n').map(l=>l.split('\t'));
 return {loaded:lines.find(l=>l[0]==='loaded').slice(1),routes:lines.filter(l=>l[0]==='route').map(l=>l.slice(1)),plans:lines.filter(l=>l[0]==='plan').map(l=>l.slice(1))};
}

const skip=jvmSkip('javac');

test('upstream CloudRequestPolicy loads the whole table: every route is one device route the page may use',{skip},()=>{
 const {loaded,routes}=check(config.plugins.ElizaCloud.routes,[]);
 assert.deepEqual(loaded,['true','true','true']);
 assert.equal(routes.length,config.plugins.ElizaCloud.routes.flatMap(g=>g.routes).length);
 assert.deepEqual(routes.filter(r=>r[2]!=='page'),[]);
 // The renderer holds no account session, so no route may need one; a Mail class (elizaOS/eliza#40242) is a device route too.
 assert.deepEqual(routes.filter(r=>!['PUBLIC','KEY_OR_SESSION','MAIL'].includes(r[3])),[]);
});

test('every request the renderer and the managed Gmail client send is admitted and sent',{skip},()=>{
 const {plans}=check(config.plugins.ElizaCloud.routes);
 assert.equal(plans.length,requests.length);
 assert.deepEqual(plans.filter(p=>!p[2].startsWith('Send:')),[]);
});

test('the table covers each path and query key of upstream\'s managed Gmail client',()=>{
 const client=inboxClientPaths();
 assert.ok(client.length>=13,`found ${client.length} client paths`);
 const covered=requests.map(([,target])=>{
  const [path,query='']=target.split('?');
  return {path:path.replace(/\/(req-1)(?=\/|$)/,'/{}'),keys:query?query.split('&').map(p=>p.split('=')[0]).sort():[]};
 });
 for(const want of client)assert.ok(covered.some(c=>c.path===want.path&&JSON.stringify(c.keys)===JSON.stringify(want.keys)),`client path ${want.path} with ${want.keys.join(',')} is a checked request`);
});

test('one sign-in-owned or unlisted route still refuses the whole table',{skip},()=>{
 const groups=config.plugins.ElizaCloud.routes;
 for(const extra of [{method:'GET',path:'/api/public/service'},{method:'DELETE',path:'/api/v1/api-keys/current'},{method:'POST',path:'/api/v1/credits/checkout'}]){
  const {loaded,plans}=check([{...groups[0],routes:[...groups[0].routes,extra]}],[['GET','/api/v1/user']]);
  assert.deepEqual(loaded,['false','true','false'],`${extra.method} ${extra.path}`);
  assert.deepEqual(plans.map(p=>p[2]),['Refuse:NOT_LISTED']);
 }
});
