// The OTA readiness check judges the live channel the way an installed phone does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {channelStatus}=await import('../scripts/update-channel-status.ts');
const {appUpdateManifestUrl}=await import('../scripts/update-channel.ts');
const signer=JSON.parse(fs.readFileSync('android/release-signer.json','utf8')).signerSha256;
const offer=(versionCode,overrides={})=>({schema:'alpha-update/v1',versionCode,variant:'launcher',signerSha256:signer,
 apkUrl:`https://github.com/eliza-research/alpha/releases/download/app-stable-alphacompute/alpha-phone-${versionCode}.apk`,sha256:'a'.repeat(64),sizeBytes:1000,...overrides});
const reader=objects=>async url=>{const value=objects[url];if(value===undefined)return null;const bytes=Buffer.from(JSON.stringify(value));return {size:bytes.length,sha256:'x',bytes};};
const current=appUpdateManifestUrl('app-stable-alphacompute'),legacy=appUpdateManifestUrl('app-stable');
const legacyOffer={...offer(75),signerSha256:'0'.repeat(64),apkUrl:'https://github.com/eliza-research/alphaphone/releases/download/app-stable/alpha-phone-75.apk'};

test('nothing published is a failure that says installed phones see no update',async()=>{
 const rows=await channelStatus({read:reader({[legacy]:legacyOffer})});
 const missing=rows.find(row=>row.gate==='manifest published');
 assert.equal(missing.passed,false);
 assert.match(missing.detail,/see no update/);
});
test('a published, newer, release-signed launcher offer passes',async()=>{
 const rows=await channelStatus({read:reader({[current]:offer(78),[legacy]:legacyOffer})});
 assert.ok(rows.every(row=>row.passed),JSON.stringify(rows));
});
test('a stale version, another signer or another release fail',async()=>{
 const gate=async(published,name)=>(await channelStatus({read:reader({[current]:published,[legacy]:legacyOffer})})).find(row=>row.gate===name);
 assert.equal((await gate(offer(75),'above legacy floor')).passed,false);
 assert.equal((await gate(offer(78,{signerSha256:'1'.repeat(64)}),'release signer')).passed,false);
 assert.equal((await gate(offer(78,{apkUrl:'https://example.com/alpha-phone-78.apk'}),'canonical APK')).passed,false);
});
