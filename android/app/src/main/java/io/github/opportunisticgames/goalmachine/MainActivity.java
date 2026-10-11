package io.github.opportunisticgames.goalmachine;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Base64;
import android.view.HapticFeedbackConstants;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import java.io.File;
import java.io.FileOutputStream;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Goal Machine for Android: a full-screen WebView around the live site, so the app always has the latest version. */
public class MainActivity extends Activity {
    private static final String HOST = "opportunisticgames.github.io";
    private static final String URL = "https://" + HOST + "/goal-machine/";

    // Shown instead of Android's error page when the site can't be reached (e.g. first launch with no signal)
    private static final String OFFLINE =
        "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
        + "<body style='margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;"
        + "background:#07261d;color:#f4f7f2;font-family:sans-serif;text-align:center;padding:24px;box-sizing:border-box'>"
        + "<div style='font-size:56px'>&#9917;</div><h2 style='margin:12px 0 6px'>No signal in the stadium</h2>"
        + "<p style='opacity:.8;margin:0 0 20px'>Goal Machine needs the internet the first time it opens.</p>"
        + "<button onclick='AndroidApp.retry()' style='background:#c8ff3d;color:#0b3d2e;border:0;border-radius:12px;"
        + "padding:14px 28px;font-size:17px;font-weight:bold'>Try again</button></body></html>";

