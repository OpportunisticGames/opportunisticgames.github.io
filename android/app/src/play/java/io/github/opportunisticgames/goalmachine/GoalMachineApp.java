package io.github.opportunisticgames.goalmachine;

import android.app.Application;

import com.google.android.gms.games.PlayGamesSdk;

/** Google Play version only: Play Games Services starts here, as Google asks, so the "Welcome back" sign-in runs at launch. */
public class GoalMachineApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        PlayGamesSdk.initialize(this);
    }
}
