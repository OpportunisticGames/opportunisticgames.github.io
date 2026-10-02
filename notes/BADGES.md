# 🏅 Badges for the Google Play launch

Plan agreed in discussion (2 Oct 2026): **100 badges, each one a Play Games achievement.** Nothing here is built yet; this is the proposed list. Tiers: **L** light (the first few sessions), **M** moderate (days to weeks), **H** heavy (months), **S** hidden (shown as ??? until found).

Totals: 100 badges: L 14 · M 47 · H 25 · S 14. (Now: 95. Cut 12, add 17.)

Google limits: 400 achievements for the game's whole life (deleted ones count), 2,000 points in total (5-point steps, 200 max each). Suggested points: L 5, M 10–15, H 25–40, S 15–20 = about 1,700, leaving room to grow.

## ✂️ Cut (12)

| Badge | Why |
|---|---|
| 🃏 Card Sharp (`htwin`) | beta secret game (Hat-Trick); add when it leaves beta |
| 🤐 Clean Sheet (`htnil`) | beta secret game (Hat-Trick) |
| ⚔️ First Blood (`mbroyal`) | secret game (Goal Royale); would spoil it in Play |
| 🦁 Big Time (`mbarena`) | secret game (Goal Royale) |
| 👑 Long Live the Owner (`mbreign`) | secret game (Reign Check) |
| 🗿 Statue (`mbstatue`) | secret game (Reign Check) |
| ☠️ Dead Rubber (`relegated`) | a "do badly" badge; not a good fit for Play |
| 🥵 No Clues (`hard`) | too easy and unclear; replaced by Hard Graft |
| 🎲 Mystery Solved (`mystery`) | near-duplicate of Near Miss |
| 📉 Going Down (`down5`) | relies on relegation data with known gaps |
| 🪂 Yo-Yo Club (`sdown`) | relies on relegation data with known gaps |
| ⚔️ Club v Country (`ibclub`) | niche, needs a favourite club |

## ✏️ Renamed (3)

| Was | Now | Why |
|---|---|---|
| Invincibles (`mbinvincible`) | Unbeaten Season | clashes with Invincibles |
| Season Ticket (`daily7`) | Seven Up | clashes with Season Ticket |
| Season Ticket (`mdseason`) | Matchday Regular | clashes with Season Ticket |

## ➕ New (17)

