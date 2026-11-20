package ai.eliza.plugins.messages;

import ai.alphacompute.alphaphone.AlphaActionJournal;
import ai.alphacompute.alphaphone.AlphaSmsSendReceiver;
import ai.alphacompute.alphaphone.AlphaTelephonyPlugin;
import ai.alphacompute.alphaphone.Trace;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.os.Looper;
import android.provider.Telephony.Sms;
import android.telephony.SmsManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.IOException;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

public final class SmsDispatchTraces {
 static final String OP="synthetic-send", OTHER="another-send", SLOT="sms-send-ledger:v1:device";
 static final int SUB=7;
 static final String[] TO={"+15555550100","+15555550101"};
 static final String[] BODY={"","Synthetic reviewed body A","Synthetic reviewed body B"};
 /** Two chat scopes, each able to hold an approved card for the fixed operation ID. */
 static final String[] SCOPE={"","a".repeat(64),"b".repeat(64)};
 static final String CLAIM="smsDispatchClaim", OTHER_NUMBER="+15555550102";
 static final long CARD_TTL=10*60*1000L;
 public static long now=1_760_000_000_000L;
 static final ArrayDeque<String> faults=new ArrayDeque<>();
 static boolean historicalListeners;
 public static String claimFault="";

 public static boolean reserveClaim(Context context,String slot,String expected,String value)throws Exception{
  check(slot.equals("alpha-sms-operation:claim:v1:"+SmsSendJournal.sha256(OP))&&expected==null,"Write-once device operation identity");
  synchronized(context.slots){
   if(claimFault.equals("claim-before"))throw new IOException("Synthetic claim refusal");
   if(context.slots.putIfAbsent(slot,value)!=null)return false;
   if(claimFault.equals("claim-after"))throw new IOException("Synthetic lost claim acknowledgement");
   return true;
  }
 }


 public static void write(Context context,String slot,String value)throws Exception{
  if(!slot.equals(SLOT))throw new AssertionError("Exact Alpha installed journal slot");
  String failure=faults.poll();
  if(failure==null||failure.equals("pass")||failure.equals("after"))context.slots.put(slot,value);
  if(failure!=null&&!failure.equals("pass"))throw new IOException("Synthetic durable "+failure+" refusal");
 }

 static void check(boolean condition,String reason){if(!condition)throw new AssertionError(reason);}
 static String wire(SmsSendJournal.Record record){return record==null?"none":record.status();}
 static void drain()throws Exception{
  // Admission, then dispatch, then a recovery decision can each enqueue the next worker step.
  for(int barrier=0;barrier<4;barrier++)SmsTelephony.WORK.submit(()->{}).get(5,TimeUnit.SECONDS);
 }

 static final class Fixture {
  final Context context=new Context();
  final AlphaTelephonyPlugin[] plugins=new AlphaTelephonyPlugin[3];
  final PluginCall[] reviewCalls=new PluginCall[3];
  final int[] reviewedBinding=new int[3];
  final AlphaSmsSendReceiver receiver=new AlphaSmsSendReceiver();
  final SmsTelephonyConfiguration config;
  final Trace trace;
  final int recipients, parts;
  final Map<String,Integer> bindings=new HashMap<>();
  int process=1,replyBinding;
  String reply="none",candidate="none",providerStatus="none";
  boolean old;

  Fixture(String name,int recipients,int parts,boolean role)throws Exception{
   this.recipients=recipients;this.parts=parts;
   context.role=role;context.radio.parts=parts;
   for(int id=1;id<=2;id++){
    bindings.put(SmsSendJournal.sha256(SmsSendJournal.bindingText(numbers(),BODY[id],SUB)),id);
    plugins[id]=new AlphaTelephonyPlugin();plugins[id].attach(context);plugins[id].load();drain();
   }
   config=(SmsTelephonyConfiguration)Trace.read(plugins[1],"config");
   context.radio.before=this::beforeSend;
   trace=new Trace(name,observe());trace.value.put("init",Trace.action("initWith",recipients,parts,role));
  }

  String[] numbers(){return Arrays.copyOf(TO,recipients);}

  String durableLedger(){
   String encrypted=context.slots.get(SLOT);
   return encrypted==null?"":new JSONObject(encrypted).getString("journal");
  }

