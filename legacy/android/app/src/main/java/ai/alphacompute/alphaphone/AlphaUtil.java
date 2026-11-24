package ai.alphacompute.alphaphone;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.regex.Pattern;

/**
 * Digests, identifier checks, bounded reads and connection setup shared by Alpha's native classes.
 * Plain JDK only, so host javac harnesses can compile it without Android stubs.
 */
final class AlphaUtil {
 private AlphaUtil(){}

 /** Lower-case hex of a SHA-256 digest. */
 static final String SHA256_HEX="[a-f0-9]{64}";
 /** Canonical lower-case UUID text of any version, as UUID.toString writes it. */
 static final String UUID_CANONICAL="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
 /** 36 lower-case hex digits or dashes in any order: the renderer writes these ids with the same loose check. */
 static final String OPAQUE_36="[a-f0-9-]{36}";
 private static final Pattern SHA256_HEX_PATTERN=Pattern.compile(SHA256_HEX);
 private static final Pattern UUID_PATTERN=Pattern.compile(UUID_CANONICAL);
 private static final Pattern OPAQUE_36_PATTERN=Pattern.compile(OPAQUE_36);
 static boolean isSha256Hex(String value){return value!=null&&SHA256_HEX_PATTERN.matcher(value).matches();}
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
}
