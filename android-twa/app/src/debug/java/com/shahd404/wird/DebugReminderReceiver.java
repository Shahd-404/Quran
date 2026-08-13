package com.shahd404.wird;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.Collections;
import java.util.UUID;
public final class DebugReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent){
        long when=System.currentTimeMillis()+120000L;String id=UUID.randomUUID().toString();
        LocalReminderScheduler.synchronize(context, Collections.singletonList(new LocalReminder(id,when,1,1,"/app/read/"+id,true)),System.currentTimeMillis());
    }
}
