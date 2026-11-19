package ai.eliza.plugins.messages;

import ai.alphacompute.alphaphone.AlphaSmsSendReceiver;
import ai.alphacompute.alphaphone.AlphaTelephonyPlugin;
import ai.alphacompute.alphaphone.MainActivity;
import ai.alphacompute.alphaphone.Trace;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Looper;
import android.provider.Telephony;
import android.telephony.SmsManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.IOException;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import org.json.JSONArray;

public final class MmsDispatchTraces {
 static boolean historicalListeners;
 static final String OP="synthetic-mms", SLOT="sms-send-ledger:v1:device", BODY="Synthetic message";
 public static final long NOW=1_760_000_000_000L;
 static final int SUB=7;
 static final String[] RECIPIENTS={"+15555550100","+15555550101"};
 static final byte[][] IMAGES={ {}, {1,2,3}, {1,2,4} };
 static final ArrayDeque<String> faults=new ArrayDeque<>();

 public static void write(Context context,String slot,String value)throws Exception{
  check(slot.equals(SLOT),"The product SMS and MMS share one installed journal slot");
  String failure=faults.poll();
  if(failure==null||failure.equals("pass")||failure.equals("after"))context.slots.put(slot,value);
  if(failure!=null&&!failure.equals("pass"))throw new IOException("Synthetic journal refusal "+failure);
 }
 static void check(boolean value,String reason){if(!value)throw new AssertionError(reason);}
 static void drain()throws Exception{
  // Admission, then dispatch, then a recovery decision can each enqueue the next worker step.
  for(int barrier=0;barrier<4;barrier++)SmsTelephony.WORK.submit(()->{}).get(5,TimeUnit.SECONDS);
 }
 static String digest(byte[] bytes)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
 static boolean group(int binding){return binding==1||binding==2;}

 static final class Fixture {
  final Context context=new Context();
  final AlphaSmsSendReceiver receiver=new AlphaSmsSendReceiver();
  final AlphaTelephonyPlugin[] plugins=new AlphaTelephonyPlugin[3];
  final PluginCall[] reviewCalls=new PluginCall[3];
  final int[] reviews=new int[3];
  final SmsTelephonyConfiguration config;
  final Trace trace;
  final Map<String,Integer> bindings=new HashMap<>();
  final String[] to;
  String reply="none",replyKind="none",source="none";
  int replyBinding, composedBinding;
  int process=1;

  Fixture(String name,boolean groupRecipients)throws Exception{
   to=Arrays.copyOf(RECIPIENTS,groupRecipients?2:1);
   context.role=true;
   for(int binding=1;binding<=3;binding++){
    String text=group(binding)?SmsSendJournal.mmsBindingText(to,BODY,new SmsSendJournal.Attachment[]{attachment(binding)},SUB)
     :SmsSendJournal.bindingText(to,BODY,SUB);
    bindings.put(SmsSendJournal.sha256(text),binding);
   }
   load();config=(SmsTelephonyConfiguration)Trace.read(plugins[1],"config");
   context.radio.beforeMms=this::beforeMms;
   trace=new Trace(name,observe());trace.value.put("init",Trace.action("initWith",groupRecipients));
  }

  void load()throws Exception{
   for(int i=1;i<=2;i++){
    plugins[i]=new AlphaTelephonyPlugin();plugins[i].attach(context);
    // The launcher's own activity, where the Messages composer has window focus.
    plugins[i].activity=new MainActivity(context);
    plugins[i].load();drain();
   }
  }

  SmsSendJournal.Attachment attachment(int binding)throws Exception{
   byte[] bytes=IMAGES[binding];
   return new SmsSendJournal.Attachment("image/png","synthetic.png",digest(bytes),bytes.length);
  }

  String disk(){
   String slot=context.slots.get(SLOT);
   return slot==null?"":new JSONObject(slot).getString("journal");
  }

