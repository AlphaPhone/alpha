// Alpha draws every native password screen itself (PasswordFillActivity, PasswordSaveActivity,
// PasswordEditor, PasswordUnlock, SecretSurfaces and AlphaPasswordsPlugin in
// android/app/src/main/java/ai/alphacompute/alphaphone) with its own wording in
// android/app/src/main/res/values/alpha_passwords.xml. The shared plugin-native-passwords module
// keeps the vault custody, the policies and the Autofill service, which stays declared under its
// installed component name (Android keeps the selected provider by that name); its strings are
// pointed at Alpha's in eliza_passwords.xml, so its offer row reads Alpha's wording and its fill and
// save tokens open Alpha's screens through activity aliases.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const strings=xml=>new Map([...xml.matchAll(/<string name="([^"]+)"(?![^>]*translatable="false")[^>]*>([^<]*)<\/string>/g)].map(m=>[m[1],m[2]]));
const upstream=strings(read('vendor/eliza/plugins/plugin-native-passwords/android/src/main/res/values/eliza_passwords.xml'));
const shared=strings(read('android/app/src/main/res/values/eliza_passwords.xml'));
const alpha=strings(read('android/app/src/main/res/values/alpha_passwords.xml'));
const own=name=>name.replace(/^eliza_passwords_/,'alpha_passwords_');
const args=text=>[...text.matchAll(/%\d+\$[sd]/g)].map(m=>m[0]).sort();
const NATIVE='android/app/src/main/java/ai/alphacompute/alphaphone/';
const SCREENS=['PasswordFillActivity','PasswordSaveActivity','PasswordEditor','PasswordUnlock','PasswordSheet','SecretSurfaces','PasswordSurfaces','AutofillStructures','PasswordVaultGate','AlphaPasswordsPlugin'];

test('every screen string of the shared module points at Alpha’s own, with the same arguments',()=>{
 assert.ok(upstream.size>=38,'shared screen strings: '+upstream.size);
 for(const [name,text] of upstream){
  assert.equal(shared.get(name),'@string/'+own(name),'shared name points at Alpha’s: '+name);
  assert.ok(alpha.has(own(name)),'Alpha string: '+own(name));
  assert.deepEqual(args(alpha.get(own(name))),args(text),name);
 }
 assert.deepEqual([...shared.keys()].sort(),[...upstream.keys()].sort(),'eliza_passwords.xml holds only the shared names');
 assert.deepEqual([...alpha.keys()].sort(),[...upstream.keys()].map(own).sort(),'Alpha words exactly the vault screens');
});

test('Alpha’s wording replaces the shared sentences people read',()=>{
 const PINNED={
  alpha_passwords_unlock_title:'Unlock Alpha passwords',
  alpha_passwords_fill_offer:'Fill with a password saved in Alpha',
  alpha_passwords_fill_title:'Choose a saved sign-in',
  alpha_passwords_save_title:'Save this password in Alpha?',
  alpha_passwords_saved:'Password saved in Alpha',
  alpha_passwords_copied:'Password copied. Alpha clears it from the clipboard shortly.',
  alpha_passwords_no_screen_lock:'Set a screen lock to use the passwords saved in Alpha',
  alpha_passwords_editor_title:'Add password',
  alpha_passwords_editor_same_title:'This sign-in is already saved',
  alpha_passwords_editor_invalid:'Check the fields. The website must be an exact HTTPS address with no path.',
 };
 for(const [name,text] of Object.entries(PINNED))assert.equal(alpha.get(name),text,name);
 const changed=[...upstream].filter(([name,text])=>alpha.get(own(name))!==text).length;
 assert.ok(changed>=25,'Alpha words most of the shared sentences itself: '+changed);
});

test('Alpha’s password screens read only Alpha’s resources and never the shared screens',()=>{
 for(const screen of SCREENS){
  const source=read(NATIVE+screen+'.java');
  assert.match(source,/^package ai\.alphacompute\.alphaphone;/,screen);
  for(const [,name] of source.matchAll(/\bR\.string\.(\w+)/g)){
   assert.match(name,/^alpha_passwords_/,screen+' reads '+name);
   assert.ok(alpha.has(name),screen+' reads a defined string: '+name);
  }
  assert.doesNotMatch(source,/\bR\.(?:style|xml)\.eliza_|ElizaPasswords\.Theme/,screen);
 }
 // The shared module's screens are not reached from anywhere in Alpha's app sources.
 const UI=/ai\.eliza\.plugins\.passwords\.(?:PasswordFillActivity|PasswordSaveActivity|PasswordEditor|PasswordUnlock|PasswordSheet|SecretSurfaces|PasswordSurfaces|PasswordsPlugin|ElizaPasswordAutofillService)\b/;
 for(const file of readdirSync(new URL('../'+NATIVE,import.meta.url),{recursive:true}).filter(name=>/\.java$/.test(name))){
  assert.doesNotMatch(read(NATIVE+file),UI,file);
 }
 // The bridge keeps the renderer's name and the refusals passwords-presentation.ts words.
 const plugin=read(NATIVE+'AlphaPasswordsPlugin.java');
 assert.match(plugin,/@CapacitorPlugin\(name = "ElizaPasswords"\)/);
 const upstreamPlugin=read('vendor/eliza/plugins/plugin-native-passwords/android/src/main/java/ai/eliza/plugins/passwords/PasswordsPlugin.java');
 const refusals=text=>[...text.matchAll(/call\.reject\("([^"]+)", "([a-z-]+)"\)/g)].map(m=>m[1]+'|'+m[2]).sort();
 assert.deepEqual(refusals(plugin),refusals(upstreamPlugin),'same refusal sentences and codes');
});

test('Alpha declares its own fill and save screens in place of the shared ones',()=>{
 const manifest=read('android/app/manifests/main/AndroidManifest.xml');
 for(const screen of ['PasswordFillActivity','PasswordSaveActivity']){
  assert.match(manifest,new RegExp(`<activity[^>]*android:name="ai\\.eliza\\.plugins\\.passwords\\.${screen}"[^>]*tools:node="remove"`),'shared '+screen+' removed');
  const own=new RegExp(`<activity[^>]*android:name="\\.${screen}"[^>]*>`).exec(manifest)?.[0];
  assert.ok(own,'Alpha '+screen+' declared');
  assert.match(own,/android:exported="false"/);
  assert.match(own,/android:excludeFromRecents="true"/);
  assert.match(own,/android:theme="@style\/AlphaPasswords\.Theme\.Dialog"/);
  // The shared name the Autofill service's one-shot tokens open is an alias of Alpha's screen.
  const alias=new RegExp(`<activity-alias[^>]*android:name="ai\\.eliza\\.plugins\\.passwords\\.${screen}"[^>]*>`).exec(manifest)?.[0];
  assert.ok(alias,'shared '+screen+' name kept as an alias');
  assert.match(alias,new RegExp(`android:targetActivity="\\.${screen}"`));
  assert.match(alias,/android:exported="false"/);
 }
 // The Autofill service keeps its installed component name and reads Alpha's label and settings.
 const service=/<service[^>]*android:name="ai\.eliza\.plugins\.passwords\.ElizaPasswordAutofillService"[^>]*>[\s\S]*?<\/service>/.exec(manifest)?.[0];
 assert.ok(service,'Autofill service declared under its installed name');
 assert.match(service,/android:label="@string\/alpha_passwords_service_label"/);
 assert.match(service,/android:resource="@xml\/alpha_passwords_autofill_service"/);
});
