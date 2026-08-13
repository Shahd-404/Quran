package com.shahd404.wird;
import android.content.Context;
final class ReminderPreferences {
    private static final String PREFS = "wird_local_reminder_preferences";
    private static final String REQUESTED = "permission_requested";
    private ReminderPreferences() {}
    static boolean requested(Context context) { return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(REQUESTED, false); }
    static void markRequested(Context context) { context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(REQUESTED, true).apply(); }
}
