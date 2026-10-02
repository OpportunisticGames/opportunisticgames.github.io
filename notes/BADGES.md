# 🏅 Badges for the Google Play launch

Plan agreed in discussion (2 Oct 2026): **100 badges, each one a Play Games achievement.** Nothing here is built yet; this is the proposed list. Tiers: **L** light (the first few sessions), **M** moderate (days to weeks), **H** heavy (months), **S** hidden (shown as ??? in the game and as a hidden achievement in Play until found).

Totals: 100 badges: L 15 · M 43 · H 22 · S 20. (Now: 95. Cut 5, add 10.)

Google limits: 400 achievements, 2,000 points in total (5-point steps, 200 max each), at least 10 visible. **A published achievement can't be deleted, and its hidden/visible state and type can't change**, so only publish badges we'll keep for good. Points: treat them as permanent too.

**Points plan for growing to 250:** 2,000 ÷ 250 = 8 on average, so launch spends **880** of the 2,000 and leaves 1120 for the next 150 (about 7.5 each: mostly 5s, a few 10s). Launch values: light 5; moderate 5 (10 for the harder ones); heavy 10–15; the five hardest 25; hidden 5–10. Nothing above 25.

Owner decisions: "do badly" badges (Dead Rubber, Parked the Bus…) are welcome, a few of them. Secret-game badges (Hat-Trick, Goal Royale, Reign Check) are included as **hidden** achievements, so Play shows no name or description until unlocked.

## ✂️ Cut (5)

| Badge | Why |
|---|---|
| 🥵 No Clues (`hard`) | too easy and unclear; Extreme Measures replaces it |
| 🎲 Mystery Solved (`mystery`) | near-duplicate of Near Miss |
| 📉 Going Down (`down5`) | relies on relegation data with known gaps (some players would miss out unfairly) |
| 🪂 Yo-Yo Club (`sdown`) | same relegation-data gaps |
| ⚔️ Club v Country (`ibclub`) | niche, and needs a favourite club |

## ✏️ Renamed (3)

| Was | Now | Why |
|---|---|---|
| Invincibles (`mbinvincible`) | Unbeaten Season | clashes with Invincibles |
| Season Ticket (`daily7`) | Seven Up | clashes with Season Ticket |
| Season Ticket (`mdseason`) | Matchday Regular | clashes with Season Ticket |

## ➕ New (10)

| Badge | Tier | Needs |
|---|---|---|
| 🎮 **Getting Going** (`g25`): Play 25 games. | L | Games played (`played`) |
| 💯 **Centurion** (`g100`): Play 100 games. | M | Games played |
| 🛋️ **Part of the Furniture** (`g500`): Play 500 games. | H | Games played |
| 🥉 **Climbing the Pyramid** (`lv10`): Reach level 10 (League Two). | M | `GM.myLevel().n` |
| 🦁 **Top Flight** (`lv30`): Reach level 30 (Premier League). | H | `GM.myLevel().n` |
| 🎖️ **Ballon d’Or** (`lv50`): Reach level 50. | H | `GM.myLevel().n` |
| 🌅 **A Hundred Days** (`daily100`): Play the Daily Ultimate on 100 different days. | H | `dlog` (the Album keeps only 60 days) |
| 📦 **Pack Mentality** (`pk50`): Open 50 packs. | H | `cards.opened` |
| ☠️ **Extreme Measures** (`extreme`): Finish a draft in Extreme. | M | needs an `extreme` flag on the draft event |
| ⚔️ **Ruthless** (`onwin25`): Win 25 online games. | H | `online.wins` |

## ⏭️ Ready for after launch (7)

Good ideas that did not fit in 100. Each costs one of the 400 lifetime slots, so add them deliberately.

- **Pack Habit** (`pk10`): Open 10 packs
- **Set Builder** (`fin25`): Finish 25 player cards
- **World Beaters** (`setwc`): Collect every World Cup winner (43)
- **Century Makers** (`set100`): Collect every 100-goal player (35)
- **Hard Graft** (`hardx`): 400+ goals in Ultimate Wildcard on Hard
- **Footle in Two** (`footle2`): Win the daily Footle in 2 guesses (needs a `checkGame` call in `daily.js`)
- **Cabinet Full** (`badges50`): Earn 50 badges

