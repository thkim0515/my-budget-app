package com.user.budgetapp;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.SharedPreferences;
import android.content.Context;

import android.provider.Settings;
import android.text.TextUtils;
import android.content.Intent;

import android.util.Log;

@CapacitorPlugin(name = "BudgetPlugin")
public class BudgetPlugin extends Plugin {

    private static final String PREF_NAME = "BudgetData";
    private static final String KEY_PENDING = "pending_notis";

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



}
