import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {publicUpdateChannel,apkUpdateChannel,apkUpdateChannelOrLegacy,assertProvisioningUpdateChannel,recordedProvisioningUpdateChannel,validateUpdateChannel,UPDATE_CHANNEL_META,UPDATE_DIGEST_META} from '../scripts/update-channel.ts';
import {consumerBuildOptions} from '../scripts/build-android.ts';
import {parseXmlTree} from '../scripts/apk.ts';

const publicUrl='https://example.test/public-update.json';
const otherUrl='https://example.test/other-update.json';
const hash=text=>createHash('sha256').update(text).digest('hex');
test('builds record the public channel as the digest of the source URL',()=>{
 const record=publicUpdateChannel(publicUrl);
 assert.deepEqual(record,{kind:'public',manifestUrlSha256:hash(publicUrl)});
 const options=consumerBuildOptions({},process.cwd(),record);
 assert.deepEqual(options.record.metadata.updateChannel,record);
});
test('compiled metadata has one channel and digest; substituted or secret-bearing records are rejected',()=>{
 const meta=(name,value)=>`    E: meta-data\n      A: android:name="${name}"\n      A: android:value="${value}"\n`;
 const xml='E: manifest\n  E: application\n'+meta(UPDATE_CHANNEL_META,'public')+meta(UPDATE_DIGEST_META,'sha256:'+hash(publicUrl));
 assert.deepEqual(apkUpdateChannel(parseXmlTree(xml)),{kind:'public',manifestUrlSha256:hash(publicUrl)});
 assert.throws(()=>apkUpdateChannel(parseXmlTree(xml+meta(UPDATE_CHANNEL_META,'public'))));
 assert.throws(()=>validateUpdateChannel({kind:'public',manifestUrlSha256:hash(publicUrl),url:publicUrl}));
 assert.throws(()=>validateUpdateChannel({kind:'other',manifestUrlSha256:hash(publicUrl)}),/input refused/);
});

test('production provisioning checks compiled channel against release evidence with a legacy absence rule',()=>{
 const meta=(name,value)=>`    E: meta-data\n      A: android:name="${name}"\n      A: android:value="${value}"\n`;
 const manifest='E: manifest\n  E: application\n';
 const channel=kind=>meta(UPDATE_CHANNEL_META,kind);
 const digest=value=>meta(UPDATE_DIGEST_META,'sha256:'+value);
 const publicRecord={kind:'public',manifestUrlSha256:hash(publicUrl)};
 const compiled=(...metadata)=>apkUpdateChannelOrLegacy(parseXmlTree(manifest+metadata.join('')));
 assert.equal(compiled(),null);
 assert.equal(recordedProvisioningUpdateChannel(undefined,undefined),null);
 assert.doesNotThrow(()=>assertProvisioningUpdateChannel(compiled(),null));
 assert.deepEqual(recordedProvisioningUpdateChannel(publicRecord,publicRecord),publicRecord);
 assert.deepEqual(recordedProvisioningUpdateChannel(undefined,publicRecord),publicRecord);
 assert.doesNotThrow(()=>assertProvisioningUpdateChannel(compiled(channel('public'),digest(hash(publicUrl))),publicRecord));
 assert.throws(()=>assertProvisioningUpdateChannel(compiled(),publicRecord),/differs from the reviewed release/);
 assert.throws(()=>assertProvisioningUpdateChannel(compiled(channel('public'),digest(hash(publicUrl))),null),/differs from the reviewed release/);
 assert.throws(()=>assertProvisioningUpdateChannel(compiled(channel('public'),digest(hash(otherUrl))),publicRecord),/differs from the reviewed release/);
 assert.throws(()=>compiled(channel('other'),digest(hash(otherUrl))),/input refused/);
 assert.throws(()=>recordedProvisioningUpdateChannel(publicRecord,{kind:'other',manifestUrlSha256:hash(otherUrl)}),/input refused/);
 assert.throws(()=>recordedProvisioningUpdateChannel(publicRecord,{...publicRecord,manifestUrlSha256:hash(otherUrl)}),/differs from the reviewed release/);
 for(const fields of [[channel('public')],[digest(hash(publicUrl))],[channel('public'),channel('public'),digest(hash(publicUrl))]])
  assert.throws(()=>compiled(...fields),/missing or duplicated/);
 assert.throws(()=>apkUpdateChannelOrLegacy(parseXmlTree('E: manifest\n')),/application manifest/);
});

test('compiled channel metadata follows only the explicitly selected identity, with strict legacy absence',()=>{
 const canonical='ai.alphacompute.alphaphone',retained='ai.elizaresearch.alphaphone';
 const meta=(name,value)=>`    E: meta-data\n      A: android:name="${name}"\n      A: android:value="${value}"\n`;
 for(const appId of [canonical,retained]){
  const manifest=`E: manifest\n  A: package="${appId}"\n  E: application\n`;
  const channel=meta(appId+'.UPDATE_CHANNEL','public'),digest=meta(appId+'.UPDATE_MANIFEST_SHA256','sha256:'+hash(publicUrl));
  const read=(...fields)=>apkUpdateChannelOrLegacy(parseXmlTree(manifest+fields.join('')),{appId});
  assert.deepEqual(read(channel,digest),{kind:'public',manifestUrlSha256:hash(publicUrl)});
  assert.equal(read(),null);
  for(const fields of [[channel],[digest],[channel,channel,digest],[channel,digest,digest]])
   assert.throws(()=>read(...fields),/missing or duplicated/);
  const foreign=appId===canonical?retained:canonical;
  const foreignChannel=meta(foreign+'.UPDATE_CHANNEL','public'),foreignDigest=meta(foreign+'.UPDATE_MANIFEST_SHA256','sha256:'+hash(publicUrl));
  for(const fields of [[foreignChannel],[foreignDigest],[foreignChannel,foreignDigest],[channel,digest,foreignChannel],[meta('UPDATE_CHANNEL','public')],[meta('UPDATE_MANIFEST_SHA256','sha256:'+hash(publicUrl))]])
   assert.throws(()=>read(...fields),/another application/);
  assert.throws(()=>apkUpdateChannelOrLegacy(parseXmlTree(manifest+channel+digest),{appId:foreign}),/package differs/);
  assert.throws(()=>apkUpdateChannel(parseXmlTree(manifest),{appId}),/metadata missing/);
 }
});
