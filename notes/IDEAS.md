# 💡 Ideas bank

Ideas for Goal Machine and future games. **Nothing here gets built until we've talked it through and the owner says
go.** Each idea keeps its notes and questions so a later session can pick it up. Status: 💬 to discuss · 🟢 agreed
(ready to build) · 🚧 being built · ✅ shipped · 🧊 parked.

## 🗺️ Priority order (agreed with the owner as we go)

Aim: have a sticky, polished game for the Play closed test (12 testers × 14 days), then launch.

**Done in 4.10:** Target percentages and fairer targets, the Players signed filter, in-app feedback, CHAOS random
formations, and badges round 2.

**Next: medium (a day or two each), a reason to come back**
6. Weekly Premier League quiz, generated from our own data, with a weekly leaderboard
7. ✅ Share your whole day (5.5) *(Claude's idea)*: one post for the group chat with every daily result ("Goal Machine ·
   26 Sep 🟩 Footle 3/8 · ⚽ Daily Ultimate 512 · #️⃣ Grid 7/9 · 🔥 12"), our best free advertising

**Later: big, design first**
8. Money games rework (an AI rival, hidden values, a deadline-day squeeze)
9. ~~Card game~~ shipped as 🃏 Hat-Trick (beta); next: online and a Daily Hat-Trick
10. Manager mode

## 💬 To discuss

### Google Play Games: achievements and Sidekick 💬 *(owner, 2 Oct 2026)*
- **Owner's words:** Sidekick is switched on in Play Console; wants our badges to count as Google Play achievements
  (Play Points, the Play Games profile, Sidekick).
- **What it needs:** Play Games Services v2 (`play-services-games-v2`) in the Android app, one achievement per badge
  created in Play Console (Grow > Play Games Services > Achievements, each gets an ID and points; 1,000 points max
  in total), and a bridge call from `GM.app(...)` when a badge unlocks. Play version only.
- **Owner's decision (2 Oct):** ALL badges become achievements, kept in step as badges are added or removed.
- **Limits (Play docs):** 400 achievements, 2,000 points in total (5-point steps, 200 max each). A published achievement can't be deleted and its hidden/visible state can't change. Plan: ~100 at launch for under half the points, so it can grow towards 250. See `notes/BADGES.md`.
- **Questions (old):** which badges become achievements (all, or about 30 of the best)? Icons (512x512) and descriptions
  for each. Sign-in: PGS v2 signs in automatically, so no extra button, but we should say what it shares.

### Player sheet: tap any player for a profile 💬 *(owner, 2 Oct 2026)*
- **Owner's words:** "it would be nice if you could click a player, whether it be on a pack, in the player index or even in
  game, and see a little bio about the player maybe? Idk how big of a job this would be, but … it could even just be their
  apps, goals, assists, who they played for, when they played, how many times you have used them in games etc. … if on a game
  and you clicked on a player maybe this popup also showed you their card? So you could be like oh this player played for
  those clubs, oh I've unlocked this player."
- **We already have:** apps, goals, assists, positions, nationality, every club and the seasons at each (stints), honours,
  first/last season, how often you've been offered and signed a player (`GM.pickCount`), your card progress (pips) and whether
  you've signed him (the Album). Tapping a player opens a sheet from a pack card, the Players index and the Album today only in
  part, and not at all mid-draft.
- **A small job (a day or so):** one shared `GM.playerSheet(p)` popup: photo, the card (with your pips and whether it's
  finished), main club and every club with its seasons, apps/goals/assists, honours, "you've signed him N times, offered N
  times", and a link to the Wikipedia article. Then wire it to taps on pack cards, the Players index, the Album and Dream XI.
- **Mid-draft is the careful part:** a tap on a reel already means "pick this player". Options: a small ⓘ on each reel card, or
  a long-press, so a normal tap still picks. Hard mode must not leak clubs/years: the sheet would show the name, photo and
  card only (or be disabled in Hard).
- **A bio** (a few lines of text) would need a source: Wikipedia's article summary, fetched when the sheet opens (free
  licence, needs credit, needs the network) or pre-fetched into a data file by the weekly job (big: 5,000+ players). Suggest
  starting without a bio, with a "Read on Wikipedia" link.
- **Questions:** Hard mode behaviour? ⓘ or long-press mid-draft? Bio now (live from Wikipedia) or later?

