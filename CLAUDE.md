# Working notes for Claude sessions

This repo is mostly **Goal Machine** (`goal-machine/`), a Premier League XI-draft game. It is a static PWA served by
GitHub Pages at https://opportunisticgames.github.io/goal-machine/, with an Android WebView wrapper (`android/`).
The root `index.html` is the Opportunistic Games studio page (contact opportunisticyp@gmail.com), which Google Play
uses as the developer website (verified in Google Search Console). `goal-machine/README.md` describes every
game mode for players; this file is about how to work on it.

## Rules the owner has set
- Work on branch `claude/premier-league-guessing-game-dz6inz`. Open a PR to `master` and **merge only when the owner
  says so** (they usually reply "merge"). If the branch's last PR is already merged, start the branch again from `master`.
- The remote is `OpportunisticGames/opportunisticgames.github.io`. Sessions sometimes point `origin` somewhere else, so
  before pushing run `git remote set-url origin https://github.com/OpportunisticGames/opportunisticgames.github.io`.
- **Player feedback:** Settings → Report a bug or suggest something saves to the `feedback` table (kind, body, name,
  meta with version/build/phone/page, done). At the start of a session, read the rows where `done` is false, file
  them into the banks and set `done = true`.
- **Read every message from the owner before building.** They often send a follow-up straight after (more detail, a change
  of mind): re-read the latest messages before starting work and before calling something done, and fold them in first.
- **Bug and idea banks:** `notes/BUGS.md` and `notes/IDEAS.md`. When the owner reports a bug, log it and fix it
  straight away, then move it to *Fixed* with the version. When they share an idea, log it (with their words and
  our notes and questions) and **discuss it, don't build it** until they say go. Read both at the start of a session.
  While we're working on one part of the game (say CHAOS), the owner's ideas for that part go straight into the
  current update (log them, then build them with it); only ideas for other parts wait in the bank.
- No personal names in the app, the address or the copy. The one exception the owner asked for: affectionate parodies of real managers as
  the head coaches in Dodgy Owner and Reign Check (Pep Cardigola, José Moaninho and friends). No AI model names in commits, PRs or files.
- **Secret games** (`js/secret.js`): locked knock-offs unlocked by doing something (Reign Check, Hat-Trick, Goal Royale).
  The owner's tester link `#/tester?code=owner-test-2026` unlocks them all on that device for play-testing.
- **Build visuals properly, with the tools we have** (the owner asked for this): anything that moves or celebrates uses
  real animations, not emoji or plain CSS stand-ins. Search LottieFiles (its MCP) for characters and objects, download
  them with `candidates.json` + the `lottie.yml` workflow, preview with `tools/lottie_preview.html`, pick, credit; use the
  PixiJS effects layer (`GM.FX`: particles, light, weather) for sparks, confetti, snow, smoke; real sounds via
  `fx/sfx/wanted.json` + `sounds.yml`; music as `audio.js` TRACKS. Plain CSS is fine for cheap background layers (like
  the falling snow on the menus), but the moments people notice should be the real thing. Always keep the Calm fallback.
- Write plainly in the owner's British English (the game's tone: short, friendly, football-y).
- Every release: add an entry at the top of `GM.UPDATES` in `js/updates.js`, then run `python3 tools/bump_version.py`
  from `goal-machine/` (it bumps every `?v=` in `index.html` and the service worker cache). `v` = the next cache
  number; `label` = the version players see, in three levels: **5.0** a big change to how the game plays, **4.10**
  new features or modes (4.9 → 4.10 → 4.11), **4.10.1** bug fixes and polish only (the Updates page folds these into
  the release they patch).
- **Announce feature releases:** after merging a release with a new mode or a big feature (4.10, 5.0, not fix-ups),
  insert one row into `announcements` (title, body, link to the new thing, e.g. `…/goal-machine/#/updates`).
  Players with "New game modes" on get it as a notification within ~15 minutes (once, for 3 days).

