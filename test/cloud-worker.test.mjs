// Alpha Cloud's operator tool (scripts/cloud-worker.ts) after the move to the cloud package: the deployment
// profile, registration rows, edge Worker and wrangler rendering are the cloud package's own (cloud/src/*.vibe,
// tested in cloud/test). What stays here is what the operator tool itself decides: secrets, the private env
// file and the public readiness probe.
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {completeSecrets,secretProblems,readEnvFile,smoke,workerSecrets,OPERATOR_SECRETS,GENERATED_SECRETS,WORKER_SECRET_SOURCE} from '../scripts/cloud-worker.ts';
import {ALPHA_CLOUD_DEPLOYMENT,CLOUD_SIGN_IN_REGISTRATION} from '../scripts/cloud-deployment-policy.ts';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const identity=read('app.config.json');
const signer=read('android/release-signer.json').signerSha256;
const legalDocument=title=>({title,revision:'synthetic-1',sections:[{title:'Fixture',paragraphs:['Only synthetic text.']}]});
const colon=hex=>hex.toUpperCase().match(/../g).join(':');

test('secrets: internal ones are generated once and never rotated, and a frozen run generates none',()=>{
 const environment='staging';
 const {values:first,entitlementPublicKey}=completeSecrets({});
 for(const name of GENERATED_SECRETS)assert.ok(first[name],name);
 crypto.createPrivateKey({key:Buffer.from(first.CLOUD_ENTITLEMENT_KEY,'base64'),format:'der',type:'pkcs8'});
 assert.deepEqual(Object.keys(entitlementPublicKey).sort(),['crv','kty','x','y']);
 assert.deepEqual(completeSecrets(first).values,first,'rerunning never rotates a generated secret');
 assert.deepEqual(completeSecrets(first,{frozen:true}).values,first,'a frozen run accepts a completed file');
 // CI deploys with --frozen: a sealing or entitlement key minted on a runner would rotate and be lost.
 assert.throws(()=>completeSecrets({},{frozen:true}),/Generated secrets are absent \(CLOUD_DIGEST_KEY, CLOUD_SEALING_KEY, CLOUD_ENTITLEMENT_KEY, EMAIL_CODE_SECRET, GOOGLE_CONNECT_TOKEN_KEY\)/);
 const {CLOUD_SEALING_KEY:_sealing,...withoutSealing}=first;
 assert.throws(()=>completeSecrets(withoutSealing,{frozen:true}),/absent \(CLOUD_SEALING_KEY\)/);
 const missing=secretProblems(first,environment);
 for(const name of OPERATOR_SECRETS.required)assert.ok(missing.includes(`${name} is missing`),name);
 const operator={DATABASE_URL:'postgresql://cloud@db.internal/alpha',RESEND_API_KEY:'r',GOOGLE_CLIENT_SECRET:'s',GOOGLE_CONNECT_CLIENT_SECRET:'c',
  STRIPE_SECRET_KEY:'sk_test_x',STRIPE_WEBHOOK_SECRET:'w',CEREBRAS_API_KEY:'k',CARTESIA_API_KEY:'v',GOOGLE_MAPS_API_KEY:'m'};
 const complete={...first,...operator};
 assert.deepEqual(secretProblems(complete,environment),[]);
 assert.deepEqual(secretProblems(complete,'production'),['STRIPE_SECRET_KEY must be a live key in production']);
 assert.deepEqual(secretProblems({...complete,STRIPE_SECRET_KEY:'sk_live_x'},environment),['STRIPE_SECRET_KEY must be a test key in staging']);
 assert.deepEqual(secretProblems({...complete,DATABASE_URL:'mysql://db.internal/alpha'},environment),['DATABASE_URL must be a postgres:// URL']);
 assert.deepEqual(secretProblems({...complete,CLOUD_SEALING_KEY:'short'},environment),['CLOUD_SEALING_KEY must hold at least 32 bytes']);
 assert.deepEqual(secretProblems({...complete,RESEND_API_KEY:'https://api.eliza.app/key'},environment),['RESEND_API_KEY names a deployed Eliza Cloud host']);
 // The Worker gets exactly its own names, the inference key under the Worker's name.
 const worker=workerSecrets(complete);
 assert.deepEqual(Object.keys(worker).sort(),Object.keys(WORKER_SECRET_SOURCE).sort());
 assert.equal(worker.INFERENCE_API_KEY,operator.CEREBRAS_API_KEY);
 for(const name of ['DATABASE_URL','CLOUD_SEALING_KEY','CLOUD_DIGEST_KEY','CLOUD_ENTITLEMENT_KEY'])assert.equal(worker[name],undefined,name);
});

test('the secrets file must be private and outside the checkout',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-cloud-secrets-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'staging.env');
 fs.writeFileSync(file,'A_KEY=1\nQUOTED="two"\n# comment\n',{mode:0o644});
 assert.throws(()=>readEnvFile(file),/chmod 600/);
 fs.chmodSync(file,0o600);
 assert.deepEqual(readEnvFile(file),{A_KEY:'1',QUOTED:'two'});
 assert.throws(()=>readEnvFile('cloud/staging.env'),/outside the checkout/);
});

