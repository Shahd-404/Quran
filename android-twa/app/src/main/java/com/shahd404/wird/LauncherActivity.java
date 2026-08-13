/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.shahd404.wird;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.browser.customtabs.CustomTabsCallback;
import com.google.androidbrowserhelper.trusted.TwaLauncher;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final Uri VERIFIED_ORIGIN = Uri.parse(SafeReminderRoute.VERIFIED_ORIGIN);
    private LocalReminderBridge reminderBridge;
    

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        reminderBridge = new LocalReminderBridge(this, VERIFIED_ORIGIN);
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        String reminderPath = SafeReminderRoute.fromIntent(getIntent());
        if (!SafeReminderRoute.FALLBACK.equals(reminderPath)) return VERIFIED_ORIGIN.buildUpon().encodedPath(reminderPath).build();

        return uri;
    }

    @Override protected CustomTabsCallback getCustomTabsCallback() { return reminderBridge; }
    @Override protected TwaLauncher createTwaLauncher() {
        PostMessageTwaLauncher launcher = new PostMessageTwaLauncher(this, VERIFIED_ORIGIN);
        reminderBridge.attach(launcher); return launcher;
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == LocalReminderBridge.PERMISSION_REQUEST) reminderBridge.permissionResult();
    }
}
