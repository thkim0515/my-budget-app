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

public final class NotificationListener extends NotificationListenerService {

    public NotificationListener() {
        super();
    }

    private static final String TAG = "NotificationListener";
    private static final String PREF_NAME = "BudgetData";
    private static final String KEY_PENDING = "pending_notis";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        Log.d(TAG, "onNotificationPosted 호출됨");

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = extras.getString(Notification.EXTRA_TITLE);
        CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);

        if (title == null || textChar == null) return;

        saveNotification(title, textChar.toString(), sbn.getPackageName());
    }

    private void saveNotification(String title, String text, String packageName) {
        SharedPreferences prefs =
                getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        try {
            JSONArray list = new JSONArray(prefs.getString(KEY_PENDING, "[]"));

            JSONObject obj = new JSONObject();
            obj.put("title", title);
            obj.put("text", text);
            obj.put("package", packageName);
            obj.put("time", System.currentTimeMillis());

            list.put(obj);

            prefs.edit().putString(KEY_PENDING, list.toString()).apply();
            Log.d(TAG, "알림 저장 완료");

        } catch (Exception e) {
            Log.e(TAG, "알림 저장 실패", e);
        }
    }
}
