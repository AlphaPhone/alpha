// Synthetic transport only. No OAuth, provider, or network requests.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import type {CloudNativeRequest} from '../apps/app/src/runtime/cloud-protocol.ts';
const {CloudProtocol,CloudProtocolError,object}=await import('../apps/app/src/runtime/cloud-protocol.ts');
const {managedServiceRequest}=await import('../apps/app/src/runtime/managed-service-routes.ts');
const credential={credentialId:'first',token:'synthetic-only',userId:'owner',organizationId:'org'};
let mode='ok';
const calls: Parameters<CloudNativeRequest>[0][]=[];
const lastBody=()=>object(calls.at(-1)?.body);
const isError=(code: InstanceType<typeof CloudProtocolError>['code'])=>(error: unknown)=>error instanceof CloudProtocolError && error.code===code;
const signal=()=>new AbortController().signal;
const client=new CloudProtocol('production',async input=>{
 calls.push(input);assert.equal(input.headers.Authorization,'Bearer synthetic-only');assert.equal(input.redirect,'error');
 assert.equal(managedServiceRequest(input.url,input.method,input.body!==undefined),true);
 assert.ok(new URL(input.url).pathname.endsWith('/connect/initiate'));
 return {status:200,data:{authUrl:mode==='bad-url'?'https://attacker.invalid':'https://accounts.google.com/o/oauth2/v2/auth?state=synthetic'}};
},{read:async()=>credential,write:async()=>{},clear:async()=>{}},async()=>{});
await client.initiateGoogle(signal());assert.deepEqual(lastBody(),{side:'owner',capabilities:['google.basic_identity','google.gmail.triage','google.calendar.read']});
await client.initiateGoogle(signal(),'write');assert.deepEqual(lastBody().capabilities,['google.basic_identity','google.gmail.triage','google.calendar.read','google.calendar.write']);
for(const permission of ['send','drafts','mailbox'] as const){
 await client.initiateGoogle(signal(),'read',permission);
 assert.deepEqual(lastBody().capabilities,['google.basic_identity','google.gmail.triage','google.calendar.read',`google.gmail.${permission}`]);
}
await client.initiateGoogle(signal(),'read','modify');assert.deepEqual(lastBody().capabilities,['google.basic_identity','google.gmail.triage','google.gmail.send','google.gmail.drafts','google.gmail.mailbox','google.calendar.read'],'one incremental modify consent retains Calendar read');
const beforeInvalidPermission=calls.length;
// @ts-expect-error An untyped caller can supply this invalid permission at runtime.
await assert.rejects(client.initiateGoogle(signal(),'read','manage'),TypeError);
assert.equal(calls.length,beforeInvalidPermission,'unsupported permissions never dispatch');
mode='bad-url';await assert.rejects(client.initiateGoogle(signal()),isError('invalid-response'));
for(const path of ['/api/v1/eliza/google/calendar/feed','/api/v1/eliza/google/calendar/calendars']){
 assert.equal(managedServiceRequest('https://api.eliza.app'+path+'?side=owner','GET'),true);
 assert.equal(managedServiceRequest('https://api.eliza.app'+path,'POST',true),false);
 assert.equal(managedServiceRequest('https://api.eliza.app'+path,'GET',true),false);
 assert.equal(managedServiceRequest('https://other.invalid'+path,'GET'),false);
}
console.log('Google Calendar protocol: combined consent, refused foreign consent URLs and managed route boundaries passed.');