### CHAOS moments: make the chaos part of the game, not a pop-up ✅ shipped in 5.4
- **Owner's words (26 Sep):** "The most fun mode but things pop up all at once and it's quite hard to tell what's
  going on… I dont want it to be less fun, but maybe prevent a million things happening at once. Like if my entire
  team's points are getting wiped in half dont just put a tiny notification at the bottom of the screen, have a tornado
  rip through my team… make the chaos moments part of the game rather than just a little add on that gets confusing."
- **Why it's confusing now:** one spin can fire an event (screen flash, 14 emojis, shake), a wildcard storm, the
  CHAOS meter going off 0.7 s later (another flash and toast) and the reels spinning, all at once. The effect itself is
  a line of text above the reels or a toast; the numbers just change.
- **Proposal:**
  1. *One moment at a time.* The spin waits while a moment plays (about 2 s, tap to skip). An event and a storm never
     share a spin, and CHAOS Unleashed waits its turn.
  2. *Every event happens on the pitch:* 🌪️ All In gone wrong = a tornado sweeps the XI and each player's number
     ticks down to half; 🚑 an ambulance to the injured player; 📺 VAR frames the last signing, "checking…", then a
     GOAL / DISALLOWED stamp; 🧾 the taxman pulls a card out of your bag; 💰 coins pour into the score; 🟥 / 🔥 / ⚽
     the next empty slot glows red, fire or gold; 🎁 the box opens and the card flies into the bag; 🎭 masks drop onto
     the reels; 🌪️ a storm turns the reels into cards as it passes.
  3. *Numbers count up or down live*, with a sound for each hit, so you see exactly what changed.
  4. *Active effects as badges* by the score (🔥 ×1.5 ×3, ⚽ ×3 next, 💥 ×2 ×2), not in the small line.
  5. *What happened?* Tap the chaos level for a timeline of every moment in the game.
  Same rules, odds and seeds, so Daily CHAOS and CHAOS Races stay fair and nothing gets less wild.
- **Owner's answers:** go, add new moments; spins are fine, it's the events; the meter should set off the chaos
  (taking or playing wildcards fills it); a couple of seconds each; coin tosses should be real coin tosses; add PL
  managers, each with a consequence; not everything every game, just enough to keep playing.
- **Built (5.4):** 12 managers (perk + catch, 👍/👎 on reels, can be sacked), meter of 4 fed by wildcards and storms
  triggers a big moment (unleash, tornado, lightning, parade, deadline day, sacked); match-day events at 22% with no
  event straight after a big one; storms never share a spin with a moment; coin toss; full-time story.
  Test: `tools/test/chaos.js`.
- **5.4.1 (owner: "TV money twice in one game… add variation, funny things, the more the better, at different
  rarities"):** 20 more match-day events and 3 more big moments, each common / uncommon / rare / legendary (weights
  1 / 0.45 / 0.15 / 0.045, badge on the card), repeats in a game are rare, not banned (owner: "not that it literally can't repeat, just that it's rare"): each time something happens its weight ×1/6, so about 1 game in 35 sees a repeat. The test forces every one.
- **Old questions:** Is about 2 s a moment right (tap to skip)? Keep the same number of events, or also stop two big
  moments landing on back-to-back spins? Any other moments you'd like (e.g. a 🌪️ tornado event that swaps players'
  positions)?

### Packs and the Packed XI ✅ shipped in 5.6
- **Owner (30 Sep 2026):** liked packs, but "the rare players aren't actually hard to get… maybe for your dream XI you
  need to sign them x amount of times? Like signing them adds a jigsaw piece to the player? Maybe a packed team?"
- **Shipped:** every 50+ app player is a card by fame: 🟫 Bronze (1 piece, ~1,300), ⚪ Silver (2, ~500), 🟡 Gold (3,
  ~190), 🟣 Legend (5, ~40, all Hall of Famers). Pieces from packs (5 pieces, odds 55/30/12/3, the last Silver or
  better, prefers cards you haven't finished) and from signings (one piece per player per day, so a star you keep
  seeing still takes days). Packs: one free a day, +1 for three dailies in a day, +1 per new badge. The Packed XI
  (best XI of finished cards) replaces the Album's Dream XI and has a leaderboard (`packedxi`). Opening: pack bursts,
  cards deal and flip (best last), a Legend gets a walkout (flag, position, club). Five badges in Collecting.
