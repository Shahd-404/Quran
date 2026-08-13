package com.shahd404.wird;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

final class LocalReminderContract {
    static final int VERSION = 1;
    static final String SYNC = "WIRD_SYNC_LOCAL_REMINDERS";
    static final String CANCEL = "WIRD_CANCEL_LOCAL_REMINDER";
    static final String CLEAR = "WIRD_CLEAR_LOCAL_REMINDERS";
    static final long GRACE_MS = 30L * 60L * 1000L;
    static final long MAX_FUTURE_MS = 8L * 24L * 60L * 60L * 1000L;
    static final int MAX_REMINDERS = 64;
    private LocalReminderContract() {}

    static List<LocalReminder> parseSync(JSONObject payload, long now) throws JSONException {
        requireEnvelope(payload, SYNC);
        JSONArray values = payload.getJSONArray("reminders");
        if (values.length() > MAX_REMINDERS) throw new JSONException("Too many reminders");
        List<LocalReminder> result = new ArrayList<>();
        for (int i = 0; i < values.length(); i++) {
            JSONObject value = values.getJSONObject(i);
            LocalReminder reminder = new LocalReminder(value.getString("readingSessionId"),
                    value.getLong("scheduledAtEpochMs"), value.getInt("startPage"), value.getInt("endPage"),
                    value.getString("path"), true);
            if (!isValid(reminder, now)) throw new JSONException("Invalid reminder");
            result.add(reminder);
        }
        return result;
    }

    static String parseCancel(JSONObject payload) throws JSONException {
        requireEnvelope(payload, CANCEL);
        String sessionId = payload.getString("readingSessionId");
        if (!SafeReminderRoute.isUuid(sessionId)) throw new JSONException("Invalid session");
        return sessionId;
    }

    static void requireEnvelope(JSONObject payload, String type) throws JSONException {
        if (!type.equals(payload.optString("type")) || payload.optInt("version", -1) != VERSION
                || !SafeReminderRoute.isUuid(payload.optString("requestId"))) throw new JSONException("Invalid envelope");
    }

    static boolean isValid(LocalReminder reminder, long now) {
        boolean timeValid = now == Long.MIN_VALUE || (reminder.scheduledAt > now - GRACE_MS
                && reminder.scheduledAt <= now + MAX_FUTURE_MS);
        return SafeReminderRoute.isUuid(reminder.sessionId) && reminder.startPage >= 1 && reminder.endPage <= 604
                && reminder.startPage <= reminder.endPage
                && SafeReminderRoute.validate(reminder.sessionId, reminder.path).equals(reminder.path) && timeValid;
    }
}
