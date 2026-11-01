package com.user.budgetapp;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

// Claude API 키를 Android Keystore 의 AES 키로 암호화해 저장한다.
// 평문은 어디에도 남기지 않고, 웹뷰(JS)로도 돌려주지 않는다. 사용은 BudgetPlugin 의 네이티브 호출 안에서만 한다.
final class SecureKeyStore {
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String ALIAS = "budget_claude_api_key";
    private static final String PREF_NAME = "BudgetSecure";
    private static final String PREF_KEY = "claude_api_key";
    private static final String TRANSFORM = "AES/GCM/NoPadding";

    private SecureKeyStore() {}

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore ks = KeyStore.getInstance(KEYSTORE);
        ks.load(null);
        if (ks.containsAlias(ALIAS)) {
            return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return generator.generateKey();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    static void save(Context context, String value) throws Exception {
        Cipher cipher = Cipher.getInstance(TRANSFORM);
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        String stored = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(encrypted, Base64.NO_WRAP);
        prefs(context).edit().putString(PREF_KEY, stored).apply();
    }

    // 없거나 복호화할 수 없으면(기기 복원 등으로 Keystore 키가 달라진 경우) null.
    static String read(Context context) {
        String stored = prefs(context).getString(PREF_KEY, null);
        if (stored == null) return null;
        try {
            String[] parts = stored.split(":", 2);
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    static void delete(Context context) {
        prefs(context).edit().remove(PREF_KEY).apply();
    }
}
