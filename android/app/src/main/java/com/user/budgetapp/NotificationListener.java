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
    private static final int MAX_HASH_SIZE = 100;

    @Override
    public void onListenerConnected() {
        Log.d(TAG, "✅ 리스너 서비스가 시스템에 연결되었습니다.");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            Notification notification = sbn.getNotification();
            if (notification == null) return;

            Bundle extras = notification.extras;
            if (extras == null) return;

            // 1. 패키지명 가져오기
            String pkg = sbn.getPackageName();
            
            // 내 앱이 띄운 알림은 가로채지 않음 (무한 루프 방지)
            if (pkg.equals(getPackageName())) return;

            // 2. 제목 추출 (null 방어)
            String title = extras.getString(Notification.EXTRA_TITLE);
            if (title == null) title = "알림";

            // 3. 본문 추출 (여러 형태의 텍스트 대응)
            CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);
            if (textChar == null) {
                textChar = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            }
            if (textChar == null) {
                CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
                if (lines != null && lines.length > 0) {
                    StringBuilder sb = new StringBuilder();
                    for (CharSequence line : lines) {
                        sb.append(line).append(" ");
                    }
                    textChar = sb.toString();
                }
            }
            
            // 본문이 아예 없으면 "내용 없음"으로 처리하여 통과
            String text = (textChar != null) ? textChar.toString() : "내용 없음";

            Log.d(TAG, "📩 가로챈 알림: [" + pkg + "] " + title + " : " + text);

            // 4. 중복 체크 (SHA-256)
            String hash = sha256(title + text + pkg);
            if (hash == null) return;

            SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            JSONArray hashes = new JSONArray(prefs.getString(KEY_HASHES, "[]"));

            for (int i = 0; i < hashes.length(); i++) {
                if (hash.equals(hashes.getString(i))) {
                    Log.d(TAG, "🚫 중복된 알림이라 저장하지 않습니다.");
                    return;
                }
            }

            // 5. 장부에 기록
            hashes.put(hash);
            if (hashes.length() > MAX_HASH_SIZE) {
                JSONArray trimmed = new JSONArray();
                for (int i = hashes.length() - MAX_HASH_SIZE; i < hashes.length(); i++) {
                    trimmed.put(hashes.get(i));
                }
                hashes = trimmed;
            }

            JSONArray list = new JSONArray(prefs.getString(KEY_PENDING, "[]"));
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

            Log.d(TAG, "✅ 장부에 알림 저장 완료! (현재 대기 건수: " + list.length() + ")");

        } catch (Exception e) {
            Log.e(TAG, "❌ 알림 처리 중 에러 발생", e);
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