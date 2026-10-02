package io.github.opportunisticgames.goalmachine;

import android.app.Activity;
import android.content.Context;

import com.google.android.gms.games.achievement.Achievement;
import com.google.android.gms.games.achievement.AchievementBuffer;
import com.google.android.gms.games.AchievementsClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

import org.json.JSONObject;

/**
 * Play Games Services achievements (Google Play version only; the sideload build has a do-nothing copy).
 * The site calls these through the bridge with a badge's name. The name is looked up in the game's achievement list
 * from Play (so no achievement ids live in the code), then unlocked, or its steps set for the counters. Signed-out players, or no
 * network, just mean nothing happens: the next sync catches up.
 */
final class Achievements {
    private Achievements() { }

    static final boolean AVAILABLE = true;

    static void init(Context context) {
        PlayGamesSdk.initialize(context.getApplicationContext());
    }

    /**
     * Sends progress for achievements: a JSON object of badge name -> how far (the steps so far for a counter, or any
     * number above 0 for a plain badge that has been earned). Counters get setSteps (it only ever goes up, and it
     * unlocks at the total); plain ones are unlocked unless they already are.
     */
    static void update(Activity activity, String progressJson) {
        final JSONObject wanted;
        try { wanted = new JSONObject(progressJson); } catch (Exception e) { return; }
        if (wanted.length() == 0) return;
        activity.runOnUiThread(() -> {
            try {
                final AchievementsClient client = PlayGames.getAchievementsClient(activity);
                client.load(false).addOnSuccessListener(data -> {
                    AchievementBuffer buffer = data.get();
                    if (buffer == null) return;
                    try {
                        for (Achievement x : buffer) {
                            int n = wanted.optInt(x.getName(), 0);
                            if (n <= 0 || x.getState() == Achievement.STATE_UNLOCKED) continue;
                            if (x.getType() == Achievement.TYPE_INCREMENTAL) {
                                int steps = Math.min(n, x.getTotalSteps());
                                if (steps > x.getCurrentSteps()) client.setSteps(x.getAchievementId(), steps);
                            } else {
                                client.unlock(x.getAchievementId());
                            }
                        }
                    } finally {
                        buffer.release();
                    }
                });
            } catch (Exception e) { /* not signed in, or Play Games isn't available */ }
        });
    }

    /** Opens Google's achievements screen for this game. */
    static void show(Activity activity) {
        activity.runOnUiThread(() -> {
            try {
                PlayGames.getAchievementsClient(activity).getAchievementsIntent()
                    .addOnSuccessListener(intent -> activity.startActivityForResult(intent, 9003));
            } catch (Exception e) { /* not signed in */ }
        });
    }
}
