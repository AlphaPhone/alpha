package ai.alphacompute.thinapp;

import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Shared {@link SmsTelephonyConfiguration} with Keystore-encrypted journal storage for thin telephony apps. */
final class ThinTelephonyConfig {
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final String PREFS_NAME = "alpha-thin-sms-journal";
    private static final String KEY_ALIAS = "alpha-thin-sms-journal-v1";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    static final SmsTelephonyConfiguration CONFIGURATION = new SmsTelephonyConfiguration(
        "sms-send-ledger:v1:device",
        null,
        "alpha-sms-operation:v1:",
        BuildConfig.APPLICATION_ID + ".SMS_SENT",
        BuildConfig.APPLICATION_ID + ".SMS_DELIVERED",
        "alphaphone-sms",
        "operationId",
        "partIndex",
        "ai.alphacompute.feature.TELEPHONY",
        ThinSmsSendReceiver.class,
        context -> true,
        ThinTelephonyConfig::openStore
    );

    private ThinTelephonyConfig() {}

    private static SmsTelephonyConfiguration.JournalStore openStore(Context context) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return new SmsTelephonyConfiguration.JournalStore() {
            @Override public synchronized String read(String slot) throws Exception {
                String encoded = prefs.getString(slot, null);
                if (encoded == null) return null;
                byte[] framed = Base64.decode(encoded, Base64.NO_WRAP);
                if (framed.length <= IV_BYTES) throw new IOException("Corrupt SMS journal slot");
                byte[] iv = new byte[IV_BYTES];
                byte[] ciphertext = new byte[framed.length - IV_BYTES];
                System.arraycopy(framed, 0, iv, 0, IV_BYTES);
                System.arraycopy(framed, IV_BYTES, ciphertext, 0, ciphertext.length);
                Cipher cipher = Cipher.getInstance(TRANSFORMATION);
                cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(TAG_BITS, iv));
                return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
            }

            @Override public synchronized void write(String slot, String value) throws Exception {
                if (value == null) {
                    if (!prefs.edit().remove(slot).commit()) throw new IOException("SMS journal delete failed");
                    return;
                }
                Cipher cipher = Cipher.getInstance(TRANSFORMATION);
                cipher.init(Cipher.ENCRYPT_MODE, secretKey());
                byte[] iv = cipher.getIV();
                byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
                byte[] framed = new byte[iv.length + ciphertext.length];
                System.arraycopy(iv, 0, framed, 0, iv.length);
                System.arraycopy(ciphertext, 0, framed, iv.length, ciphertext.length);
                String encoded = Base64.encodeToString(framed, Base64.NO_WRAP);
                if (!prefs.edit().putString(slot, encoded).commit()) {
                    throw new IOException("SMS journal write failed");
                }
            }
        };
    }

    private static SecretKey secretKey() throws Exception {
        KeyStore store = KeyStore.getInstance(ANDROID_KEYSTORE);
        store.load(null);
        KeyStore.Entry entry = store.getEntry(KEY_ALIAS, null);
        if (entry instanceof KeyStore.SecretKeyEntry secretEntry) {
            return secretEntry.getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return generator.generateKey();
    }
}
