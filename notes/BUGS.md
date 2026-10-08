# 🐞 Bug bank

Bugs reported by the owner (or found along the way). **Bugs get fixed straight away**, then move to *Fixed* with the
version they shipped in. Newest at the top.

### Fixed in 5.22.1 *(owner, 8 Oct 2026)*
- Extreme drafts showed clubs, apps and years like Normal: Extreme now hides the clues like Hard (every player as before).
- A full wildcard bag sometimes threw a card away (storms) and sometimes refused: now it always asks (play it now / play one of yours first / swap).
- Share a picture of your XI drew its own 4-4-2 (wrong for other shapes): now it's the pitch on screen (html-to-image).
- Extreme Measures never unlocked: the main event and CHAOS on Extreme are modes of their own (extreme/purist/chaosx), not the Extreme flag. Quick-game badges on Extreme never counted either (hilox etc.). Both fixed; past Extreme drafts on your board count.
- Dodgy Owner's PB on Home was divided by 100 (an old scale), so it read 0 pts.
- A saved CHAOS game asked for a manager first and "carry on?" second.
- The weather kept going on the full-time screen and into the next game.
- Leaving a draft mid-pick could move the next game on a spin (the pick finished on the new game).
- Wrong person in a photo (Dean Richards showed a rugby coach): removed in 5.21; going through the older photos turned up 26 more
  people who only share a name (a bishop, a US senator, a Lieutenant Governor, a lion keeper, an NFL player, a meeting with
  Joe Biden…). All removed, and `data/photos_notme.json` stops the finder ever picking them again. The remaining ~3,800 photos
  found before the stricter checks go through a recheck run (photos.yml, recheck on).
- Photos that didn't fit the circle (Ingimarsson, Laursen): both found again by the new face finder (YuNet), with ~4,800 others.

### Fixed in 5.22 *(owner, 3 Oct 2026)*
- Marks on a player showed only a corner: the player boxes clip their edges, so marks and the parked ambulance now sit inside.
- The tornado's crooked players never showed: another transform on the card undid the tilt (now its own `rotate`).
- Tapping a moment skipped its animation and play stopped until it ended: now a tap moves it on, and play carries on during it.
- The Add songs action moved the CHAOS sound effects (fx/sfx) into the Soundtrack as 25 "songs": moved back, and it now leaves fx/ alone.
- Rain was lines across the pitch: now drops, ripples and clouds. Too many screen flashes and throbbing backdrops: cut right down.

## Open

| Reported | Bug | Status |
|---|---|---|

## Fixed