  int claimOwner()throws Exception{
   String saved=context.slots.get("alpha-sms-operation:claim:v1:"+SmsSendJournal.sha256(OP));
   if(saved==null)return 0;
   JSONObject claim=new JSONObject(saved);
   int card=Arrays.asList(SCOPE).indexOf(claim.getString("scope"));
   check(card>0&&OP.equals(claim.getString("proposalId"))&&claim.getString("operationHash").equals(
    AlphaActionJournal.get(context).get(SCOPE[card],OP).getString("operationHash")),"The device claim names its exact approved entry");
   return card;
  }
  int tombstoneBinding(){
   String prefix="t1|"+OP+"|";
   return durableLedger().lines().filter(line->line.startsWith(prefix)).findFirst()
    .map(line->Objects.requireNonNull(bindings.get(line.substring(prefix.length())))).orElse(0);
  }

  SmsSendJournal.Record readDisk()throws Exception{
   String ledger=durableLedger();
   if(ledger.isEmpty())return null;
   check(!ledger.contains(BODY[1])&&!ledger.contains(BODY[2]),"Durable SMS journal contains only body hashes");
   SmsSendJournal fresh=new SmsSendJournal(new SmsSendJournal.Storage(){
    public String read(){return ledger;}
    public void write(String value){throw new AssertionError("Read-only disk observation");}
   },config.retiredNamespace);
   return fresh.get(OP);
  }

  SmsSendJournal.Record readMemory()throws Exception{
   var caches=(Map<?,?>)staticField("JOURNALS").get(null);
   SmsSendJournal journal=(SmsSendJournal)caches.get(config.journalKey());
   return journal==null?null:journal.get(OP);
  }

  static java.lang.reflect.Field staticField(String name)throws Exception{
   var field=SmsTelephony.class.getDeclaredField(name);field.setAccessible(true);return field;
  }

  Set<?> registeredListeners()throws Exception{
   if(!historicalListeners)return (Set<?>)staticField("LISTENERS").get(null);
   Object listener=staticField("listener").get(null);
   return listener==null?Set.of():Set.of(listener);
  }

  int binding(SmsSendJournal.Record record){
   if(record==null)return 0;
   Integer id=bindings.get(record.bindingHash);
   check(id!=null&&record.subscriptionId==SUB&&Arrays.equals(record.recipients,numbers()),"Exact journal binding and subscription");
   return id;
  }

  void beforeSend(SmsManager.Call call){
   try{
    var disk=readDisk();
    check(disk!=null&&disk.dispatching&&disk.bindingHash.equals(SmsSendJournal.sha256(
     SmsSendJournal.bindingText(numbers(),String.join("",call.parts()),SUB))),"Exact durable dispatch precedes radio");
    int index=context.radio.attempts;
    check(call.sim()==SUB&&call.address().equals(TO[index])&&call.parts().size()==parts,"Separate exact recipient and part count");
    for(int p=0;p<parts;p++){
     callbackShape(call.sent().get(p),config.sentAction,index*parts+p);
     callbackShape(call.delivery().get(p),config.deliveredAction,index*parts+p);
    }
    if(context.role&&index==0)for(int recipient=0;recipient<recipients;recipient++){
     var row=context.provider.rows.get(disk.providerRow[recipient]);
     check(row!=null&&row.get(Sms.TYPE).equals(4)&&row.get(Sms.ADDRESS).equals(TO[recipient]),
      "All exact default app outbox rows precede the first radio call");
    }
   }catch(Exception failure){throw new AssertionError(failure);}
  }

  void callbackShape(PendingIntent pending,String action,int index){
   Intent intent=pending.intent;
   check((pending.flags&(PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_ONE_SHOT))==
     (PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_ONE_SHOT)&&intent.component==AlphaSmsSendReceiver.class&&
     context.getPackageName().equals(intent.pkg)&&action.equals(intent.getAction())&&OP.equals(intent.getStringExtra(config.operationExtra))&&
     intent.getIntExtra(config.indexExtra,-1)==index&&intent.getData().toString().equals(config.callbackScheme+":"+OP+"/"+index),
    "Exact immutable one-shot package/component/action/operation/part callback");
  }

  void classify(PluginCall call){
   replyBinding=0;
   if(call==null||!call.answered){reply="pending";return;}
   if(call.rejection!=null){reply=call.rejection;return;}
   if("sms-send-not-attempted".equals(call.result.optString("kind"))){
    check(call.result.keySet().equals(Set.of("kind","operationId","reason"))&&OP.equals(call.result.getString("operationId"))&&
     Set.of("busy","closed").contains(call.result.getString("reason")),"Not-attempted response is exact and contains no durable receipt");
    reply=call.result.getString("reason");return;
   }
   if(!call.result.has("status")){reply="ok";return;}
   check(call.result.keySet().equals(Set.of("kind","operationId","subscriptionId","bindingHash","status","parts","createdAt"))&&
    call.result.getString("kind").equals("sms-send")&&call.result.getString("operationId").equals(OP)&&call.result.getInt("subscriptionId")==SUB,
    "Result is the redacted exact wire receipt");
   reply=call.result.getString("status");replyBinding=bindings.get(call.result.getString("bindingHash"));
  }