  SmsSendJournal.Record readDisk()throws Exception{
   String ledger=disk();
   check(!ledger.contains(BODY)&&!ledger.contains("synthetic.png"),"Journal redacts message and attachment metadata");
   SmsSendJournal fresh=new SmsSendJournal(new SmsSendJournal.Storage(){
    public String read(){return ledger;}
    public void write(String value){throw new AssertionError("Read-only disk observation");}
   },config.retiredNamespace);
   return fresh.get(OP);
  }

  static java.lang.reflect.Field sharedField(String name)throws Exception{
   var field=SmsTelephony.class.getDeclaredField(name);field.setAccessible(true);return field;
  }

  Set<?> registeredListeners()throws Exception{
   if(!historicalListeners)return (Set<?>)sharedField("LISTENERS").get(null);
   Object listener=sharedField("listener").get(null);
   return listener==null?Set.of():Set.of(listener);
  }

  SmsSendJournal.Record readMemory()throws Exception{
   SmsSendJournal journal=(SmsSendJournal)((Map<?,?>)sharedField("JOURNALS").get(null)).get(config.journalKey());
   return journal==null?null:journal.get(OP);
  }

  int binding(SmsSendJournal.Record record){
   if(record==null)return 0;
   Integer id=bindings.get(record.bindingHash);
   check(id!=null&&record.group==group(id)&&record.subscriptionId==SUB&&Arrays.equals(record.recipients,to),"Exact record binding, kind and subscription");
   return id;
  }

  JSONObject record(SmsSendJournal.Record record){
   return new JSONObject().put("binding",binding(record)).put("status",record==null?"none":record.status())
    .put("dispatching",record!=null&&record.dispatching).put("boot",record==null?0:record.boot)
    .put("row",record!=null&&record.providerRow[0]>0);
  }

  void beforeMms(SmsManager.Multimedia call){
   try{
    SmsSendJournal.Record marker=readDisk();
    int id=binding(marker);
    check(group(id)&&marker.dispatching&&marker.parts()==1,"Durable exact one-radio group marker precedes handoff");
    PendingIntent pending=call.callback();
    Intent intent=pending.intent;
    String file=intent.getStringExtra(SmsTelephony.EXTRA_MMS_FILE);
    check(call.sim()==SUB&&call.uri().equals(MmsStore.fileUri(config.mmsFileAuthority,file))&&
     pending.flags==(PendingIntent.FLAG_MUTABLE|PendingIntent.FLAG_ONE_SHOT)&&
     intent.component==AlphaSmsSendReceiver.class&&context.getPackageName().equals(intent.pkg)&&config.sentAction.equals(intent.getAction())&&
     OP.equals(intent.getStringExtra(config.operationExtra))&&intent.getIntExtra(config.indexExtra,-1)==0&&
     intent.getData().toString().equals(config.callbackScheme+":"+OP+"/mms"),"Exact URI-bound mutable one-shot private MMS callback");
    MmsPdu.Message pdu=MmsPdu.parse(Files.readAllBytes(MmsStore.file(context,file).toPath()));
    check(pdu.type==MmsPdu.SEND_REQ&&pdu.transactionId.equals(SmsTelephony.mmsTransaction(OP))&&pdu.to.equals(List.of(to))&&
     pdu.parts.stream().anyMatch(part->part.isText()&&part.text().equals(BODY))&&
     pdu.parts.stream().anyMatch(part->part.contentType.equals("image/png")&&Arrays.equals(part.data,IMAGES[id])),
     "Actual encoded PDU has the exact reviewed addresses, text and attachment bytes");
    if(!context.provider.refuseInsert&&!context.provider.refuseMmsPart){
     check(marker.providerRow[0]>0&&context.provider.members.equals(Set.of(to))&&
      context.provider.mms.get(marker.providerRow[0]).get(Telephony.Mms.MESSAGE_BOX).equals(4)&&
      context.provider.bytes.values().stream().anyMatch(bytes->Arrays.equals(bytes.toByteArray(),IMAGES[id])),
      "Exact provider outbox and attachment bytes precede radio");
    }
   }catch(Exception failed){throw new AssertionError(failed);}
  }

