package com.shahd404.wird;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class LocalReminderStore {
    private static final String PREFS = "wird_local_reading_reminders_v1";
    private static final String KEY = "schedule";
    private LocalReminderStore() {}
    static synchronized List<LocalReminder> load(Context context) {
        List<LocalReminder> result = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"));
            if (array.length() > LocalReminderContract.MAX_REMINDERS) return Collections.emptyList();
            for (int i = 0; i < array.length(); i++) result.add(LocalReminder.fromJson(array.getJSONObject(i)));
        } catch (JSONException ignored) { return Collections.emptyList(); }
        return result;
    }
    static synchronized void save(Context context, List<LocalReminder> reminders) {
        JSONArray array = new JSONArray();
        try { for (LocalReminder reminder : reminders) array.put(reminder.toJson()); }
        catch (JSONException exception) { throw new IllegalStateException(exception); }
        if (!context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, array.toString()).commit())
            throw new IllegalStateException("Reminder persistence failed");
    }
    static LocalReminder eligible(Context context, String sessionId, long now) {
        for (LocalReminder reminder : load(context)) if (reminder.sessionId.equals(sessionId) && reminder.active
                && reminder.scheduledAt > now - LocalReminderContract.GRACE_MS) return reminder;
        return null;
    }
    static void disable(Context context, String sessionId) {
        List<LocalReminder> next = new ArrayList<>();
        for (LocalReminder reminder : load(context)) next.add(reminder.sessionId.equals(sessionId) ? reminder.disabled() : reminder);
        save(context, next);
    }
}
