package com.user.budgetapp;

import android.os.Bundle; // 추가
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        registerPlugin(BudgetPlugin.class);
    }
}