  void classify(PluginCall call){
   replyBinding=0;replyKind="none";composedBinding=0;
   if(!call.answered){reply="pending";return;}
   if(call.rejection!=null){reply=call.rejection;return;}
   if(!call.result.has("status")){reply="ok";return;}
   reply=call.result.getString("status");replyKind=call.result.getString("kind");
   Set<String> fields=new HashSet<>(Set.of("kind","operationId","subscriptionId","bindingHash","status","createdAt"));
   if(replyKind.equals("sms-send"))fields.add("parts");
   check(call.result.keySet().equals(fields)&&call.result.getString("operationId").equals(OP)&&call.result.getInt("subscriptionId")==SUB,
    "Wire receipt exposes the exact redacted fields");
   replyBinding=bindings.get(call.result.getString("bindingHash"));
  }

  JSObject message(int binding,String input)throws Exception{
   JSArray recipients=new JSArray();for(String recipient:to)recipients.put(recipient);
   JSObject data=new JSObject();
   data.put("operationId",OP).put("recipients",recipients).put("subscriptionId",SUB).put("body",BODY);
   if(group(binding)){
    SmsSendJournal.Attachment exact=attachment(binding);
    byte[] bytes=IMAGES[binding];
    JSONObject attachment=new JSONObject().put("contentType",exact.contentType).put("name",exact.name).put("size",exact.size)
     .put("sha256",exact.sha256).put("data",Base64.getEncoder().encodeToString(input.equals("bad-bytes")?IMAGES[3-binding]:bytes));
    data.put("attachments",new JSArray().put(attachment));
   }
   return data;
  }

  /** The historical shared plugin's native review: only the raw-pin regression probes drive it. */
  void review(int actor,int binding,String input)throws Exception{
   check(historicalListeners,"Only the historical plugin shows a native review");
   int count=plugins[actor].activity.dialogs.size();
   PluginCall call=new PluginCall(message(binding,input));
   if(group(binding))plugins[actor].sendMms(call);else plugins[actor].sendSms(call);
   drain();
   if(plugins[actor].activity.dialogs.size()>count){
    reviewCalls[actor]=call;reviews[actor]=binding;
    AlertDialog dialog=dialog(actor);
    check(dialog.message.contains(BODY)&&dialog.message.contains("To: "+String.join(", ",to)+"\n")&&dialog.message.contains("Synthetic SIM")&&
     (dialog.getWindow().flags&android.view.WindowManager.LayoutParams.FLAG_SECURE)!=0&&dialog.getButton(-1).filtered,
     "Reviewed message is private and obscured tap is filtered");
    if(group(binding))check(dialog.message.contains(historicalListeners?"Attachment: synthetic.png":"Picture: synthetic.png")&&dialog.preview.images.size()==1&&
     Arrays.equals(dialog.preview.images.getFirst().image.bytes(),IMAGES[binding])&&
     (to.length==1||dialog.message.contains(historicalListeners?"every recipient sees all the others":"everyone sees who else it went to")),"Exact attachment preview and group disclosure");
   }
   classify(call);point("request",actor,binding,input);
  }

  AlertDialog dialog(int actor){return plugins[actor].activity.dialogs.getLast();}
  void approve(int actor,String mode)throws Exception{
   check(historicalListeners,"Only the historical plugin shows a native review");
   Looper.runMain(()->dialog(actor).clickSend());
   drain();classify(reviewCalls[actor]);point("approve",actor,mode);
  }

  /** The agent bridge's sendMms: no card can confirm an MMS, so it is refused. */
  void request(int actor,int binding,String input)throws Exception{
   PluginCall call=new PluginCall(message(binding,input));
   plugins[actor].sendMms(call);drain();classify(call);
   check(call.answered&&call.rejection!=null,"The agent bridge answers an MMS with a refusal only");
   point("request",actor,binding,input);
  }

