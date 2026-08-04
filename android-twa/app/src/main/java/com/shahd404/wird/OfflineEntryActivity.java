package com.shahd404.wird;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Shows a small branded message only when the very first TWA launch has no network.
 * After an online launch, offline starts continue to Chrome so the existing Service
 * Worker can open downloaded Wird sessions.
 */
public final class OfflineEntryActivity extends Activity {
    private static final String PREFERENCES = "wird_launcher_state";
    private static final String HAS_ONLINE_LAUNCH = "has_online_launch";
    private boolean launched;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(6, 78, 59));
        routeOrShowFallback();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (hasOnlineLaunch() || isOnline()) {
            routeOrShowFallback();
        }
    }

    private void routeOrShowFallback() {
        if (isOnline()) {
            getSharedPreferences(PREFERENCES, MODE_PRIVATE)
                    .edit()
                    .putBoolean(HAS_ONLINE_LAUNCH, true)
                    .apply();
            launchTwa();
            return;
        }
        if (hasOnlineLaunch()) {
            launchTwa();
            return;
        }
        showFirstLaunchOfflineFallback();
    }

    private boolean hasOnlineLaunch() {
        return getSharedPreferences(PREFERENCES, MODE_PRIVATE)
                .getBoolean(HAS_ONLINE_LAUNCH, false);
    }

    private void launchTwa() {
        if (launched) return;
        launched = true;
        Intent intent = new Intent(this, LauncherActivity.class);
        startActivity(intent);
        finish();
    }

    @SuppressWarnings("deprecation")
    private boolean isOnline() {
        ConnectivityManager manager =
                (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network network = manager.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
            return capabilities != null
                    && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        }
        NetworkInfo info = manager.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    private void showFirstLaunchOfflineFallback() {
        int padding = dp(24);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(padding, padding, padding, padding);
        layout.setBackgroundColor(Color.rgb(247, 246, 242));
        layout.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        TextView mark = new TextView(this);
        mark.setText("و");
        mark.setTextColor(Color.WHITE);
        mark.setTextSize(28);
        mark.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        mark.setGravity(Gravity.CENTER);
        mark.setBackgroundColor(Color.rgb(6, 78, 59));
        layout.addView(mark, new LinearLayout.LayoutParams(dp(64), dp(64)));

        TextView title = textView("يلزم الاتصال بالإنترنت عند فتح ورد لأول مرة", 22, true);
        LinearLayout.LayoutParams titleParams = wrapContent();
        titleParams.setMargins(0, dp(24), 0, dp(8));
        layout.addView(title, titleParams);

        TextView description = textView(
                "اتصلي بالإنترنت مرة واحدة لإعداد التطبيق. بعد ذلك يمكنك تنزيل جلسات الورد وقراءتها دون اتصال.",
                16,
                false
        );
        layout.addView(description, wrapContent());

        Button retry = new Button(this);
        retry.setText("إعادة المحاولة");
        retry.setTextSize(16);
        retry.setTextColor(Color.WHITE);
        retry.setBackgroundColor(Color.rgb(6, 78, 59));
        retry.setOnClickListener(view -> routeOrShowFallback());
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(52)
        );
        retryParams.setMargins(0, dp(24), 0, 0);
        layout.addView(retry, retryParams);

        setContentView(layout);
    }

    private TextView textView(String text, int size, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(Color.rgb(28, 25, 23));
        view.setGravity(Gravity.CENTER);
        view.setTextDirection(View.TEXT_DIRECTION_RTL);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private LinearLayout.LayoutParams wrapContent() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
