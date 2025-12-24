package com.user.budgetapp;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.SharedPreferences;
import android.content.Context;

import android.provider.Settings;
import android.text.TextUtils;
import android.content.Intent;


@CapacitorPlugin(name = "BudgetPlugin")
public class BudgetPlugin extends Plugin {

    private static final String PREF_NAME = "BudgetData";
    private static final String KEY_PENDING = "pending_notis";

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

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        getActivity().startActivity(intent);
        call.resolve();
    }


}
