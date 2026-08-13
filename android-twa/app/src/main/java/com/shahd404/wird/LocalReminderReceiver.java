package com.shahd404.wird;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
public final class LocalReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !LocalReminderScheduler.FIRE.equals(intent.getAction())) return;
        String sessionId = intent.getStringExtra(LocalReminderScheduler.EXTRA_SESSION);
        LocalReminder reminder = LocalReminderStore.eligible(context, sessionId, System.currentTimeMillis());
        if (reminder == null) return;
        if (NativeReminderNotifications.hasPermission(context) && !NativeReminderNotifications.channelBlocked(context))
            NativeReminderNotifications.show(context, reminder);
        LocalReminderStore.disable(context, sessionId);
    }
}
