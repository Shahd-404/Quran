package com.shahd404.wird;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
public final class LocalReminderRescheduleReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent != null && supported(intent.getAction())) LocalReminderScheduler.restore(context, System.currentTimeMillis());
    }
    static boolean supported(String action) { return Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action); }
}
