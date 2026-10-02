package io.github.opportunisticgames.goalmachine;

import android.app.Activity;
import android.content.Context;

import com.google.android.gms.games.achievement.Achievement;
import com.google.android.gms.games.achievement.AchievementBuffer;
import com.google.android.gms.games.AchievementsClient;
import com.google.android.gms.games.GameStatsClient;
import com.google.android.gms.games.LeaderboardsClient;
import com.google.android.gms.games.leaderboard.Leaderboard;
import com.google.android.gms.games.leaderboard.LeaderboardBuffer;
import com.google.android.gms.games.playergameevent.PlayerGameEvent;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Play Games Services: achievements, leaderboards and game stats (Google Play version only; the sideload build has a do-nothing copy).
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

    private static final Map<String, String> BOARDS = new HashMap<>();   // leaderboard display name -> id, from Play

    /** Submits a score to the leaderboard with this name (Play Console is the source of ids, so only names live here). */
    static void score(Activity activity, String boardName, long score) {
        activity.runOnUiThread(() -> {
            try {
                final LeaderboardsClient client = PlayGames.getLeaderboardsClient(activity);
                final String known = BOARDS.get(boardName);
                if (known != null) { client.submitScore(known, score); return; }
                client.loadLeaderboardMetadata(false).addOnSuccessListener(data -> {
                    LeaderboardBuffer buffer = data.get();
                    if (buffer == null) return;
                    try {
                        for (Leaderboard b : buffer) BOARDS.put(b.getDisplayName(), b.getLeaderboardId());
                    } finally {
                        buffer.release();
                    }
                    String id = BOARDS.get(boardName);
                    if (id != null) client.submitScore(id, score);
                });
            } catch (Exception e) { /* not signed in, or this board isn't in Play Console yet */ }
        });
    }

    /** Opens Google's list of this game's leaderboards. */
    static void showBoards(Activity activity) {
        activity.runOnUiThread(() -> {
            try {
                PlayGames.getLeaderboardsClient(activity).getAllLeaderboardsIntent()
                    .addOnSuccessListener(intent -> activity.startActivityForResult(intent, 9004));
            } catch (Exception e) { /* not signed in */ }
        });
    }

    /**
     * Game Stats events for the player's Play Games profile: a JSON array of {name, props}. The names and properties must
     * match the event schema uploaded in Play Console (events that don't match are dropped by Play, not by us).
     */
    static void stats(Activity activity, String eventsJson) {
        activity.runOnUiThread(() -> {
            try {
                JSONArray list = new JSONArray(eventsJson);
                GameStatsClient client = PlayGames.getGameStatsClient(activity);
                for (int i = 0; i < list.length(); i++) {
                    JSONObject e = list.getJSONObject(i);
                    PlayerGameEvent.Builder b = new PlayerGameEvent.Builder(e.getString("name"));
                    JSONObject props = e.optJSONObject("props");
                    if (props != null) {
                        for (Iterator<String> it = props.keys(); it.hasNext(); ) {
                            String k = it.next();
                            Object v = props.get(k);
                            if (v instanceof Boolean) b.addProperty(k, ((Boolean) v).booleanValue());
                            else if (v instanceof Number) b.addProperty(k, ((Number) v).intValue());
                            else b.addProperty(k, String.valueOf(v));
                        }
                    }
                    client.recordEvent(b.build());
                }
                client.requestEventsUpload();
            } catch (Exception e) { /* not signed in, or an older Play Games */ }
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
