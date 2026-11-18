package ai.alphacompute.alphaphone;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.regex.Pattern;

/**
 * Digests, identifier checks, bounded reads and connection setup shared by Alpha's native classes.
 * Plain JDK only, so host javac harnesses can compile it without Android stubs.
 */
final class AlphaUtil {
 private AlphaUtil(){}

 /** Lower-case hex of a SHA-256 digest. */
 static final String SHA256_HEX="[a-f0-9]{64}";
 /** Client operation and proposal ids: 1 to 128 URL-safe characters. */
 static final String OPERATION_ID="[A-Za-z0-9_-]{1,128}";
 /** Source, run and result ids: an alphanumeric first character, then up to 127 URL-safe characters. */
 static final String OPAQUE_ID="[A-Za-z0-9][A-Za-z0-9_-]{0,127}";
 /** Canonical lower-case UUID text of any version, as UUID.toString writes it. */
 static final String UUID_CANONICAL="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
 /** 36 lower-case hex digits or dashes in any order: the renderer writes these ids with the same loose check. */
 static final String OPAQUE_36="[a-f0-9-]{36}";
 private static final Pattern SHA256_HEX_PATTERN=Pattern.compile(SHA256_HEX);
 private static final Pattern OPERATION_ID_PATTERN=Pattern.compile(OPERATION_ID);
 private static final Pattern OPAQUE_ID_PATTERN=Pattern.compile(OPAQUE_ID);
 private static final Pattern UUID_PATTERN=Pattern.compile(UUID_CANONICAL);
 private static final Pattern OPAQUE_36_PATTERN=Pattern.compile(OPAQUE_36);
 static boolean isSha256Hex(String value){return value!=null&&SHA256_HEX_PATTERN.matcher(value).matches();}
 static boolean isOperationId(String value){return value!=null&&OPERATION_ID_PATTERN.matcher(value).matches();}
 static boolean isOpaqueId(String value){return value!=null&&OPAQUE_ID_PATTERN.matcher(value).matches();}
 static boolean isUuid(String value){return value!=null&&UUID_PATTERN.matcher(value).matches();}
 static boolean isOpaque36(String value){return value!=null&&OPAQUE_36_PATTERN.matcher(value).matches();}

 private static final char[] HEX_DIGITS="0123456789abcdef".toCharArray();
 /** Lower-case hex, two characters per byte. */
 static String hex(byte[] bytes){
  char[] out=new char[bytes.length*2];
  for(int i=0;i<bytes.length;i++){out[2*i]=HEX_DIGITS[(bytes[i]>>4)&15];out[2*i+1]=HEX_DIGITS[bytes[i]&15];}
  return new String(out);
 }
 /** A new SHA-256 digest. Every Android release provides SHA-256, so its absence is a broken platform. */
 static MessageDigest sha256(){
  try{return MessageDigest.getInstance("SHA-256");}
  catch(NoSuchAlgorithmException unavailable){throw new IllegalStateException(unavailable);}
 }
 static String sha256Hex(byte[] data){return hex(sha256().digest(data));}
 /** SHA-256 of the UTF-8 bytes of value. */
 static String sha256Hex(String value){return sha256Hex(value.getBytes(StandardCharsets.UTF_8));}
 /** SHA-256 of the rest of in, read in 64 KiB blocks. The caller closes in. */
 static String sha256Hex(InputStream in)throws IOException{
  MessageDigest digest=sha256();byte[] buffer=new byte[65536];
  for(int count;(count=in.read(buffer))!=-1;)digest.update(buffer,0,count);
  return hex(digest.digest());
 }

 /**
  * The rest of in, refused with an IOException carrying tooLarge (which may be null) as soon as more
  * than limit bytes have arrived. A zero-length read falls back to a single-byte read so a
  * misbehaving stream cannot spin. The caller closes in.
  */
 static byte[] readBounded(InputStream in,int limit,String tooLarge)throws IOException{
  ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];
  for(int count;(count=in.read(buffer))!=-1;){
   if(count==0){int one=in.read();if(one<0)break;buffer[0]=(byte)one;count=1;}
   if(count>limit-out.size())throw new IOException(tooLarge);
   out.write(buffer,0,count);
  }
  return out.toByteArray();
 }

 /** Configures a fresh connection to follow no redirects and use no cache, with both timeouts. */
 static <T extends HttpURLConnection> T noCache(T connection,int connectMs,int readMs){
  connection.setInstanceFollowRedirects(false);connection.setUseCaches(false);
  connection.setConnectTimeout(connectMs);connection.setReadTimeout(readMs);
  return connection;
 }
 /** An HTTP status for diagnostics: 100 to 599, otherwise 0. */
 static int httpStatus(int status){return status>=100&&status<=599?status:0;}

 /**
  * Hands work to a worker. Capacitor can deliver a bridge call after handleOnDestroy has stopped
  * the worker, and a bounded worker can be full; Executor.execute would then throw on the bridge
  * thread and kill the process. Here refused runs on the calling thread instead.
  * True when the worker accepted the work.
  */
 static boolean submit(Executor worker,Runnable work,Runnable refused){
  try{worker.execute(work);return true;}
  catch(RejectedExecutionException stopped){refused.run();return false;}
 }

 /** A fence re-checked between steps of long work; it throws once the work is no longer current. */
 interface Guard {void check()throws Exception;}
}
