package io.github.opportunisticgames.goalmachine;

import android.app.Activity;
import android.content.Context;

import com.google.android.gms.games.achievement.Achievement;
import com.google.android.gms.games.achievement.AchievementBuffer;
import com.google.android.gms.games.AchievementsClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

import org.json.JSONArray;

import java.util.HashSet;
import java.util.Set;

/**
 * Play Games Services achievements (Google Play version only; the sideload build has a do-nothing copy).
 * The site calls these through the bridge with a badge's name. The name is looked up in the game's achievement list
 * from Play (so no achievement ids live in the code) and unlocked if it isn't already. Signed-out players, or no
 * network, just mean nothing happens: the next sync catches up.
 */
final class Achievements {
    private Achievements() { }

    static final boolean AVAILABLE = true;

    static void init(Context context) {
        PlayGamesSdk.initialize(context.getApplicationContext());
    }

    /** Unlocks the achievements with these names (a JSON array), skipping the ones already unlocked. */
    static void unlock(Activity activity, String namesJson) {
        final Set<String> wanted = new HashSet<>();
        try {
            JSONArray a = new JSONArray(namesJson);
            for (int i = 0; i < a.length(); i++) wanted.add(a.getString(i));
        } catch (Exception e) { return; }
        if (wanted.isEmpty()) return;
        activity.runOnUiThread(() -> {
            try {
                final AchievementsClient client = PlayGames.getAchievementsClient(activity);
                client.load(false).addOnSuccessListener(data -> {
                    AchievementBuffer buffer = data.get();
                    if (buffer == null) return;
                    try {
                        for (Achievement x : buffer) {
                            if (wanted.contains(x.getName()) && x.getState() != Achievement.STATE_UNLOCKED) {
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