    private WebView web;
    private FrameLayout frame;
    private String failedUrl = URL;
    private ValueCallback<Uri[]> fileCallback;
    /** Whether the game is on screen: notifications are skipped then, as the page shows the same thing. */
    static volatile boolean visible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setBackgroundColor(0xFF07261D);
        // no scrollbars: Android draws its own over the page (a line on the right that does nothing useful on a phone)
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);

        Achievements.checkSignIn(this, false);   // Play Games Services (a do-nothing in the sideload APK)
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // scores, album and settings live in localStorage
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);   // the site is laid out for normal text; the phone's big-text setting pushed card names off the cards

        web.setWebChromeClient(new WebChromeClient() {
            // lets <input type="file"> work (e.g. picking a photo), for features that may want it later
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), 7);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                openElsewhere(uri);  // anything off-site (e.g. GitHub links) opens in the browser
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (!request.isForMainFrame()) return;
                failedUrl = request.getUrl().toString();
                view.loadDataWithBaseURL(null, OFFLINE, "text/html", "utf-8", null);
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidApp");

        String link = siteLink(getIntent());
        if (link != null) web.loadUrl(link);
        else if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(URL);
        // Android 15+ draws apps edge to edge, under the status and navigation bars. Keep the page clear of them by
        // padding a frame around the WebView by the system bar (and camera cut-out) sizes; the green shows behind.
        frame = new FrameLayout(this);
        frame.setBackgroundColor(0xFF07261D);
        frame.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        if (Build.VERSION.SDK_INT >= 30) {
            frame.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        setContentView(frame);
        shortcuts();
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    /** Tells the page something happened on the phone side: GM.appEvent(name, value) (e.g. "update", "downloaded"). */
    void event(String name, String value) {
        if (web == null) return;
        String js = "window.GM && GM.appEvent && GM.appEvent(" + org.json.JSONObject.quote(name) + "," + org.json.JSONObject.quote(value == null ? "" : value) + ")";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    /** Long-press the app icon: straight to the daily CHAOS, Footle, your challenges or the online games. */
    private void shortcuts() {
        if (Build.VERSION.SDK_INT < 25) return;
        try {
            android.content.pm.ShortcutManager sm = getSystemService(android.content.pm.ShortcutManager.class);
            if (sm == null) return;
            String[][] list = {
                { "dchaos", "Daily CHAOS", "Today's CHAOS draft", "#/draft?m=chaos&daily=1" },
                { "footle", "Footle", "Guess today's player", "#/footle" },
                { "challenges", "Your challenges", "Challenges you've sent and taken on", "#/challenges" },
                { "online", "Play online", "Your games and friends", "#/online" },
            };
            java.util.List<android.content.pm.ShortcutInfo> out = new java.util.ArrayList<>();
            for (String[] x : list) {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(URL + x[3]), this, MainActivity.class);
                out.add(new android.content.pm.ShortcutInfo.Builder(this, x[0]).setShortLabel(x[1]).setLongLabel(x[2])
                    .setIcon(android.graphics.drawable.Icon.createWithResource(this, R.mipmap.ic_launcher)).setIntent(i).build());
            }
            sm.setDynamicShortcuts(out);
        } catch (Exception e) { /* a launcher without shortcuts */ }
    }

    /** Whether Android lets this app open Goal Machine links: "verified" (or chosen by the player), "off", or
     *  "unknown" (Android 11 and older can't say). */
    private String linkState() {
        if (Build.VERSION.SDK_INT < 31) return "unknown";
        try {
            android.content.pm.verify.domain.DomainVerificationManager dm = getSystemService(android.content.pm.verify.domain.DomainVerificationManager.class);
            android.content.pm.verify.domain.DomainVerificationUserState st = dm.getDomainVerificationUserState(getPackageName());
            if (st == null) return "unknown";
            Integer h = st.getHostToStateMap().get(HOST);
            boolean on = st.isLinkHandlingAllowed() && h != null && h != android.content.pm.verify.domain.DomainVerificationUserState.DOMAIN_STATE_NONE;
            return on ? "verified" : "off";
        } catch (Exception e) { return "unknown"; }
    }

    /** A Goal Machine link (e.g. a friend's challenge) tapped while the app is already open. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String link = siteLink(intent);
        if (link != null) web.loadUrl(link);
    }

    private static String siteLink(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        return uri != null && HOST.equals(uri.getHost()) ? uri.toString() : null;
    }

    private void openElsewhere(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            // nothing on the phone can open it; stay put
        }
    }

    /** The phone switched between light and dark: tell the page, so the Auto look follows it straight away. */
    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (web != null) web.evaluateJavascript("window.GM && GM.applyTheme && GM.applyTheme()", null);
    }

    private boolean isNight() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        visible = false;
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        visible = true;
        web.onResume();
        GameCheckService.ensureScheduled(this);  // puts the 15-minute check back if Android dropped it
        PushService.fetchToken(this);            // this phone's address for instant notifications
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 7 && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    private void askForNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED
            && !getSharedPreferences(GameCheckService.PREFS, MODE_PRIVATE).getBoolean("asked", false)) {
            getSharedPreferences(GameCheckService.PREFS, MODE_PRIVATE).edit().putBoolean("asked", true).apply();
            runOnUiThread(() -> requestPermissions(new String[] { "android.permission.POST_NOTIFICATIONS" }, 1));
        }
    }

    /** Back (button or swipe) goes to the game first: it closes a pop-up, steps back to the last menu page, or on the
     *  home screen asks whether to quit (GM.back() in app.js). Only if the page can't answer does Android's usual
     *  back happen. Android 13+ apps targeting new versions get back through OnBackInvokedCallback, not onBackPressed. */
    private void handleBack() {
        web.evaluateJavascript("window.GM && GM.back ? GM.back() : 'native'", result -> {
            if (result != null && result.contains("handled")) return;
            if (web.canGoBack()) web.goBack();
            else finish();
        });
    }

    @Override
    public void onBackPressed() {
        handleBack();
    }

    /** What the web app can ask of the phone. Adding methods here needs a new APK, so the site checks they exist first. */
    private class Bridge {
        /** Opens Android's native share sheet. */
        @JavascriptInterface
        public void share(String text) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(send, "Share"));
        }

        /** The app's build number, so the site can tell players when a newer APK is worth downloading. */
        @JavascriptInterface
        public String channel() {
            return BuildConfig.CHANNEL;  // "play" or "sideload"
        }

        /** Whether this build has Play Games achievements (the Google Play version). */
        @JavascriptInterface
        public boolean pgsAvailable() {
            return Achievements.AVAILABLE;
        }

        /** Sends Play Games achievement progress: a JSON object of badge name -> steps so far (or 1 for earned). */
        @JavascriptInterface
        public void pgsUpdate(String progressJson) {
            Achievements.update(MainActivity.this, progressJson);
        }

        /** Play Games sign-in, for Settings: "Signed in as …" or why not. */
        @JavascriptInterface
        public String pgsStatus() {
            Achievements.checkSignIn(MainActivity.this, false);   // refreshes it for next time
            return Achievements.status();
        }

        /** Asks the player to sign in to Play Games (the Sign in button). */
        @JavascriptInterface
        public void pgsSignIn() {
            Achievements.checkSignIn(MainActivity.this, true);
        }

        /** Submits a score to the Play Games leaderboard with this name. */
        @JavascriptInterface
        public void pgsScore(String boardName, double score) {
            Achievements.score(MainActivity.this, boardName, (long) score);
        }

        /** Opens Google's leaderboards screen. */
        @JavascriptInterface
        public void pgsBoards() {
            Achievements.showBoards(MainActivity.this);
        }

        /** Sends Play Games Game Stats events: a JSON array of {name, props}. */
        @JavascriptInterface
        public void pgsStats(String eventsJson) {
            Achievements.stats(MainActivity.this, eventsJson);
        }

        /** Opens Google's achievements screen. */
        @JavascriptInterface
        public void pgsShow() {
            Achievements.show(MainActivity.this);
        }

        @JavascriptInterface
        public int version() {
            return BuildConfig.VERSION_CODE;
        }

        /** Whether the phone is in dark mode. The app's own window style is always dark, so the page can't rely on
         *  prefers-color-scheme inside the app; the Auto look asks this instead. */
        @JavascriptInterface
        public boolean nightMode() {
            return isNight();
        }

        /** Turns on notifications for this player (checked every ~15 minutes). The first time, Android 13+ asks
         *  whether the app may send them. */
        @JavascriptInterface
        public void watchGames(String user, String url, String key) {
            try {
                setInbox(new org.json.JSONObject().put("url", url).put("key", key).put("rpc", "app_inbox")
                    .put("args", new org.json.JSONObject().put("p_user", user)).toString());
            } catch (org.json.JSONException e) { /* can't happen */ }
        }

        /** The general form: {url, key, rpc, args}. The server function returns [{id, title, body, link}], so the
         *  site can change what gets notified without a new APK. */
        @JavascriptInterface
        public void setInbox(String configJson) {
            GameCheckService.configure(MainActivity.this, configJson);
            askForNotifications();
        }

        /** This phone's Firebase push token ("" until Firebase has handed one over), for the site to register. */
        @JavascriptInterface
        public String pushToken() {
            return PushService.token(MainActivity.this);
        }

        /** How notifications are doing: permission, whether the check is scheduled, and what the last check found. */
        @JavascriptInterface
        public String notifyStatus() {
            return GameCheckService.status(MainActivity.this);
        }

        /** Sends a sample notification (with the whistle), to test sound and permission. */
        @JavascriptInterface
        public void testNotification() {
            GameCheckService.test(MainActivity.this);
        }

        /** Checks the server for anything to notify about right now (and shows it even though the game is open). */
        @JavascriptInterface
        public void checkNow() {
            new Thread(() -> {
                try { GameCheckService.check(MainActivity.this, true); }
                catch (Exception e) { GameCheckService.note(MainActivity.this, "error: " + e.getClass().getSimpleName(), -1); }
            }).start();
        }

        /** Asks for notification permission again (Android only asks once; after that it's the phone's settings). */
        @JavascriptInterface
        public void askNotifications() {
            if (Build.VERSION.SDK_INT >= 33) runOnUiThread(() -> requestPermissions(new String[] { "android.permission.POST_NOTIFICATIONS" }, 1));
        }

        /** Whether notifications are allowed (so the site can offer a button to switch them on). */
        @JavascriptInterface
        public boolean notificationsAllowed() {
            return Build.VERSION.SDK_INT < 33 || checkSelfPermission("android.permission.POST_NOTIFICATIONS") == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }

        /** Opens this app's notification settings. */
        @JavascriptInterface
        public void openNotificationSettings() {
            Intent i = Build.VERSION.SDK_INT >= 26
                ? new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())
                : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
            startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }

        /** Colours the strips behind the status and navigation bars to match the page (e.g. the light look or a club's
         *  colours), with dark icons on light colours. */
        @JavascriptInterface
        public void setBars(String hex, boolean darkIcons) {
            runOnUiThread(() -> {
                try {
                    int c = android.graphics.Color.parseColor(hex);
                    frame.setBackgroundColor(c);
                    web.setBackgroundColor(c);
                    if (Build.VERSION.SDK_INT >= 30) {
                        int bits = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                        getWindow().getInsetsController().setSystemBarsAppearance(darkIcons ? bits : 0, bits);
                    }
                } catch (IllegalArgumentException e) { /* not a colour */ }
            });
        }

        /** Closes the app (after the page has asked "are you sure?"). */
        @JavascriptInterface
        public void quit() {
            runOnUiThread(MainActivity.this::finish);
        }

        /** Keeps the screen on (e.g. during a live Draft Duel). */
        @JavascriptInterface
        public void keepAwake(boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        /** Shares a picture (a PNG as a data: URL or base64), e.g. an image of your XI, through the share sheet. */
        @JavascriptInterface
        public void shareImage(String png, String text) {
            try {
                String b64 = png.contains(",") ? png.substring(png.indexOf(',') + 1) : png;
                File dir = new File(getCacheDir(), "share");
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, "goal-machine.png");
                try (FileOutputStream o = new FileOutputStream(f)) { o.write(Base64.decode(b64, Base64.DEFAULT)); }
                Uri uri = Uri.parse("content://" + getPackageName() + ".share/goal-machine.png");
                Intent send = new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, uri)
                    .putExtra(Intent.EXTRA_TEXT, text == null ? "" : text).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(Intent.createChooser(send, "Share"));
            } catch (Exception e) {
                share(text);
            }
        }

        /** What this build can do, so the site can switch features on: e.g. "review,update,pgsAuth,buzz,links,shortcuts". */
        @JavascriptInterface
        public String features() {
            return (PlayExtras.AVAILABLE ? "review,update,pgsPlayer,pgsAuth," : "") + "buzz,links,shortcuts,events";
        }

        /** Asks Google Play for the "Enjoying Goal Machine?" review card (Play decides whether it shows). */
        @JavascriptInterface
        public void askReview() {
            PlayExtras.review(MainActivity.this);
        }

        /** Checks Play for a newer build (event "update"); with start set, begins downloading it in the background. */
        @JavascriptInterface
        public void checkUpdate(boolean start) {
            PlayExtras.checkUpdate(MainActivity.this, start);
        }

        /** Installs a downloaded update and restarts the app. */
        @JavascriptInterface
        public void completeUpdate() {
            PlayExtras.completeUpdate(MainActivity.this);
        }

        /** The Play Games player id (event "pgsPlayer"). */
        @JavascriptInterface
        public void pgsPlayer() {
            PlayExtras.playerId(MainActivity.this);
        }

        /** A server auth code for the signed-in Play Games player (event "pgsAuth"), for a server to verify. */
        @JavascriptInterface
        public void pgsServerAuth(String serverClientId) {
            PlayExtras.serverAuth(MainActivity.this, serverClientId);
        }

        /** A haptic: "tick" (a light tap), "click", "confirm" (something good), "reject" (something bad), "heavy",
         *  or "win" (a little pattern). Follows the phone's touch-feedback setting. */
        @JavascriptInterface
        public void buzz(String kind) {
            runOnUiThread(() -> {
                try {
                    if ("win".equals(kind) || "heavy".equals(kind)) {
                        android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                        if (v == null || !v.hasVibrator()) return;
                        long[] pattern = "win".equals(kind) ? new long[] { 0, 40, 60, 40, 60, 120 } : new long[] { 0, 90 };
                        if (Build.VERSION.SDK_INT >= 26) v.vibrate(android.os.VibrationEffect.createWaveform(pattern, -1));
                        else v.vibrate(pattern, -1);
                        return;
                    }
                    int c = HapticFeedbackConstants.VIRTUAL_KEY;
                    if ("tick".equals(kind)) c = Build.VERSION.SDK_INT >= 21 ? HapticFeedbackConstants.CLOCK_TICK : HapticFeedbackConstants.VIRTUAL_KEY;
                    else if ("confirm".equals(kind)) c = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.VIRTUAL_KEY;
                    else if ("reject".equals(kind)) c = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;
                    web.performHapticFeedback(c);
                } catch (Exception e) { /* no vibration on this phone */ }
            });
        }

        /** Whether Goal Machine links open in the app: "verified", "off" or "unknown". */
        @JavascriptInterface
        public String linksStatus() {
            return linkState();
        }

        /** Opens Android's "Open by default" page for this app, where the player can let it open its links. */
        @JavascriptInterface
        public void openLinkSettings() {
            Intent i = Build.VERSION.SDK_INT >= 31
                ? new Intent(Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS, Uri.parse("package:" + getPackageName()))
                : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
            try { startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
            catch (ActivityNotFoundException e) { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
        }

        /** Reloads the site after the offline screen. */
        @JavascriptInterface
        public void retry() {
            web.post(() -> web.loadUrl(failedUrl));
        }
    }
}
