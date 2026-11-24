import test from 'node:test';
import {normalizeSignInPhone, signInReadiness, validSignInPhone} from '../apps/app/src/runtime/cloud-sign-in.ts';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer,loadConfigFromFile} from 'vite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);

test('phone sign-in and code entry stay in the app and require native support',()=>{
 const code=buildSync({entryPoints:['apps/app/src/runtime/cloud-sign-in-ui.tsx'],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime']}).outputFiles[0].text;
 const module={exports:{}};new Function('require','module','exports',code)(require,module,module.exports);
 const panel=module.exports.CloudSignInPanel;
 const props={view:{step:'choose',environment:'production'},busy:false,google:false,message:'',error:'',actions:{}};
 const render=extra=>renderToStaticMarkup(React.createElement(panel,{...props,...extra}));
 assert.doesNotMatch(render({phone:false}),/type="tel"|Continue with phone number/);
 assert.doesNotMatch(render({phone:false}),/Sign in to verify your account|review access before authorizing|Your agent runs on this device/);
 assert.doesNotMatch(render({phone:false}),/By continuing, you allow/);
 assert.match(render({phone:true}),/<label>Email<input type="email"/);
 assert.match(render({phone:true}),/Continue with phone number/);
 assert.match(render({phone:false,showPhone:true}),/disabled=""[^>]*>Continue with phone number/);
 assert.match(render({phone:true,emailEnabled:false}),/<label>Phone number<input/);
 assert.match(render({phone:true,emailEnabled:false}),/type="tel"/);
 assert.match(render({phone:true,view:{step:'choose',environment:'production',phone:'+14155550100'}}),/value="\+14155550100"/,'a failed text-message attempt returns to the phone entry with its number');
 assert.doesNotMatch(render({phone:true,emailEnabled:false}),/type="email"/);
 const entered=render({phone:true,view:{step:'code',environment:'production',phone:'+14155550100',email:'',attemptId:'synthetic',expiresAt:Date.now()+60000,resendAt:Date.now()+60000}});
 assert.match(entered,/Enter your phone code/);assert.match(entered,/\+14155550100/);assert.match(entered,/Resend · \d+s/);
 assert.doesNotMatch(entered,/href=|iframe|type="email"/);
});

test('phone codes use the native host, retain MFA, and never reach renderer HTTP',async t=>{
 // Keep Vite's dependency scan and cache out of the repository's shared node_modules/.vite.
 const cacheDir=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-phone-login-vite-'));t.after(()=>fs.rmSync(cacheDir,{recursive:true,force:true}));
 // The renderer's own upstream aliases (vite.config.ts), so every module resolves as it does in the app.
 const {config}=await loadConfigFromFile({command:'serve',mode:'development'},path.resolve('vite.config.ts'),undefined,'silent');
 const server=await createServer({configFile:false,logLevel:'silent',cacheDir,resolve:{alias:config.resolve.alias},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
 try {
  const {CloudProtocol}=await server.ssrLoadModule('/apps/app/src/runtime/cloud-protocol.ts');
  const calls=[];const attemptId='00000000-0000-4000-8000-000000000001';
  const signIn={startPhone:async input=>{calls.push(input);return {attemptId,expiresAt:Date.now()+60000,resendAt:Date.now()+30000};},verifyPhone:async input=>{calls.push(input);return {status:'mfa',method:'totp',expiresAt:Date.now()+60000};},cancel:async()=>{}};
  const client=new CloudProtocol('production',async()=>{throw Error('renderer network must not run');},{read:async()=>null,write:async()=>{},clear:async()=>{}},async()=>{},{signIn});
  const signal=new AbortController().signal;
  assert.equal((await client.startPhoneSignIn('+14155550100',signal)).attemptId,attemptId);
  assert.equal((await client.verifyPhoneSignIn(attemptId,'123456',signal)).status,'mfa');
  assert.deepEqual(calls,[{environment:'production',phone:'+14155550100'},{attemptId,code:'123456'}]);
  delete signIn.startPhone;
  await assert.rejects(client.startPhoneSignIn('+14155550100',signal),error=>error.code==='unavailable');
 }finally{await server.close();}
});

test('method discovery accepts independent methods and never guesses SMS from old or malformed answers',()=>{
 assert.deepEqual(signInReadiness({inApp:true,email:false,phone:true,google:false}),{email:false,phone:true,google:false});
 assert.deepEqual(signInReadiness({inApp:true,email:false,google:true}),{email:false,phone:false,google:true});
 assert.equal(signInReadiness({inApp:false,phone:true}),null);
 assert.equal(signInReadiness({inApp:true,email:true,phone:'true'}).phone,false);
 assert.equal(signInReadiness(null),null);
 assert.deepEqual(signInReadiness({inApp:false,methodsKnown:true,email:false,phone:false,google:false}),{email:false,phone:false,google:false});
});

test('typed phone numbers normalise separators, 00 prefix and 10/11-digit US numbers to E.164',()=>{
 assert.equal(normalizeSignInPhone(' (415) 555-0100 '),'+14155550100');
 assert.equal(normalizeSignInPhone('1-415-555-0100'),'+14155550100');
 assert.equal(normalizeSignInPhone('0044 20 7946 0958'),'+442079460958');
 assert.equal(normalizeSignInPhone('+44 (20) 7946-0958'),'+442079460958');
 assert.equal(validSignInPhone(normalizeSignInPhone('(415) 555-0100')),true);
 assert.equal(validSignInPhone(normalizeSignInPhone('+1 (415) 555-010a')),false);
});
