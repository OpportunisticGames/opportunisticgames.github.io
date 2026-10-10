package io.github.opportunisticgames.goalmachine;

/** The APK on GitHub isn't installed from Google Play: no review card, Play updates or Play Games. See the play version. */
final class PlayExtras {
    private PlayExtras() { }

    static final boolean AVAILABLE = false;

    static void review(MainActivity a) { a.event("review", "unavailable"); }

    static void checkUpdate(MainActivity a, boolean start) { a.event("update", "none"); }

    static void completeUpdate(MainActivity a) { }

    static void playerId(MainActivity a) { a.event("pgsPlayer", ""); }

    static void serverAuth(MainActivity a, String serverClientId) { a.event("pgsAuth", ""); }
}
