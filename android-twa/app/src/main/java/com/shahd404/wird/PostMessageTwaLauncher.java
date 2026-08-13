package com.shahd404.wird;

import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.browser.customtabs.*;
import androidx.browser.trusted.*;
import com.google.androidbrowserhelper.trusted.*;
import com.google.androidbrowserhelper.trusted.splashscreens.SplashScreenStrategy;

final class PostMessageTwaLauncher extends TwaLauncher {
    private final Context context; private final Uri origin; private final TwaProviderPicker.Action provider;
    private CustomTabsServiceConnection connection; private CustomTabsSession session;
    PostMessageTwaLauncher(Context context, Uri origin) { super(context); this.context=context; this.origin=origin; provider=TwaProviderPicker.pickProvider(context.getPackageManager()); }
    CustomTabsSession getSession() { return session; }
    @Override public void launch(TrustedWebActivityIntentBuilder builder, CustomTabsCallback callback,
            SplashScreenStrategy splash, Runnable completion, FallbackStrategy fallback) {
        FallbackStrategy safeFallback = fallback == null ? CCT_FALLBACK_STRATEGY : fallback;
        if (provider.provider == null || provider.launchMode != 0) { safeFallback.launch(context,builder,provider.provider,completion); return; }
        if (splash != null) splash.onTwaLaunchInitiated(provider.provider,builder);
        connection = new CustomTabsServiceConnection() {
            @Override public void onCustomTabsServiceConnected(@NonNull android.content.ComponentName name,@NonNull CustomTabsClient client) {
                client.warmup(0); session=client.newSession(callback);
                if(session==null){safeFallback.launch(context,builder,provider.provider,completion);return;}
                session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN,origin,new Bundle());
                Runnable ready=()->launchPrepared(builder,completion); if(splash==null)ready.run();else splash.configureTwaBuilder(builder,session,ready);
            }
            @Override public void onServiceDisconnected(@NonNull android.content.ComponentName name){session=null;}
        };
        if(!CustomTabsClient.bindCustomTabsServicePreservePriority(context,provider.provider,connection)) safeFallback.launch(context,builder,provider.provider,completion);
    }
    private void launchPrepared(TrustedWebActivityIntentBuilder builder,Runnable completion){
        TrustedWebActivityIntent intent=builder.build(session); FocusActivity.addToIntent(intent.getIntent(),context); intent.launchTrustedWebActivity(context);
        PackageManager pm=context.getPackageManager(); Token token=Token.create(provider.provider,pm); if(token!=null)new SharedPreferencesTokenStore(context).store(token); if(completion!=null)completion.run();
    }
    @Override public void destroy(){if(connection!=null)try{context.unbindService(connection);}catch(IllegalArgumentException ignored){} session=null;connection=null;}
}