  /** The owner's Send in the Messages composer, through the launcher port's exact entry point. */
  void composerSend(int actor,PluginCall call,int binding)throws Exception{
   var method=AlphaTelephonyPlugin.class.getDeclaredMethod("sendComposed",PluginCall.class,boolean.class,java.util.function.Consumer.class);
   method.setAccessible(true);
   method.invoke(plugins[actor],call,group(binding),(java.util.function.Consumer<Runnable>)Runnable::run);
  }

  void compose(int actor,int binding,String input,String mode)throws Exception{
   context.radio.mode=mode;
   if(mode.equals("begin-before"))faults.add("before");
   if(mode.equals("end-before"))faults.addAll(List.of("pass","pass","before"));
   PluginCall call=new PluginCall(message(binding,input));
   composerSend(actor,call,binding);drain();context.radio.mode="complete";
   check(faults.isEmpty(),"Injected storage refusal reached intended boundary");
   check(call.answered,"Every composer send answers within its macrostep");
   classify(call);composedBinding=binding;point("compose",actor,binding,input,mode);
  }

  /** Two composer sends with one operation ID, both queued on the send worker before either is admitted. */
  void composeTogether(int first,int second)throws Exception{
   CountDownLatch gate=new CountDownLatch(1);
   SmsTelephony.WORK.execute(()->{try{gate.await();}catch(InterruptedException stop){throw new AssertionError(stop);}});
   PluginCall a=new PluginCall(message(first,"valid")),b=new PluginCall(message(second,"valid"));
   composerSend(1,a,first);composerSend(2,b,second);
   gate.countDown();drain();
   check(a.answered&&b.answered,"Both composer sends answer");
   classify(a);
   check(replyBinding==first&&replyKind.equals(group(first)?"mms-send":"sms-send"),"The first send receives its own receipt");
   classify(b);composedBinding=second;point("composeTogether",first,second);
  }

  void preflightConflict(int actor,String field)throws Exception{
   JSObject data=message(1,"valid");
   switch(field){
    case "body" -> data.put("body","A different synthetic body");
    case "recipients" -> data.put("recipients",new JSArray().put("+15555550102"));
    case "sim" -> data.put("subscriptionId",SUB+1);
    default -> throw new AssertionError(field);
   }
   PluginCall call=new PluginCall(data);
   composerSend(actor,call,1);drain();classify(call);
   check(reply.equals("invalid")&&replyBinding==0,"MMS preflight checks the exact composed "+field);
   point("preflightConflict",actor,field);
  }

  int tombstoneBinding(){
   String prefix="t1|"+OP+"|";
   return disk().lines().filter(line->line.startsWith(prefix)).findFirst()
    .map(line->Objects.requireNonNull(bindings.get(line.substring(prefix.length())))).orElse(0);
  }

  void prune()throws Exception{
   SmsSendJournal journal=SmsTelephony.journal(context,config);
   for(int i=0;i<SmsSendJournal.MAX_RECORDS;i++)
    journal.decide("synthetic-filler-"+i,to,BODY,SUB,"cancelled",NOW,context.boot);
   check(readMemory()==null&&readDisk()==null&&tombstoneBinding()==1,"Capacity retires the exact durable MMS binding");
   point("prune");
  }

  void readback(int actor,boolean mms)throws Exception{
   JSObject data=new JSObject();data.put("operationId",OP);PluginCall call=new PluginCall(data);
   if(mms)plugins[actor].mmsSendResult(call);else plugins[actor].smsSendResult(call);
   classify(call);point("readback",actor,mms);
  }

