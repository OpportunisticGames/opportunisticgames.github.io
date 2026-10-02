# 🏅 Badges for the Google Play launch

Plan agreed in discussion (2 Oct 2026): **100 badges, each one a Play Games achievement.** Nothing here is built yet; this is the proposed list. Tiers: **L** light (the first few sessions), **M** moderate (days to weeks), **H** heavy (months), **S** hidden (shown as ??? in the game and as a hidden achievement in Play until found).

Totals: 100 badges: L 15 · M 43 · H 22 · S 20. (Now: 95. Cut 5, add 10.)

Google limits: 400 achievements for the game's whole life (deleted ones count), 2,000 points in total (5-point steps, 200 max each), and at least 10 visible ones. Suggested points: L 5, M 10–15, H 25–40, S 15–20, about 1,700 in all, leaving room to grow.

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
| 🏆 **Ballon d’Or** (`lv50`): Reach level 50. | H | `GM.myLevel().n` |
| 🗓️ **A Hundred Days** (`daily100`): Play the Daily Ultimate on 100 different days. | H | `dlog` (the Album keeps only 60 days) |
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

| # | Badge | Tier | What for |
|---|---|---|---|
| 1 | 🥅 First XI (`first`) | L | Finish your first draft. |
| 2 | 🥉 300 Club (`ult300`) | L | Score 300+ goals in Ultimate Wildcard. |
| 3 | 🥈 400 Club (`ult400`) | M | Score 400+ goals in Ultimate Wildcard. |
| 4 | 🥇 Goal Machine (`ult500`) | H | Score 500+ goals in Ultimate Wildcard. |
| 5 | 🅰️ Creator (`ast250`) | M | Build an XI with 250+ assists in Ultimate Wildcard. |
| 6 | 🏃 Iron Men (`apps4000`) | M | Build an XI with 4,000+ apps in Ultimate Wildcard. |
| 7 | 🎯 Bullseye (`bull`) | M | Hit a Target exactly. |
| 8 | 🏆 Treble Winners (`treble`) | H | Win the Treble – goals, assists and apps all within 3%. |
| 9 | 📏 Near Miss (`close`) | M | Finish within 2% of a Target. |
| 10 | 🏆 Title Race (`contenders`) | M | Get a Title contenders squad rating (or better). |
| 11 | 👑 Invincibles (`invincible`) | H | Get an Invincibles squad rating. |
| 12 | ☠️ Dead Rubber (`relegated`) | L | Finish with a Relegation certainties squad. It happens. |
| 13 | 🤝 Band of Brothers (`chem5`) | M | Have 5+ pairs of former teammates in one XI. |
| 14 | 🏛️ Hall of Fame XI (`hof3`) | M | Sign 3+ Hall of Famers in one XI. |
| 15 | 🌍 World Champions (`wc2`) | M | Sign 2+ World Cup winners in one XI. |
| 16 | 🏟️ Club Legends (`club5`) | L | Have 5+ players from the same club in one XI. |
| 17 | 🃏 Wildcard Wizard (`wild5`) | L | Use 5 wildcards in one game. |
| 18 | 🎲 Fortune Favours (`coin`) | L | Win a Double or Nothing coin toss. |
| 19 | 🌪️ Agent of Chaos (`chaos`) | M | Score 500+ points in Ultimate Wildcard CHAOS (goals). |
| 20 | 🧣 Proper Fan (`fan6`) | M | Have 6+ players who played for your club in one XI (not in a Club or Matchday XI). |
| 21 | 🗓️ Lifers (`lifers`) | H | Every player in your XI had a PL career spanning 10+ seasons. |
| 22 | 💥 Total Anarchy (`cx1000`) | H | Score 1,000+ points in CHAOS (goals). |
| 23 | 📰 Vote of No Confidence (`cxsack`) | M | Get your manager sacked in CHAOS. |
| 24 | ✨ Once in a Lifetime (`cxleg`) | H | See a legendary CHAOS moment. |
| 25 | ⚡ Meltdown (`cxmeter`) | M | Fill the CHAOS meter 3 times in one game. |
| 26 | 👍 Gaffer’s Favourites (`cxgaffer`) | M | Sign 6+ players your manager likes in one CHAOS XI. |
| 27 | 📅 Regular (`daily3`) | L | Play the Daily Ultimate 3 days in a row. |
| 28 | 🗓️ Seven Up (`daily7`) | M | Play the Daily Ultimate 7 days in a row. |
| 29 | 🦘 Globetrotter (`hop10`) | L | Make 10 hops in Club Hopper. |
| 30 | ✈️ Frequent Flyer (`hop20`) | M | Make 20 hops in Club Hopper. |
| 31 | ↕️ Streaker (`hilo10`) | L | Get 10 in a row in Higher or Lower. |
| 32 | 🔥 On Fire (`hilo25`) | M | Get 25 in a row in Higher or Lower. |
| 33 | 🕵️ Detective (`who3000`) | M | Score 3,000+ in Who Am I? |
| 34 | #️⃣ Full House (`grid`) | M | Fill a whole Club Grid. |
| 35 | 🔢 Human Calculator (`tally700`) | M | Score 700+ in Guess the Tally. |
| 36 | 🃏 Card Sharp (`htwin`) | S | Win a game of Hat-Trick. |
| 37 | 🤐 Clean Sheet (`htnil`) | S | Make a Nil bid in Hat-Trick. |
| 38 | 📒 Scout (`col100`) | M | Collect 100 players. |
| 39 | 🔭 Chief Scout (`col500`) | H | Collect 500 players. |
| 40 | 📚 Encyclopedia (`col1000`) | H | Collect 1,000 players. |
| 41 | 🏛️ Pantheon (`hofall`) | H | Collect every Hall of Famer. |
| 42 | 👟 Boot Room (`gball`) | H | Collect every Golden Boot winner. |
| 43 | 📆 Ever Present (`daily14`) | M | Play the Daily Ultimate 14 days in a row. |
| 44 | 🏟️ Season Ticket Holder (`daily30`) | H | Play the Daily Ultimate 30 days in a row. |
| 45 | 🌐 Kick-off (`on1`) | L | Finish your first online game. |
| 46 | ⚔️ Away Win (`onwin`) | L | Win an online game. |
| 47 | 🏅 Serial Winners (`onwin10`) | M | Win 10 online games. |
| 48 | 👥 Beat Them All (`onbeat5`) | M | Beat 5 different friends online. |
| 49 | 🎮 All-Rounder (`onall`) | H | Win a Draft Duel, a Live Race and a Transfer Auction. |
| 50 | 🌀 Chaos Merchant (`onchaos`) | M | Win a CHAOS Race. |
| 51 | 🔢 The Magic Number (`s442`) | S | Build an XI with exactly 442 goals. |
| 52 | 🇦🇷 AGÜEROOOO (`saguero`) | S | Sign Sergio Agüero in a draft. |
| 53 | 🚌 Parked the Bus (`sbus`) | S | Finish a goals draft with under 40 goals. |
| 54 | 💙 Club Till I Die (`sloyal`) | S | Have 8+ players from the same club in one XI. |
| 55 | 🦉 Night Owl (`sowl`) | S | Finish a draft between midnight and 4am. |
| 56 | ☄️ One-Season Wonders (`sonce`) | S | Have 3+ players who only had one PL season in one XI. |
| 57 | 🍌 The Slip (`cxslip`) | S | Steven Gerrard finishes a CHAOS game on 0. |
| 58 | 🦊 Dilly Ding, Dilly Dong (`cxdilly`) | S | Ranieri in the dugout with 3+ Leicester players. |
| 59 | ⌚ Fergie Time (`cxfergie`) | S | Fergie in the dugout with 5+ Man Utd players. |
| 60 | 🛸 We Are Not Alone (`cxaliens`) | S | Witness an alien abduction in CHAOS. |
| 61 | 🐦 Pigeon Fancier (`cxpigeon`) | S | A pigeon lands on your pitch in CHAOS. |
| 62 | 🏟️ Matchday (`mdfirst`) | L | Play a Matchday XI when your club’s on. |
| 63 | 🤝 Split Loyalties (`mdboth`) | M | Sign 3+ players who played for both sides in one Matchday XI. |
| 64 | 📣 Twelfth Man (`md150`) | M | Score 150+ goals in a Matchday XI. |
| 65 | 🎟️ Matchday Regular (`mdseason`) | M | Play the Matchday XI on 5 different matchdays. |
| 66 | 🔮 Pundit (`mdpundit`) | M | Get the pre-match Footle in 3 guesses or fewer. |
| 67 | 🔥 Derby Day (`mdderby`) | S | Play a Matchday XI on derby day. |
| 68 | 🌍 International Duty (`ibfirst`) | L | Finish an International XI during an international break. |
| 69 | 🌟 Golden Generation (`ib250`) | M | Score 250+ goals in an International XI. |
| 70 | 🧳 World Tour (`ibtour`) | M | Build International XIs for 5 different countries. |
| 71 | 📈 In the Black (`mbprofit`) | M | Finish a Moneyball season worth £150m or more. |
| 72 | 💎 Buy Low, Sell High (`mbflip`) | M | Sell a player for double what you paid in Moneyball. |
| 73 | 📨 Sold to Madrid (`mbmadrid`) | M | Accept a big-money bid for one of your stars. |
| 74 | 🏆 Champions! (`mbchamp`) | H | Win the league as the Dodgy Owner. |
| 75 | 🛡️ Unbeaten Season (`mbinvincible`) | H | Go a whole Dodgy Owner season unbeaten. |
| 76 | 🏆 Cup Run (`mbcup`) | M | Win the Cup as the Dodgy Owner. |
| 77 | 🔥 Under Investigation (`mbheat`) | M | Finish a Dodgy Owner season with the heat at 80 or more. |
| 78 | 😇 Squeaky Clean (`mbclean`) | M | Finish in the top half with no heat at all. |
| 79 | 📣 Owner Out (`mbout`) | S | Get forced out by your own fans. |
| 80 | 🎯 Living the Dream (`mbdream`) | M | Achieve your owner’s ambition in Dodgy Owner. |
| 81 | ⚔️ First Blood (`mbroyal`) | S | Win a Goal Royale battle. |
| 82 | 🦁 Big Time (`mbarena`) | S | Reach the Premier League arena in Goal Royale. |
| 83 | 👑 Long Live the Owner (`mbreign`) | S | Reign for a whole season in Reign Check. |
| 84 | 🗿 Statue (`mbstatue`) | S | Get flattened by your own statue in Reign Check. |
| 85 | 🎁 Pack Opener (`colpack`) | L | Open your first pack. |
| 86 | 🚶 Walkout (`colwalk`) | M | Pull a Legend in a pack. |
| 87 | 🟡 Gold Standard (`colgold`) | M | Finish a Gold card. |
| 88 | 🟣 Legendary (`collegend`) | H | Finish a Legend card. |
| 89 | 🃏 Fully Packed (`colxi`) | H | Fill all 11 places in your Packed XI. |
| 90 | 🏴 Home Nations (`ibhome`) | S | Build International XIs for England, Scotland, Wales and Northern Ireland. |
| 91 | 🎮 Getting Going (`g25`) | L | Play 25 games. |
| 92 | 💯 Centurion (`g100`) | M | Play 100 games. |
| 93 | 🛋️ Part of the Furniture (`g500`) | H | Play 500 games. |
| 94 | 🥉 Climbing the Pyramid (`lv10`) | M | Reach level 10 (League Two). |
| 95 | 🦁 Top Flight (`lv30`) | H | Reach level 30 (Premier League). |
| 96 | 🏆 Ballon d’Or (`lv50`) | H | Reach level 50. |
| 97 | 🗓️ A Hundred Days (`daily100`) | H | Play the Daily Ultimate on 100 different days. |
| 98 | 📦 Pack Mentality (`pk50`) | H | Open 50 packs. |
| 99 | ☠️ Extreme Measures (`extreme`) | M | Finish a draft in Extreme. |
| 100 | ⚔️ Ruthless (`onwin25`) | H | Win 25 online games. |

## Things to watch

- **Names must be unique** in Play; the three renames fix the clashes.
- **Fragile CHAOS secrets:** The Slip, Dilly Ding, Fergie Time, We Are Not Alone and Pigeon Fancier match on event/manager names (`Alien abduction`, `Pitch invader`, `Manager sacked!`). Renaming a CHAOS event silently breaks its badge; move them to event ids before launch.
- **Thresholds are guesses** (Who Am I? 3,000, Guess the Tally 700, Moneyball £150m…). Check them against real play once testers have scores.
- **Hat-Trick, Goal Royale and Reign Check are betas:** if one is reworked, its hidden achievement stays in Play (an achievement can be deleted but not changed much, and deleted ones count towards the 400).
- Play can't take an unlocked achievement back; removing a badge later only removes it from the console list.
