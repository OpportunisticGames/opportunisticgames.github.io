package io.github.opportunisticgames.goalmachine;

import android.app.Activity;
import android.content.Context;

/** The APK on GitHub has no Play Games Services: the same calls, doing nothing. See the play version. */
final class Achievements {
    private Achievements() { }

    static final boolean AVAILABLE = false;

    static void init(Context context) { }

    static String status() { return "Only in the Google Play version"; }

    static void checkSignIn(Activity activity, boolean interactive) { }

    static void update(Activity activity, String progressJson) { }

    static void show(Activity activity) { }

    static void score(Activity activity, String boardName, long score) { }

    static void showBoards(Activity activity) { }

    static void stats(Activity activity, String eventsJson) { }
}