  void callback(String mode,boolean ok)throws Exception{
   PendingIntent saved=context.radio.multimedia.getFirst().callback();
   Intent intent=new Intent(saved.intent);
   if(mode.equals("bad-uri"))intent.setData(android.net.Uri.fromParts(config.callbackScheme,"unrelated/mms",null));
   if(mode.equals("foreign-kind"))intent=new Intent(config.sentAction).putExtra(config.operationExtra,OP).putExtra(config.indexExtra,0);
   if(mode.equals("before")||mode.equals("after"))faults.add(mode);
   if(mode.equals("failure-conf"))intent.putExtra(SmsManager.EXTRA_MMS_DATA,new byte[]{(byte)0x8c,(byte)0x81,(byte)0x92,(byte)0x81});
   if(mode.equals("unreadable-conf"))intent.putExtra(SmsManager.EXTRA_MMS_DATA,new byte[]{(byte)0xff});
   receiver.code=ok?Activity.RESULT_OK:0;receiver.onReceive(context,intent);drain();
   check(receiver.accepted==receiver.finished&&faults.isEmpty(),"Each accepted callback retires its receiver result");
   point("callback",mode,ok);
  }

  void controls(String kind,boolean value)throws Exception{
   switch(kind){
    case "role" -> context.role=value;
    case "locked" -> context.lock.locked=value;
    case "carrier" -> context.radio.carrierEnabled=value;
    case "size" -> context.radio.carrierLimit=value?300*1024:1;
    case "provider" -> context.provider.refuseMmsPart=!value;
    default -> throw new AssertionError(kind);
   }
   point("controls",kind,value);
  }

  void restart(boolean reboot)throws Exception{
   for(int actor=1;actor<=2;actor++){
    ((java.util.concurrent.ExecutorService)Trace.read(plugins[actor],"reader")).shutdownNow();
    reviewCalls[actor]=null;
   }
   ((Map<?,?>)sharedField("JOURNALS").get(null)).clear();
   if(historicalListeners)sharedField("listener").set(null,null);
   else ((Set<?>)sharedField("LISTENERS").get(null)).clear();
   context.dynamicReceivers.clear();if(reboot)context.boot++;
   load();process++;reply="none";replyKind="none";replyBinding=0;composedBinding=0;
   point("restart",reboot);
  }

  int files()throws Exception{
   try(var files=Files.list(MmsStore.directory(context).toPath())){return (int)files.count();}
  }

  JSONObject observe()throws Exception{
   int mmsBox=context.provider.mms.isEmpty()?0:(int)context.provider.mms.values().iterator().next().get(Telephony.Mms.MESSAGE_BOX);
   JSONArray listeners=new JSONArray(),deliveries=new JSONArray();
   Set<?> registered=registeredListeners();
   for(int actor=1;actor<=2;actor++){
    if(registered.contains(Trace.read(plugins[actor],"sendListener")))listeners.put(actor);
    for(JSObject notice:plugins[actor].notices)check(OP.equals(notice.opt("operationId")),"Every bridge notice names the exact fixed operation");
    deliveries.put(new JSONArray().put(actor).put(plugins[actor].notices.size()));
   }
   check(registered.size()==listeners.length(),"Every native listener belongs to an observed current bridge");
   JSONObject events=new JSONObject().put("listeners",listeners).put("deliveries",deliveries);
   return Trace.fields("groupRecipients",to.length==2,"source",source,"reply",reply,
    "replyKind",replyKind,"replyBinding",replyBinding,"composedBinding",composedBinding,
    "memory",record(readMemory()),"disk",record(readDisk()),"tombstoneBinding",tombstoneBinding(),
    "smsAttempts",context.radio.attempts,"mmsAttempts",context.radio.mmsAttempts,"mmsAccepted",context.radio.multimedia.size(),
    "files",files(),"mmsBox",mmsBox,"deletedMms",context.provider.deletedMms,"events",events,
    "role",context.role,"carrier",context.radio.carrierEnabled,"size",context.radio.carrierLimit>1,
    "provider",!context.provider.refuseMmsPart,"locked",context.lock.locked,
    "process",process,"boot",context.boot);
  }
  void point(String name,Object... args)throws Exception{
   source=name.equals("request")?"agent":Set.of("compose","composeTogether","preflightConflict").contains(name)?"composer":"none";
   trace.step(name,observe(),args);
  }

