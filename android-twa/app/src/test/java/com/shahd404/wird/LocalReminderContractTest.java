package com.shahd404.wird;
import static org.junit.Assert.*;
import org.junit.Test;
public class LocalReminderContractTest {
    private static final String SESSION="123e4567-e89b-42d3-a456-426614174000";
    private LocalReminder reminder(long when,String path){return new LocalReminder(SESSION,when,1,2,path,true);}
    @Test public void acceptsValidReminder(){assertTrue(LocalReminderContract.isValid(reminder(2_000_000L,"/app/read/"+SESSION),1_000_000L));}
    @Test public void rejectsArbitraryRoute(){assertFalse(LocalReminderContract.isValid(reminder(2_000_000L,"https://evil.example"),1_000_000L));}
    @Test public void rejectsExpiredReminder(){assertFalse(LocalReminderContract.isValid(reminder(1L,"/app/read/"+SESSION),2_000_000L));}
    @Test public void routeFallsBackForWrongSession(){assertEquals("/app",SafeReminderRoute.validate(SESSION,"/app/read/223e4567-e89b-42d3-a456-426614174000"));}
}
