package com.user.budgetapp;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.app.Notification;
import android.os.Bundle;
import android.content.SharedPreferences;
import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.security.MessageDigest;

public final class NotificationListener extends NotificationListenerService {

    private static final String TAG = "NotificationListener";
    private static final String PREF_NAME = "BudgetData";
    private static final String KEY_PENDING = "pending_notis";
    private static final String KEY_HASHES = "recent_hashes";
    private static final int MAX_HASH_SIZE = 50;

    // 🔥 리스너가 실제로 연결되었는지 확인하는 핵심 로그
    @Override
    public void onListenerConnected() {
        Log.d(TAG, "리스너 연결됨");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = extras.getString(Notification.EXTRA_TITLE);

        CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);
        if (textChar == null) {
            textChar = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        }
        if (textChar == null) {
            CharSequence[] lines =
                    extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
            if (lines != null && lines.length > 0) {
                StringBuilder sb = new StringBuilder();
                for (CharSequence line : lines) {
                    sb.append(line).append(" ");
                }
                textChar = sb.toString();
            }
        }

        if (title == null || textChar == null) return;

        String text = textChar.toString();
        String pkg = sbn.getPackageName();

        Log.d(TAG, "PKG=" + pkg + " TITLE=" + title + " TEXT=" + text);

        String hash = sha256(title + text + pkg);
        if (hash == null) return;

        SharedPreferences prefs =
                getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        try {
            JSONArray hashes =
                    new JSONArray(prefs.getString(KEY_HASHES, "[]"));

            for (int i = 0; i < hashes.length(); i++) {
                if (hash.equals(hashes.getString(i))) {
                    Log.d(TAG, "중복 알림 차단");
                    return;
                }
            }

            hashes.put(hash);
            if (hashes.length() > MAX_HASH_SIZE) {
                JSONArray trimmed = new JSONArray();
                for (int i = hashes.length() - MAX_HASH_SIZE; i < hashes.length(); i++) {
                    trimmed.put(hashes.get(i));
                }
                hashes = trimmed;
            }

            JSONArray list =
                    new JSONArray(prefs.getString(KEY_PENDING, "[]"));

            JSONObject obj = new JSONObject();
            obj.put("title", title);
            obj.put("text", text);
            obj.put("package", pkg);
            obj.put("time", System.currentTimeMillis());

            list.put(obj);

            prefs.edit()
                    .putString(KEY_PENDING, list.toString())
                    .putString(KEY_HASHES, hashes.toString())
                    .apply();

            Log.d(TAG, "알림 저장 완료");

        } catch (Exception e) {
            Log.e(TAG, "알림 처리 실패", e);
        }
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(input.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }
}
