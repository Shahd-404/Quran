package com.shahd404.wird;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import java.util.List;

final class LocalReminderScheduler {
    static final String FIRE = "com.shahd404.wird.FIRE_LOCAL_READING_REMINDER";
    static final String EXTRA_SESSION = "readingSessionId";
    private LocalReminderScheduler() {}
    static int synchronize(Context context, List<LocalReminder> reminders, long now) {
        for (LocalReminder old : LocalReminderStore.load(context)) cancelAlarm(context, old.sessionId);
        LocalReminderStore.save(context, reminders);
        int count = 0;
        for (LocalReminder reminder : reminders) if (reminder.active && reminder.scheduledAt > now - LocalReminderContract.GRACE_MS) {
            schedule(context, reminder, now); count++;
        }
        return count;
    }
    static void cancel(Context context, String sessionId) { cancelAlarm(context, sessionId); LocalReminderStore.disable(context, sessionId); NativeReminderNotifications.cancel(context, sessionId); }
    static int restore(Context context, long now) { return synchronize(context, LocalReminderStore.load(context), now); }
    private static void schedule(Context context, LocalReminder reminder, long now) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) throw new IllegalStateException("AlarmManager unavailable");
        long trigger = Math.max(reminder.scheduledAt, now + 1L);
        PendingIntent operation = operation(context, reminder.sessionId, PendingIntent.FLAG_UPDATE_CURRENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, operation);
        else manager.set(AlarmManager.RTC_WAKEUP, trigger, operation);
    }
    private static void cancelAlarm(Context context, String sessionId) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent operation = operation(context, sessionId, PendingIntent.FLAG_NO_CREATE);
        if (manager != null && operation != null) manager.cancel(operation);
    }
    private static PendingIntent operation(Context context, String sessionId, int flag) {
        Intent intent = new Intent(context, LocalReminderReceiver.class).setAction(FIRE)
                .setData(Uri.parse("wird://local-reminder/" + sessionId)).putExtra(EXTRA_SESSION, sessionId);
        return PendingIntent.getBroadcast(context, stableRequestCode(sessionId), intent, flag | PendingIntent.FLAG_IMMUTABLE);
    }
    static int stableRequestCode(String sessionId) { return sessionId.hashCode() & 0x7fffffff; }
}
