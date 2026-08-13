package com.shahd404.wird;

import android.content.Intent;
import java.util.regex.Pattern;

final class SafeReminderRoute {
    static final String VERIFIED_ORIGIN = "https://quran-seven-lyart.vercel.app";
    static final String OPEN_ACTION = "com.shahd404.wird.OPEN_LOCAL_READING_REMINDER";
    static final String EXTRA_SESSION = "readingSessionId";
    static final String EXTRA_PATH = "path";
    static final String FALLBACK = "/app";
    private static final Pattern UUID = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$");
    private SafeReminderRoute() {}
    static boolean isUuid(String value) { return value != null && UUID.matcher(value).matches(); }
    static String validate(String sessionId, String path) {
        String expected = isUuid(sessionId) ? "/app/read/" + sessionId : FALLBACK;
        return expected.equals(path) ? expected : FALLBACK;
    }
    static String fromIntent(Intent intent) {
        return intent != null && OPEN_ACTION.equals(intent.getAction())
                ? validate(intent.getStringExtra(EXTRA_SESSION), intent.getStringExtra(EXTRA_PATH)) : FALLBACK;
    }
}