  void close()throws Exception{
   Looper.runMain(()->{for(int i=1;i<=2;i++)plugins[i].fixtureDestroy();});
   SmsTelephony.WORK.shutdown();SmsTelephony.WORK.awaitTermination(5,TimeUnit.SECONDS);
   try(var entries=Files.walk(context.noBackup.toPath())){
    for(var entry:entries.sorted(Comparator.reverseOrder()).toList())Files.delete(entry);
   }
  }
 }

 public static void main(String[] args)throws Exception{
  historicalListeners=args.length>1&&args[1].equals("historical");
  String mode=args[0];
  Fixture f=new Fixture(mode,mode.equals("group-carrier-confirm"));
  try{
   if(historicalListeners)historical(f,mode);else current(f,mode);
   java.lang.System.out.print(f.trace.value);
  } finally {f.close();}
 }

 /** The raw-pin regressions of the shared plugin's native MMS review, before the staged repair. */
 static void historical(Fixture f,String mode)throws Exception{
  switch(mode){
   case "mms-attachment-conflict":
    f.review(1,1,"valid");f.review(2,2,"valid");f.approve(1,"complete");f.approve(2,"complete");
    check(f.reply.equals("invalid")&&f.replyKind.equals("none")&&f.replyBinding==0&&
     f.context.radio.mmsAttempts==1&&f.files()==1&&f.binding(f.readDisk())==1,
     "Conflicting MMS approval must reject: "+f.reply+"/"+f.replyKind+"/"+f.replyBinding);
    break;
   case "sms-first-mms-receives-sms":
    f.review(1,3,"valid");f.review(2,1,"valid");f.approve(1,"complete");f.approve(2,"complete");
    check(f.reply.equals("invalid")&&f.replyKind.equals("none")&&f.replyBinding==0&&
     f.context.radio.attempts==1&&f.context.radio.mmsAttempts==0&&f.files()==0&&f.binding(f.readDisk())==3,
     "Cross-kind MMS approval must reject: "+f.reply+"/"+f.replyKind+"/"+f.replyBinding);
    break;
   default: throw new AssertionError("Unknown historical schedule "+mode);
  }
 }