test('the CI deploy verifies its secrets frozen and refuses an empty env file',()=>{
 const workflow=fs.readFileSync('.github/workflows/cloud-deploy.yml','utf8');
 assert.match(workflow,/\$CLOUD secrets --environment "\$\{\{ inputs\.environment \}\}" --env-file "\$RUNNER_TEMP\/alpha-cloud\.env" --frozen/);
 assert.match(workflow,/test -n "\$ALPHA_CLOUD_ENV" \|\|/);
});

function smokeFixture(environment){
 const row=ALPHA_CLOUD_DEPLOYMENT[environment];
 const redirectUri=row.web+CLOUD_SIGN_IN_REGISTRATION.callbackPath;
 const config={success:true,clientId:identity.appId,environment,redirectUri,codeChallengeMethod:'S256'};
 const registration=`${row.api}/api/v1/app-auth/mobile/config?${new URLSearchParams({clientId:identity.appId,environment,redirectUri})}`;
 const service={success:true,version:1,service:{name:row.name,terms:legalDocument('Terms'),privacy:legalDocument('Privacy')}};
 const links=[{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:identity.appId,sha256_cert_fingerprints:[colon(signer)]}}];
 const {publicKey}=crypto.generateKeyPairSync('ec',{namedCurve:'P-256'});
 const keys=[{...publicKey.export({format:'jwk'}),kid:'synthetic-entitlement'}];
 const callback=`<a href="intent://${new URL(redirectUri).host}${new URL(redirectUri).pathname}#Intent;scheme=https;package=${identity.appId};end">Return to Alpha</a>`;
 const answers={
  [`${row.api}/api/health`]:[200,{status:'ok'}],
  [`${row.api}/api/public/service`]:[200,service],
  [`${row.api}/api/v1/subscription/entitlement-keys`]:[200,{keys}],
  [registration]:[200,config],
  [`${row.api}/api/v1/subscriptions/plans`]:[200,{plans:[
   {key:'plus_monthly',name:'Plus',amountCents:3000,currency:'usd',interval:'month',allowance:{amountUsd:'25.000000'}},
   {key:'pro_monthly',name:'Pro',amountCents:10000,currency:'usd',interval:'month',allowance:{amountUsd:'90.000000'}},
  ]}],
  [`${row.api}/api/v1/auth/methods`]:[200,{email:true,google:true}],
  [`${row.web}/.well-known/assetlinks.json`]:[200,links],
  [redirectUri]:[200,callback,'text/html'],
 };
 const fetcher=overrides=>async (url,options)=>{
  assert.equal(options.redirect,'manual');
  assert.ok(options.signal instanceof AbortSignal);
  const [status,body,type='application/json']=overrides[url]??answers[url]??[404,{}];
  return new Response(type==='application/json'?JSON.stringify(body):body,{status,headers:{'content-type':type}});
 };
 return {row,redirectUri,config,registration,service,links,keys,callback,fetcher};
}

test('smoke checks the public readiness gates for both environments',async()=>{
 for(const environment of ['staging','production']){
  const {fetcher}=smokeFixture(environment);
  const rows=await smoke(environment,fetcher({}));
  assert.equal(rows.length,8);
  assert.ok(rows.every(row=>row.passed),JSON.stringify(rows));
 }
});

test('smoke refuses incomplete and wrong-authority HTTP 200 answers, one gate each',async()=>{
 const {row,redirectUri,config,registration,service,links,keys,callback,fetcher}=smokeFixture('staging');
 const regressions=[
  ['api health',`${row.api}/api/health`,[200,'not json','text/plain']],
  ['service document',`${row.api}/api/public/service`,[200,{success:true,service:{name:row.name}}]],
  ['service document',`${row.api}/api/public/service`,[200,{...service,service:{...service.service,name:'Unexpected service'}}]],
  ['entitlement keys',`${row.api}/api/v1/subscription/entitlement-keys`,[200,{keys:[]}]],
  ['entitlement keys',`${row.api}/api/v1/subscription/entitlement-keys`,[200,{keys:[...keys,{...keys[0],d:'synthetic-private-value'}]}]],
  ['app registration',registration,[200,{...config,redirectUri:redirectUri+'-other'}]],
  ['app registration',registration,[200,{...config,codeChallengeMethod:'plain'}]],
  ['plans',`${row.api}/api/v1/subscriptions/plans`,[200,{plans:[]}]],
  ['asset links',`${row.web}/.well-known/assetlinks.json`,[200,[{target:{package_name:identity.appId}}]]],
  ['asset links',`${row.web}/.well-known/assetlinks.json`,[200,[{...links[0],target:{...links[0].target,sha256_cert_fingerprints:[colon('a'.repeat(64))]}}]]],
  ['callback page',redirectUri,[302,'','text/html']],
  ['callback page',redirectUri,[200,callback.replace(identity.appId,'ai.example.other'),'text/html']],
 ];
 for(const [gate,url,answer] of regressions){
  const rows=await smoke('staging',fetcher({[url]:answer}));
  assert.deepEqual(rows.filter(row=>!row.passed).map(row=>row.gate),[gate],`${gate}: ${JSON.stringify(answer).slice(0,120)}`);
 }
});

test('the operator tool refuses an unknown command and names its usage',()=>{
 const result=spawnSync(process.execPath,['scripts/cloud-worker.ts','no-such-command'],{encoding:'utf8'});
 assert.equal(result.status,2);
 assert.match(result.stderr,/Usage: node scripts\/cloud-worker\.ts/);
});
