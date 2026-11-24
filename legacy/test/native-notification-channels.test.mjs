import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {nativeSource,runJvm,jvmSkip,root,javaBinary,jsonJar,jvmTimeout} from './fixtures/jvm-tools.mjs';
import {stringResources} from '../specs/quint/refinement/native/string-resources.mjs';

// Run the actual presentation helper against a recording platform boundary. This verifies the
// calls Alpha makes, not Android's persistence of user choices or real Settings presentation.
// The platform keeps an installed channel's group, as Android does: a group is set only on a
// channel that has none.
const platform=(dir,strings)=>{
 const files=[nativeSource('AlphaNotificationChannels.java')];
 const put=(name,source)=>{const file=join(dir,name);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,source);files.push(file);};
 put('android/app/NotificationChannel.java',`package android.app;
public final class NotificationChannel {
 private final String id;private final CharSequence name;private final int importance;private String description,group;
 public int visibility=-1000;public boolean userImportance,userSound;
 public NotificationChannel(String id,CharSequence name,int importance){this.id=id;this.name=name;this.importance=importance;}
 public String getId(){return id;}public CharSequence getName(){return name;}public int getImportance(){return importance;}
 public String getDescription(){return description;}public void setDescription(String value){description=value;}
 public String getGroup(){return group;}public void setGroup(String value){group=value;}
 public int getLockscreenVisibility(){return visibility;}public boolean hasUserSetImportance(){return userImportance;}public boolean hasUserSetSound(){return userSound;}
}`);
 put('android/app/NotificationChannelGroup.java',`package android.app;
public final class NotificationChannelGroup {
 private final String id;private final CharSequence name;public boolean blocked;
 public NotificationChannelGroup(String id,CharSequence name){this.id=id;this.name=name;}
 public String getId(){return id;}public CharSequence getName(){return name;}public boolean isBlocked(){return blocked;}
}`);
 put('android/app/Notification.java',`package android.app;
public final class Notification {public static final int VISIBILITY_PUBLIC=1;}`);
 put('android/service/notification/NotificationListenerService.java',`package android.service.notification;
public abstract class NotificationListenerService {public static class Ranking {public static final int VISIBILITY_NO_OVERRIDE=-1000;}}`);
 put('android/os/Build.java',`package android.os;
public final class Build {public static final class VERSION {public static int SDK_INT=36;}}`);
 put('android/app/NotificationManager.java',`package android.app;
public final class NotificationManager {
 public static final int IMPORTANCE_NONE=0,IMPORTANCE_LOW=2,IMPORTANCE_DEFAULT=3,IMPORTANCE_HIGH=4;
 public final java.util.Map<String,NotificationChannel> installed=new java.util.LinkedHashMap<>();
 public final java.util.Map<String,NotificationChannelGroup> groups=new java.util.LinkedHashMap<>();
 public final java.util.List<NotificationChannel> writes=new java.util.ArrayList<>();
 public final java.util.List<NotificationChannelGroup> groupWrites=new java.util.ArrayList<>();
 public boolean refuseRead,refuseWrite;public int attempts;
 public NotificationChannel getNotificationChannel(String id){if(refuseRead)throw new SecurityException("read refused");return installed.get(id);}
 public java.util.List<NotificationChannelGroup> getNotificationChannelGroups(){if(refuseRead)throw new SecurityException("read refused");return new java.util.ArrayList<>(groups.values());}
 public NotificationChannelGroup getNotificationChannelGroup(String id){return groups.get(id);}
 public void createNotificationChannelGroup(NotificationChannelGroup value){if(refuseWrite)throw new SecurityException("write refused");NotificationChannelGroup old=groups.get(value.getId());if(old!=null)value.blocked=old.blocked;groupWrites.add(value);groups.put(value.getId(),value);}
 public void createNotificationChannel(NotificationChannel value){attempts++;if(refuseWrite)throw new SecurityException("write refused");NotificationChannel old=installed.get(value.getId());if(old==null)throw new AssertionError("Created an absent channel");
  if(value.getGroup()!=null&&!groups.containsKey(value.getGroup()))throw new IllegalArgumentException("NotificationChannelGroup doesn't exist");
  if(old.getGroup()!=null)value.setGroup(old.getGroup());writes.add(value);installed.put(value.getId(),value);}
}`);
 put('android/content/Context.java',`package android.content;
public final class Context {
 public android.app.NotificationManager manager;public boolean refuse;
 public Context(android.app.NotificationManager manager){this.manager=manager;}
 public <T>T getSystemService(Class<T> type){if(refuse)throw new SecurityException("service refused");return type.cast(manager);}
${strings.getString}}`);
 // The shipped string resources, as Android returns them.
 put('R.java',`package ai.alphacompute.alphaphone;
final class R {${strings.rString}}`);
 // Channel identities of Alpha's own posters, named the same as the installed constants.
 put('Posters.java',`package ai.alphacompute.alphaphone;
final class AlphaReminders {static final Configuration CONFIGURATION=new Configuration();static final class Configuration {final String channelId="alpha_reminders";String dueChannelId(){return channelId+"-due";}}}
final class GmailNoticePoster {static final String CHANNEL="alpha-gmail";}
final class AlphaHostedResultsPlugin {static final String CHANNEL="alpha-hosted-results";}
final class WorkflowNoticePoster {static final String CHANNEL="alpha_workflow_steps",APPROVAL_CHANNEL="alpha_workflow_approvals";}
final class AlphaNoteRecordingService {static final String CHANNEL="alpha.notes.recording";}
final class AlphaNavigationService {static final String CHANNEL="alpha.maps.navigation";}`);
 // The shared channel routing, staged into Alpha's package as the Android host generator stages it.
 const shared=readFileSync(join(root,'vendor/eliza/packages/app/platforms/android/app/src/main/java/ai/elizaos/app/NativeNotificationChannels.java'),'utf8');
 assert.match(shared,/^package ai\.elizaos\.app;$/m);
 put('NativeNotificationChannels.java',shared.replace(/^package ai\.elizaos\.app;$/m,'package ai.alphacompute.alphaphone;'));
 return {files,put};
};
test('channel descriptions update only existing identities and recover after platform refusal',{skip:jvmSkip('javac')},()=>{
 const dir=mkdtempSync(join(tmpdir(),'alpha-channel-descriptions-'));
 try{
  const {files,put}=platform(dir,stringResources());
  put('ChannelDescriptionsTest.java',`package ai.alphacompute.alphaphone;
import android.app.*;import android.content.Context;
public final class ChannelDescriptionsTest {
 static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 static NotificationChannel seed(NotificationManager manager,String id,String name,int importance){NotificationChannel row=new NotificationChannel(id,name,importance);manager.installed.put(id,row);return row;}
 public static void main(String[] args){
  NotificationManager manager=new NotificationManager();Context context=new Context(manager);
  AlphaNotificationChannels.describe(context);check(manager.attempts==0&&manager.groups.isEmpty(),"Absent channels must stay absent and need no group");
  seed(manager,"eliza_alerts","Installed alerts",0);seed(manager,"eliza_quiet","Installed quiet",2);
  seed(manager,"alpha_reminders","Earlier reminders",1);seed(manager,"alpha_reminders-due","Earlier reminders (due)",4);
  NotificationChannel unrelated=seed(manager,"unrelated","Unrelated",3);
  AlphaNotificationChannels.describe(context);check(manager.writes.size()==4,"Only the four existing known channels are described");
  check(manager.installed.size()==5&&manager.installed.get("unrelated")==unrelated,"No new identities or unrelated changes");
  check(manager.installed.get("eliza_alerts").getImportance()==0,"A blocked channel stays blocked in the submitted update");
  check(manager.installed.get("eliza_alerts").getName().toString().equals("Installed alerts"),"Existing ordinary names are retained");
  check(manager.installed.get("eliza_quiet").getImportance()==2,"Existing importance is retained");
  check(manager.installed.get("eliza_quiet").getDescription().equals("Low-priority notices from Alpha. Shown without sound."),"Quiet description");
  check(manager.installed.get("alpha_reminders").getName().toString().equals("Reminders (not used)"),"Legacy reminder presentation");
  check(manager.installed.get("alpha_reminders").getImportance()==1,"Legacy reminder importance");
  check(manager.installed.get("alpha_reminders-due").getName().toString().equals("Reminders"),"Active reminder presentation");
  check(manager.installed.get("alpha_reminders-due").getImportance()==4,"Active reminder importance");
  check(manager.installed.get("alpha_reminders-due").getDescription().equals("Reminders you set on this phone. Android may delay them."),"Active reminder description");
  int attempts=manager.attempts;AlphaNotificationChannels.describe(context);check(manager.attempts==attempts,"Matching descriptions are not written again");
  AlphaNotificationChannels.describe(new Context(null));context.refuse=true;AlphaNotificationChannels.describe(context);context.refuse=false;
  NotificationManager retry=new NotificationManager();Context retryContext=new Context(retry);
  NotificationChannel original=seed(retry,"eliza_alerts","Retry alerts",0);
  retry.refuseRead=true;AlphaNotificationChannels.describe(retryContext);check(retry.attempts==0,"Read refusal does not invent a channel");
  retry.refuseRead=false;retry.refuseWrite=true;AlphaNotificationChannels.describe(retryContext);
  check(retry.installed.get("eliza_alerts")==original&&retry.groups.isEmpty(),"Write refusal leaves the installed record alone");
  retry.refuseWrite=false;AlphaNotificationChannels.describe(retryContext);
  check(retry.writes.size()==1&&retry.installed.get("eliza_alerts").getDescription()!=null,"A later refresh retries the refused update");
  System.out.println("PASS existing channel identities, presentation, idempotence and refusal recovery");
 }
}`);
  assert.match(runJvm(files,'ai.alphacompute.alphaphone.ChannelDescriptionsTest'),/^PASS existing channel identities/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('installed channels join Alpha\'s groups once, keep an existing group, and occurrence alerts still route as before',{skip:jvmSkip('javac')},()=>{
 const dir=mkdtempSync(join(tmpdir(),'alpha-channel-groups-'));
 try{
  const {files,put}=platform(dir,stringResources());
  put('ChannelGroupsTest.java',`package ai.alphacompute.alphaphone;
import android.app.*;import android.content.Context;
public final class ChannelGroupsTest {
 static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 static NotificationChannel seed(NotificationManager manager,String id,String name,int importance){NotificationChannel row=new NotificationChannel(id,name,importance);row.setDescription("Installed "+id);manager.installed.put(id,row);return row;}
 static String group(NotificationManager manager,String id){return manager.installed.get(id).getGroup();}
 public static void main(String[] args){
  NotificationManager manager=new NotificationManager();Context context=new Context(manager);
  for(String id:new String[]{"eliza_updates","eliza_notifications","alpha-gmail","alpha-hosted-results","alpha_workflow_steps","alpha_workflow_approvals","alpha.notes.recording","alpha.maps.navigation","alpha_reminders-due"})seed(manager,id,"Installed "+id,3);
  manager.groups.put("owner-made",new NotificationChannelGroup("owner-made","Elsewhere"));manager.installed.get("eliza_notifications").setGroup("owner-made");
  AlphaNotificationChannels.describe(context);
  check(group(manager,"eliza_updates").equals("alpha.group.assistant"),"Assistant group");
  check(group(manager,"eliza_notifications").equals("owner-made"),"An installed group is never moved");
  check(group(manager,"alpha-gmail").equals("alpha.group.mail-briefs")&&group(manager,"alpha-hosted-results").equals("alpha.group.mail-briefs"),"Mail and briefs group");
  check(group(manager,"alpha_workflow_steps").equals("alpha.group.workflows")&&group(manager,"alpha_workflow_approvals").equals("alpha.group.workflows"),"Workflows group");
  check(group(manager,"alpha.notes.recording").equals("alpha.group.ongoing")&&group(manager,"alpha.maps.navigation").equals("alpha.group.ongoing"),"Ongoing activity group");
  check(group(manager,"alpha_reminders-due")==null,"Reminders stay ungrouped");
  check(manager.installed.get("alpha-gmail").getName().toString().equals("Installed alpha-gmail")&&manager.installed.get("alpha-gmail").getDescription().equals("Installed alpha-gmail"),"A poster's own name and description are kept");
  check(manager.groupWrites.size()==4,"Each used group is created once: "+manager.groupWrites.size());
  check(manager.groups.get("alpha.group.assistant").getName().toString().equals("Assistant")&&manager.groups.get("alpha.group.mail-briefs").getName().toString().equals("Mail and briefs")
   &&manager.groups.get("alpha.group.workflows").getName().toString().equals("Workflows")&&manager.groups.get("alpha.group.ongoing").getName().toString().equals("Ongoing activity"),"Group names");
  int writes=manager.writes.size(),groupWrites=manager.groupWrites.size();AlphaNotificationChannels.describe(context);
  check(manager.writes.size()==writes&&manager.groupWrites.size()==groupWrites,"Grouped channels are not written again");
  // Shared occurrence routing on Android 11+: before Alpha names its groups, Alpha's own group on eliza_updates reads as an owner choice.
  NativeNotificationChannels.setHostAssignedGroups(java.util.Set.of());
  check(NativeNotificationChannels.resolveReminderChannel(manager,"high","occurrence").getId().equals("eliza_updates"),"Unregistered group keeps the alert on eliza_updates");
  AlphaNotificationChannels.registerGroups();
  check(NativeNotificationChannels.resolveReminderChannel(manager,"high","occurrence").getId().equals("eliza_notifications"),"Alpha's group does not move occurrence alerts");
  manager.groups.get("alpha.group.assistant").blocked=true;
  NotificationChannel blocked=NativeNotificationChannels.resolveReminderChannel(manager,"high","occurrence");
  check(blocked.getId().equals("eliza_updates")&&NativeNotificationChannels.isReminderChannelBlocked(manager,blocked),"A blocked Assistant group keeps the alert blocked");
  manager.groups.get("alpha.group.assistant").blocked=false;manager.installed.get("eliza_updates").userImportance=true;
  check(NativeNotificationChannels.resolveReminderChannel(manager,"high","occurrence").getId().equals("eliza_updates"),"An owner importance choice still holds");
  System.out.println("PASS channel groups and occurrence routing");
 }
}`);
  assert.match(runJvm(files,'ai.alphacompute.alphaphone.ChannelGroupsTest'),/^PASS channel groups and occurrence routing/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('the brief poster refuses a blocked channel group like a blocked channel',{skip:jvmSkip('javac','json')},async()=>{
 const {sourceRenewalPlatform,renewalOwner}=await import('../specs/quint/refinement/native/source-renewal-platform.mjs');
 const dir=mkdtempSync(join(tmpdir(),'alpha-brief-group-'));
 try{
  // Alpha's actual poster with the source-renewal refinement's Android ports; only allowed() is exercised.
  const app=name=>nativeSource(name+'.java'),harness=name=>join(root,'specs/quint/refinement/native',name);
  const main=join(dir,'BriefGroupTest.java');
  writeFileSync(main,`package ai.alphacompute.alphaphone;
import android.app.*;
public final class BriefGroupTest {
 static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args){
  android.content.Context context=new android.content.Context();HostedNoticePoster poster=new HostedNoticePoster(context);
  check(poster.allowed(),"An ungrouped channel is allowed");
  NotificationChannel channel=context.manager.getNotificationChannel(AlphaHostedResultsPlugin.CHANNEL);NotificationChannelGroup group=new NotificationChannelGroup();
  channel.group="alpha.group.mail-briefs";context.manager.groups.put(channel.group,group);check(poster.allowed(),"An allowed group is allowed");
  group.blocked=true;check(!poster.allowed(),"A blocked group is refused");
  java.lang.System.out.println("PASS blocked brief group");
 }
}`);
  const sources=[...['SourceRenewalNotices','SourceRenewalHost','HostedNoticePoster','HostedResultNotices','PluginWorkers'].map(app),join(root,'vendor/eliza',renewalOwner),
   ...sourceRenewalPlatform(dir),harness('SourceRenewalTraces.java'),harness('Trace.java'),main];
  // The refinement ports use records and switch rules, so this compiles at the harness's language level.
  const classes=join(dir,'classes');execFileSync(javaBinary('javac'),['--release','21','-cp',jsonJar,'-d',classes,...sources],{timeout:jvmTimeout});
  assert.match(execFileSync(javaBinary('java'),['-cp',classes+':'+jsonJar,'ai.alphacompute.alphaphone.BriefGroupTest'],{encoding:'utf8',timeout:jvmTimeout}),/^PASS blocked brief group/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