  JSONObject input(String id,int binding){
   JSArray to=new JSArray();for(String number:numbers())to.put(number);
   return new JSObject().put("operationId",id).put("subscriptionId",SUB).put("recipients",to).put("body",BODY[binding]);
  }

  PluginCall message(int binding){
   JSObject data=new JSObject();JSONObject input=input(OP,binding);input.keys().forEachRemaining(key->data.put(key,input.get(key)));
   return new PluginCall(data);
  }

  AlertDialog dialog(int bridge){return plugins[bridge].activity.dialogs.getLast();}

  /** The historical shared plugin's native review: only the raw-pin regression probe drives it. */
  void request(int bridge,int binding,String mode)throws Exception{
   check(historicalListeners,"Only the historical plugin shows a native review");
   PluginCall call=message(binding);
   int before=plugins[bridge].activity.dialogs.size();
   if(mode.equals("long-number"))call.getData().put("subscriptionId",7L);
   if(mode.equals("divide-refused"))context.radio.parts=-1;
   if(mode.equals("empty-parts"))context.radio.parts=0;
   plugins[bridge].sendSms(call);drain();
   context.radio.parts=parts;
   if(plugins[bridge].activity.dialogs.size()>before){
    reviewCalls[bridge]=call;reviewedBinding[bridge]=binding;
    AlertDialog review=dialog(bridge);
    check(review.message.contains(BODY[binding])&&review.message.contains("To: "+String.join(", ",numbers())+"\n")&&
     review.message.contains("Synthetic SIM")&&review.getButton(-1).filtered&&
     (review.getWindow().flags&android.view.WindowManager.LayoutParams.FLAG_SECURE)!=0,"Exact private review and obscured-tap filter");
   }
   classify(call);point("request",bridge,binding,mode);
  }

  void approve(int bridge,String mode)throws Exception{
   check(historicalListeners,"Only the historical plugin shows a native review");
   Looper.runMain(()->dialog(bridge).clickSend());
   drain();classify(reviewCalls[bridge]);point("approve",bridge,mode);
  }

  /** The owner's Approve on card {@code card}: the chat journals an applying sms_send entry for exactly this text. */
  void approveCard(int card,int binding)throws Exception{
   JSONArray to=new JSONArray();for(String number:numbers())to.put(number);
   JSONObject operation=new JSONObject().put("type","sms_send").put("recipients",to).put("body",BODY[binding]).put("subscriptionId",SUB);
   JSONObject record=new JSONObject().put("operation",operation).put("expiresAt",now+CARD_TTL)
    .put("context",new JSONObject().put("sensitive",false));
   var journal=AlphaActionJournal.get(context);
   check(journal.reserve(SCOPE[card],OP,OP,SmsSendJournal.sha256(operation.toString()),record).created,"A fresh card entry");
   journal.markApplying(SCOPE[card],OP,"synthetic-attempt-"+card);
   point("approveCard",card,binding);
  }

  JSONObject card(int card)throws Exception{
   JSONObject entry=AlphaActionJournal.get(context).get(SCOPE[card],OP);
   if(entry==null)return new JSONObject().put("binding",0).put("phase","none").put("expired",false);
   JSONObject record=entry.getJSONObject("record"),operation=record.getJSONObject("operation");
   int binding=operation.getString("body").equals(BODY[1])?1:2;
   check(OP.equals(entry.getString("operationId"))&&"applying".equals(entry.getString("phase")),"A card stays applying; only the chat settles it");
   if(entry.has(CLAIM))check(entry.getJSONObject(CLAIM).toString().equals(new JSONObject().put("operationId",OP).toString()),"The claim names exactly this operation");
   return new JSONObject().put("binding",binding).put("phase",entry.has(CLAIM)?"claimed":"open").put("expired",record.getLong("expiresAt")<=now);
  }

