// AlphaCloudSignInClient is Alpha's own copy of the shared native Cloud sign-in client
// (vendor/eliza packages/auth/android ai.eliza.auth.cloud.CloudSignInPlugin), forked so that the
// authorization dialog and the browser launch are Alpha's UI. Below its class declaration it must
// stay the reviewed projection of the pinned upstream client, so the sign-in,
// acknowledgement, renewal and revocation semantics remain the ones upstream's own tests cover
// (packages/auth/android/test). When the pin moves and upstream changed the client, this fails:
// review the diff, port shared sign-in changes into AlphaCloudSignInClient, then rerun. Source reading only: no Android, Cloud,
// Google or credential is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const UPSTREAM='vendor/eliza/packages/auth/android/src/main/java/ai/eliza/auth/cloud/CloudSignInPlugin.java';
const FORK='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCloudSignInClient.java';
const HOST='android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCloudSignInPlugin.java';
const UPSTREAM_DECLARATION='public abstract class CloudSignInPlugin extends Plugin {';
const FORK_DECLARATION='public abstract class AlphaCloudSignInClient extends Plugin {';
// Upstream #39859 put encrypted password backup inside its sign-in client. Alpha's PRD keeps
// the vault on-device, so its client keeps the ordinary email, phone and Google sign-in paths.
// The upstream picker also supplies the account for its combined sign-in and Gmail grant. Alpha
// uses the ID token for sign-in and keeps Google service access behind its separate settings flow.
// Both full bodies are bound here to make any later upstream or Alpha change require review.
const SIGN_IN_BODY = {
 upstream: 'd3d15cec52d7a4cd888c46073cd5db462883abed33373375befef0daff254254',
 alpha: 'eda78b5ba91bd7a147545fad2c3a7c3db8c7a7650ac84f1271d2456ec31fdb53',
};
const sha256=body=>createHash('sha256').update(body).digest('hex');
/** The shared non-UI policy the fork keeps using from the pinned upstream package. */
const SHARED=['CloudCredentialSlots','CloudEmailCode','CloudKeyRenewal','CloudKeyRevocation','CloudSignInConfig','CloudSignInEnvironment',
 'CloudSignInFlow','CloudSignInReadiness','CloudSignInRoutes','CloudSmsCode','NativeGoogleCredential'];

const split=(source,declaration)=>{
 const at=source.indexOf(declaration);
 assert.ok(at>0,declaration);
 return {header:source.slice(0,at),body:source.slice(at+declaration.length)};
};
const imports=header=>[...header.matchAll(/^import ([\w.]+);$/gm)].map(match=>match[1]).sort();

test('the complete upstream and Alpha sign-in bodies match the reviewed local-vault projection',()=>{
 const upstream=split(read(UPSTREAM),UPSTREAM_DECLARATION),fork=split(read(FORK),FORK_DECLARATION);
 assert.equal(sha256(upstream.body),SIGN_IN_BODY.upstream,'review the change to the upstream sign-in client');
 assert.equal(sha256(fork.body),SIGN_IN_BODY.alpha,'review the Alpha sign-in client against the pinned upstream client');
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