- **5.7 (owner: "prettier cards, a whole animation, wildcards… themed packs"):** FUT-style cards (fixed layout,
  tier finishes, a holo Legend), the full opening (rays, charge-up, the top tears off, cards fan out face down, Gold and
  Legend backs glow, sparks/confetti), wildcards (3 packs in 10: Pick one 60, Scout's tip 30, Legend's choice 10),
  themed free packs (Nations in a break, Matchday on your club's matchday) and a Legends pack for each new rank. The
  Album became the hub for all of it (level, packs, My XI, Cards, Badges, Signed).
- **Maybe next:** spare pieces for finished cards turn into something (a "pick your own piece" token?); a weekly
  special pack (Team of the Week, see the FPL API ideas); trading pieces with friends.

### First game: a guided first XI ✅ shipped in 5.6 *(Claude's idea)*
- **Shipped:** first launch asks "Play my first XI" (an Ultimate draft, no wildcards, `tut=1`) with coach bubbles for
  spin, pick and place until 3 signings, then a full-time card pointing at CHAOS and packs. Home shows a "New here?"
  card until you've played. The three "how it works" cards stay under Settings.
- The home screen throws a lot at a new player (Normal/Hard/Extreme, four tabs, CHAOS, Ultimate, lots of tiles).
- **Idea:** on first launch one big "▶ Play your first XI" button: a short guided game ("Spin… pick one… put him in the
  slot…"), then the full home screen. Where testers would bounce if anywhere.
- **Questions:** skip button for people who know it? Which mode (Ultimate goals, wildcards off for the first go)?

### Club v club: fans playing for their club ✅ shipped in 5.6 *(Claude's idea)*
- **Shipped:** `club_table(p_week)` in Supabase: this week's (Mon–Sun, UK) Daily Ultimate results by club, the average,
  ranked from 3 games (same spins for everyone, so it's fair). Your club goes with your account (`set_profile`,
  players.club). Page `#/clubs` (This week / Last week), linked from Ranks and the club tile.
- **Maybe next:** a Monday notification with last week's winner; a club v club badge; the rival's position on Home.
- A weekly table of clubs, each scoring from its fans' results ("Everton fans 4th this week, Liverpool fans 11th").
  Fits the banter and matchdays, and gives a reason to recruit mates.
- **Notes:** everyone already picks a club and scores already go to Supabase, so it's a view plus a page. Needs the
  club saved with the account (it's only on the phone now). Average per active fan, or total (big clubs win)? Probably
  an average over fans with 3+ games that week, so small clubs can top it.

### Levels: a rank to climb ✅ shipped in 5.6 *(Claude's idea)*
- **Shipped:** XP for a draft 25, a daily game +20, any other game 15, a badge 50, a pack 5, an online game 10 (win 30).
  Level n→n+1 takes 100 + 25(n−1) XP. Ranks: Sunday League 1, Non-League 5, League Two 10, League One 15,
  Championship 20, Premier League 30, Champions League 40, Ballon d'Or 50. A pack every level. The level chip on Home,
  `#/level`, and "Lv 12" next to names on boards (players.level via set_profile). Existing players start with XP for
  what they've done (games, badges, dailies).
- **Maybe next:** unlocks by rank (pitch styles, card designs, CHAOS managers).
- Everything you do earns XP towards a rank: Sunday League → Non-League → Championship → Premier League → Ballon d'Or.
  Badges are the only long-term progress now.
- **Questions:** what earns XP (games, dailies, badges, packs)? Unlocks along the way (pitch styles, card designs,
  CHAOS managers) or just the title? Show the rank next to your name on leaderboards?

### Monthly leaderboards ✅ shipped in 5.6 *(Claude's idea)*
- **Shipped:** a `month_scores` view (UK months); boards open on This month with an All time switch (remembered),
  on the Ranks page and the in-game 🏆 pop-up. Dated boards (a day, a match) have no switch.
- **Maybe next:** "End of season: you finished 7th" at the start of each month, with a pack for the top 3.
- All-time boards go stale (once someone has 600 on Ultimate a newcomer can't catch them). Monthly boards (keeping
  all-time) give a fresh race each month and an "End of season: you finished 7th" moment, maybe with a pack prize.
- **Notes:** the scores table has created_at, so a monthly view per mode is cheap; the boards need a This month / All
  time switch.

### Launch basics 💬 *(Claude's ideas, 30 Sep 2026)*
- **Ask for a review at a good moment:** after a personal best or a badge, Play's in-app review prompt (needs the
  Play Review API in the Android app; Google limits how often it shows). Early ratings matter a lot.
- **Anonymous usage stats:** which modes people play and where they drop off (a small Supabase `events` table:
  mode, action, day; no names). We'd stop guessing what to build.
- **Streak freeze:** one missed day doesn't wipe a 40-day streak; earn a freeze by playing 7 days in a row.

### Bigger ideas for later 💬 *(Claude's ideas, 30 Sep 2026)*
- **Commentary:** a line when you sign someone ("He's been waiting his whole career for this"), audio later. Makes
  the quiet modes feel alive.
- **Other leagues:** the Women's Super League, La Liga… a bigger audience, but data is the hard part.
- **Money:** cosmetic unlocks or a supporter pack, whenever the owner wants to think about it.

### More from the FPL API 💬
- **Context (30 Sep 2026):** the fixtures now come from the FPL API (`fantasy.premierleague.com/api/`, no login, the
  weekly data job can reach it; this sandbox can't). The owner asked what else it could give us. Claude's ideas,
  best fit first:
  1. **Results and scorers** (`/fixtures/`: score, scorers, assists, cards, bonus once played): the result on the
     matchday hub, a full-time notification ("FT: Everton 2–1 Liverpool"), and a post-match quiz ("Who scored
     Everton's winner?"). Recommended first: it finishes the matchday loop.
  2. **Team of the Week** (`/dream-team/{gw}/`): a weekly game when the Tuesday data lands: guess the Team of the Week,
     or a Footle whose answer is the weekend's star.
  3. **Fresher numbers** (`bootstrap-static` elements): current-season goals/assists/minutes straight from source,
     instead of the vaastav repo that can lag a few days; new signings show up as soon as they play.
  4. **Injury news** (`news`, `chance_of_playing_next_round`): a CHAOS moment ("🚑 Real news: he's out this weekend"),
     or a flag on reels for injured current players.
  5. **FPL prices and ownership** (`now_cost`, `selected_by_percent`): a Higher or Lower round ("who's in more FPL
     teams?"), or real prices as a Moneyball option for current players.
  6. **Fixture difficulty** (`team_h_difficulty` / `team_a_difficulty`, 1–5): shown on the matchday hub's list.
  7. **Link your FPL team** (`/entry/{id}/`, `/leagues-classic/{id}/`): type in your FPL ID, pull your real squad;
     a "Your FPL XI" draft, or compare Goal Machine scores with your FPL mini-league. Big, but could bring FPL
     players in.
- **Questions:** which first? (Claude suggests 1, then 2 and 3.)

### Money games need more depth ✅ Moneyball reworked in 5.8
- **Owner (1 Oct 2026):** "the perfect time to rework the money games… make these fun and engaging, can use things
  different to goals/apps/assists… across the three difficulty levels."
- **Shipped (js/moneyball.js):** chairman for a season. £100m, a squad of 5, 8 weeks. The market prices reputation
  (GM.market.price); a player's worth is his reputation scaled by his output against players of a similar reputation
  (so every price band is fair on average and the bargains are the over-performers). Each week: news (a bid for your
  star with a sell/keep choice, injury, takeover +15%, FFP −12%, agent's tip for £2m, Player of the Month, TV money,
  taxman, international duty), a market of four, then the matchweek at each player's real PL rates (goals, assists,
  clean sheets earn prize money and move value; values drift 10% a week towards worth). Week 8 is Deadline Day
  (asking prices −30%). Sell any time less a 10% agent's fee. Score = net worth (£m). Normal shows clubs/era/apps,
  Hard names and positions only, Extreme every PL player. The Daily is the same season for everyone. The Transfer
  Window folded into it. Balance (tools/test/moneyball.js): random buying ~+10%, stars ~+7% (swingy), spotting real
  bargains ~+45%.
- **Maybe next:** the Auction reworked on the same economy (bid for players, then a season of matchweeks to see who
  was the better chairman); an online "Chairmen's league" on the Daily; loans; wages.

### (Before 5.8) Money games need more depth (Moneyball, Transfer Window, Auction)
- **Owner's take:** there's something there, but it isn't satisfying. By two-thirds of the way through you're often
  left with one affordable option (a free transfer), and it boils down to "longest career for the cost". It lacks the
  tension of the spin games. It probably needs an opponent (the computer, or a person online) and more depth.
- **Notes:** the fun in the spin games is risk and the unknown. Here everything is known and the budget squeezes out
  choice. Directions to talk through:
  - an AI rival bidding on the same market, who takes players you hesitate on
  - hidden or partly hidden values (a scout report gives a range, not the number)
  - prices that move as the window goes on (deadline-day panic, bargains late)
  - selling: buy low, sell a player back mid-window to fund a star
  - a squad need each round ("you need a CB by round 6")
  - a guaranteed floor so the last picks are still choices, not one free transfer
- **Proposal: "Deadline Day", one transfer game against 3 computer managers** (replaces the three as they are):
  - Everyone starts with a budget and an empty XI; the window runs 8 rounds.
  - Each round a market of 5 players with asking prices. The true value (goals) is hidden: you get a scout report
    as a range ("110–160 goals"), and spend scouting tokens to narrow it.
  - Sealed bids against the rivals, who have personalities (the big spender, the bargain hunter, the panic buyer),
    so the player you hesitate on gets taken.
  - Prices fall as the window goes on, but the good players go first. The last round is Deadline Day: a frenzy.
  - Sell one player back mid-window to fund a star.
  - At the end, a 4-team league table decides the winner (XI totals + a little luck).
  - Online: the same thing with friends in the Auction room.

- **Owner, later:** unsure about the rework. Maybe the problem is goals themselves: make the goal *money*, more
  Monopoly-style? 🧊 Parked for now; come back to it.

### Weekly Premier League trivia quiz
- **Owner's idea:** a weekly quiz.
- **Questions:** questions from our own data (tallies, clubs, seasons), or hand-written about that week's real
  matches? The data-only version can be automatic; topical questions need someone to write them each week (or a
  weekly data refresh that turns into questions). Leaderboard for the week, streaks across weeks?

### International breaks ✅ shipped in 5.6
- **Owner's idea (30 Sep 2026):** "an international break thing… some form of extra gamemode/theme that appears when
  there is an international break", with badges for it and for matchdays.
- **Shipped:** breaks come from the fixture list (11+ free days between PL matchdays in Sep/Oct/Nov/Mar, worked out by
  build_fixtures.py). During one: flag bunting, an INTERNATIONAL BREAK banner on Home and Today, and the International
  XI (#/nations): 32 countries with 10+ PL regulars, drafting from every PL player each has had. New badge list
  "Matchdays & breaks" (6 matchday, 5 international, 3 of them secret).
- **Maybe next:** a daily "International Footle" during breaks; a nations leaderboard (which country's fans score most).

### One difficulty switch ✅ shipped in 5.6
- **Owner (30 Sep 2026):** the "50+ apps / every player" switch on the cards was ugly; fold it into the difficulty.
- **Shipped:** Normal / Hard / Extreme. Extreme = every player in the Main event and CHAOS (the old Extreme/Purist and
  CHAOS Extreme boards). The Main event card keeps Classic/Ultimate and wildcards on/off. Old Hard and Extreme-pool
  settings carry over.

### Your club's matchdays ✅ shipped in 5.5
- **Shipped:** real fixtures (data/fixtures.js, from the FPL API or the FPL repo, rebuilt with the Tuesday data job);
  a MATCHDAY banner on Home and Today; a matchday hub (#/matchday) with the next match and what's coming up; the
  Matchday XI (either side, double for both, seeded by the fixture, one go, a leaderboard per match); a pre-match
  Footle (played for both, or either if hardly anyone did); a 9am "Matchday" notification in the Android app (the app
  sends its next match to app_inbox; a setting, on by default).
- **Maybe next:** a league of the week's Matchday XI scores between rival fans; a post-match "who scored" quiz.
- **Owner's idea (30 Sep 2026):** "it would be cool to have something on your team's matchdays, can't think what
  though."
- **Notes:** needs fixture dates for the favourite club (not in our data yet; a weekly fixtures fetch in the data
  workflow could add them). Ideas to talk through: a matchday banner on home ("🏟️ Everton v Spurs today"); a
  matchday Club XI with double points for players from both clubs; a pre-match Footle using players who played for
  both sides; a push notification on the morning of the game.

### Hidden things: secrets, unlocks, easter eggs ✅ first round shipped in 5.5
- **Owner's idea:** hidden items, unlocks and secrets to keep the game exciting.
- **Notes:** some directions, from light to heavy:
  - secret badges (hidden in the list as "???" until earned): an all-one-club XI, exactly 442 goals, a 0-goal XI
  - easter eggs triggered by real football moments: sign Aguero with the last spin → "AGUEROOOO" commentary
  - unlockable looks: pitch styles, retro kits for the card design, earned rather than bought
  - a hidden mode that appears after something special (e.g. completing a club's full set in the Album)
  - rare "legend" reel cards with a special shine (cosmetic)
- **Questions:** cosmetic only, or can unlocks change gameplay (a new wildcard)? Should secrets be shareable
  ("I found the hidden mode") to spread word of mouth?
- **Owner's ideas (30 Sep 2026):** over half the XI from your club; the Gerrard slip (Gerrard on 0 in CHAOS); CHAOS
  with its own challenges, some secret, and CHAOS as the headline event; an XI of PL lifers; players who got
  relegated; one-season players; a daily banter line about your club on the home page.
- **Shipped in 5.5:** Share my day; CHAOS headline + a CHAOS badge category (Total Anarchy, Vote of No Confidence,
  Once in a Lifetime, Meltdown, Gaffer's Favourites; secret: The Slip, Dilly Ding, Fergie Time, We Are Not Alone,
  Pigeon Fancier); squad badges Proper Fan, Lifers (career spans 10+ seasons; we don't have careers outside the PL),
  Going Down (from a relegation table in collection.js + Transfermarkt club spells, which have gaps); secret Yo-Yo
  Club and One-Season Wonders; the Slip event goes for Gerrard; an AGÜEROOOO moment for signing him last; daily
  club banter (js/banter.js). Test: `tools/test/secrets.js`.

### Manager mode
- **Owner's idea:** some form of manager mode.
- **Questions:** what's the fantasy? Build a squad over a "season" of fixtures, simulate results from squad
  strength, manage a budget and transfers between gameweeks? It's a big feature, so a small first version would help
  work out whether it's fun.

### Optional account recovery (email or Google sign-in) 💬
- **Came up (30 Sep 2026):** filling in Play's Data safety form, the owner asked "we probably should start collecting
  emails right?"
- **Notes:** the one strong reason is recovery: an account lives on the phone (a secret key), so a lost phone with no
  backup loses it. Costs: UK GDPR duties once we hold emails (security, breach reporting, opt-in consent before any
  newsletter), friction at sign-up, and the policy and Data safety form would need updating. Agreed for launch: don't
  collect emails. Later, if lost accounts become a problem, an **optional** "link your email / Google account to
  recover your progress", never required.

### Share your whole day *(Claude's idea)*
- Footle and the drafts already have share buttons. This adds one "Share my day" on the Today page: every daily
  result plus your streak in one spoiler-free post, with the link. One post a day in a group chat is how Wordle
  spread.

### Online lobby / quick match *(step 1, Quick match, ✅ shipped in 5.1)*
- **Idea:** a lobby to play people you don't know yet.
- **What it could be, in steps:**
  1. **Quick match:** tap "Find me a game" for a Live Race (the easiest online game). You join the oldest open
     quick-match game of that kind, or open one that the next person joins. No chat, no browsing strangers. That's
     simple and safe, and it's mostly server work (an `open` flag on rooms and a `quick_match` RPC).
  2. **Open lobby:** a list of open games ("Bob · Draft Duel · goals · 2 min ago") to pick from.
  3. **Live lobby:** see who's online now; needs Supabase Realtime.
- **Things to settle:** only players with a claimed name (and the name filter/reporting we have) can use it; what if
  nobody's around (fall back to a computer opponent after a minute?); a daily cap to stop spam; no messaging at all
  (keeps the Play content rating simple).
- **Hat-Trick online:** ✅ shipped in 5.0 (1 v 1 with computer partners). Next: 2 v 2 with four friends.

## 🟢 Agreed

_None yet._

## ✅ Shipped

- **🃏 Hat-Trick online, 5.0:** you + Skipper v a friend + their Skipper, turn by turn, notifications on your turn.
- **🃏 Hat-Trick (beta), 4.11:** football Spades, 4 players (you + a computer partner v 2 computer rivals).
  Normal shows the numbers (pure Spades), Hard hides them. Each game picks goals, assists or apps. **Next steps to
  discuss:** online (you + computer partner v a friend + computer partner), a Daily Hat-Trick, 2- and 3-player
  cut-throat, harder computer managers, and Nil bids for the computers.
- **4.10 top five:** Target games show a percentage (full time, PB, boards) and targets are fairer (apps 3,400,
  assists 325, from a 20,000-game simulation: a typical random XI has ~478 goals, ~288 assists, ~2,671 apps).
  Players page ✅/❌ filter. In-app feedback (`feedback` table). CHAOS random formations (7 shapes, seeded).
  13 new badges in 6 categories, incl. 6 online and 5 secret ("???") ones. The secret ones are the first step of
  *hidden things*.
- **Settings sub-menus** (4.10): a menu of Account, Look & club, Sound & vibration, Notifications and Gameplay,
  each showing its current value.
- **Version numbers** (4.10): three levels (5.0 big, 4.10 features, 4.10.1 fixes); fix-ups fold into their
  release on the Updates page.
- **Notification choices and reminders** (4.10): owner's spec. Each kind can be switched off in Settings. On by
  default: friend invites and challenges, your move, new game modes, come back (from noon on the 4th day without a
  game, and again after 2 weeks) and an 8pm streak reminder if the streak is about to end. Results are also on. There's
  a daily reminder at a chosen time (off by default). Announce a new mode by adding a row to `announcements`.
- **Done in 5.9 (owner's idea):** NEW / UPDATED tags on game tiles (from the release's `tags`), and a rotating banner on Home: matchday, the international break, the release's featured games (`promo` in updates.js) and news from the `announcements` table (readable by the app now). Posting an announcement puts it in the banner for a fortnight, no release needed.

## 💼 Moneyball, take 3 (owner feedback, 2026-10-01): to discuss
Feedback on 5.8: better, but still "just clicking buttons". Not clear how many to sign; by week 3 you can only
afford one of four; the £2m scout tip doesn't help; 8 weeks is mostly luck; bargains don't make sense.
Owner's ideas: start with a full XI; values rise and fall with individual and team performance; hire and sack
managers with perks; a whole season; start with a meh team and build it into a good one.
**Built in 5.9 as a new game, Club Boss** (owner: "try this as a new game mode first"), alongside Moneyball: your club, a 4-4-2 with OVRs, two swaps a week, managers with perks (sack for a bounce), a 10-club league over 9 weeks, points as the score. If it lands, Moneyball could fold into it or go. Original proposal: see the reply of 2026-10-01. The short version: your club, a mid-table XI and a
budget; a mini-league of real fixtures; score = points (the board's target by difficulty); swap-one-for-one transfers
from a browsable market; managers with perks; form visible to everyone (no paid scouting).
- **Built in 5.10: Dodgy Owner** (owner's feedback: Club Boss "needs a LOT more complexity"; owner's name and twist: you're a dodgy, very involved owner who hires and sacks head coaches). Manager + chairman, a full 38-week season with a cup, one deep season (careers later), replaces Club Boss. Squad of 20 with fitness/injuries/cards/morale, weekly money (TV, gate, sponsor, wages, a wage cap), two windows with bids/counters/terms/loans/free agents/offers for your players, coaches with perks and egos (meddling costs the relationship), live matches with the owner's half-time team talk and subs, Heat (dodgy choices → investigations: fines, embargoes, points deductions), Fans (at zero they force you out), random inbox events. **Next ideas:** multi-season careers (ageing, youth intake, promotion/relegation, facilities), a Daily version, more events, Europe.
- **5.10 (owner's feedback on Dodgy Owner):** parody managers (the owner asked for them; affectionate, about tactics and touchline habits only), more than one way to succeed or fail (five owner types with their own ambitions, three club situations, opponent styles to counter, a legacy score from points + Cup + fans + profit + ambition, and endings for going bust and being banned). New look shared with Reign Check.
- **🤫 Secret games (owner's idea):** well-made fun knock-offs, unlocked by doing something. Reign Check (Reigns, as a football owner: unlocked by sacking a coach in Dodgy Owner) and Hat-Trick (Spades: 10 games, or already played). **Built in 5.11: Goal Royale** (the Clash Royale knock-off): your finished pack cards as a deck of eight (topped up from the academy), stamina instead of elixir, forwards/midfielders/defenders as units and keeper cards as boosts, goals instead of towers (first to 3 or most in 3 minutes, then sudden death); bronze all alike, silver a perk, gold an ability, Legends special (Talisman, Maestro, Colossus, The Wall); trophies and five arenas, a pack every 5 wins; unlocked by finishing a Legend. **Next ideas:** card levels/upgrades from duplicate pieces, online battles against friends, emotes, a daily challenge deck.
