package io.github.opportunisticgames.goalmachine;

import android.app.Activity;

import com.google.android.gms.games.PlayGames;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

/**
 * Google Play extras (the Play version only; the sideload APK has a do-nothing copy):
 *  - the in-app review card ("Enjoying Goal Machine?"), which Play shows at most a few times a year, whatever we ask;
 *  - in-app updates: a newer build downloads in the background and the page offers "Restart to update";
 *  - the Play Games player id and a server auth code, so an account can later follow the player to a new phone.
 * Results go back to the page through MainActivity.event(name, value), i.e. GM.appEvent(name, value).
 */
final class PlayExtras {
    private PlayExtras() { }

    static final boolean AVAILABLE = true;
    private static AppUpdateManager updates;
    private static InstallStateUpdatedListener listener;

    /** Asks Play for the review card. Play decides whether it actually appears (and never says). */
    static void review(MainActivity a) {
        a.runOnUiThread(() -> {
            try {
                ReviewManager rm = ReviewManagerFactory.create(a);
                rm.requestReviewFlow().addOnCompleteListener(t -> {
                    if (!t.isSuccessful()) { a.event("review", "unavailable"); return; }
                    rm.launchReviewFlow(a, t.getResult()).addOnCompleteListener(x -> a.event("review", "done"));
                });
            } catch (Exception e) { a.event("review", "unavailable"); }
        });
    }

    /** Checks for a newer build on Play. "none", "available" (with the version code), "downloading", "downloaded". */
    static void checkUpdate(MainActivity a, boolean start) {
        a.runOnUiThread(() -> {
            try {
                if (updates == null) {
                    updates = AppUpdateManagerFactory.create(a);
                    listener = s -> {
                        if (s.installStatus() == InstallStatus.DOWNLOADED) a.event("update", "downloaded");
                        else if (s.installStatus() == InstallStatus.DOWNLOADING) a.event("update", "downloading");
                        else if (s.installStatus() == InstallStatus.FAILED) a.event("update", "failed");
                    };
                    updates.registerListener(listener);
                }
                updates.getAppUpdateInfo().addOnSuccessListener(info -> {
                    if (info.installStatus() == InstallStatus.DOWNLOADED) { a.event("update", "downloaded"); return; }
                    boolean avail = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE);
                    if (!avail) { a.event("update", "none"); return; }
                    if (!start) { a.event("update", "available:" + info.availableVersionCode()); return; }
                    startFlexible(a, info);
                }).addOnFailureListener(e -> a.event("update", "none"));
            } catch (Exception e) { a.event("update", "none"); }
        });
    }

    private static void startFlexible(MainActivity a, AppUpdateInfo info) {
        try {
            updates.startUpdateFlowForResult(info, a, AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(), 21);
        } catch (Exception e) { a.event("update", "failed"); }
    }

    /** After "downloaded": installs the update and restarts the app. */
    static void completeUpdate(MainActivity a) {
        a.runOnUiThread(() -> { if (updates != null) updates.completeUpdate(); });
    }

    /** The signed-in Play Games player's id ("" if not signed in), sent as event "pgsPlayer". */
    static void playerId(MainActivity a) {
        a.runOnUiThread(() -> {
            try {
                PlayGames.getPlayersClient(a).getCurrentPlayer()
                    .addOnSuccessListener(p -> a.event("pgsPlayer", p.getPlayerId()))
                    .addOnFailureListener(e -> a.event("pgsPlayer", ""));
            } catch (Exception e) { a.event("pgsPlayer", ""); }
        });
    }

    /** A one-time server auth code for the signed-in player (for the web client id given), sent as event "pgsAuth". The
     *  server swaps it with Google for the verified player id, which is how an account can be restored safely. */
    static void serverAuth(MainActivity a, String serverClientId) {
        a.runOnUiThread(() -> {
            try {
                PlayGames.getGamesSignInClient(a).requestServerSideAccess(serverClientId, false)
                    .addOnSuccessListener(code -> a.event("pgsAuth", code))
                    .addOnFailureListener(e -> a.event("pgsAuth", ""));
            } catch (Exception e) { a.event("pgsAuth", ""); }
        });
    }
}
