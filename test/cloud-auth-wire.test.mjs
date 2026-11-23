// apps/app/spec/account/session.md, "The native host signs in on the wire of the deployment it addresses"
// Host-JVM check of the native sign-in wire: the shipped Eliza Cloud keeps Steward, and Alpha Cloud (the
// Vibestack Cloud, elizaOS/eliza spec/cloud/client.md signInRoutes) is signed in to only on its own
// /api/v1/auth/* routes with exactly the fields its schemas admit (packages/cloud/src/identity/code-challenges.vibe
// EmailSend/EmailVerify/PhoneSend/PhoneVerify, federated.vibe ExchangeBody, second-factor.vibe CompleteBody refuse
// any other field), and its opaque session is read into the one shape the client keeps. Not Android evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,jsonJarSkip,nativeSource,runJvm} from './fixtures/jvm-tools.mjs';

const RULE='apps/app/spec/account/session.md, "The native host signs in on the wire of the deployment it addresses"';
const sources=[...['CloudAuthWire','CloudSignInEnvironment','CloudSignInConfig','CloudSignInFlow','CloudSignInReadiness','CloudEmailCode',
 'CloudSmsCode','CloudSignInRoutes','CloudKeyRenewal'].map(name=>nativeSource(`cloud/${name}.java`)),nativeSource('BillingAuthorityRoutes.java'),
 fixture('cloud-auth-wire/CloudAuthWireCheck.java')];

let steps;
const step=name=>{
 steps??=new Map(runJvm(sources,'ai.alphacompute.alphaphone.CloudAuthWireCheck',{json:true}).split('\n').filter(Boolean)
  .map(line=>JSON.parse(line)).map(({step,value})=>[step,value]));
 assert.ok(steps.has(name),name);
 return steps.get(name);
};
const keys=object=>Object.keys(object).sort();

test(`the build's deployment picks the wire, and only Steward needs a tenant (${RULE})`,{skip:jsonJarSkip},()=>{
 assert.equal(step('wire-of-shipped'),'STEWARD');
 assert.equal(step('wire-of-cutover'),'ELIZA_AUTH');
 assert.equal(step('steward-default-wire'),'STEWARD');
 assert.equal(step('eliza-tenant'),'');
 assert.equal(step('steward-without-tenant'),'refused:IllegalArgumentException');
});

test(`Alpha Cloud is signed in to only on the Vibestack Cloud's own routes (${RULE})`,{skip:jsonJarSkip},()=>{
 assert.deepEqual(step('eliza-paths'),['/api/v1/auth/email/code/send','/api/v1/auth/email/code/verify','/api/v1/auth/sms/code/send',
  '/api/v1/auth/sms/code/verify','/api/v1/auth/google/exchange','/api/v1/auth/mfa/complete','/api/v1/auth/logout']);
 assert.deepEqual(step('steward-paths'),['/steward/auth/email/code/send','/steward/auth/email/code/verify','/steward/auth/sms/send',
  '/steward/auth/sms/verify','/steward/auth/oauth/exchange','/steward/auth/mfa/totp/complete','/steward/auth/logout']);
 assert.equal(step('passkey-factor'),'refused:IllegalArgumentException');
 assert.deepEqual(step('routes-post'),Array(9).fill(true));
 assert.deepEqual(step('routes-get'),[true,true,false]);
 assert.equal(step('eliza-authorize'),'https://api.alphacompute.cc/api/v1/auth/google/authorize?response_type=code&client_id=ai.alphacompute.alphaphone'
  +'&environment=production&redirect_uri=https%3A%2F%2Fcloud.alphacompute.cc%2Falphaphone%2Fauth%2Fcallback&code_challenge=<challenge>'
  +'&code_challenge_method=S256&state=<state>');
 assert.match(step('steward-authorize'),/^https:\/\/api\.eliza\.app\/steward\/auth\/oauth\/google\/authorize\?response_type=code&tenant_id=elizacloud&/);
 assert.equal(step('callback-access-denied'),'ERROR');
 assert.equal(step('callback-code'),'SUCCESS');
});

