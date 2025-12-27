package com.user.budgetapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BudgetPlugin.class);

        super.onCreate(savedInstanceState);

        android.util.Log.d("BudgetApp", "플러그인이 등록되었습니다.");
    }
}