- **Badges are Google Play Games achievements (and scores, stats: `GM.pgsRecord`, `GM.pgsStat`, see `notes/PLAY_GAMES.md`).** There are 100 (`A` in `js/collection.js`; plan and points in
  `notes/BADGES.md`). The Play app matches them **by name**, so a badge's name must be exactly the achievement's name
  in Play Console (`android/store/play-achievements/`). Hidden badges (`secret`) are hidden achievements, and Play can't
  delete a published achievement or change hidden/visible, so **don't add or rename a badge without telling the owner**:
  a new one needs its achievement made in the console first (points: mostly 5, the total cap is 2,000). The app unlocks
  on a new badge (`GM.pgsUnlock`) and re-sends every earned badge when it opens (`GM.pgsSync`); Java is
  `android/app/src/play/.../Achievements.java` (the sideload APK has a do-nothing copy).

## Code map (`goal-machine/js/`, plain scripts on a global `GM`, no build step)
- `core.js` – shared helpers: storage (`GM.store`, keys prefixed `gm:`), seeded RNG (`GM.rng`), avatars and photo
  caching (`GM.avatar`, `GM._ph`), modals and notices, the leaderboard client (`GM.lb`: `top`, `mine`, `submit`),
  the in-game 🏆 pop-up (`GM.lbButton`, `GM.lbModal`, `GM.lbYou`), `GM.APP_MIN_BUILD`, accounts, backups.