 static void current(Fixture f,String mode)throws Exception{
  switch(mode){
   case "agent-bridge-refuses-mms":
    f.request(1,1,"valid");f.request(2,2,"bad-bytes");
    check(f.context.radio.mmsAttempts==0&&f.readDisk()==null&&f.files()==0&&f.context.provider.mms.isEmpty(),
     "The agent bridge reads, journals, stages and sends nothing for an MMS");
    f.controls("locked",true);f.request(1,1,"valid");f.controls("locked",false);
    break;
   case "mms-attachment-conflict":
    f.composeTogether(1,2);
    check(f.reply.equals("invalid")&&f.replyKind.equals("none")&&f.replyBinding==0&&
     f.context.radio.mmsAttempts==1&&f.files()==1&&f.binding(f.readDisk())==1,
     "Conflicting MMS approval must reject: "+f.reply+"/"+f.replyKind+"/"+f.replyBinding);
    f.compose(2,2,"valid","complete");
    break;
   case "sms-first-mms-receives-sms":
    f.composeTogether(3,1);
    check(f.reply.equals("invalid")&&f.replyKind.equals("none")&&f.replyBinding==0&&
     f.context.radio.attempts==1&&f.context.radio.mmsAttempts==0&&f.files()==0&&f.binding(f.readDisk())==3,
     "Cross-kind MMS approval must reject: "+f.reply+"/"+f.replyKind+"/"+f.replyBinding);
    f.compose(2,1,"valid","complete");f.readback(2,true);f.readback(1,false);
    break;
   case "mms-first-sms-rejected":
    f.composeTogether(1,3);
    check(f.reply.equals("invalid")&&f.replyBinding==0&&f.context.radio.attempts==0&&
     f.context.radio.mmsAttempts==1,"Composer SMS recovery refuses the same-ID MMS receipt");
    f.compose(2,3,"valid","complete");f.readback(2,false);f.readback(1,true);
    break;
   case "exact-compose":
    f.composeTogether(1,1);f.compose(2,1,"valid","complete");
    break;
   case "preflight-revalidates-composed-tuple":
    f.compose(1,1,"valid","complete");
    f.preflightConflict(2,"body");f.preflightConflict(2,"recipients");f.preflightConflict(2,"sim");f.compose(2,2,"valid","complete");
    check(f.context.radio.mmsAttempts==1&&f.files()==1&&f.binding(f.readDisk())==1,"Preflight preserves the original accepted MMS");
    break;
   case "pruned-exact-compose":
   case "pruned-conflicting-compose":
    int lateBinding=mode.equals("pruned-exact-compose")?1:2;
    String refusal=lateBinding==1?"expired":"invalid";
    f.compose(1,1,"valid","complete");f.callback("complete",true);
    f.prune();f.compose(2,lateBinding,"valid","complete");
    check(f.reply.equals(refusal)&&f.replyBinding==0&&f.context.radio.mmsAttempts==1&&f.files()==0,
     "A pruned operation reports the exact tombstone refusal to a later composer send and stages nothing");
    f.restart(false);f.compose(2,lateBinding,"valid","complete");f.readback(1,true);
    break;
   case "group-carrier-confirm":
    f.compose(1,1,"valid","complete");f.callback("bad-uri",true);f.callback("foreign-kind",true);
    f.callback("failure-conf",true);f.readback(1,true);
    break;
   case "invalid-bytes-and-size":
    f.compose(1,1,"bad-bytes","complete");f.controls("size",false);f.compose(1,1,"valid","complete");
    check(f.readDisk()==null&&f.files()==0,"An oversized or mismatched message is neither journaled nor staged");
    f.controls("size",true);f.compose(2,1,"valid","complete");
    break;
   case "carrier-disabled-denies":
    f.controls("carrier",false);f.compose(1,1,"valid","complete");f.readback(2,true);
    break;
   case "begin-refusal-cleans-pdu":
    f.compose(1,1,"valid","begin-before");f.compose(2,1,"valid","complete");
    break;
   case "part-refusal-cleans-outbox":
    f.controls("provider",false);f.compose(1,1,"valid","complete");f.callback("unreadable-conf",true);f.readback(1,true);
    break;
   case "radio-refusal-before-handoff":
    f.compose(1,1,"valid","throw-before");f.compose(2,1,"valid","complete");
    break;
   case "uncertain-radio-handoff":
    f.compose(1,1,"valid","throw-after");f.compose(2,1,"valid","complete");
    f.callback("complete",false);f.readback(1,true);
    break;
   case "interrupted-durable-dispatch":
    f.compose(1,1,"valid","end-before");f.restart(false);f.readback(2,true);
    f.callback("complete",true);f.compose(1,1,"valid","complete");
    break;
   case "role-loss-before-callback":
    f.compose(1,1,"valid","complete");f.controls("role",false);
    f.controls("locked",true);f.callback("complete",true);f.readback(1,true);
    f.controls("locked",false);f.readback(1,true);
    break;
   case "volatile-callback-evidence":
    f.compose(1,1,"valid","complete");f.callback("before",true);f.readback(1,true);
    f.restart(false);f.readback(1,true);
    break;
   case "committed-callback-refusal":
    f.compose(1,1,"valid","complete");f.callback("after",false);
    f.restart(false);f.readback(1,true);
    break;
   case "boot-without-receipt":
    f.compose(1,1,"valid","complete");f.restart(true);f.compose(1,1,"valid","complete");
    break;
   default: throw new AssertionError(mode);
  }
 }
}
