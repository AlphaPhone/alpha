// The shared password vault (plugin-native-passwords) draws its unlock, fill, save and editor
// screens from Android string resources a host overrides by name. Alpha overrides every one of
// them in android/app/src/main/res/values/eliza_passwords.xml, so no screen shows the shared
// module's English, and keeps each format argument the screen fills in.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const strings=xml=>new Map([...xml.matchAll(/<string name="([^"]+)"(?![^>]*translatable="false")[^>]*>([^<]*)<\/string>/g)].map(m=>[m[1],m[2]]));
const upstream=strings(read('vendor/eliza/plugins/plugin-native-passwords/android/src/main/res/values/eliza_passwords.xml'));
const alpha=strings(read('android/app/src/main/res/values/eliza_passwords.xml'));
const args=text=>[...text.matchAll(/%\d+\$[sd]/g)].map(m=>m[0]).sort();

test('every screen string of the shared vault has an Alpha override with the same arguments',()=>{
 assert.ok(upstream.size>=38,'shared screen strings: '+upstream.size);
 for(const [name,text] of upstream){
  assert.ok(alpha.has(name),'Alpha override: '+name);
  assert.deepEqual(args(alpha.get(name)),args(text),name);
 }
 assert.deepEqual([...alpha.keys()].sort(),[...upstream.keys()].sort(),'Alpha overrides only shared screen strings');
});

test('Alpha’s wording replaces the shared sentences people read',()=>{
 const PINNED={
  eliza_passwords_unlock_title:'Unlock Alpha passwords',
  eliza_passwords_fill_title:'Choose a saved sign-in',
  eliza_passwords_save_title:'Save this password in Alpha?',
  eliza_passwords_copied:'Password copied. Alpha clears it from the clipboard shortly.',
  eliza_passwords_no_screen_lock:'Set a screen lock to use the passwords saved in Alpha',
  eliza_passwords_editor_title:'Add password',
  eliza_passwords_editor_same_title:'This sign-in is already saved',
  eliza_passwords_editor_invalid:'Check the fields. The website must be an exact HTTPS address with no path.',
 };
 for(const [name,text] of Object.entries(PINNED))assert.equal(alpha.get(name),text,name);
 const changed=[...upstream].filter(([name,text])=>alpha.get(name)!==text).length;
 assert.ok(changed>=25,'Alpha words most of the shared sentences itself: '+changed);
});