- Offline and backups (core.js): `GM.net` (`online`, `ping`, `msg(what, fallback)` = the go-online card for a page's "couldn't load" spot, the 📶 strip `#net-bar`); every server call goes through `GM.lb._f` so a failure marks the phone offline; scores made offline wait in `gm:lbQueue` (`GM.lb.flush`). `GM.backup`: `GM.store.set` marks data changed, backs up 2 min later and when the app is hidden; `GM.backup.check()` (once a launch, on the tabs) offers a newer cloud backup (Android's own auto-backup can restore an old copy of the WebView data on a reinstall).
- `app.js` – the router (`#/path?query`), the tab bar (Play · Today · Online · Ranks · 🎒 Locker), the top bar on the tabs'
  pages (`GM.statusBar`: picture, level, season tier, 🎁 `GM.toOpen()` sheet of packs/spins/picks/new kit), Home (with
  sub-tabs), Settings, Ranks (`leaderboard()`), About, the CHAOS look (`GM.chaosLook`). Old addresses map into tabs:
  `#/album`, `#/packs`, `#/season` all draw the Locker tab (`TAB_OF`).
- `draft.js` – the draft engine for every XI mode (Ultimate, Classic, Extreme, Purist, Target, Treble, Mystery, Club,
  Daily, CHAOS). `RULES`, `WILDCARDS`, CHAOS `EVENTS`, seasonal CHAOS `SZ_CHAOS` (per season: 2 wildcards keyed `sz_*` that play as an
  existing kind (`as:` for modifiers), 3 moments, colours via `body[data-cz]`; `S.sz` fixed at kick-off and carried by challenges; `inSz` gates them; `SZ_MGRS`: characters (3 offered a game) as
  `MANAGERS['szm_*']` = a real manager's rules (`base`, `mgrIs` matches it) with their own name/look/text, offered instead of the real ones; all of it only in the Seasonal CHAOS mode (`m=szchaos`, `RULES.szchaos`, its own board `szchaos`), which is
  deliberately wilder through its cards, not flat doubling (seasonal coin cards `as:'coin'` ×3 or ×0, meter ×1.5, storms 20%, Hard works) while normal CHAOS stays normal; its look on the pitch is `czDeco` (`DECO`: cobweb/pumpkin stills, bats/ghost/witch flying over, `.cz-deco`) and the weather `SZ_WX` (never sunny at Halloween); the wild moments are factories in `WILD`
  (steal, transfig, merge, ghost12, flip, werewolf, drain, potion, scared, rise, hidden, trick, bonus) dressed per season in `SZ_WILD`; `SZ_MGRS` has ten a season;
  full time calls rewards.js `GM.szChaosDone` (season XP, the `szchaos` mission that's always one of the three, Locker titles `src.szc`)), reel generation (`makeReels`, seeded, so the same seed = the same
  game), scoring (`scoreFor`), rendering. The pitch is sized at kick-off by `fitPitch()` (shrunk mid-game if the page would scroll, grown back into empty space, reset on a new game; last resort `zoom` on `#app`: a game is always one screen; `.cz-deco` is fixed and clipped so it can never add scroll); everything under it sits in a
  fixed-height `.dock` so the layout never jumps. `render()` only draws while its own game is on screen.
- `challenge.js` – friend challenges (`GM.challenge`): `#/c?id=CODE` (landing, `&p=` head-to-head, `&watch=` watch along), `#/rival?name=`; the draft keeps `S.ch` (the challenge you're playing), `S.prog` ([signed, total] after each signing), `S.picks`; tables `challenges` / `challenge_plays`, RPCs `challenge_create/_get/_start/_progress/_react/_history/_mine/_send` (`_send` sends yours to app friends: `challenge_invites`, pushed as `cm:`) (`_mine` feeds the Online tab's ⚔️ Challenges sub-tab (`#/challenges` redirects there) and the in-app card), inbox items and push on new plays, results, reactions and rematches.
- `online.js` – online games with friends: the hub (sub-tabs Games / Finished / League / Friends), Draft Duel,
  Scout Duel (card hand + bonus cards), Live Race and its variants Target Race and CHAOS Race (race = both play the
  same seed; the variant picks the draft mode), the opponent live feed in races, the weekly league, notifications.
- `market.js` – Moneyball, Transfer Window, Auction (online + pass-and-play).
- `hattrick.js` – 🃏 Hat-Trick: football Spades (cards: number/suit/name on the edge strip, the player's face on the card; tap to preview with ▶ Play; offline card strength `ht:stat`), you + a computer partner v two computer rivals. `deal`
  (52 players, 4 suits, ⭐ Legends are trumps), `legal`, `winning`, `cpuBid`, `cpuPlay`, Spades scoring (bags = 🟨,
  10 = −100), first to 250. Menu: opponents Easy/Medium/Hard (`ht:level`), card numbers shown/hidden (`ht:hidden`, hidden scores go to `hattrickh`). Saved in `ht:save`. Dark card-table look via `body.ht-mode`; sounds `card`, `trickwin`, `tricklose`. Board: winning margin.
  Two jokers (`Jsub` wins the trick, `Jvar` gives it to the lowest of the suit led; playable any time, not as a lead); the lowest Defender and Midfielder make way. Cards: kit per suit, number/suit/name in the left strip (`.htc-edge`) so a fanned hand reads. Online (`GM.hattrickOnline`): a duel room with variant `hattrick`; only the humans' moves are stored ({t:'b',n} / {t:'p',c}, s = host/guest), and `replay` rebuilds the game from the room seed with the computers (seats 2, 3) on the never-random Hard play, so both phones agree. The final mover posts both team scores (p_all) and gm_finalise gives the higher 100–0.
- `chaosart.js` – CHAOS artwork (`GM.CFX`): drawn scenes over the pitch for events (`play`), wildcard flourishes (`wild`),
  the weather (`WEATHER`, set per game at kick-off), extra sprites and drawn leftovers. Calm mode skips the scenes.
- Seasonal CHAOS's in-game music: `audio.js` `SZ_TRACK` (halloween → `spookychaos`, christmas → `festivechaos`, else `chaos`), scene `szchaos`; they build with the meter like CHAOS.
- `fx.js` – the effects layer for every game (`GM.FX`): a PixiJS canvas over the page for particles and light
  (`sparks`, `smoke`, `flare`, `burst`, `lightning`, `vortex`, `twister`, `rain`, `confetti`, `money`, `fireworks`…) and
  `GM.FX.lottie(name, …)` for LottieFiles animations in `fx/lottie/` (credits in `fx/lottie/credits.json`, shown on the
  credits page). The libraries (`js/vendor/`) load on first use; `GM.FX.on` is false in Calm mode or without WebGL, so keep a
  fallback. Canvas at resolution 1 (sharper cost too much on phones). **Getting Lottie files:** sessions can search
  LottieFiles (its MCP) but not download, so list candidates in `fx/lottie/candidates.json` and push: the `lottie.yml`
  workflow downloads them into `fx/lottie/cand/`; preview with `tools/lottie_preview.html?n=a,b`, copy the picks out, add credits, empty the list, delete `cand/`.
- Recorded sounds: `fx/sfx/*.mp3` (credits in `fx/sfx/credits.json`); `audio.js` `REC` maps a sound name to a recording,
  loaded by `GM.sound.recordings(true)` (CHAOS at kick-off); the synthesised sound plays until it's loaded. **Getting more:**
  add `key: [max seconds, search terms…]` to `fx/sfx/wanted.json` and push: `sounds.yml` runs `tools/fetch_sfx.py`, which
  searches Wikimedia Commons and OpenGameArt (free licences only, spoken pronunciations skipped) and commits trimmed,
  level-matched candidates with spectrograms to `fx/sfx/cand/`. Pick by title and spectrogram, copy to `fx/sfx/<key>.mp3`,
  add the credit, delete `cand/`.
- Manager portraits: `fx/mgr/<key>.jpg` (free-licence Wikipedia photos, 320px) with face positions in `fx/mgr/credits.json`, fetched by
  `managers.yml` / `tools/fetch_managers.py` (add the article to `ARTICLES` for a new manager); shown by `GM.CFX.faceImg`.
- **Levels (5.34):** `GM.LEVELS` easy/normal/hard/extreme. Easy (draft games in `GM.EASY_MODES` only): reels weighted by
  √fame (big names about ×4; Target games fame^1.2), clues shown, boards `<key>e`, not in Best Players (`gm_main_board`)
  or the Ultimate/CHAOS badges; it travels in the seed (`e~…`, `GM.seedEasy`), so challenges/races/share links match.
  `GM.levelKey(k)` = the board at your level. Classic (`classic`, `classicwild`) is retired from the menus (old links work).
- 5.33 bits: `GM.lbList(rows, o)` (core.js) draws every board (podium, pictures via `GM.isFriend`, ▲▼ from `gm:lbSeen`);
  nation cards in packs.js (`GM.isNo1`, `GM.NATION_SETS`, `checkSets` pays a Nations pack, Packed XI `bonus`); CHAOS
  moment `visa` sets `S.passNat` + `S.forceSpecial = 'passport'` (a `deal: false` wildcard); Hat-Trick fusion
  (`fusedName`, `fusedFace`, `fuseFx` in draft.js); renewables in prizes.js (`GM.CONSUM`: freeze/boost/scout,
  `gm:consum`, `GM.freezeCheck` in daily.js, season bonus tiers every 1,000 XP after tier 30 in rewards.js).
- `locker.js` – 🎒 the Locker tab (`GM.lockerHub(root, {v})`: views `season` (rewards.js `GM.seasonPage`), `xi`/`cards`/`signed`/`badges`
  (collection.js `GM.albumView`) and `kit`, what you wear). Future seasons' and unstarted events' items stay hidden (`GM.lockerSecret`).
  The kit (`GM.LOCKER`, 64 items): pitch styles (`body.pk-*`), card backs (`body.cbk-*`), celebrations + horns
  (`GM.celebrate()` on a new best / challenge win), frames (`.fr-*` on pictures) and titles (`GM.titleHtml(name)`) that others
  see (server `players.flair`: `set_flair`, `get_flair`, fetched with the pictures), challenge reactions, Dodgy Owner owners
  (`OWNERS.celeb/trust` have `locked`). Each item's `src` says how you get it (lvl, season tier, missions, badges, club
  dailies, login); `GM.lockerCheck()` hands out what you've earned. A new item = one line in `L` (+ CSS for its look).
- `prizes.js` – 🎁 one way to give any reward (`GM.grant({pack|item|xp|spin|vault|choice})`), the level road
  (`GM.levelReward(n)`), the prize wheel (`#/spin`, `WHEEL`), pick-one-of-three (`GM.pickReward`), a pack's bonus slot
  (`GM.packBonus`, always in a 🌟 Legendary pack), the vault (`GM.vaultItems`: vault-only items, past seasons' (`src.s`
  earlier than now) and finished events'), and events (`EVENTS`: dates, a 10-tier track; items have `src.event` + `tier`;
  `gm:eventPeek` = an event id shows it early, for testing). New season items: add `src: { season: tier, s: 'YYYY-MM' }`.
- `rewards.js` – 🏆 seasons (`GM.gmSeason()`; not `GM.season`, which formats a PL season like 2008/09) (`SEASONS`: each month's name, icon, theme `html.sz-<theme>` (a slim band along the top in its colours, never emoji; tints; the falling layer is drawn SVG shapes; the wheel's `WHEEL_LOOK` in prizes.js), menu music
  (`audio.js` TRACKS: spooky, champions, festive, easter), Lottie visitors on Home (`VISIT`: sleigh, snowman, gift, ghost, witch, spider (`dangle`s from the Halloween `.sz-corner` cobweb), bat,
  batmoon, pumpkin, bunny, eggs, fireworks, sun, stopwatch, flags, trophy) and items (locker.js `src.s`); a calendar month; all XP also fills a 30-tier track, `GM.seasonXP`), weekly missions (on the Today tab: `GM.missionsHtml`, `GM.loginHtml`; three
  a week from `POOL`, counted by `GM.track(event)` calls in the games), login rewards (`GM.loginCheck`), `#/season`.