  /** The agent bridge's sendSms naming card {@code card} (0: none), as the renderer sends it after Approve. */
  void send(int bridge,int card,int binding,String request,String mode)throws Exception{
   PluginCall call=message(binding);
   JSObject data=call.getData();
   if(card!=0)data.put("journalIdentity",new JSONObject().put("scope",SCOPE[card]).put("proposalId",OP));
   switch(request){
    case "complete" -> {}
    case "long-number" -> data.put("subscriptionId",7L);
    case "divide-refused" -> context.radio.parts=-1;
    case "empty-parts" -> context.radio.parts=0;
    case "other-sim" -> data.put("subscriptionId",SUB+1);
    case "other-recipient" -> {JSArray to=new JSArray();for(int i=0;i<recipients;i++)to.put(i==0?OTHER_NUMBER:TO[i]);data.put("recipients",to);}
    default -> throw new AssertionError(request);
   }
   context.radio.mode=mode;
   claimFault=mode;
   switch(mode){
    case "begin-before" -> faults.add("before");
    case "journal-refused" -> {faults.add("before");faults.add("before");}
    case "begin-after-and-deny-before" -> {faults.add("after");faults.add("before");}
    case "end-before" -> {faults.add("pass");faults.add("before");}
    case "end-after" -> {faults.add("pass");faults.add("after");}
    default -> {}
   }
   boolean queued=mode.equals("cancel-queued")||mode.equals("pause-queued");
   CountDownLatch gate=new CountDownLatch(1);
   // Hold the send worker so the cancellation lands while the send is still queued.
   if(queued)SmsTelephony.WORK.execute(()->{try{gate.await();}catch(InterruptedException stop){throw new AssertionError(stop);}});
   plugins[bridge].sendSms(call);
   if(mode.equals("cancel-queued")){
    PluginCall cancel=new PluginCall((JSObject)new JSObject().put("operationId",OP));
    plugins[bridge].cancelSmsReview(cancel);
    check(cancel.answered&&cancel.rejection==null,"The exact cancellation answers at once");
   }
   if(mode.equals("pause-queued"))Looper.runMain(()->plugins[bridge].fixturePause());
   gate.countDown();drain();
   context.radio.parts=parts;context.radio.mode="complete";
   check(faults.isEmpty(),"Every injected write refusal reached its expected boundary");
   check(call.answered,"Every send answers within its macrostep");
   classify(call);point("send",bridge,card,binding,request,mode);
  }

  JSONObject record(SmsSendJournal.Record value){
   JSONArray sent=new JSONArray(),failed=new JSONArray(),reported=new JSONArray(),delivered=new JSONArray(),deliveryFailed=new JSONArray(),rows=new JSONArray();
   if(value!=null){
    for(int i=0;i<value.parts();i++){
     if(value.sent[i]==SmsSendJournal.SUCCESS)sent.put(i+1);
     if(value.sent[i]==SmsSendJournal.FAILED)failed.put(i+1);
     if(value.reported[i])reported.put(i+1);
     if(value.delivery[i]==SmsSendJournal.SUCCESS)delivered.put(i+1);
     if(value.delivery[i]==SmsSendJournal.FAILED)deliveryFailed.put(i+1);
    }
    for(int i=0;i<value.providerRow.length;i++)if(value.providerRow[i]>0)rows.put(i+1);
   }
   return new JSONObject().put("binding",binding(value)).put("status",wire(value))
    .put("decision",value==null||value.decision==null?"none":value.decision)
    .put("dispatching",value!=null&&value.dispatching).put("submitted",value!=null&&value.submitted)
    .put("unknown",value!=null&&value.unknown).put("boot",value==null?0:value.boot)
    .put("sent",sent).put("failed",failed).put("reported",reported).put("delivered",delivered)
    .put("deliveryFailed",deliveryFailed).put("rows",rows);
  }

  JSONObject observe()throws Exception{
   JSONArray cards=new JSONArray(),foreground=new JSONArray(),closed=new JSONArray(),outbox=new JSONArray(),
    sentRows=new JSONArray(),failedRows=new JSONArray();
   JSONArray listeners=new JSONArray(),events=new JSONArray();
   Set<?> registered=registeredListeners();
   for(int bridge=1;bridge<=2;bridge++){
    var plugin=plugins[bridge];
    cards.put(new JSONArray().put(bridge).put(card(bridge)));
    if((boolean)Trace.read(plugin,"foreground"))foreground.put(bridge);
    if((boolean)Trace.read(plugin,"closed"))closed.put(bridge);
    if(registered.contains(Trace.read(plugin,"sendListener")))listeners.put(bridge);
    for(JSObject notice:plugin.notices)check(OP.equals(notice.opt("operationId")),"Every bridge notice names the exact fixed operation");
    events.put(new JSONArray().put(bridge).put(plugin.notices.size()));
   }
   check(registered.size()==listeners.length(),"Every native listener belongs to an observed current bridge");
   for(var entry:context.provider.rows.entrySet()){
    if(entry.getKey()>=900)continue;
    var row=entry.getValue();
    int recipient=row.get(Sms.ADDRESS).equals(TO[0])?1:2;
    switch((int)row.get(Sms.TYPE)){case 4 -> outbox.put(recipient);case 2 -> sentRows.put(recipient);case 5 -> failedRows.put(recipient);default -> throw new AssertionError();}
   }
   return Trace.fields("recipients",recipients,"parts",parts,"reply",reply,"replyBinding",replyBinding,
    "memory",record(readMemory()),"disk",record(readDisk()),"tombstoneBinding",tombstoneBinding(),"claimOwner",claimOwner(),
    "attempts",context.radio.attempts,"accepted",context.radio.accepted.size(),
    "cards",cards,"foreground",foreground,"closed",closed,"listeners",listeners,"events",events,
    "image",context.admitted,"send",context.send,"phone",context.phone,"read",context.read,"locked",context.lock.locked,
    "role",context.role,"sim",context.subscriptions.revision,"process",process,"boot",context.boot,"old",old,
    "candidate",candidate,"providerStatus",providerStatus,"refuseOutbox",context.provider.refuseInsert,"outbox",outbox,"sentRows",sentRows,"failedRows",failedRows);
  }

