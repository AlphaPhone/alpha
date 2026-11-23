// Alpha's Quick Settings tile (AlphaQuickSettingsTile, forked from upstream plugin-native-system
// AssistantEntryTile) on a plain JVM against Android stand-ins, plus its source and manifest
// declaration. Ported from upstream test/assistant-tile.test.mjs and AssistantEntryTileTest.java.
// No Android device, SystemUI or permission is used; this is not device evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {javaBinary,jvmTimeout,nativeSource,fixture,root} from './fixtures/jvm-tools.mjs';

const tile=nativeSource('AlphaQuickSettingsTile.java');
const read=path=>readFileSync(path,'utf8');
/** Alpha's tile wording, read from its resources so the stand-in answers getString as Android would. */
const strings=Object.fromEntries([...read(join(root,'android/app/src/main/res/values/alpha-system-entry.xml'))
 .matchAll(/<string name="(alpha_quick_settings_\w+)">([^<]*)<\/string>/g)].map(([,name,value])=>[name,value]));
const names=Object.keys(strings).sort();
const quote=value=>JSON.stringify(value);

const stubs={
 'android/annotation/SuppressLint.java':'package android.annotation; public @interface SuppressLint {String[] value();}',
 'android/content/Context.java':`package android.content; public class Context {public String getString(int id){switch(id){${names.map((name,index)=>`case ${index+1}:return ${quote(strings[name])};`).join('')}default:throw new IllegalArgumentException("unknown string "+id);}}}`,
 'android/net/Uri.java':'package android.net; public class Uri {}',
 'android/content/Intent.java':'package android.content; public class Intent {public static final String ACTION_ASSIST="android.intent.action.ASSIST";public static final int FLAG_ACTIVITY_NEW_TASK=0x10000000,FLAG_ACTIVITY_CLEAR_TOP=0x04000000;public Class<?> target;public String action;public android.net.Uri data;public int flags,extras;public Intent(Context context,Class<?> cls){target=cls;}public Intent setAction(String a){action=a;return this;}public Intent setData(android.net.Uri u){data=u;return this;}public Intent putExtra(String k,String v){extras++;return this;}public Intent addFlags(int f){flags|=f;return this;}}',
 'android/app/Activity.java':'package android.app; public class Activity extends android.content.Context {}',
 'android/app/PendingIntent.java':'package android.app; public class PendingIntent {public static final int FLAG_UPDATE_CURRENT=0x08000000,FLAG_IMMUTABLE=0x04000000;public android.content.Intent intent;public int flags,requestCode;public static PendingIntent getActivity(android.content.Context c,int request,android.content.Intent i,int f){PendingIntent p=new PendingIntent();p.intent=i;p.flags=f;p.requestCode=request;return p;}}',
 'android/graphics/drawable/Icon.java':'package android.graphics.drawable; public class Icon {public int resource;public static Icon createWithResource(android.content.Context c,int id){Icon i=new Icon();i.resource=id;return i;}}',
 'android/os/Build.java':'package android.os; public class Build {public static class VERSION {public static int SDK_INT=36;}public static class VERSION_CODES {public static final int N=24,Q=29,UPSIDE_DOWN_CAKE=34;}}',
 'android/service/quicksettings/Tile.java':'package android.service.quicksettings; public class Tile {public static final int STATE_UNAVAILABLE=0,STATE_INACTIVE=1,STATE_ACTIVE=2;public int state=STATE_ACTIVE,updates;public boolean subtitleSet;public CharSequence label,subtitle,description;public android.graphics.drawable.Icon icon;public void setIcon(android.graphics.drawable.Icon i){icon=i;}public void setLabel(CharSequence s){label=s;}public void setSubtitle(CharSequence s){subtitle=s;subtitleSet=true;}public void setContentDescription(CharSequence s){description=s;}public void setState(int s){state=s;}public void updateTile(){updates++;}}',
 'android/service/quicksettings/TileService.java':'package android.service.quicksettings; public class TileService extends android.content.Context {public boolean locked;public Runnable unlock;public Tile tile=new Tile();public int launched;public android.content.Intent lastIntent;public android.app.PendingIntent lastPending;public void onStartListening(){}public void onClick(){}public Tile getQsTile(){return tile;}public boolean isLocked(){return locked;}public void unlockAndRun(Runnable r){unlock=r;}public void startActivityAndCollapse(android.content.Intent i){lastIntent=i;launched++;}public void startActivityAndCollapse(android.app.PendingIntent p){lastPending=p;lastIntent=p.intent;launched++;}}',
 'ai/alphacompute/alphaphone/AlphaAssistActivity.java':'package ai.alphacompute.alphaphone; public class AlphaAssistActivity extends android.app.Activity {}',
 'ai/alphacompute/alphaphone/R.java':`package ai.alphacompute.alphaphone; final class R {static final class string {${names.map((name,index)=>`static final int ${name}=${index+1};`).join('')}} static final class drawable {static final int notification_icon=${names.length+1};}}`,
};

test('Alpha\'s tile waits for unlock, opens one immutable assist entry and never reports an active state',()=>{
 assert.deepEqual(names,['alpha_quick_settings_description','alpha_quick_settings_label','alpha_quick_settings_locked','alpha_quick_settings_open']);
 const dir=mkdtempSync(join(tmpdir(),'alpha-quick-settings-tile-'));
 try{
  const files=Object.entries(stubs).map(([name,body])=>{const file=join(dir,'src',name);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,body);return file;});
  execFileSync(javaBinary('javac'),['--release','17','-proc:none','-d',join(dir,'classes'),...files,tile,fixture('AlphaQuickSettingsTileTest.java')],{timeout:jvmTimeout});
  assert.match(execFileSync(javaBinary('java'),['-cp',join(dir,'classes'),'ai.alphacompute.alphaphone.AlphaQuickSettingsTileTest'],{encoding:'utf8',timeout:jvmTimeout}),
   /^PASS Alpha quick settings tile/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('the tile carries no capture, permission or lock-screen shortcut and is declared as a SystemUI-bound action tile',()=>{
 const source=read(tile).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'');
 for(const forbidden of ['requestPermissions','startForegroundService','setShowWhenLocked','setTurnScreenOn','requestDismissKeyguard','putExtra(','setData(','STATE_ACTIVE'])
  assert.ok(!source.includes(forbidden),forbidden);
 assert.match(source,/public final class AlphaQuickSettingsTile extends TileService \{/);
 assert.doesNotMatch(source,/ai\.eliza\.plugins\.system\.AssistantEntryTile/);
 // The installed component keeps its name, SystemUI-only binding and non-toggle declaration.
 const manifest=read(join(root,'android/app/manifests/main/AndroidManifest.xml'));
 const entry=manifest.match(/<service android:name="\.AlphaQuickSettingsTile"[\s\S]*?<\/service>/)?.[0];
 assert.ok(entry,'Alpha\'s tile is declared under its installed name');
 assert.match(entry,/android:permission="android\.permission\.BIND_QUICK_SETTINGS_TILE"/);
 assert.match(entry,/android:enabled="false"/);
 assert.match(entry,/<action android:name="android\.service\.quicksettings\.action\.QS_TILE"\/>/);
 assert.match(entry,/android:name="android\.service\.quicksettings\.TOGGLEABLE_TILE" android:value="false"/);
});