| Reported | Bug | Fixed in |
|---|---|---|
| 2026-10-02 | CHAOS: van Gaal + a Centurion Throw + Hat-Trick Hero = a guaranteed ×3 on a 100-goal striker in any slot | 5.18: van Gaal's any-position rule is off on themed spins; the Hat-Trick is its own spin now; the armband passes down in CHAOS |
| 2026-10-02 | The coin landed the moment you tapped it and CHAOS effects just appeared (battery saver turns on the phone's "reduce motion") | 5.18: the game's own Animations setting (Full by default) |
| 2026-10-02 | Cards showed the first club a player played for (Kane = Norwich, Rio = West Ham), not the club he's known for | 5.13.3: the card shows the club with the most Premier League seasons (`p.main`, worked out from the club stints; the first club if a player has none) |
| 2026-10-02 | Many players have Wikipedia pages but no photo in the Play app (it shows only the freely licensed Wikimedia photos, and the finder only looked at the 2,039 main-pool players, and only at an article's lead image) | Photo finder reworked (see below): everyone, lead image then Wikidata then other article images then a Commons search, 1,500 a run |
| 2026-10-02 | Play app: opening a pack, player names sat too low and were covered (fine in the Album and in a browser). Reproduced by scaling text 130%: the app's WebView follows the phone's text size, so card text outgrew the cards | 5.11.2 + app build: the app pins text zoom to 100%; the card grid also lets the photo and corner column shrink so the name always stays in place |
| 2026-10-02 | Pack opening: players' names were hard to read on the cards (light text on bronze and gold, the shine sat over the name) and long names were cut off | 5.11.1: dark ink, the shine sits under the text, names shrink to fit (a test checks all 2,000+ fit on a 360px phone) |
| 2026-10-02 | Pack cards: the COMPLETE label at the bottom was clipped by the card's shape | 5.11.1: a ✓ badge in the corner |
| 2026-10-02 | Small phones: tile icons overlapped tile titles, and wide tiles' corner icons sat on their first line of text | 5.11.1: smaller icons on narrow screens; wide tiles keep their text clear |
| 2026-10-02 | Small phones: "Appearances" didn't fit its stat button | 5.11.1: it says "Apps" |
| 2026-10-02 | Draft: the title ("👑 Ultimate Wil…") and the empty wildcards hint were cut off on a 360px phone | 5.11.1: the title wraps onto two lines; a shorter hint |
| 2026-10-02 | Goal Royale: long surnames ran into the edges of the small deck cards | 5.11.1: they shrink to fit |
| 2026-10-02 | International break: the bunting covered the top of the logo | 5.11.1: the page drops a little to make room |
| 2026-10-02 | Dodgy Owner: with Everton as your favourite club, Everton was always one of the three clubs to buy | 5.11: your club turns up about a third of the time |
| 2026-10-02 | Dodgy Owner: the live commentary flashed over and over (the whole screen redrew four times a second, replaying every line's animation) | 5.11: the screen's built once; only the numbers change, and new lines slide in once and stay |
| 2026-10-02 | Dodgy Owner: you could sell a player and instantly buy him back | 5.11: anyone you sell or release can't be signed again that season (and isn't in the search) |
| 2026-10-02 | Dodgy Owner: every player of the same OVR wanted exactly the same wage | 5.11: wage demands depend on fame (honours, big clubs) and the agent too |
| 2026-10-02 | Dodgy Owner: subs didn't show positions, and the coach never made subs in a live match | 5.11: position badges on every sub chip and on the pitch list; the coach makes his own changes around the hour unless you're meddling |
| 2026-10-02 | Dodgy Owner: you couldn't see what you'd paid for a player, so you couldn't tell if an offer was a profit | 5.11: paid (or value when you bought the club) on the squad list, the player sheet and every offer, with profit/loss |
| 2026-10-02 | Dodgy Owner: the shirt sponsor's other two options were unreadable (dark buttons on the paper card) | 5.11: readable paper buttons |
| 2026-10-02 | Dodgy Owner: no way to see if a player's value or rating was rising | 5.11: players develop (good runs of form lift their OVR, ▲/▼ shown; young players faster), and each player's value is charted through the season |
| 2026-10-02 | Dodgy Owner: the chosen half-time team talk turned grey, looking unchosen | 5.11: the chosen one is highlighted gold |
| 2026-10-02 | Found while building Dodgy Owner: toast messages sat on top of everything at the bottom of the screen and swallowed taps on the buttons underneath (the big Continue buttons, modal buttons) for a couple of seconds | 5.10: toasts let taps through |
| 2026-10-01 | Moneyball: signing a player after the week's matches had played (the market was still open) stuck the season: the screen went back to "Play matchweek", which did nothing, so week 8 never played | 5.9: the market and selling shut once the matchweek's played, and the button moves on to next week |
| 2026-10-01 | Moneyball: the Deadline Day clock took over six minutes to run down | 5.9: it runs down in about 40 seconds |
| 2026-10-01 | The Market tab's tiles were ragged: Daily Moneyball and the Auction each sat alone in half a row (should have been caught) | 5.9: Moneyball full width, the two small tiles side by side; a test now fails if any Home tab leaves a half-width tile alone |
| 2026-10-01 | Tapping Moneyball turned Home dark (Moneyball's boardroom look and music) without Moneyball appearing. Couldn't reproduce in testing: likely the Moneyball page failing to draw on that phone after the router had already switched the look | 5.9: a page that fails to draw now shows a "Something went wrong" screen with Reload, in the normal look; Home always resets the look and music whenever it draws |
| 2026-10-01 | In an international break the flag bunting sat on top of your club's stripe along the top edge, and the stripe showed through between the flags | 5.7.1: the bunting takes over the top edge for the break |
| 2026-10-01 | The leaderboards' difficulty only had Normal and Hard; Extreme boards were hidden in the version list | 5.7.1: the drop-down is Normal / Hard / Extreme, like Home |
| 2026-10-01 | Extreme only changed the Main event and CHAOS; the other games ignored it | 5.7.1: every player on the reels and markets in the Target games, Moneyball, the Transfer Window, Higher or Lower and Guess the Tally; in the name-typing games (Who Am I?, Club Grid, Club Hopper) any PL player counts at every level and Extreme turns suggestions off (owner's idea). Hard added to the money games. Own boards throughout; the dailies stay the same for everyone |
| 2026-09-30 | The Leaderboards menu had got too complicated: four rows of category buttons, a row of modes and three toggles before any scores | 5.7: one scrolling row of games, one line of drop-downs (version, stat, Normal/Hard, month), your position first; Club v club and Daily stars moved inside |
| 2026-09-30 | Pack cards weren't even: each card centred its contents, so a one-line name sat lower than a two-line one, and the last row wasn't centred | 5.7: new cards with a fixed layout (the same size and rows on every card), and the pack's cards centred in rows |
| 2026-09-30 | The Album didn't make sense after packs: the Packed XI had quietly replaced the Dream XI in a page that still said it was "players you've signed" | 5.7: the Album reworked into one hub (level and packs, My XI, Cards, Badges, Signed); it says the Packed XI replaced the Dream XI |
| 2026-09-30 | Found while building levels: a new player's first game asked for a leaderboard name twice (the draft's score, then the Packed XI's) | 5.6: the Packed XI only posts quietly if you already have a name |
| 2026-09-30 | Northern Ireland players showed the Union Jack: there's no emoji flag for Northern Ireland, so the GB code was used | 5.6: a small drawing of the flag the NI football team plays under (the Ulster Banner), everywhere flags show |
| 2026-09-30 | CHAOS: the Double or Nothing / All In coin did a weird shaky glitch instead of flipping. Its keyframes used different transform lists (a scale() only in the middle), so the browser blended them as matrices and the big spin came out as a wobble | 5.5: flipped frame by frame (up, end over end, back down on the right face) with 3D perspective and a shadow |
| 2026-09-27 | CHAOS Lightning strike always halved your top scorer and tripled your lowest, usually a 0, so it was nearly always a pure loss (the sponge and 5000–1 also boosted a 0) | 5.4.2: two random players (the ×3 one has scored); sponge and 5000–1 pick the lowest who has scored, or give bonus points |
| 2026-09-26 | CHAOS: the coin flipped itself (should be yours to flip); moments too quick to read; the event line under the reels overflowed ("ugly"); few sounds | 5.4.1: tap-to-flip coin; three-act moments (full-screen entrance with its own scene, action on the pitch, result); new sounds; tips only on the first go. A CSS filter on the landed coin also flattened its 3D so tails showed a mirrored HEADS: fixed |
| 2026-09-26 | Results spread charts topped out at 800+ (fixed bands), and CHAOS charted goals, not its points (often 800+) | 5.4: every score kept per mode, eight round-sized bands fitted to your range; CHAOS charts points |
| 2026-09-26 | Owner: dailies not refreshing (25th not lit, streak stuck at 1, Moneyball/CHAOS not replayable) | Not a bug: the server shows Daily Moneyball, CHAOS and Ultimate all played on the 26th and nothing on the 25th (last before that the 24th) |
| 2026-09-26 | A friend's phone said "Instant notifications: waiting for Google Play services" and got ~15 notifications at once from the 15-minute check. Only one phone had ever registered for instant pushes; the Firebase token request fails silently and was only retried when the app opened | 5.4 (needs the new app build): the failure reason is saved and shown in Settings, the background check keeps retrying, and more than 3 at once arrive as one summary |
| 2026-09-26 | CHAOS: everything happened at once (event, storm, meter, reels) and the effect was only a line of text | 5.4: CHAOS rebuilt around one moment at a time on the pitch (see the ideas bank) |
| 2026-09-26 | The music sometimes popped when opening or leaving the app: the sound was paused mid-wave (and the soundtrack cut dead) | 5.3: everything fades out before pausing and fades back in on return |
| 2026-09-26 | Quick match had too many choices (3 games × 3 stats), so people waiting could miss each other, and a Draft Duel's fallback said "Play the computer" but started a solo draft | 5.3: one game a day for everyone, always goals; the fallback says "Play on your own" and starts the matching solo mode |
| 2026-09-26 | Online: no way to leave a Live Race once the draft had started, and a Quick match race let you build your XI before anyone joined (a head start that defeats the point of a race) | 5.3: Quick match races wait for an opponent, with "Play on your own instead" after a minute; ✕ on the race bar leaves (cancels an unanswered invite, or ends a race in progress) |
| 2026-09-26 | No background notifications ever arrived (owner + a friend). The 4.9.1 diagnostics showed the cause: SecurityException, ACCESS_NETWORK_STATE required for jobs with a connectivity constraint (Android 14+) | 5.2 / app build 25: permission added, with a fallback job without the network condition. **Confirm on the phone:** Settings says "Checking every ~15 min" |
| 2026-09-26 | The ‹ back arrow often didn't work: only the character itself was tappable, and in a Hat-Trick game it pointed at the page you were on | 5.2: a 48 px target, and ‹ to the current page redraws it (Hat-Trick → the menu) |
| 2026-09-26 | Online: an unanswered Draft Duel invite said "your opponent is picking" and "Their's XI"; the invite text was muddled | 4.12: "Waiting for your mate to join", "Their XI", and a clear invite box with the code and Send invite |
| 2026-09-26 | About → The data said there are only 2,039 players, but every PL player (5,157) is in now | 4.10: says everyone who's played in the PL since 1992/93, and that most modes use the 2,039 with 50+ apps |
| 2026-09-26 | Album's sub-tabs (Album / Purist / Players) wrapped onto two lines, and ‹ on Players went to the home screen | 4.10: one line of tabs, also shown on the Players page, and ‹ goes back to where you came from |
| 2026-09-26 | Wildcard cards (e.g. 🩹 Rotation Risk) cut their description off after a few words | 4.10: cards measure themselves and shrink the icon or tag until the text fits |
| 2026-09-26 | The bottom of player cards (the apps line) was cut off on the owner's Pixel (bigger text than the test browser), mostly with two-line names (seen in CHAOS, affected every draft) | 4.10: cards measure themselves; club badges, then the photo size, give way so the stat box always shows. Test: `tools/test/cards.js` |
| 2026-09-26 | The What's New pop-up vanished after about 5 seconds on the first open after an update | 4.10: the new version taking over no longer reloads the page while the pop-up is open, and it only counts as seen once you close it |
