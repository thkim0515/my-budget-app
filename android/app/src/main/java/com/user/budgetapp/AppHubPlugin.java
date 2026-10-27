package com.user.budgetapp;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 앱 허브(com.thkim.apphub)와의 연동 — 다른 앱들과 같은 규약.
 * 허브가 설치돼 있으면 APK 업데이트를 허브에서 받는다(앱이 직접 받아 설치하면 설치 주인이 허브가 아니게 되어
 * 허브의 무확인 업데이트가 깨진다).
 *  - action com.thkim.apphub.OPEN_APP, extra app_key(String), start_update(Boolean)
 *  - 허브가 이 인텐트를 모르는 구버전이면 허브 첫 화면을 대신 연다.
 */
@CapacitorPlugin(name = "AppHub")
public class AppHubPlugin extends Plugin {

    static final String PACKAGE = "com.thkim.apphub";
    static final String ACTION_OPEN_APP = "com.thkim.apphub.OPEN_APP";
    static final String EXTRA_APP_KEY = "app_key";
    static final String EXTRA_START_UPDATE = "start_update";
    static final String DEFAULT_APP_KEY = "mybudget";

    @PluginMethod
    public void isInstalled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("installed", isHubInstalled(getContext()));
        call.resolve(ret);
    }

    /** 허브에서 이 앱의 업데이트를 연다. result: "update"(업데이트 화면) | "launcher"(허브 첫 화면) | "failed" */
    @PluginMethod
    public void openUpdate(PluginCall call) {
        String appKey = call.getString("appKey", DEFAULT_APP_KEY);
        if (appKey == null || !appKey.matches("[a-z0-9_]{1,32}")) appKey = DEFAULT_APP_KEY;
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();
        String result = "failed";

        Intent intent = new Intent(ACTION_OPEN_APP)
            .setPackage(PACKAGE)
            .putExtra(EXTRA_APP_KEY, appKey)
            .putExtra(EXTRA_START_UPDATE, true)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (pm.resolveActivity(intent, 0) != null && start(ctx, intent)) {
            result = "update";
        } else {
            Intent launcher = pm.getLaunchIntentForPackage(PACKAGE);
            if (launcher != null && start(ctx, launcher.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))) result = "launcher";
        }

        JSObject ret = new JSObject();
        ret.put("result", result);
        call.resolve(ret);
    }

    private static boolean isHubInstalled(Context ctx) {
        try {
            ctx.getPackageManager().getPackageInfo(PACKAGE, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private static boolean start(Context ctx, Intent intent) {
        try {
            ctx.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
