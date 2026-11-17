// AlphaCloudSignInClient is Alpha's own copy of the shared native Cloud sign-in client
// (vendor/eliza packages/auth/android ai.eliza.auth.cloud.CloudSignInPlugin), forked so that the
// authorization dialog and the browser launch are Alpha's UI. Below its class declaration it must
// stay the pinned upstream client apart from the changes Alpha lists here, so the sign-in,
// acknowledgement, renewal and revocation semantics remain the ones upstream's own tests cover
// (packages/auth/android/test). When the pin moves and upstream changed the client, this fails:
// port the change into AlphaCloudSignInClient, then rerun. Source reading only: no Android, Cloud,
// Google or credential is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const UPSTREAM='vendor/eliza/packages/auth/android/src/main/java/ai/eliza/auth/cloud/CloudSignInPlugin.java';
const FORK='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCloudSignInClient.java';
const HOST='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCloudSignInPlugin.java';
const UPSTREAM_DECLARATION='public abstract class CloudSignInPlugin extends Plugin {';
const FORK_DECLARATION='public abstract class AlphaCloudSignInClient extends Plugin {';
/** Alpha's changes to the upstream body, applied in order as [upstream text, Alpha text]. None
 * yet: the body never names its own class, and the dialog words "Authorize <productName>" from
 * Alpha's registration. A rewording of the dialog is listed here when Alpha makes one. */
const ALPHA_CHANGES=[];
/** The shared non-UI policy the fork keeps using from the pinned upstream package. */
const SHARED=['CloudCredentialSlots','CloudEmailCode','CloudKeyRenewal','CloudKeyRevocation','CloudSignInConfig','CloudSignInEnvironment',
 'CloudSignInFlow','CloudSignInReadiness','CloudSignInRoutes','CloudSmsCode','NativeGoogleCredential'];

const split=(source,declaration)=>{
 const at=source.indexOf(declaration);
 assert.ok(at>0,declaration);
 return {header:source.slice(0,at),body:source.slice(at+declaration.length)};
};
const imports=header=>[...header.matchAll(/^import ([\w.]+);$/gm)].map(match=>match[1]).sort();

test('below its declaration Alpha\'s sign-in client is the pinned upstream client with only Alpha\'s listed changes',()=>{
 const upstream=split(read(UPSTREAM),UPSTREAM_DECLARATION),fork=split(read(FORK),FORK_DECLARATION);
 let expected=upstream.body;
 for(const [from,to] of ALPHA_CHANGES){assert.ok(expected.includes(from),`upstream still contains ${from}`);expected=expected.replaceAll(from,to);}
 // Compare line by line so a failure names the first drifted line instead of two whole files.
 const want=expected.split('\n'),have=fork.body.split('\n');
 const first=want.findIndex((line,index)=>line!==have[index]);
 assert.equal(first===-1&&want.length===have.length?-1:first,-1,
  `AlphaCloudSignInClient differs from the pinned CloudSignInPlugin at body line ${first+1}:\n upstream: ${want[first]}\n alpha:    ${have[first]}`);
 assert.match(fork.header,/^package ai\.alphacompute\.alphaphone;$/m);
 assert.deepEqual(imports(fork.header).filter(name=>!name.startsWith('ai.eliza.auth.cloud.')),imports(upstream.header),'same platform and library imports');
 assert.deepEqual(imports(fork.header).filter(name=>name.startsWith('ai.eliza.auth.cloud.')),SHARED.map(name=>`ai.eliza.auth.cloud.${name}`).sort(),
  'only the shared non-UI policy comes from upstream');
 assert.doesNotMatch(fork.header,/import ai\.eliza\.auth\.cloud\.CloudSignInPlugin;/);
});

test('Alpha registers its own client under its installed plugin name and return path',()=>{
 const host=read(HOST);
 assert.match(host,/@CapacitorPlugin\(name = "AlphaCloudSignIn"\)\npublic final class AlphaCloudSignInPlugin extends AlphaCloudSignInClient \{/);
 assert.doesNotMatch(host,/import ai\.eliza\.auth\.cloud\.CloudSignInPlugin;|extends CloudSignInPlugin\b/);
 assert.match(host,/CALLBACK_PATH = "\/alphaphone\/auth\/callback"/);
 assert.match(host,/PENDING_SLOT = "cloud-signin:v1:pending"/);
 assert.match(host,/\.productName\("Alpha Phone"\)/);
});

test('the authorization dialog alone authorizes, within the attempt, and cannot be dismissed by an outside touch',()=>{
 const fork=read(FORK);
 const gate=fork.slice(fork.indexOf(' private void requireAuthorization(Attempt current)'),fork.indexOf(' private void completeOrRequireMfa('));
 assert.ok(gate.length>200,'requireAuthorization located');
 // The only write that authorizes is the dialog's positive button, under the same checks.
 assert.equal([...fork.matchAll(/current\.authorized = true/g)].length,1);
 assert.match(gate,/setPositiveButton\("Authorize", \(dialog, which\) -> \{\s*synchronized \(lock\) \{\s*if \(attempt == current && !current\.cancelled && !destroyed && System\.currentTimeMillis\(\) < current\.expiresAt\) current\.authorized = true;/);
 assert.match(gate,/\.setTitle\("Authorize " \+ product\)/);
 assert.match(gate,/setCanceledOnTouchOutside\(false\)/);
 assert.match(gate,/setNegativeButton\("Cancel", \(dialog, which\) -> decision\.countDown\(\)\)/);
 assert.match(gate,/setOnCancelListener\(dialog -> decision\.countDown\(\)\)/);
 assert.match(gate,/if \(!decision\.await\(remaining, TimeUnit\.MILLISECONDS\)\) throw new SignInFailure\("expired"\)/);
 assert.match(gate,/if \(attempt != current \|\| current\.cancelled \|\| destroyed \|\| !current\.authorized\) throw new SignInFailure\("cancelled"\)/);
 // The minted key is requested only after the gate.
 const complete=fork.slice(fork.indexOf(' private void complete(Attempt current, JSONObject session)'));
 assert.ok(complete.indexOf('requireAuthorization(current);')>0&&complete.indexOf('requireAuthorization(current);')<complete.indexOf('"/api/v1/app-auth/connect"'),
  'authorization precedes the mobile App Auth connect');
 // The browser Google page opens in an external browser's Custom Tab without sharing.
 assert.match(fork,/new CustomTabsIntent\.Builder\(\)\.setShowTitle\(true\)\.setShareState\(CustomTabsIntent\.SHARE_STATE_OFF\)\.build\(\)/);
});