## The full list (100)

| # | Badge | Tier | Points | What for |
|---|---|---|---|---|
| 1 | 🥅 First XI (`first`) | L | 5 | Finish your first draft. |
| 2 | 🥉 300 Club (`ult300`) | L | 5 | Score 300+ goals in Ultimate Wildcard. |
| 3 | 🥈 400 Club (`ult400`) | M | 10 | Score 400+ goals in Ultimate Wildcard. |
| 4 | 🥇 Goal Machine (`ult500`) | H | 25 | Score 500+ goals in Ultimate Wildcard. |
| 5 | 🅰️ Creator (`ast250`) | M | 10 | Build an XI with 250+ assists in Ultimate Wildcard. |
| 6 | 🏃 Iron Men (`apps4000`) | M | 10 | Build an XI with 4,000+ apps in Ultimate Wildcard. |
| 7 | 🎯 Bullseye (`bull`) | M | 10 | Hit a Target exactly. |
| 8 | 🏆 Treble Winners (`treble`) | H | 15 | Win the Treble – goals, assists and apps all within 3%. |
| 9 | 📏 Near Miss (`close`) | M | 5 | Finish within 2% of a Target. |
| 10 | 🏆 Title Race (`contenders`) | M | 10 | Get a Title contenders squad rating (or better). |
| 11 | 👑 Invincibles (`invincible`) | H | 15 | Get an Invincibles squad rating. |
| 12 | ☠️ Dead Rubber (`relegated`) | L | 5 | Finish with a Relegation certainties squad. It happens. |
| 13 | 🤝 Band of Brothers (`chem5`) | M | 5 | Have 5+ pairs of former teammates in one XI. |
| 14 | 🏛️ Hall of Fame XI (`hof3`) | M | 5 | Sign 3+ Hall of Famers in one XI. |
| 15 | 🌍 World Champions (`wc2`) | M | 5 | Sign 2+ World Cup winners in one XI. |
| 16 | 🏟️ Club Legends (`club5`) | L | 5 | Have 5+ players from the same club in one XI. |
| 17 | 🃏 Wildcard Wizard (`wild5`) | L | 5 | Use 5 wildcards in one game. |
| 18 | 🎲 Fortune Favours (`coin`) | L | 5 | Win a Double or Nothing coin toss. |
| 19 | 🌪️ Agent of Chaos (`chaos`) | M | 10 | Score 500+ points in Ultimate Wildcard CHAOS (goals). |
| 20 | 🧣 Proper Fan (`fan6`) | M | 5 | Have 6+ players who played for your club in one XI (not in a Club or Matchday XI). |
| 21 | 🗓️ Lifers (`lifers`) | H | 10 | Every player in your XI had a PL career spanning 10+ seasons. |
| 22 | 💥 Total Anarchy (`cx1000`) | H | 15 | Score 1,000+ points in CHAOS (goals). |
| 23 | 📰 Vote of No Confidence (`cxsack`) | M | 5 | Get your manager sacked in CHAOS. |
| 24 | ✨ Once in a Lifetime (`cxleg`) | H | 10 | See a legendary CHAOS moment. |
| 25 | ⚡ Meltdown (`cxmeter`) | M | 5 | Fill the CHAOS meter 3 times in one game. |
| 26 | 👍 Gaffer’s Favourites (`cxgaffer`) | M | 5 | Sign 6+ players your manager likes in one CHAOS XI. |
| 27 | 📅 Regular (`daily3`) | L | 5 | Play the Daily Ultimate 3 days in a row. |
| 28 | 🗓️ Seven Up (`daily7`) | M | 5 | Play the Daily Ultimate 7 days in a row. |
| 29 | 🦘 Globetrotter (`hop10`) | L | 5 | Make 10 hops in Club Hopper. |
| 30 | ✈️ Frequent Flyer (`hop20`) | M | 5 | Make 20 hops in Club Hopper. |
| 31 | ↕️ Streaker (`hilo10`) | L | 5 | Get 10 in a row in Higher or Lower. |
| 32 | 🔥 On Fire (`hilo25`) | M | 5 | Get 25 in a row in Higher or Lower. |
| 33 | 🕵️ Detective (`who3000`) | M | 10 | Score 3,000+ in Who Am I? |
| 34 | #️⃣ Full House (`grid`) | M | 5 | Fill a whole Club Grid. |
| 35 | 🔢 Human Calculator (`tally700`) | M | 10 | Score 700+ in Guess the Tally. |
| 36 | 🃏 Card Sharp (`htwin`) | S | 10 | Win a game of Hat-Trick. |
| 37 | 🤐 Clean Sheet (`htnil`) | S | 5 | Make a Nil bid in Hat-Trick. |
| 38 | 📒 Scout (`col100`) | M | 5 | Collect 100 players. |
| 39 | 🔭 Chief Scout (`col500`) | H | 15 | Collect 500 players. |
| 40 | 📚 Encyclopedia (`col1000`) | H | 25 | Collect 1,000 players. |
| 41 | 🏛️ Pantheon (`hofall`) | H | 10 | Collect every Hall of Famer. |
| 42 | 👟 Boot Room (`gball`) | H | 10 | Collect every Golden Boot winner. |
| 43 | 📆 Ever Present (`daily14`) | M | 10 | Play the Daily Ultimate 14 days in a row. |
| 44 | 🏟️ Season Ticket Holder (`daily30`) | H | 15 | Play the Daily Ultimate 30 days in a row. |
| 45 | 🌐 Kick-off (`on1`) | L | 5 | Finish your first online game. |
| 46 | ⚔️ Away Win (`onwin`) | L | 5 | Win an online game. |
| 47 | 🏅 Serial Winners (`onwin10`) | M | 5 | Win 10 online games. |
| 48 | 👥 Beat Them All (`onbeat5`) | M | 10 | Beat 5 different friends online. |
| 49 | 🎮 All-Rounder (`onall`) | H | 10 | Win a Draft Duel, a Live Race and a Transfer Auction. |
| 50 | 🌀 Chaos Merchant (`onchaos`) | M | 5 | Win a CHAOS Race. |
| 51 | 🔢 The Magic Number (`s442`) | S | 10 | Build an XI with exactly 442 goals. |
| 52 | 🇦🇷 AGÜEROOOO (`saguero`) | S | 5 | Sign Sergio Agüero in a draft. |
| 53 | 🚌 Parked the Bus (`sbus`) | S | 5 | Finish a goals draft with under 40 goals. |
| 54 | 💙 Club Till I Die (`sloyal`) | S | 10 | Have 8+ players from the same club in one XI. |
| 55 | 🦉 Night Owl (`sowl`) | S | 5 | Finish a draft between midnight and 4am. |
| 56 | ☄️ One-Season Wonders (`sonce`) | S | 10 | Have 3+ players who only had one PL season in one XI. |
| 57 | 🍌 The Slip (`cxslip`) | S | 5 | Steven Gerrard finishes a CHAOS game on 0. |
| 58 | 🦊 Dilly Ding, Dilly Dong (`cxdilly`) | S | 10 | Ranieri in the dugout with 3+ Leicester players. |
| 59 | ⌚ Fergie Time (`cxfergie`) | S | 10 | Fergie in the dugout with 5+ Man Utd players. |
| 60 | 🛸 We Are Not Alone (`cxaliens`) | S | 5 | Witness an alien abduction in CHAOS. |
| 61 | 🐦 Pigeon Fancier (`cxpigeon`) | S | 5 | A pigeon lands on your pitch in CHAOS. |
| 62 | 🎫 Matchday (`mdfirst`) | L | 5 | Play a Matchday XI when your club’s on. |
| 63 | 🔀 Split Loyalties (`mdboth`) | M | 5 | Sign 3+ players who played for both sides in one Matchday XI. |
| 64 | 📣 Twelfth Man (`md150`) | M | 5 | Score 150+ goals in a Matchday XI. |
| 65 | 🎟️ Matchday Regular (`mdseason`) | M | 5 | Play the Matchday XI on 5 different matchdays. |
| 66 | 🔮 Pundit (`mdpundit`) | M | 5 | Get the pre-match Footle in 3 guesses or fewer. |
| 67 | 🔥 Derby Day (`mdderby`) | S | 10 | Play a Matchday XI on derby day. |
| 68 | 🌍 International Duty (`ibfirst`) | L | 5 | Finish an International XI during an international break. |
| 69 | 🌟 Golden Generation (`ib250`) | M | 10 | Score 250+ goals in an International XI. |
| 70 | 🧳 World Tour (`ibtour`) | M | 5 | Build International XIs for 5 different countries. |
| 71 | 📈 In the Black (`mbprofit`) | M | 10 | Finish a Moneyball season worth £150m or more. |
| 72 | 💎 Buy Low, Sell High (`mbflip`) | M | 10 | Sell a player for double what you paid in Moneyball. |
| 73 | 📨 Sold to Madrid (`mbmadrid`) | M | 5 | Accept a big-money bid for one of your stars. |
| 74 | 🍾 Champions! (`mbchamp`) | H | 10 | Win the league as the Dodgy Owner. |
| 75 | 🛡️ Unbeaten Season (`mbinvincible`) | H | 10 | Go a whole Dodgy Owner season unbeaten. |
| 76 | 🏁 Cup Run (`mbcup`) | M | 10 | Win the Cup as the Dodgy Owner. |
| 77 | 🔍 Under Investigation (`mbheat`) | M | 5 | Finish a Dodgy Owner season with the heat at 80 or more. |
| 78 | 😇 Squeaky Clean (`mbclean`) | M | 10 | Finish in the top half with no heat at all. |
| 79 | 📣 Owner Out (`mbout`) | S | 10 | Get forced out by your own fans. |
| 80 | 🌠 Living the Dream (`mbdream`) | M | 5 | Achieve your owner’s ambition in Dodgy Owner. |
| 81 | ⚔️ First Blood (`mbroyal`) | S | 10 | Win a Goal Royale battle. |
| 82 | 🦁 Big Time (`mbarena`) | S | 10 | Reach the Premier League arena in Goal Royale. |
| 83 | 👑 Long Live the Owner (`mbreign`) | S | 10 | Reign for a whole season in Reign Check. |
| 84 | 🗿 Statue (`mbstatue`) | S | 5 | Get flattened by your own statue in Reign Check. |
| 85 | 🎁 Pack Opener (`colpack`) | L | 5 | Open your first pack. |
| 86 | 🚶 Walkout (`colwalk`) | M | 5 | Pull a Legend in a pack. |
| 87 | 🟡 Gold Standard (`colgold`) | M | 10 | Finish a Gold card. |
| 88 | 🟣 Legendary (`collegend`) | H | 10 | Finish a Legend card. |
| 89 | 🃏 Fully Packed (`colxi`) | H | 10 | Fill all 11 places in your Packed XI. |
| 90 | 🏴 Home Nations (`ibhome`) | S | 10 | Build International XIs for England, Scotland, Wales and Northern Ireland. |
| 91 | 🎮 Getting Going (`g25`) | L | 5 | Play 25 games. |
| 92 | 💯 Centurion (`g100`) | M | 10 | Play 100 games. |
| 93 | 🛋️ Part of the Furniture (`g500`) | H | 25 | Play 500 games. |
| 94 | 🥉 Climbing the Pyramid (`lv10`) | M | 10 | Reach level 10 (League Two). |
| 95 | 🦁 Top Flight (`lv30`) | H | 15 | Reach level 30 (Premier League). |
| 96 | 🎖️ Ballon d’Or (`lv50`) | H | 25 | Reach level 50. |
| 97 | 🌅 A Hundred Days (`daily100`) | H | 25 | Play the Daily Ultimate on 100 different days. |
| 98 | 📦 Pack Mentality (`pk50`) | H | 15 | Open 50 packs. |
| 99 | ☠️ Extreme Measures (`extreme`) | M | 10 | Finish a draft in Extreme. |
| 100 | ⚔️ Ruthless (`onwin25`) | H | 15 | Win 25 online games. |