  void access(String kind,boolean enabled)throws Exception{
   switch(kind){
    case "image" -> context.admitted=enabled;
    case "send" -> context.send=enabled;
    case "phone" -> context.phone=enabled;
    case "read" -> context.read=enabled;
    case "locked" -> context.lock.locked=enabled;
    case "role" -> context.role=enabled;
    default -> throw new AssertionError("Unknown access port");
   }
   point("access",kind,enabled);
  }

  void sim(int value)throws Exception{context.subscriptions.revision=value;point("simAt",value);}

  void lifecycle(int bridge,String mode)throws Exception{
   var plugin=plugins[bridge];
   var off=(android.content.BroadcastReceiver)Trace.read(plugin,"screenOff");
   Looper.runMain(()->{
    switch(mode){
     case "pause" -> plugin.fixturePause();
     case "resume" -> plugin.fixtureResume();
     case "destroy" -> plugin.fixtureDestroy();
     case "screen" -> off.onReceive(context,new Intent(Intent.ACTION_SCREEN_OFF));
     default -> throw new AssertionError();
    }
   });
   drain();point("lifecycle",bridge,mode);
  }

  void cancel(int bridge,boolean exact)throws Exception{
   var call=new PluginCall((JSObject)new JSObject().put("operationId",exact?OP:OTHER));
   plugins[bridge].cancelSmsReview(call);drain();classify(call);
   point("cancel",bridge,exact);
  }

  void readback(int bridge)throws Exception{
   var call=new PluginCall((JSObject)new JSObject().put("operationId",OP));
   plugins[bridge].smsSendResult(call);drain();classify(call);
   point("readback",bridge);
  }

  void history(int bridge)throws Exception{
   var call=new PluginCall(new JSObject());plugins[bridge].smsSendHistory(call);drain();
   check(call.answered&&call.rejection==null&&call.result.keySet().equals(Set.of("receipts")),"Exact bounded history");
   String raw=call.result.toString();
   check(!raw.contains(BODY[1])&&!raw.contains(BODY[2])&&!raw.contains(TO[0]),"History has no plaintext content or recipients");
   trace.stutter("native history exposes only redacted receipts",observe());
  }

  void restart(boolean reboot)throws Exception{
   // A process kill does not execute the plugin's graceful review cancellation.
   for(int bridge=1;bridge<=2;bridge++){
    var executor=(java.util.concurrent.ExecutorService)Trace.read(plugins[bridge],"reader");
    executor.shutdownNow();reviewCalls[bridge]=null;reviewedBinding[bridge]=0;
   }
   context.dynamicReceivers.clear();
   ((Map<?,?>)staticField("JOURNALS").get(null)).clear();
   if(historicalListeners)staticField("listener").set(null,null);
   else ((Set<?>)staticField("LISTENERS").get(null)).clear();
   if(reboot)context.boot++;
   for(int bridge=1;bridge<=2;bridge++){plugins[bridge]=new AlphaTelephonyPlugin();plugins[bridge].attach(context);plugins[bridge].load();drain();}
   process++;reply="none";replyBinding=0;
   point("restart",reboot);
  }

