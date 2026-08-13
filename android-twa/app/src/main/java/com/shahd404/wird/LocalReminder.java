package com.shahd404.wird;

import org.json.JSONException;
import org.json.JSONObject;

final class LocalReminder {
    final String sessionId;
    final long scheduledAt;
    final int startPage;
    final int endPage;
    final String path;
    final boolean active;

    LocalReminder(String sessionId, long scheduledAt, int startPage, int endPage, String path, boolean active) {
        this.sessionId = sessionId;
        this.scheduledAt = scheduledAt;
        this.startPage = startPage;
        this.endPage = endPage;
        this.path = path;
        this.active = active;
    }

    LocalReminder disabled() { return new LocalReminder(sessionId, scheduledAt, startPage, endPage, path, false); }

    JSONObject toJson() throws JSONException {
        return new JSONObject().put("readingSessionId", sessionId).put("scheduledAtEpochMs", scheduledAt)
                .put("startPage", startPage).put("endPage", endPage).put("path", path).put("active", active);
    }

    static LocalReminder fromJson(JSONObject value) throws JSONException {
        LocalReminder reminder = new LocalReminder(value.getString("readingSessionId"),
                value.getLong("scheduledAtEpochMs"), value.getInt("startPage"), value.getInt("endPage"),
                value.getString("path"), value.getBoolean("active"));
        if (!LocalReminderContract.isValid(reminder, Long.MIN_VALUE)) throw new JSONException("Invalid reminder");
        return reminder;
    }
}
