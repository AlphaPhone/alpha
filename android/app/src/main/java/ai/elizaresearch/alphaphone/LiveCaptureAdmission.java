package ai.elizaresearch.alphaphone;

/** Per-capture admission, reserved before permission/start and cancelled without waiting for startup. */
final class LiveCaptureAdmission {
 static final class Ticket {
  final String id;final long epoch;
  private boolean cancelled,discard,awaitingPermission;
  private Runnable cancel;
  Ticket(String id,long epoch){this.id=id;this.epoch=epoch;}
 }
 private Ticket active;
 synchronized Ticket begin(String id,long epoch){
  cancelAll();active=new Ticket(id,epoch);return active;
 }
 synchronized boolean current(Ticket ticket){return active==ticket&&!ticket.cancelled;}
 /** Explicit Stop permits the captured tail; replacement/lifecycle cancellation discards it. */
 synchronized boolean events(Ticket ticket){return active==ticket&&!ticket.discard;}
 synchronized boolean attach(Ticket ticket,Runnable cancel){
  if(!current(ticket)){cancel.run();return false;}
  ticket.cancel=cancel;return true;
 }
 synchronized void stop(String id){if(active!=null&&active.id.equals(id))cancel(active,false);}
 synchronized void cancelAll(){if(active!=null)cancel(active,true);}
 /** The ticket now waits on Android's microphone permission dialog, which pauses the activity while it shows. */
 synchronized void awaitPermission(Ticket ticket){if(current(ticket))ticket.awaitingPermission=true;}
 /** The dialog was answered (or could not be shown). True while the ticket may still start. */
 synchronized boolean permissionAnswered(Ticket ticket){ticket.awaitingPermission=false;return current(ticket);}
 /**
  * Activity pause. A ticket waiting on the permission dialog survives, because that dialog is the
  * pause; anything else is cancelled and discarded. True when nothing was kept, so the caller also
  * retires its epoch.
  */
 synchronized boolean pause(){
  if(active!=null&&!active.cancelled&&active.awaitingPermission)return false;
  cancelAll();return true;
 }
 static final String CANCELLED="cancelled";
 /**
  * Why a capture that finished opening must not be published, or null when it may be. Lifecycle
  * cancellation wins; then whatever interrupted it while it opened (a phone call, a recording that
  * took the microphone); then a call that still holds the audio path, as {@code callRefusal}.
  */
 static String openingRefusal(boolean lifecycleCancelled,String interruption,boolean callActive,String callRefusal){
  if(lifecycleCancelled)return CANCELLED;
  if(interruption!=null)return interruption;
  return callActive?callRefusal:null;
 }
 private void cancel(Ticket ticket,boolean discard){
  ticket.cancelled=true;ticket.discard|=discard;
  if(ticket.cancel!=null){Runnable cancel=ticket.cancel;ticket.cancel=null;cancel.run();}
 }
}