## 💡 Idea pool: the next 150 (all 5 points unless noted)

Not agreed, just a stock to pick from so the list can grow towards 250 without scrambling. Roughly in the order I'd add them.

**Time and habit:** Pack Habit (10 packs) · Set Builder (finish 25 cards) · Cabinet Full (50 badges) · Trophy Hunter (25 badges) · a Week of Dailies (every daily game in one day) · Early Bird (a daily before 8am) · Comeback Kid (return after 30 days away) · 200 / 365 Days · Daily streak 60 and 100 · games played 1,000 · levels 5, 15, 20, 40 (one per rank).
**Skill and scores:** Hard Graft (400+ goals on Hard) · 500+ on Hard (10) · 450 / 550 Ultimate (10) · Perfect Stat Days: 300+ assists, 5,000+ apps · a score badge per mode (Classic, Purist, Treble, Club, CHAOS Extreme) · Extreme 400+ (10) · Bullseye three times · Treble on Hard (10).
**Collecting:** World Beaters (all World Cup winners) · Century Makers (all 100-goal players) · Euro Nights (all Champions League winners, 10) · One-Club Men (all, 10) · Collect 1,500 / every player in the Album (25) · Purist 1,000 / 2,500 / 5,000 (every PL player) · finish 10 / 50 / 150 Gold cards · finish 5 / 20 Legends · Packed XI over a set total · a pack with three Golds · a pack of all Silver or better · open 10 / 100 / 250 packs · a Legend's Choice pick · use every kind of wildcard.
**Quick games:** a third tier for each (Club Hopper 30, Higher or Lower 50, Who Am I? 4,500, Tally 900) · Grid in under a minute · Who Am I? first-guess · Footle: first win, in 2, 10 wins, a 7-win streak, a perfect month · Matchday Footle streak.
**Matchdays and breaks:** Matchday XI for your club 10 times · a derby twice · every Home Nation (done) plus 10 / 20 countries · Golden Generation on Hard · Matchday Hat-Trick (three days running).
**CHAOS:** each event seen (a handful of fun ones, e.g. tornado, lightning, the coin x5) · 1,500 points (10) · three Double or Nothing wins in a row · survive an All In · see five different moments in one game · a Legend moment twice.
**Money games:** Moneyball £250m (10) · Transfer Window and Auction badges (none yet): win an auction, spend the whole budget, sign a Legend · Dodgy Owner: win the league twice, survive three seasons, a clean cup run, the sack before Christmas (hidden) · Goal Royale / Reign Check / Hat-Trick second tiers.
**Online:** finish 10 / 50 games · win a Scout Duel, Target Race, Hat-Trick online · win a Quick match · win the weekly league (10) · add 3 friends · a 5-win streak · beat the same friend 3 times.
**Social and setup:** pick your club · set an avatar · share a picture of your XI · share your day · top the board in any mode (10) · top ten in any mode · join a club v club week · rename yourself.
**Hidden and silly (plenty more room here):** a goals draft of exactly 100 / 365 / 1,000 · all 11 from one nation · an all-keeper style joke (every position the same) · play on New Year's Day / Christmas · play on 1 April · finish on exactly 0 · the same player three games in a row · sign the same player in every draft for a week · get sacked three times · every wildcard Rotation Risk.

## Things to watch

- **Names must be unique** in Play; the three renames fix the clashes.
- **Fragile CHAOS secrets:** The Slip, Dilly Ding, Fergie Time, We Are Not Alone and Pigeon Fancier match on event/manager names (`Alien abduction`, `Pitch invader`, `Manager sacked!`). Renaming a CHAOS event silently breaks its badge; move them to event ids before launch.
- **Thresholds are guesses** (Who Am I? 3,000, Guess the Tally 700, Moneyball £150m…). Check them against real play once testers have scores.
- **Hat-Trick, Goal Royale and Reign Check are betas:** a published achievement can't be deleted, so if one of those games is dropped its hidden achievement stays in Play for good. Worth being sure we keep them before launch.
- Play can't take an unlocked achievement back; removing a badge later only removes it from the console list.
