package android.content;
public abstract class Context {
 public static final int MODE_PRIVATE=0; public Context createDeviceProtectedStorageContext(){return this;}
 public abstract SharedPreferences getSharedPreferences(String file,int mode);
 public Object getContentResolver(){return null;} public android.content.pm.PackageManager getPackageManager(){return new android.content.pm.PackageManager();}
 public String getPackageName(){return "test";} public boolean stopService(Intent i){return true;}
}
