package com.shahd404.wird;
import static org.junit.Assert.*;
import android.content.Intent;
import org.junit.Test;
public class LocalReminderSchedulerTest {
    private static final String ID="123e4567-e89b-42d3-a456-426614174000";
    @Test public void identityIsDeterministic(){assertEquals(LocalReminderScheduler.stableRequestCode(ID),LocalReminderScheduler.stableRequestCode(ID));}
    @Test public void lifecycleActionsAreSupported(){assertTrue(LocalReminderRescheduleReceiver.supported(Intent.ACTION_BOOT_COMPLETED));assertTrue(LocalReminderRescheduleReceiver.supported(Intent.ACTION_TIME_CHANGED));assertTrue(LocalReminderRescheduleReceiver.supported(Intent.ACTION_TIMEZONE_CHANGED));assertTrue(LocalReminderRescheduleReceiver.supported(Intent.ACTION_MY_PACKAGE_REPLACED));}
    @Test public void channelIdIsStable(){assertEquals("wird_local_reading_reminders",NativeReminderNotifications.CHANNEL_ID);}
    @Test public void changedTimeProducesReplacementRecord(){LocalReminder oldValue=new LocalReminder(ID,2L,1,2,"/app/read/"+ID,true);LocalReminder newValue=new LocalReminder(ID,3L,1,2,"/app/read/"+ID,true);assertEquals(oldValue.sessionId,newValue.sessionId);assertNotEquals(oldValue.scheduledAt,newValue.scheduledAt);}
    @Test public void cancellationStateDoesNotMutateSessionData(){LocalReminder value=new LocalReminder(ID,2L,1,2,"/app/read/"+ID,true);LocalReminder disabled=value.disabled();assertFalse(disabled.active);assertEquals(value.sessionId,disabled.sessionId);assertEquals(value.startPage,disabled.startPage);assertEquals(value.endPage,disabled.endPage);}
}
