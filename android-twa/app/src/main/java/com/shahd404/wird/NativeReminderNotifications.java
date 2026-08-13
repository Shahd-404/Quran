package com.shahd404.wird;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

final class NativeReminderNotifications {
    static final String CHANNEL_ID = "wird_local_reading_reminders";
    private NativeReminderNotifications() {}
    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                context.getString(R.string.local_reminder_channel_name), NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(context.getString(R.string.local_reminder_channel_description));
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }
    static boolean hasPermission(Context context) {
        return (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
                && NotificationManagerCompat.from(context).areNotificationsEnabled();
    }
    static boolean channelBlocked(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel channel = manager == null ? null : manager.getNotificationChannel(CHANNEL_ID);
        return channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE;
    }
    static void show(Context context, LocalReminder reminder) {
        createChannel(context);
        Intent tap = new Intent(context, LauncherActivity.class).setAction(SafeReminderRoute.OPEN_ACTION)
                .putExtra(SafeReminderRoute.EXTRA_SESSION, reminder.sessionId)
                .putExtra(SafeReminderRoute.EXTRA_PATH, reminder.path)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(context, LocalReminderScheduler.stableRequestCode(reminder.sessionId),
                tap, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String body = context.getString(R.string.local_reminder_body, reminder.startPage, reminder.endPage);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_icon).setColor(Color.rgb(6, 78, 59))
                .setContentTitle(context.getString(R.string.local_reminder_title)).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(content)
                .setAutoCancel(true).setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        NotificationManagerCompat.from(context).notify("local-reading-" + reminder.sessionId, 604, notification.build());
    }
    static void cancel(Context context, String sessionId) {
        NotificationManagerCompat.from(context).cancel("local-reading-" + sessionId, 604);
    }
}