test(`each Alpha Cloud request names exactly the fields the Cloud's schema admits (${RULE})`,{skip:jsonJarSkip},()=>{
 const send=step('eliza-email-send');
 assert.deepEqual(keys(send),['clientId','codeChallenge','codeChallengeMethod','email']);
 assert.equal(send.clientId,'ai.alphacompute.alphaphone');
 assert.match(send.codeChallenge,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(send.codeChallengeMethod,'S256');
 assert.equal(step('eliza-email-challenge-is-s256'),true);
 const verify=step('eliza-email-verify');
 assert.deepEqual(keys(verify),['clientId','code','codeVerifier','email']);
 assert.match(verify.codeVerifier,/^[A-Za-z0-9._~-]{43,128}$/);
 assert.deepEqual(keys(step('eliza-sms-send')),['clientId','codeChallenge','codeChallengeMethod','phone']);
 assert.deepEqual(keys(step('eliza-sms-verify')),['clientId','code','codeVerifier','phone']);
 assert.equal(step('eliza-sms-bad-phone'),'refused:IllegalArgumentException');
 assert.equal(step('eliza-verify-bad-code'),'refused:IllegalArgumentException');
 assert.deepEqual(step('eliza-factor'),{challengeId:'challenge-1',method:'sms',code:'123456'});
 assert.deepEqual(step('eliza-factor-code-asked'),[true,false,false]);
 assert.deepEqual(keys(step('eliza-exchange')),['clientId','code','codeVerifier','redirectUri']);
 assert.equal(step('eliza-exchange').redirectUri,'https://cloud.alphacompute.cc/alphaphone/auth/callback');
});

test(`Eliza Cloud keeps Steward's tenant-bound requests unchanged (${RULE})`,{skip:jsonJarSkip},()=>{
 const send=step('steward-email-send');
 assert.deepEqual(keys(send),['client','email','pkce','tenantId']);
 assert.deepEqual(keys(send.pkce),['codeChallenge','codeChallengeMethod']);
 assert.deepEqual(step('steward-sms-send'),{phone:'+15551234567',tenantId:'elizacloud'});
 assert.deepEqual(step('steward-factor'),{challengeId:'challenge-1',code:'123456'});
 assert.deepEqual(keys(step('steward-exchange')),['code','codeVerifier','redirectUri','tenantId']);
});

test(`the Cloud's opaque session and second-factor challenge read into the session the client keeps (${RULE})`,{skip:jsonJarSkip},()=>{
 assert.deepEqual(step('eliza-signed-in'),{token:'eliza_session_'+'a'.repeat(43),refreshToken:'eliza_refresh_'+'b'.repeat(43),
  expiresAt:1_800_000_900_000,userId:'user-1',organizationId:'org-1'});
 for(const name of ['eliza-signed-in-expired','eliza-signed-in-no-organization','eliza-signed-in-no-refresh','eliza-factor-none',
  'eliza-factor-expired','eliza-steward-shaped-answer'])assert.equal(step(name),null,name);
 assert.deepEqual(step('eliza-factor-totp-first'),{mfaRequired:true,mfa:{type:'totp',challengeId:'challenge-1',expiresAt:1_800_000_300_000}});
 assert.deepEqual(step('eliza-factor-sms-only'),{mfaRequired:true,mfa:{type:'sms',challengeId:'challenge-1',expiresAt:1_800_000_300_000}});
 assert.deepEqual(step('steward-session'),{token:'steward.jwt.token-aaaaaaaaaaaa',refreshToken:'r'.repeat(30)});
 assert.deepEqual(step('steward-session-under-data'),step('steward-session'));
 assert.equal(step('eliza-resend-at'),1_800_000_060_000);
 assert.equal(step('steward-resend-at'),1_800_000_060_000);
});

test(`readiness reads the Cloud's registration answer, which carries no success flag (${RULE})`,{skip:jsonJarSkip},()=>{
 assert.equal(step('eliza-registered'),true);
 assert.equal(step('eliza-registered-wrong-return'),false);
 assert.equal(step('steward-registered-without-success'),false);
 assert.deepEqual(step('eliza-methods'),{email:true,sms:false,google:false});
 assert.deepEqual(step('eliza-methods-google-configured'),{email:true,sms:false,google:true});
 assert.equal(step('eliza-methods-missing'),null);
});

test(`the billing authority keeps the Cloud's opaque session for at most an hour, and Steward's JWT as before (${RULE})`,{skip:jsonJarSkip},()=>{
 assert.deepEqual(step('billing-eliza'),['eliza_session_'+'a'.repeat(43),'1800000900000']);
 assert.deepEqual(step('billing-eliza-capped'),['eliza_session_'+'a'.repeat(43),'1800003600000']);
 assert.equal(step('billing-eliza-expired'),'refused:SecurityException');
 assert.equal(step('billing-eliza-factor'),'refused:SecurityException');
 assert.equal(step('billing-steward'),'1800000600000');
 assert.equal(step('billing-steward-opaque'),'refused:IllegalArgumentException');
});