- `promo.js` – the Home banner: matchday, the newest feature releases from the last 3 weeks (an entry's `promo` list, or a slide made from its title), a challenge waiting for you, a daily "Try today" game (`TRY`), news from `announcements`. Give a feature release a `promo` entry to choose its slide.
- `modes.js` – quick games (Club Hopper, Higher or Lower, Who Am I?, Club Grid, Guess the Tally); `h2h.js` – pass-the-phone series.
- `daily.js` – Today page, Footle, daily streaks. `collection.js` – Album, badges, Dream XIs. `report.js` – full-time report.
- `picture.js` – share-a-picture of your XI: `GM.screenPicture` copies the pitch on screen (html-to-image, `js/vendor/`, loaded on first use) into a framed PNG; the drawn `GM.teamPicture` is the fallback. `audio.js` – synthesised sound + music. `updates.js` – changelog.
- Data: `data/players.js` (2,039 players with 50+ apps), the full list is loaded on demand; built by `tools/build_players.py`,
  then `tools/clean_sheets.py` adds keepers' clean sheets (column 13; CHAOS counts one goal per three).

## Backend (Supabase project `tberlvceqqspgwlfzisy`)
Everything goes through security-definer RPCs that check the account with `gm_auth(p_user, p_key)`.
- Accounts and scores: `claim_name`, `submit_score`; the public `best_scores` view feeds the leaderboards.
- Online: `online_create` (kind `race` / `duel` / `auction`, optional `p_variant`: `scout`, `target`, `chaos`),
  `online_join`, `online_get`, `online_move`, `online_bid`, `online_resign`, `online_games`, `online_waiting`,
  friends (`online_friends`, `online_add_friend`, `online_remove_friend`), `friends_week` (league).
- Quick match: `quick_match(p_user, p_key, p_kind, p_stat, p_variant)` joins the oldest open `quick` room of that game
  from the last 30 minutes, reuses your own waiting one, or opens one (max 3); no auto-befriend. Turn-by-turn games
  offer the computer (Hat-Trick) or a solo draft after a minute (`QM_WAIT` in online.js); races wait for an opponent too.
  The app plays one game a day for everyone (`QM_DAYS` in online.js, by UTC day, always goals) so nobody's queue is split;
  the server accepts race (plain/chaos/target) and duel (plain/hattrick/scout).
- `gm_finalise` decides results once both players are done: races 50/30/20 (total / rating / speed), duels and
  auction 60/40, Target Race = closest (`d`) wins 100–0, CHAOS Race = most CHAOS points (`c`) wins 100–0.
- Names: `gm_name_ok` (offensive-word filter, used by `claim_name`, `rename_account` and `name_available`, which returns
  null for a banned name), `report_name` (3 reports hide a name from `best_scores` / `daily_board` via `players.name_hidden`),
  `name_status`, `rename_account` (moves scores, friends, rooms and backup to the new name).
- **Instant push (Firebase Cloud Messaging, project `opportunistic-games`):** phones register with `set_push_token`
  (token + their notification choices, `push_tokens`). Triggers on `rooms` and `friends` call `gm_push`, which posts
  (pg_net, shared secret in `private_config`) to the Edge Function `push`: for each phone it asks `app_inbox` and
  pushes new game/result/friend/challenge items once (the `push` function's id filter must list every kind) (`push_sent`). Needs the `FCM_SERVICE_ACCOUNT` Edge Function secret. The
  app's `PushService` shows them (same ids as the 15-minute check, so never twice). Reminders stay with the check.
- Notifications: `app_inbox(p_user, p_prefs, p_state, p_tz)` returns what the Android app should notify about. The app
  sends the player's choices from Settings (`GM.notify`: move, friends, results, modes, streak, comeback, daily time),
  their daily streak and time zone. **To announce a new game mode**, insert a row into `announcements` (title, body,
  link): every app with "New game modes" on shows it once, for 3 days.
- **Beaten alerts, the 🔔 and Best Players (5.32):** `submit_score` checks, before saving, whether the score takes someone's
  top spot (all time, else this month; boards without a `:`); if so it writes an `activity` row for them (`beaten`, at most
  one an hour per board, pushed via `gm_push`, shown by `app_inbox` as `b:<id>`, pref `beaten`) and a `crown` row for you.
  `activity_feed(p_user, p_key)` feeds the 🔔 drawer (`GM.feed`, `GM.feedSheet` in app.js: items, `crowns`/`mcrowns`,
  `best`/`mbest`). `best_players(p_month, p_limit)` = points 10/7/5/4/3/2/2/1/1/1 for top-ten places on the main draft
  boards (`gm_main_board`), best 8 count; Ranks tab `bestplayers`. Board names for alerts: `gm_board_name`.
  At full time `GM.boardNews` (core.js, after the submit; `GM.lb.mine(mode, name, month)`) works out your place: a 👑 record, a
  "Top N" (`GM.BOARD_TIERS`, only if the board has 2N+ players) or just the place; it fires `gm:board` and draft.js shows it in
  the result card (`#board-news`, `GM.boardNewsHtml`); screens without that slot get a `GM.notice` card.
- **5.33:** `player_profile(p_name, p_me)` (profile.js `GM.profile`; tap any `.lb-row[data-name]` or `[data-profile]`), scores'
  meta carries `xi` (names) and `mgr`; `claim_referral(p_user, p_key, p_ref)` + `referrals` table (?ref=NAME links,
  `GM.invite`, both get a `referral` pack, made friends, `activity` kinds `referral`/`referral_in`; the inviter's pack is
  handed out by `GM.feed.load`, remembered in `gm:refGot`).
- Also: `save_backup` / `load_backup`, `delete_account`, avatars
  (`set_avatar`, `get_avatars`, `report_avatar`).
Change SQL with the Supabase MCP tools (`apply_migration`); read a function first with `pg_get_functiondef`.

## Android app (`android/`)
`MainActivity.java` hosts the site in a WebView and exposes a JS bridge (called safely from the web with
`GM.app('fn', ...)`); `GameCheckService.java` polls `app_inbox` for notifications. Pushing changes under `android/`
runs `.github/workflows/android.yml`, which builds a signed APK and publishes a release (`versionCode` = run number).
Raise `GM.APP_MIN_BUILD` in `core.js` only when the web code needs a newer app; players below it see an update prompt.
Build 57+ (5.25) tells the site what it can do: `AndroidApp.features()` → check with `GM.appHas('buzz')`. Native haptics
(`buzz(kind)`: tick/click/confirm/reject/heavy/win, used by `GM.buzz`), the Play review card (`askReview`, asked by
`GM.native.happy()`), in-app updates (`checkUpdate`, `completeUpdate`), the links check (`linksStatus`,
`openLinkSettings`), Play Games player id and server auth code (`pgsPlayer`, `pgsServerAuth`). Replies come back as
`GM.appEvent(name, value)` (`GM.onAppEvent`). Play-only code lives in `PlayExtras.java` (the sideload copy does nothing).
Icon shortcuts are set in `MainActivity.shortcuts()`; notifications get a button by id (`GameCheckService.action`) and
reminders/news go to the quieter `reminders` channel.
Most changes are web-only and reach the app automatically.

## Testing
There's no unit test suite; test in a real browser with Playwright (Chromium is pre-installed in cloud sessions).
1. Serve the repo root: `python3 -m http.server 8765` from the repo root (it sometimes dies; just restart it).
2. **Run them with `node run.js`** from `goal-machine/tools/test/` (it starts the server if needed, runs 3 at a time, prints one
   summary with times and any failures; the full output of each goes to `lay/<name>.log`): `node run.js` = the quick set (a few
   minutes), `node run.js full` = everything, `node run.js chaos,cards` = just those. **The owner's rule: don't run the tests
   after every change.** Keep building; run them once, before merging (the full set, or the quick set plus the tests for
   what changed), and fix anything they find then. A quick look in the browser while building is fine.
   New tests: use `helpers.js` where the look doesn't matter: `fast(ctx)` (Calm on, the game's timers 10× faster) and
   `idle(pg)` (taps through CHAOS cards and waits for the spin, instead of fixed sleeps). Never `pg.click` a CHAOS card that
   may be mid-action without a short `{ timeout }`: Playwright waits 30 s for it to become tappable (that made the CHAOS tests
   take minutes). Or run one script on its own with `node <script>.js`. Each uses `mockserver.js`, which fakes the
   Supabase RPCs in memory (test accounts Alice/Bob/Cara), so nothing touches the real database.
   - `new534.js` – 5.34: Easy deals more big names, its own board key, travels in the seed, the four-level switch, Classic gone from the menus.
   - `new533.js` – 5.33: profiles, invites, the podium, nation sets and No. 1s, Visa trouble!, the Hat-Trick fusion, Streak Freeze, Double XP and the bonus tiers.
   - `record5321.js` – where your score landed: record all time / this month, Top 3/10 by board size, just the place on a small board, an older best, a daily board, and the line on a real full-time screen.
   - `beaten532.js` – two phones: a beaten alert in the inbox (and off with the switch), the 🔔 count and drawer, Bob's crown, Best Players points.
   - `offline531.js` – a newer cloud backup is offered once and restores, backing up on leaving the app, the offline strip and cards, scores kept and sent later. `offline.js` – the service worker opens the game from cache offline and on a hanging network.
   - `odds.js` – who turns up on the reels in every draft mode and difficulty, measured with the real dealing code (stars v average, each tenth of the pool, wildcard and storm rates). Check the How to play / Settings wording against it after changing a weight.
   - `sweep.js` – opens every page in light, dark and club themes: page errors and sideways overflow.
   - `races.js` – two phones play a Target Race and a CHAOS Race end to end.
   - `quickmatch.js` – pairing, no auto-friend, and the computer fallback after a minute.
   - `htonline.js` – two phones play Hat-Trick online to full time.
   - `hattrick.js` – 200 computer hands check the Hat-Trick rules, then a hand is played through the screen.
   - `features.js` – CHAOS formations, Target percentages, the Players filter, feedback and badges.
   - `cards.js` – every reel card fits, even with bigger text (`FS=130% node cards.js`).
   - `names.js` – rude names refused, reporting a name, a hidden name renamed, and no Soundtrack in the Play app.
   - `chaosnew.js` – keepers' clean sheets, the newer CHAOS wildcards and moments, leftovers, van Gaal and Conte.
   - `managers.js` – manager balance: a bot plays the same seeded CHAOS drafts with every manager (timers sped up) and
     compares average points (`node managers.js 150 "" 6`, ~25 min; `SIM_URL` points it at a frozen copy so you can keep
     editing). Keep every manager within about 5% of the average.
   - `chaosfx.js` – every CHAOS scene and wildcard flourish is drawn, weather, the parked bus, sacking, replay and the CHAOS picture.
   - `chaospixi.js` – the effects layer in CHAOS: Lottie vehicles and characters, PixiJS particles, the parked ambulance, Calm off.
   - `challenges.js` – friend challenges on three phones: send, ghost bar, watch along, head-to-head, reactions, rematch (best of three), group table, tally, rivalry page, CHAOS.
   - `allbadges.js` – every one of the 100 badges is earned through the calls the games make (a new badge needs a trigger here).
   - `szfull.js` – three whole Seasonal CHAOS games with the wild moments (steal, merge, hex…) forced in, each to full time.
   - `chaosseasons.js` – every season's CHAOS: kick-off line and colours, each seasonal moment and wildcard plays, no other season's leak in.
   - `layout527.js` – the 5.27 layout: the top bar and 🎁 sheet, the Locker tab's views and the old addresses that land in it, missions on Today, Online's Challenges sub-tab (390 and 360 px).
   - `rewards526.js` – the Locker and seasons: unlocks from what you've done, wearing styles, frames/titles seen by a friend, the season track, missions, login rewards, the locked owners.
   - `app525.js` – the app's extras with a pretend AndroidApp: haptics, Play updates, the links nudge and Settings row, the review card's timing, old builds untouched.
   - `fixes5232.js` – your challenges: the in-app card when someone takes yours on, the Online tab lists, `#/challenges`, the friend menu.
   - `fixes5231.js` – Make a Sub can be called off, the Joker becomes any wildcard, Benítez the Tinkerman halves a player.
   - `fixes5222.js` – the weather clears when it stops; the "Open in the app" bar on Android browsers and the ?go= hand-over.
   - `fixes5221.js` – Extreme hides clues, the full wildcard bag choice, the share picture, CHAOS resume order, weather at full time, bonus notes, badges on every level.
   - `szlook.js` – Halloween CHAOS's look: cobwebs and pumpkins on the pitch, flyers, no sun, Calm and leaving clear it, Hard hides the clubs.
   - `layout.js` – plays whole drafts and checks the pitch never changes size (`node layout.js "chaos:1,ultimate:0" 360x740`).
   Screenshots land in `./lay/` (ignored by git). Block photo hosts with `ctx.route(...)` to keep runs fast.
3. Tests set `gm:welcomed` and `gm:seenVersion` in localStorage so the welcome and What's New pop-ups stay out of the way.

## Things that tripped us up before
- The draft re-renders the whole screen on every tap: anything that must persist between taps (the race opponent
  bar, photo crops) is kept outside `render()`.
- Face-centred photos: crops are cached as percentages per photo URL, and dead photo links are remembered, so faces don't flicker.
- `best_scores` modes carry suffixes: stat (`ast`, `apps`) and Hard (`h`), e.g. `chaosh`, `ultimateasth`; dailies use `daily:YYYY-MM-DD`.
- The Play app (`GM.playSafe`) leaves out the premierleague.com / Transfermarkt photos and the 🎧 Soundtrack (the
  Epidemic Sound licence covers the website only).
- CHAOS scores are points (the XI total plus bonuses), not goals: label them `pts`.