  void callback(int index,String kind,boolean ok,String mode)throws Exception{
   int recipient=(index-1)/parts, part=(index-1)%parts;
   SmsManager.Call send=context.radio.accepted.get(recipient);
   PendingIntent pending=(kind.equals("sent")?send.sent():send.delivery()).get(part);
   if(mode.equals("before")||mode.equals("after"))faults.add(mode);
   Intent intent=new Intent(pending.intent);
   if(mode.equals("wrong-action"))intent=new Intent("foreign-action").putExtra(config.operationExtra,OP).putExtra(config.indexExtra,index-1);
   receiver.code=ok?Activity.RESULT_OK:0;
   receiver.onReceive(context,intent);drain();
   check(faults.isEmpty()&&receiver.accepted==receiver.finished,"Receiver retires its async result after the exact worker");
   point("callback",index,kind,ok,mode);
  }

  void provider(String kind,String status)throws Exception{
   candidate=kind;providerStatus=status;
   context.provider.rows.keySet().removeIf(id->id>=900);
   if(!kind.equals("none")){
    var record=readMemory();
    for(int i=0;i<(kind.equals("ambiguous")?2:1);i++){
     long id=900+i;
     ContentValues row=new ContentValues();
     row.put(Sms._ID,id);row.put(Sms.CREATOR,context.getPackageName());row.put(Sms.ADDRESS,TO[0]);row.put(Sms.TYPE,2);
     row.put(Sms.BODY,kind.equals("wrong")?"Other synthetic body":BODY[binding(record)]);
     row.put(Sms.DATE,record.createdAt+1000);row.put(Sms.SUBSCRIPTION_ID,SUB);
     row.put(Sms.STATUS,switch(status){case "complete"->0;case "pending"->32;case "failed"->64;default->-1;});
     context.provider.rows.put(id,row);
    }
   }
   point("provider",kind,status);
  }

  void reconcile()throws Exception{SmsTelephony.reconcileLater(context,config);drain();point("reconcile");}

  void age()throws Exception{now+=SmsSendJournal.MAX_OPEN_MS+1;old=old||readMemory()!=null;point("age");}

  void prune()throws Exception{
   SmsSendJournal journal=SmsTelephony.journal(context,config);
   for(int i=0;i<SmsSendJournal.MAX_RECORDS;i++)
    journal.decide("synthetic-filler-"+i,numbers(),BODY[1],SUB,"cancelled",now,context.boot);
   check(readMemory()==null&&readDisk()==null&&tombstoneBinding()==1,"Actual capacity pruning retains exact durable binding");
   point("prune");
  }

  void refuseProviderInsert(boolean refuse)throws Exception{
   context.provider.refuseInsert=refuse;
   point("refuseOutbox",refuse);
  }

  void point(String name,Object... args)throws Exception{trace.step(name,observe(),args);}

  void close()throws Exception{
   Looper.runMain(()->{for(int bridge=1;bridge<=2;bridge++)if(!plugins[bridge].activity.destroyed)plugins[bridge].fixtureDestroy();});
   SmsTelephony.WORK.shutdown();SmsTelephony.WORK.awaitTermination(5,TimeUnit.SECONDS);
   Files.delete(context.noBackup.toPath());
  }
 }

 public static void main(String[] args)throws Exception{
  historicalListeners=args.length>1&&args[1].equals("historical");
  String mode=args[0];
  int recipients=mode.equals("per-recipient-sim-change")||mode.equals("partial-radio-throw")?2:1;
  int parts=mode.equals("multipart-provider-cannot-prove-delivery")||mode.equals("default-role-outbox")?2:1;
  boolean role=Set.of("default-role-outbox","provider-insert-refused","retired-role-outbox","partial-radio-throw").contains(mode);
  Fixture f=new Fixture(mode,recipients,parts,role);
  try{
   if(historicalListeners)historical(f,mode);else current(f,mode);
   java.lang.System.out.println(f.trace.value);
  }finally{f.close();}
 }

 /** The raw-pin regression of the shared plugin's native review, before the staged repair. */
 static void historical(Fixture f,String mode)throws Exception{
  if(!mode.equals("cross-dialog-binding"))throw new AssertionError("Unknown historical schedule "+mode);
  f.request(1,1,"complete");f.request(2,2,"complete");
  f.approve(1,"complete");f.approve(2,"complete");
  check(f.reply.equals("invalid")&&f.replyBinding==0&&f.binding(f.readDisk())==1&&f.context.radio.attempts==1,
   "Conflicting reviewed tuple cannot receive the retained receipt or repeat radio dispatch");
 }

