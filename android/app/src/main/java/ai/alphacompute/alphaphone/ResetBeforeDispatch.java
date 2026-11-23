package ai.alphacompute.alphaphone;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.CalendarContract;
import ai.eliza.auth.cloud.CloudKeyRevocation;
import ai.eliza.plugins.calendar.CalendarConfiguration;
import ai.eliza.plugins.system.reset.DataReset;

/**
 * Alpha's work before the reset's package-scoped clear (AlphaDataReset): deleting its own "On this
 * phone" calendar, which lives in the system Calendar provider and so survives the clear, then the
 * shared ai.eliza.auth.cloud.CloudKeyRevocation reset step over this build's registration and slots.
 */
final class ResetBeforeDispatch {
 static final DataReset.BeforeDispatch STEP=create(CloudKeyRevocation::revoke);
 /** The calendar delete is local; it never takes more of the budget than this. */
 static final long CALENDAR_BUDGET_MS=2000;

 /**
  * Best effort and within the coordinator's budget, run only while a confirmed reset is pending:
  * Alpha's own calendar, then this phone's Eliza Cloud key(s) (each step capped at 8 s on an
  * interrupted daemon worker). The transport is injectable for host tests.
  */
 static DataReset.BeforeDispatch create(CloudKeyRevocation.Transport transport){
  CloudKeyRevocation.ResetStep<Context> cloud=CloudKeyRevocation.resetStep(()->AlphaCloudSignInPlugin.REGISTRATION,AlphaCredentialStore::readSlotBeforeAttach,transport);
  return (context,timeoutMs)->{
   long deadline=System.nanoTime()+timeoutMs*1_000_000L;
   deleteLocalCalendar(context,Math.min(CALENDAR_BUDGET_MS,timeoutMs));
   cloud.run(context,remaining(deadline));
  };
 }
 private static long remaining(long deadline){return Math.max(0,(deadline-System.nanoTime())/1_000_000L);}

 /** Deletes Alpha's LOCAL calendar row (account, type and name; its events go with it) as its sync
  * adapter. Skipped without WRITE_CALENDAR; never throws and never waits past timeoutMs. */
 static void deleteLocalCalendar(Context context,long timeoutMs){
  if(timeoutMs<=0)return;
  Thread worker=new Thread(()->{
   try{
    if(context.checkSelfPermission(Manifest.permission.WRITE_CALENDAR)!=PackageManager.PERMISSION_GRANTED)return;
    CalendarConfiguration calendar=AlphaCalendarPlugin.CONFIGURATION;
    Uri uri=CalendarContract.Calendars.CONTENT_URI.buildUpon().appendQueryParameter(CalendarContract.CALLER_IS_SYNCADAPTER,"true").appendQueryParameter(CalendarContract.Calendars.ACCOUNT_NAME,calendar.accountName).appendQueryParameter(CalendarContract.Calendars.ACCOUNT_TYPE,CalendarContract.ACCOUNT_TYPE_LOCAL).build();
    context.getContentResolver().delete(uri,CalendarContract.Calendars.ACCOUNT_NAME+"=? AND "+CalendarContract.Calendars.ACCOUNT_TYPE+"=? AND "+CalendarContract.Calendars.NAME+"=?",new String[]{calendar.accountName,CalendarContract.ACCOUNT_TYPE_LOCAL,calendar.localCalendarName});
   }catch(Exception unavailable){/* The local reset must still proceed. */}
  },"alpha-reset-calendar");
  worker.setDaemon(true);
  worker.start();
  try{worker.join(timeoutMs);}catch(InterruptedException interrupted){Thread.currentThread().interrupt();}
 }
 private ResetBeforeDispatch(){}
}
