package ai.elizaresearch.alphaphone.sense;

import ai.elizaresearch.alphaphone.sense.IndicatorLease.Loss;
import ai.elizaresearch.alphaphone.sense.IndicatorLease.Observation;
import ai.elizaresearch.alphaphone.sense.ListenerPolicy.IndicatorPause;
import ai.elizaresearch.alphaphone.sense.ListenerPolicy.ServiceCommand;

/** Plain-JVM checks of the listener's lease observation and service start/stop rules. Not an Android test. */
public final class ListenerServiceRulesTest {
 private static void check(boolean condition,String name){if(!condition)throw new AssertionError(name);}
 private static void expect(Observation seen,boolean valid,boolean latches,IndicatorPause pause,String name){
  check(seen.valid==valid&&seen.latches==latches&&seen.pause==pause,name+": valid="+seen.valid+" latches="+seen.latches+" pause="+seen.pause);
 }

 public static void main(String[] args){
  // Foreground-service contract: the service is never stopped from outside while it can stop itself or a start is on its way.
  check(ListenerPolicy.serviceCommand(true,false,false)==ServiceCommand.START&&ListenerPolicy.serviceCommand(true,true,true)==ServiceCommand.START,"a foreground state starts or re-delivers");
  check(ListenerPolicy.serviceCommand(false,true,false)==ServiceCommand.CONVERGE&&ListenerPolicy.serviceCommand(false,true,true)==ServiceCommand.CONVERGE,"a running service converges and stops itself");
  check(ListenerPolicy.serviceCommand(false,false,true)==ServiceCommand.DEFER,"an undelivered start is never stopped from outside");
  check(ListenerPolicy.serviceCommand(false,false,false)==ServiceCommand.STOP,"nothing running and nothing on its way");
  check(ListenerPolicy.serviceMayStop(0)&&!ListenerPolicy.serviceMayStop(1)&&!ListenerPolicy.serviceMayStop(3),"the service stops itself only after every start was delivered");

  // Lease observation.
  expect(IndicatorLease.observe(true,IndicatorPause.NONE,Loss.NONE,true),true,false,IndicatorPause.NONE,"a fresh lease while capturing");
  expect(IndicatorLease.observe(true,IndicatorPause.NONE,Loss.EXPIRED,true),false,true,IndicatorPause.NONE,"an unexplained loss while capturing latches");
  expect(IndicatorLease.observe(true,IndicatorPause.NONE,Loss.BINDER_DIED,true),false,true,IndicatorPause.NONE,"SystemUI dying while capturing latches");
  expect(IndicatorLease.observe(true,IndicatorPause.NONE,Loss.FULLSCREEN,true),false,false,IndicatorPause.FULLSCREEN,"an explained loss pauses");
  expect(IndicatorLease.observe(false,IndicatorPause.FULLSCREEN,Loss.EXPIRED,true),false,true,IndicatorPause.NONE,"an unexplained loss during an explained pause latches");
  expect(IndicatorLease.observe(false,IndicatorPause.SHADE,Loss.TRANSITION,true),false,false,IndicatorPause.TRANSITION,"one explained pause may follow another");
  expect(IndicatorLease.observe(false,IndicatorPause.NONE,Loss.EXPIRED,true),false,false,IndicatorPause.NONE,"a loss with the microphone released and no pause only withholds the next start");
  expect(IndicatorLease.observe(false,null,Loss.PENDING,true),false,false,IndicatorPause.NONE,"a missing pause counts as none");
  expect(IndicatorLease.observe(false,IndicatorPause.DISPLAY_OFF,Loss.EXPIRED,false),false,false,IndicatorPause.DISPLAY_OFF,"a lapse while asleep keeps the display-off pause");
  expect(IndicatorLease.observe(false,IndicatorPause.DISPLAY_OFF,Loss.PENDING,true),false,false,IndicatorPause.NONE,"on wake the new generation is pending and nothing latches");
  expect(IndicatorLease.observe(false,IndicatorPause.DISPLAY_OFF,Loss.BINDER_DIED,false),false,true,IndicatorPause.NONE,"SystemUI dying during a display-off pause latches");
  expect(IndicatorLease.observe(true,IndicatorPause.DISPLAY_OFF,Loss.EXPIRED,false),false,true,IndicatorPause.NONE,"a lapse while the microphone is held is never excused");
  expect(IndicatorLease.observe(false,IndicatorPause.DISPLAY_OFF,Loss.NONE,true),true,false,IndicatorPause.NONE,"a fresh acknowledgement ends the pause");

  // A stale observation written after a newer one is what serialising prevents: applied in order the
  // pause is still known when the unexplained loss arrives, applied out of order the latch is missed.
  IndicatorPause ordered=IndicatorLease.observe(true,IndicatorPause.NONE,Loss.FULLSCREEN,true).pause;
  check(IndicatorLease.observe(false,ordered,Loss.SURFACE_HIDDEN,true).latches,"in order, the loss during the pause latches");
  check(!IndicatorLease.observe(false,IndicatorPause.NONE,Loss.SURFACE_HIDDEN,true).latches,"with the pause overwritten by a stale NONE it would not");

  // A verdict never reports REPLACED, so it is not a sleep lapse.
  IndicatorLease lease=new IndicatorLease();
  lease.acquire(7);lease.renew(lease.generation(),100,7,true,true,false);lease.acquire(7);
  check(lease.verdict(200,7,false)==Loss.PENDING,"a replacing generation reads PENDING");
  check(!IndicatorLease.sleepLapse(false,IndicatorPause.DISPLAY_OFF,Loss.REPLACED),"REPLACED is not a sleep lapse");
  check(IndicatorLease.sleepLapse(false,IndicatorPause.DISPLAY_OFF,Loss.PENDING)&&IndicatorLease.sleepLapse(false,IndicatorPause.DISPLAY_OFF,Loss.EXPIRED),"pending and expired still are");
  System.out.println("PASS listener service rules");
 }
}
