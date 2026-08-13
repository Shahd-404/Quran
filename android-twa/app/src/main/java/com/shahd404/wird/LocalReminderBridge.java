package com.shahd404.wird;

import android.Manifest;
import android.app.Activity;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.*;
import com.google.androidbrowserhelper.trusted.QualityEnforcer;
import org.json.JSONException;
import org.json.JSONObject;

final class LocalReminderBridge extends QualityEnforcer {
    static final int PERMISSION_REQUEST = 7404;
    private final Activity activity; private final Uri origin; private PostMessageTwaLauncher launcher;
    private boolean verified; private boolean navigated; private boolean ready;
    LocalReminderBridge(Activity activity, Uri origin){this.activity=activity;this.origin=origin;}
    void attach(PostMessageTwaLauncher launcher){this.launcher=launcher;}
    @Override public void onRelationshipValidationResult(int relation,@NonNull Uri requested,boolean result,@Nullable Bundle extras){
        super.onRelationshipValidationResult(relation,requested,result,extras);
        verified=result && relation==CustomTabsService.RELATION_USE_AS_ORIGIN && origin.equals(requested); requestChannel();
    }
    @Override public void onNavigationEvent(int event,@Nullable Bundle extras){super.onNavigationEvent(event,extras);if(event==CustomTabsCallback.NAVIGATION_FINISHED){navigated=true;requestChannel();}}
    private void requestChannel(){if(verified&&navigated&&launcher!=null&&launcher.getSession()!=null)launcher.getSession().requestPostMessageChannel(origin,origin,new Bundle());}
    @Override public void onMessageChannelReady(@Nullable Bundle extras){super.onMessageChannelReady(extras);ready=true;post(json("WIRD_NATIVE_LOCAL_REMINDERS_READY",null,null));}
    @Override public void onPostMessage(@NonNull String message,@Nullable Bundle extras){
        super.onPostMessage(message,extras); if(!verified||!ready||message.length()>65536)return;
        String requestId="";
        try{
            JSONObject payload=new JSONObject(message);requestId=payload.optString("requestId","");String type=payload.optString("type","");
            if("WIRD_ENABLE_LOCAL_REMINDERS".equals(type)){LocalReminderContract.requireEnvelope(payload,type);enable(requestId);return;}
            if(LocalReminderContract.SYNC.equals(type)){int count=LocalReminderScheduler.synchronize(activity,LocalReminderContract.parseSync(payload,System.currentTimeMillis()),System.currentTimeMillis());respond(requestId,"scheduled",count);return;}
            if(LocalReminderContract.CANCEL.equals(type)){LocalReminderScheduler.cancel(activity,LocalReminderContract.parseCancel(payload));respond(requestId,"scheduled",0);return;}
            if(LocalReminderContract.CLEAR.equals(type)){LocalReminderContract.requireEnvelope(payload,type);LocalReminderScheduler.synchronize(activity,new java.util.ArrayList<>(),System.currentTimeMillis());respond(requestId,"scheduled",0);}
        }catch(JSONException exception){respond(requestId,"invalid_payload",0);}catch(RuntimeException exception){respond(requestId,"scheduling_failed",0);}
    }
    private void enable(String requestId){
        NativeReminderNotifications.createChannel(activity);
        if(NativeReminderNotifications.channelBlocked(activity)){respond(requestId,"notifications_blocked",0);return;}
        if(!NativeReminderNotifications.hasPermission(activity)){
            if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.TIRAMISU&&!ReminderPreferences.requested(activity)){
                ReminderPreferences.markRequested(activity);activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
            }
            respond(requestId,ReminderPreferences.requested(activity)?"permission_required":"notifications_blocked",0);return;
        }
        respond(requestId,"scheduled",0);
    }
    void permissionResult(){post(json("WIRD_LOCAL_REMINDERS_PERMISSION",null,NativeReminderNotifications.hasPermission(activity)?"scheduled":"notifications_blocked"));}
    private void respond(String requestId,String status,int count){try{JSONObject value=new JSONObject().put("type","WIRD_LOCAL_REMINDERS_RESULT").put("version",1).put("requestId",requestId).put("status",status).put("scheduledCount",count);post(value.toString());}catch(JSONException ignored){}}
    private String json(String type,String requestId,String status){try{JSONObject value=new JSONObject().put("type",type).put("version",1);if(requestId!=null)value.put("requestId",requestId);if(status!=null)value.put("status",status);return value.toString();}catch(JSONException ignored){return "{}";}}
    private void post(String value){if(ready&&launcher!=null&&launcher.getSession()!=null)launcher.getSession().postMessage(value,null);}
}
