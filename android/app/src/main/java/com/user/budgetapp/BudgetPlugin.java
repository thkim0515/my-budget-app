package com.user.budgetapp;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.content.SharedPreferences;
import android.content.Context;

import android.provider.Settings;
import android.text.TextUtils;
import android.content.Intent;

import android.util.Log;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

@CapacitorPlugin(
    name = "BudgetPlugin",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class BudgetPlugin extends Plugin {

    private static final String PREF_NAME = "BudgetData";
    private static final String KEY_PENDING = "pending_notis";
    private static final String STICKY_CHANNEL_ID = "budget_sticky_channel";
    private static final int STICKY_NOTI_ID = 9001;

    // BudgetPlugin.java 내 해당 메서드 수정
    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Log.d("BudgetPlugin", "openNotificationAccessSettings 호출됨");

        try {
            // 정확한 설정 화면 Intent (API 18 이상 공통)
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            if (getActivity() != null) {
                getActivity().startActivity(intent);
                call.resolve();
            } else {
                // Context를 통해서라도 실행 시도
                getContext().startActivity(intent);
                call.resolve();
            }
        } catch (Exception e) {
            Log.e("BudgetPlugin", "설정 화면 열기 실패: " + e.getMessage());
            call.reject("설정 화면을 열 수 없습니다: " + e.getMessage());
        }
    }


    @PluginMethod
    public void getPendingNotifications(PluginCall call) {
        SharedPreferences prefs =
            getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        String json = prefs.getString(KEY_PENDING, "[]");

        JSObject ret = new JSObject();
        ret.put("data", json);   
        call.resolve(ret);
    }

    @PluginMethod
    public void clearNotifications(PluginCall call) {
        getContext()
            .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_PENDING)
            .apply();

        call.resolve();
    }

    @PluginMethod
    public void hasNotificationAccess(PluginCall call) {
        String pkgName = getContext().getPackageName();
        String enabledListeners =
            Settings.Secure.getString(
                getContext().getContentResolver(),
                "enabled_notification_listeners"
            );

        boolean granted = false;

        if (!TextUtils.isEmpty(enabledListeners)) {
            String[] listeners = enabledListeners.split(":");
            for (String listener : listeners) {
                if (listener.contains(pkgName)) {
                    granted = true;
                    break;
                }
            }
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    // @PluginMethod
    // public void openNotificationAccessSettings(PluginCall call) {
    //     Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    //     intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    //     getContext().startActivity(intent);
    //     call.resolve();
    // }

    // 상태바에 고정(스와이프로 지워지지 않는) 알림을 표시하거나 갱신한다.
    @PluginMethod
    public void showStickyNotification(PluginCall call) {
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            postStickyNotification(call);
        } else {
            requestPermissionForAlias("notifications", call, "notificationPermsCallback");
        }
    }

    @PermissionCallback
    private void notificationPermsCallback(PluginCall call) {
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            postStickyNotification(call);
        } else {
            call.reject("알림 권한이 거부되었습니다.");
        }
    }

    private void postStickyNotification(PluginCall call) {
        String text = call.getString("text", "");
        Context context = getContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager != null) {
            NotificationChannel channel = manager.getNotificationChannel(STICKY_CHANNEL_ID);
            if (channel == null) {
                channel = new NotificationChannel(
                    STICKY_CHANNEL_ID,
                    "고정 알림",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("설정에서 켠 상태바 고정 알림을 표시합니다.");
                manager.createNotificationChannel(channel);
            }
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            contentIntent = PendingIntent.getActivity(context, 0, launchIntent, flags);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, STICKY_CHANNEL_ID)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle(text)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW);

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
        }

        NotificationManagerCompat.from(context).notify(STICKY_NOTI_ID, builder.build());
        call.resolve();
    }

    // 고정 알림을 완전히 제거한다(재생성되지 않음).
    @PluginMethod
    public void hideStickyNotification(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(STICKY_NOTI_ID);
        call.resolve();
    }

}