 static void current(Fixture f,String mode)throws Exception{
  switch(mode){
   case "cross-card-binding":
    f.approveCard(1,1);f.approveCard(2,2);
    f.send(1,1,1,"complete","complete");f.send(2,2,2,"complete","complete");
    check(f.reply.equals("invalid")&&f.replyBinding==0&&f.binding(f.readDisk())==1&&f.context.radio.attempts==1,
     "Conflicting approved card cannot receive the retained receipt or repeat radio dispatch");
    f.send(2,2,2,"complete","complete");
    break;
   case "exact-card-replay":
    f.approveCard(1,1);f.approveCard(2,1);
    f.send(1,1,1,"complete","complete");f.send(2,2,1,"complete","complete");f.send(1,1,1,"complete","complete");f.history(1);
    break;
   case "pruned-exact-card":
   case "pruned-conflicting-card":
    int lateBinding=mode.equals("pruned-exact-card")?1:2;
    String refusal=lateBinding==1?"expired":"invalid";
    f.approveCard(1,1);f.approveCard(2,lateBinding);
    f.send(1,1,1,"complete","complete");f.age();f.prune();f.send(2,2,lateBinding,"complete","complete");
    check(f.reply.equals(refusal)&&f.replyBinding==0&&f.context.radio.attempts==1,
     "A retired operation reports the same binding-specific refusal to a late card");
    f.restart(false);f.send(2,2,lateBinding,"complete","complete");f.readback(1);
    break;
   case "approval-mismatch-and-missing":
    f.approveCard(1,1);
    f.send(1,0,1,"complete","complete");f.send(1,1,2,"complete","complete");
    f.send(1,1,1,"other-sim","complete");f.send(1,1,1,"other-recipient","complete");f.send(1,1,1,"long-number","complete");
    check(f.context.radio.attempts==0&&f.readDisk()==null,"An unapproved or mismatched text journals and sends nothing");
    f.send(1,1,1,"complete","complete");
    break;
   case "expired-card":
    f.approveCard(1,1);f.age();f.send(1,1,1,"complete","complete");
    check(f.reply.equals("not-approved")&&f.readDisk()==null&&f.context.radio.attempts==0,"An expired card admits nothing");
    break;
   case "journal-refused-claim-is-single-use":
    f.approveCard(1,1);f.send(1,1,1,"complete","journal-refused");
    check(f.readDisk()==null&&f.context.radio.attempts==0,"Nothing reached Android and nothing was journaled");
    f.restart(false);f.send(2,1,1,"complete","complete");
    check(f.reply.equals("not-approved")&&f.context.radio.attempts==0,"A claimed card cannot admit another send");
    f.approveCard(2,2);f.send(2,2,2,"complete","complete");
    check(f.reply.equals("not-approved")&&f.claimOwner()==1&&f.context.radio.attempts==0,"The device claim survives a new chat and restart");
    break;
   case "uncertain-device-claim":
    f.approveCard(1,1);f.approveCard(2,2);
    f.send(1,1,1,"complete","claim-before");
    check(f.claimOwner()==0&&f.context.radio.attempts==0,"A refused write never admits a dispatch");
    f.send(1,1,1,"complete","claim-after");f.restart(false);f.send(2,2,2,"complete","complete");
    check(f.reply.equals("not-approved")&&f.claimOwner()==1&&f.context.radio.attempts==0,"A committed claim with lost confirmation remains spent");
    break;
   case "queued-cancellation":
    f.approveCard(1,1);f.send(1,1,1,"complete","cancel-queued");f.readback(2);f.send(2,1,1,"complete","complete");
    break;
   case "queued-background-cancellation":
    f.approveCard(1,1);f.send(1,1,1,"complete","pause-queued");f.lifecycle(1,"resume");f.readback(1);
    break;
   case "screen-off-and-lock":
    f.approveCard(1,1);f.access("locked",true);f.send(1,1,1,"complete","complete");f.cancel(1,true);
    f.lifecycle(1,"screen");f.access("locked",false);f.cancel(1,false);f.send(1,1,1,"complete","complete");
    break;
   case "empty-parts-retains-denied":
    f.approveCard(1,1);f.send(1,1,1,"empty-parts","complete");
    check(f.reply.equals("denied")&&f.binding(f.readDisk())==1&&f.context.radio.attempts==0,
     "Empty platform division must durably close the approved operation without radio");
    f.send(2,1,1,"complete","complete");f.send(2,1,2,"complete","complete");
    check(f.reply.equals("invalid")&&f.context.radio.attempts==0,
     "A later valid division or conflicting tuple cannot revive the denied operation");
    break;
   case "initial-permission-denied":
    f.access("send",false);f.approveCard(1,1);f.send(1,1,1,"complete","complete");f.access("send",true);f.send(2,1,1,"complete","complete");
    break;
   case "carrier-replaced-after-card":
    f.approveCard(1,1);f.sim(2);f.send(1,1,1,"complete","complete");f.sim(1);f.readback(2);
    break;
   case "per-recipient-sim-change":
    f.approveCard(1,1);f.send(1,1,1,"complete","guard-change");
    f.callback(1,"sent",true,"complete");f.readback(2);f.send(1,1,1,"complete","complete");
    break;
   case "partial-radio-throw":
    f.approveCard(1,1);f.send(1,1,1,"complete","throw-after");
    check(f.context.radio.attempts==1&&f.context.provider.rows.size()==1&&
     f.context.provider.rows.values().iterator().next().get(Sms.ADDRESS).equals(TO[0]),
     "Keep the attempted recipient's row and discard the unattempted recipient's row");
    f.callback(1,"sent",true,"complete");f.send(1,1,1,"complete","complete");
    break;
   case "radio-refused-before-acceptance":
    f.approveCard(1,1);f.send(1,1,1,"complete","throw-before");f.readback(2);
    break;
   case "begin-save-before-refusal":
    f.approveCard(1,1);f.send(1,1,1,"complete","begin-before");f.send(2,1,1,"complete","complete");
    break;
   case "begin-commit-then-failed-report":
    f.approveCard(1,1);f.send(1,1,1,"complete","begin-after-and-deny-before");
    f.restart(false);f.send(2,1,1,"complete","complete");
    break;
   case "end-write-failure-and-process-recovery":
    f.approveCard(1,1);f.send(1,1,1,"complete","end-before");f.readback(2);f.restart(false);
    f.readback(2);f.callback(1,"sent",true,"complete");f.send(1,1,1,"complete","complete");
    break;
   case "end-committed-before-failure-report":
    f.approveCard(1,1);f.send(1,1,1,"complete","end-after");f.restart(false);f.readback(2);
    break;
   case "callback-evidence-is-volatile-before-save":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");
    f.callback(1,"sent",true,"before");f.readback(2);f.restart(false);f.readback(2);
    break;
   case "callback-evidence-durable-before-failure-report":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");
    f.callback(1,"sent",true,"after");f.restart(false);f.readback(2);
    break;
   case "immutable-receiver-and-newest-listener":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");
    f.callback(1,"sent",true,"wrong-action");f.access("image",false);f.callback(1,"sent",true,"complete");f.access("image",true);
    f.lifecycle(2,"pause");f.callback(1,"sent",true,"complete");f.lifecycle(2,"resume");
    f.callback(1,"sent",false,"complete");f.lifecycle(2,"destroy");f.callback(1,"delivery",true,"complete");f.readback(1);
    break;
   case "boot-retirement-of-missing-receipts":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");f.restart(true);f.send(2,1,1,"complete","complete");
    break;
   case "provider-readback-requires-unique-row-and-report":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");f.provider("wrong","complete");
    f.callback(1,"sent",true,"complete");f.provider("ambiguous","complete");f.callback(1,"delivery",false,"complete");
    f.provider("exact","pending");f.access("read",false);f.reconcile();f.access("read",true);f.reconcile();
    f.provider("exact","complete");f.reconcile();f.readback(2);f.history(2);
    break;
   case "multipart-provider-cannot-prove-delivery":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");f.provider("exact","complete");
    f.callback(1,"delivery",true,"complete");f.callback(2,"delivery",true,"complete");
    f.callback(1,"sent",true,"complete");f.callback(2,"sent",true,"complete");f.readback(2);
    break;
   case "expired-provider-attribution":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");f.callback(1,"sent",true,"complete");f.age();
    f.provider("exact","complete");f.callback(1,"delivery",true,"complete");f.readback(2);
    break;
   case "default-role-outbox":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");
    f.callback(1,"sent",true,"complete");f.callback(2,"sent",false,"complete");f.readback(2);
    break;
   case "provider-insert-refused":
    f.refuseProviderInsert(true);f.approveCard(1,1);f.send(1,1,1,"complete","complete");
    check(f.reply.equals("denied")&&f.context.radio.attempts==0&&f.context.provider.rows.isEmpty(),
     "Default role provider refusal denies dispatch without a radio call");
    f.refuseProviderInsert(false);f.send(2,1,1,"complete","complete");f.readback(2);
    check(f.reply.equals("denied")&&f.context.radio.attempts==0,
     "An exact replay retains the denial after the provider recovers");
    break;
   case "retired-role-outbox":
    f.approveCard(1,1);f.send(1,1,1,"complete","complete");f.access("role",false);
    f.callback(1,"sent",true,"complete");f.readback(2);
    break;
   default:throw new AssertionError("Unknown schedule "+mode);
  }
 }
}
