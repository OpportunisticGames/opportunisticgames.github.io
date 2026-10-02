package io.github.opportunisticgames.goalmachine;

import android.app.Activity;
import android.content.Context;

/** The APK on GitHub has no Play Games Services: the same calls, doing nothing. See the play version. */
final class Achievements {
    private Achievements() { }

    static final boolean AVAILABLE = false;

    static void init(Context context) { }

    static void update(Activity activity, String progressJson) { }

    static void show(Activity activity) { }
}