| Badge | Tier | Needs |
|---|---|---|
| 🎮 **Getting Going** (`g25`): Play 25 games. | L | Games played (`played`) |
| 💯 **Centurion** (`g100`): Play 100 games. | M | Games played |
| 🛋️ **Part of the Furniture** (`g500`): Play 500 games. | H | Games played |
| 🥉 **Climbing the Pyramid** (`lv10`): Reach level 10 (League Two). | M | `GM.myLevel().n` |
| 🦁 **Top Flight** (`lv30`): Reach level 30 (Premier League). | H | `GM.myLevel().n` |
| 🏆 **Ballon d’Or** (`lv50`): Reach level 50. | H | `GM.myLevel().n` |
| 🗓️ **A Hundred Days** (`daily100`): Play the Daily Ultimate on 100 different days. | H | `dlog` (the Album keeps only 60 days) |
| 🎁 **Pack Habit** (`pk10`): Open 10 packs. | M | `cards.opened` |
| 📦 **Pack Mentality** (`pk50`): Open 50 packs. | H | `cards.opened` |
| 🧩 **Set Builder** (`fin25`): Finish 25 player cards. | M | `GM.cardsFinished()` |
| 🌍 **World Beaters** (`setwc`): Collect every World Cup winner (43). | H | existing set `wc` |
| 💯 **Century Makers** (`set100`): Collect every player with 100+ goals (35). | H | existing set `100` |
| 🥵 **Hard Graft** (`hardx`): Score 400+ goals in Ultimate Wildcard on Hard. | M | `hard` already on the draft event |
| ☠️ **Extreme Measures** (`extreme`): Finish a draft in Extreme. | M | needs an `extreme` flag on the draft event |
| 🟩 **Footle in Two** (`footle2`): Win the daily Footle in 2 guesses or fewer. | M | needs a `checkGame` call in `daily.js` |
| ⚔️ **Ruthless** (`onwin25`): Win 25 online games. | H | `online.wins` |
| 🏅 **Cabinet Full** (`badges50`): Earn 50 badges. | H | count of earned badges |

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
| 12 | 🤝 Band of Brothers (`chem5`) | M | Have 5+ pairs of former teammates in one XI. |
| 13 | 🏛️ Hall of Fame XI (`hof3`) | M | Sign 3+ Hall of Famers in one XI. |
| 14 | 🌍 World Champions (`wc2`) | M | Sign 2+ World Cup winners in one XI. |
| 15 | 🏟️ Club Legends (`club5`) | L | Have 5+ players from the same club in one XI. |
| 16 | 🃏 Wildcard Wizard (`wild5`) | L | Use 5 wildcards in one game. |
| 17 | 🎲 Fortune Favours (`coin`) | L | Win a Double or Nothing coin toss. |
| 18 | 🌪️ Agent of Chaos (`chaos`) | M | Score 500+ points in Ultimate Wildcard CHAOS (goals). |
| 19 | 🧣 Proper Fan (`fan6`) | M | Have 6+ players who played for your club in one XI (not in a Club or Matchday XI). |
| 20 | 🗓️ Lifers (`lifers`) | H | Every player in your XI had a PL career spanning 10+ seasons. |
| 21 | 💥 Total Anarchy (`cx1000`) | H | Score 1,000+ points in CHAOS (goals). |
| 22 | 📰 Vote of No Confidence (`cxsack`) | M | Get your manager sacked in CHAOS. |
| 23 | ✨ Once in a Lifetime (`cxleg`) | H | See a legendary CHAOS moment. |
| 24 | ⚡ Meltdown (`cxmeter`) | M | Fill the CHAOS meter 3 times in one game. |
| 25 | 👍 Gaffer’s Favourites (`cxgaffer`) | M | Sign 6+ players your manager likes in one CHAOS XI. |
| 26 | 📅 Regular (`daily3`) | L | Play the Daily Ultimate 3 days in a row. |
| 27 | 🗓️ Seven Up (`daily7`) | M | Play the Daily Ultimate 7 days in a row. |
| 28 | 🦘 Globetrotter (`hop10`) | L | Make 10 hops in Club Hopper. |
| 29 | ✈️ Frequent Flyer (`hop20`) | M | Make 20 hops in Club Hopper. |
| 30 | ↕️ Streaker (`hilo10`) | L | Get 10 in a row in Higher or Lower. |
| 31 | 🔥 On Fire (`hilo25`) | M | Get 25 in a row in Higher or Lower. |
| 32 | 🕵️ Detective (`who3000`) | M | Score 3,000+ in Who Am I? |
| 33 | #️⃣ Full House (`grid`) | M | Fill a whole Club Grid. |
| 34 | 🔢 Human Calculator (`tally700`) | M | Score 700+ in Guess the Tally. |
| 35 | 📒 Scout (`col100`) | M | Collect 100 players. |
| 36 | 🔭 Chief Scout (`col500`) | H | Collect 500 players. |
| 37 | 📚 Encyclopedia (`col1000`) | H | Collect 1,000 players. |
| 38 | 🏛️ Pantheon (`hofall`) | H | Collect every Hall of Famer. |
| 39 | 👟 Boot Room (`gball`) | H | Collect every Golden Boot winner. |
| 40 | 📆 Ever Present (`daily14`) | M | Play the Daily Ultimate 14 days in a row. |
| 41 | 🏟️ Season Ticket Holder (`daily30`) | H | Play the Daily Ultimate 30 days in a row. |
| 42 | 🌐 Kick-off (`on1`) | L | Finish your first online game. |
| 43 | ⚔️ Away Win (`onwin`) | L | Win an online game. |
| 44 | 🏅 Serial Winners (`onwin10`) | M | Win 10 online games. |
| 45 | 👥 Beat Them All (`onbeat5`) | M | Beat 5 different friends online. |
| 46 | 🎮 All-Rounder (`onall`) | H | Win a Draft Duel, a Live Race and a Transfer Auction. |
| 47 | 🌀 Chaos Merchant (`onchaos`) | M | Win a CHAOS Race. |
| 48 | 🔢 The Magic Number (`s442`) | S | Build an XI with exactly 442 goals. |
| 49 | 🇦🇷 AGÜEROOOO (`saguero`) | S | Sign Sergio Agüero in a draft. |
| 50 | 🚌 Parked the Bus (`sbus`) | S | Finish a goals draft with under 40 goals. |
| 51 | 💙 Club Till I Die (`sloyal`) | S | Have 8+ players from the same club in one XI. |
| 52 | 🦉 Night Owl (`sowl`) | S | Finish a draft between midnight and 4am. |
| 53 | ☄️ One-Season Wonders (`sonce`) | S | Have 3+ players who only had one PL season in one XI. |
| 54 | 🍌 The Slip (`cxslip`) | S | Steven Gerrard finishes a CHAOS game on 0. |
| 55 | 🦊 Dilly Ding, Dilly Dong (`cxdilly`) | S | Ranieri in the dugout with 3+ Leicester players. |
| 56 | ⌚ Fergie Time (`cxfergie`) | S | Fergie in the dugout with 5+ Man Utd players. |
| 57 | 🛸 We Are Not Alone (`cxaliens`) | S | Witness an alien abduction in CHAOS. |
| 58 | 🐦 Pigeon Fancier (`cxpigeon`) | S | A pigeon lands on your pitch in CHAOS. |
| 59 | 🏟️ Matchday (`mdfirst`) | L | Play a Matchday XI when your club’s on. |
| 60 | 🤝 Split Loyalties (`mdboth`) | M | Sign 3+ players who played for both sides in one Matchday XI. |
| 61 | 📣 Twelfth Man (`md150`) | M | Score 150+ goals in a Matchday XI. |
| 62 | 🎟️ Matchday Regular (`mdseason`) | M | Play the Matchday XI on 5 different matchdays. |
| 63 | 🔮 Pundit (`mdpundit`) | M | Get the pre-match Footle in 3 guesses or fewer. |
| 64 | 🔥 Derby Day (`mdderby`) | S | Play a Matchday XI on derby day. |
| 65 | 🌍 International Duty (`ibfirst`) | L | Finish an International XI during an international break. |
| 66 | 🌟 Golden Generation (`ib250`) | M | Score 250+ goals in an International XI. |
| 67 | 🧳 World Tour (`ibtour`) | M | Build International XIs for 5 different countries. |
| 68 | 📈 In the Black (`mbprofit`) | M | Finish a Moneyball season worth £150m or more. |
| 69 | 💎 Buy Low, Sell High (`mbflip`) | M | Sell a player for double what you paid in Moneyball. |
| 70 | 📨 Sold to Madrid (`mbmadrid`) | M | Accept a big-money bid for one of your stars. |
| 71 | 🏆 Champions! (`mbchamp`) | H | Win the league as the Dodgy Owner. |
| 72 | 🛡️ Unbeaten Season (`mbinvincible`) | H | Go a whole Dodgy Owner season unbeaten. |
| 73 | 🏆 Cup Run (`mbcup`) | M | Win the Cup as the Dodgy Owner. |
| 74 | 🔥 Under Investigation (`mbheat`) | M | Finish a Dodgy Owner season with the heat at 80 or more. |
| 75 | 😇 Squeaky Clean (`mbclean`) | M | Finish in the top half with no heat at all. |
| 76 | 📣 Owner Out (`mbout`) | S | Get forced out by your own fans. |
| 77 | 🎯 Living the Dream (`mbdream`) | M | Achieve your owner’s ambition in Dodgy Owner. |
| 78 | 🎁 Pack Opener (`colpack`) | L | Open your first pack. |
| 79 | 🚶 Walkout (`colwalk`) | M | Pull a Legend in a pack. |
| 80 | 🟡 Gold Standard (`colgold`) | M | Finish a Gold card. |
| 81 | 🟣 Legendary (`collegend`) | H | Finish a Legend card. |
| 82 | 🃏 Fully Packed (`colxi`) | H | Fill all 11 places in your Packed XI. |
| 83 | 🏴 Home Nations (`ibhome`) | S | Build International XIs for England, Scotland, Wales and Northern Ireland. |
| 84 | 🎮 Getting Going (`g25`) | L | Play 25 games. |
| 85 | 💯 Centurion (`g100`) | M | Play 100 games. |
| 86 | 🛋️ Part of the Furniture (`g500`) | H | Play 500 games. |
| 87 | 🥉 Climbing the Pyramid (`lv10`) | M | Reach level 10 (League Two). |
| 88 | 🦁 Top Flight (`lv30`) | H | Reach level 30 (Premier League). |
| 89 | 🏆 Ballon d’Or (`lv50`) | H | Reach level 50. |
| 90 | 🗓️ A Hundred Days (`daily100`) | H | Play the Daily Ultimate on 100 different days. |
| 91 | 🎁 Pack Habit (`pk10`) | M | Open 10 packs. |
| 92 | 📦 Pack Mentality (`pk50`) | H | Open 50 packs. |
| 93 | 🧩 Set Builder (`fin25`) | M | Finish 25 player cards. |
| 94 | 🌍 World Beaters (`setwc`) | H | Collect every World Cup winner (43). |
| 95 | 💯 Century Makers (`set100`) | H | Collect every player with 100+ goals (35). |
| 96 | 🥵 Hard Graft (`hardx`) | M | Score 400+ goals in Ultimate Wildcard on Hard. |
| 97 | ☠️ Extreme Measures (`extreme`) | M | Finish a draft in Extreme. |
| 98 | 🟩 Footle in Two (`footle2`) | M | Win the daily Footle in 2 guesses or fewer. |
| 99 | ⚔️ Ruthless (`onwin25`) | H | Win 25 online games. |
| 100 | 🏅 Cabinet Full (`badges50`) | H | Earn 50 badges. |

## Things to watch

- **Hidden-name clash check:** every achievement name must be unique; the three renames fix the clashes.
- **Fragile CHAOS secrets:** The Slip, Dilly Ding, Fergie Time, We Are Not Alone and Pigeon Fancier match on event/manager names (`Alien abduction`, `Pitch invader`, `Manager sacked!`). Renaming a CHAOS event silently breaks its badge; move them to event ids before launch.
- **Thresholds are guesses** (Who Am I? 3,000, Guess the Tally 700, Moneyball £150m…). Check them against real play once testers have scores.
- **Secret games** (Hat-Trick, Goal Royale, Reign Check) have no achievements for now so Play doesn't reveal them; add them when they leave beta.
- Play can't take an unlocked achievement back; removing a badge later only removes it from the console list.
