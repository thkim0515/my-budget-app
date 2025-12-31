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
    
    // [변경 1] 처리된 알림의 고유 ID(Key)를 저장하는 키
    private static final String KEY_PROCESSED_IDS = "processed_ids"; 
    
    // [변경 2] 최근 내용(중복 방지용)을 저장하는 키
    private static final String KEY_RECENT_CONTENTS = "recent_contents";
    
    private static final int MAX_HISTORY_SIZE = 100;
    private static final long DUPLICATE_WINDOW_MS = 3000; // 3초 내 타 앱 중복 알림 방어

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
            if (pkg.equals(getPackageName())) return; // 내 앱 알림 무시

            // 2. 제목 및 본문 추출
            String title = extras.getString(Notification.EXTRA_TITLE);
            if (title == null) title = "알림";

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
            String text = (textChar != null) ? textChar.toString() : "내용 없음";

            // [핵심 1] 시스템 고유 키(Key) 사용 - 물리적 중복 방지
            // sbn.getKey()는 알림마다 부여되는 고유값입니다. 앱을 껐다 켜도 유지됩니다.
            String uniqueKey = sbn.getKey(); 
            
            SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            
            // A. 이미 처리한 알림 객체인지 확인 (ID 기반)
            JSONArray processedIds = new JSONArray(prefs.getString(KEY_PROCESSED_IDS, "[]"));
            for (int i = 0; i < processedIds.length(); i++) {
                if (uniqueKey.equals(processedIds.getString(i))) {
                    // Log.d(TAG, "🚫 이미 처리된 알림 ID입니다. (시스템 중복)");
                    return;
                }
            }

            // [핵심 3] 교차 알림(카뱅+카톡) 방어 로직
            // 패키지명을 제외하고 내용만으로 해시를 생성
            String contentHash = sha256(title + text);
            long now = System.currentTimeMillis();
            
            JSONArray recentContents = new JSONArray(prefs.getString(KEY_RECENT_CONTENTS, "[]"));
            
            for (int i = 0; i < recentContents.length(); i++) {
                JSONObject history = recentContents.getJSONObject(i);
                String hHash = history.getString("hash");
                long hTime = history.getLong("time");
                String hPkg = history.getString("pkg");

                // 내용이 같고, 3초 이내에 발생한 경우
                if (contentHash.equals(hHash) && (now - hTime) < DUPLICATE_WINDOW_MS) {
                    if (pkg.equals(hPkg)) {
                        // 같은 앱(패키지)이면 -> 연속 결제(Valid) -> 통과
                        Log.d(TAG, "⚠️ 같은 앱의 연속 알림(봉봉스테이션 등) 감지 - 저장 허용");
                    } else {
                        // 다른 앱(패키지)이면 -> 중복 알림(Duplicate) -> 차단
                        Log.d(TAG, "🚫 타 앱 중복 알림 차단 (" + hPkg + " vs " + pkg + ")");
                        
                        // ID는 처리된 것으로 기록해두어야 다음에 또 검사 안함
                        saveProcessedId(prefs, processedIds, uniqueKey);
                        return;
                    }
                }
            }

            // [통과] 저장 로직 실행
            Log.d(TAG, "📩 새 알림 저장: [" + pkg + "] " + text);

            // 1. 처리된 ID 저장 (재부팅 시 중복 방지)
            saveProcessedId(prefs, processedIds, uniqueKey);

            // 2. 최근 내용 기록 (타 앱 중복 방지용)
            JSONObject historyObj = new JSONObject();
            historyObj.put("hash", contentHash);
            historyObj.put("time", now);
            historyObj.put("pkg", pkg);
            
            recentContents.put(historyObj);
            // 리스트 크기 관리
            if (recentContents.length() > MAX_HISTORY_SIZE) {
                JSONArray trimmed = new JSONArray();
                for (int i = 1; i < recentContents.length(); i++) { // 앞에서부터 삭제
                    trimmed.put(recentContents.get(i));
                }
                recentContents = trimmed;
            }

            // 3. 실제 데이터 저장 (JS 전달용)
            JSONArray list = new JSONArray(prefs.getString(KEY_PENDING, "[]"));
            JSONObject obj = new JSONObject();
            obj.put("title", title);
            obj.put("text", text);
            obj.put("package", pkg);
            // [변경] 알림이 실제 발생한 정확한 시간(postTime) 사용
            obj.put("time", sbn.getPostTime()); 
            
            list.put(obj);

            prefs.edit()
                    .putString(KEY_PENDING, list.toString())
                    .putString(KEY_RECENT_CONTENTS, recentContents.toString())
                    .apply();

        } catch (Exception e) {
            Log.e(TAG, "❌ 알림 처리 중 에러 발생", e);
        }
    }

    // 처리된 ID 저장 헬퍼 함수
    private void saveProcessedId(SharedPreferences prefs, JSONArray processedIds, String uniqueKey) {
        processedIds.put(uniqueKey);
        if (processedIds.length() > MAX_HISTORY_SIZE) {
            JSONArray trimmed = new JSONArray();
            for (int i = processedIds.length() - MAX_HISTORY_SIZE; i < processedIds.length(); i++) {
                trimmed.put(processedIds.opt(i));
            }
            processedIds = trimmed;
        }
        prefs.edit().putString(KEY_PROCESSED_IDS, processedIds.toString()).apply();
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