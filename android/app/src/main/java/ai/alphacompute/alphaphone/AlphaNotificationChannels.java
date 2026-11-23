package ai.alphacompute.alphaphone;

import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.content.Context;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Display names, descriptions and groups for Alpha's notification channels (app review #855,
 * NOTIF-13). Channel and group IDs are installed identities and never change here. Only a channel
 * that already exists is touched, with its own importance: Android then updates just its name,
 * description and, while it has none, its group, so nothing is created early and no owner choice
 * (importance, sound, lock screen) is replaced. Android never moves a channel that already has a group.
 *
 * Every grouped channel is posted by code that treats a blocked group like a blocked channel: the
 * shared canonical notice routing (NativeNotificationChannels.isReminderChannelBlocked), the
 * workflow, Gmail and brief posters, and foreground-service notices, which Android hides without
 * stopping the service. {@link #registerGroups} names these groups to the shared routing
 * (elizaOS/eliza#39953), so Alpha's own group on eliza_updates is not read as an owner
 * customisation and high-priority occurrence alerts still move to eliza_notifications. Reminder
 * channels stay ungrouped: the shared reminder store (ReminderStore.allowed) decides from the
 * channel alone, so a blocked group would hide reminders it reports as allowed. Call and text
 * channels stay ungrouped so that blocking a group never hides an incoming call or text.
 */
final class AlphaNotificationChannels {
 private AlphaNotificationChannels(){}
 static final String ASSISTANT="alpha.group.assistant",MAIL_AND_BRIEFS="alpha.group.mail-briefs",WORKFLOWS="alpha.group.workflows",ONGOING="alpha.group.ongoing";
 /** Group ID and the string resource (alpha-notices.xml) for its display name. */
 static final class Group {final String id;final int name;Group(String id,int name){this.id=id;this.name=name;}}
 static final Group[] GROUPS={
  new Group(ASSISTANT,R.string.alpha_channel_group_assistant),
  new Group(MAIL_AND_BRIEFS,R.string.alpha_channel_group_mail_briefs),
  new Group(WORKFLOWS,R.string.alpha_channel_group_workflows),
  new Group(ONGOING,R.string.alpha_channel_group_ongoing),
 };
 static final List<String> GROUP_IDS=Arrays.asList(ASSISTANT,MAIL_AND_BRIEFS,WORKFLOWS,ONGOING);
 /** Channel ID, the string resources for its display name and description (0 keeps the installed one), and its group (null: none). */
 static final class Row {final String id;final int name,description;final String group;Row(String id,int name,int description,String group){this.id=id;this.name=name;this.description=description;this.group=group;}}
 static final Row[] ROWS={
  new Row("eliza_alerts",0,R.string.alpha_channel_alerts_description,ASSISTANT),
  new Row("eliza_notifications",0,R.string.alpha_channel_notifications_description,ASSISTANT),
  new Row("eliza_updates",0,R.string.alpha_channel_updates_description,ASSISTANT),
  new Row("eliza_quiet",0,R.string.alpha_channel_quiet_description,ASSISTANT),
  // The shared reminder store names this channel after the older one plus " (due)"; it is the one in use.
  new Row(AlphaReminders.CONFIGURATION.channelId,R.string.alpha_channel_reminders_old_name,R.string.alpha_channel_reminders_old_description,null),
  new Row(AlphaReminders.CONFIGURATION.dueChannelId(),R.string.alpha_channel_reminders_name,R.string.alpha_channel_reminders_description,null),
  // Alpha's own posters name and describe these channels when they create them.
  new Row(GmailNoticePoster.CHANNEL,0,0,MAIL_AND_BRIEFS),
  new Row(AlphaHostedResultsPlugin.CHANNEL,0,0,MAIL_AND_BRIEFS),
  new Row(WorkflowNoticePoster.CHANNEL,0,0,WORKFLOWS),
  new Row(WorkflowNoticePoster.APPROVAL_CHANNEL,0,0,WORKFLOWS),
  new Row(AlphaNoteRecordingService.CHANNEL,0,0,ONGOING),
  new Row(AlphaNavigationService.CHANNEL,0,0,ONGOING),
 };
 /** Names Alpha's groups to the shared notice routing. Called once per process before any notice is posted (AlphaApplication). */
 static void registerGroups(){NativeNotificationChannels.setHostAssignedGroups(GROUP_IDS);}
 /** Safe to repeat: a channel whose name, description and group already match is left alone. */
 static void describe(Context context){
  try{
   NotificationManager manager=context.getSystemService(NotificationManager.class);
   if(manager==null)return;
   Set<String> installed=new HashSet<>();
   for(NotificationChannelGroup group:manager.getNotificationChannelGroups())installed.add(group.getId()+"\n"+group.getName());
   for(Row row:ROWS){
    NotificationChannel existing=manager.getNotificationChannel(row.id);
    if(existing==null)continue;
    String name=row.name==0?String.valueOf(existing.getName()):context.getString(row.name),description=row.description==0?existing.getDescription():context.getString(row.description);
    String group=existing.getGroup()!=null?existing.getGroup():row.group;
    if(name.contentEquals(existing.getName())&&Objects.equals(description,existing.getDescription())&&Objects.equals(group,existing.getGroup()))continue;
    // A channel can only join a group that exists; creating it again only renames it.
    if(group!=null&&group.equals(row.group)){String label=context.getString(groupName(group));if(installed.add(group+"\n"+label))manager.createNotificationChannelGroup(new NotificationChannelGroup(group,label));}
    NotificationChannel next=new NotificationChannel(row.id,name,existing.getImportance());
    next.setDescription(description);
    next.setGroup(group);
    manager.createNotificationChannel(next);
   }
  }catch(RuntimeException unavailable){/* Presentation only; retried on the next start or return to the app. */}
 }
 private static int groupName(String id){for(Group group:GROUPS)if(group.id.equals(id))return group.name;throw new IllegalArgumentException("Unknown channel group");}
}
