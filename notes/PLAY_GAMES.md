# 🎮 Google Play Games: leaderboards, events and game stats

Proposal (2 Oct 2026), after the 100 achievements went live. Nothing is built yet. The pattern is the same as the
achievements: you create the items in Play Console, the app finds each one **by name** (no ids in the code).

## What Google says (checked in the docs)
- **Leaderboards:** up to 70, **created one at a time** in the console (no import). Daily / weekly / all-time views come free
  (they reset at UTC-7, not midnight UTC). **Larger/smaller-is-better can't change once published.** Name, icon, description
  and score limits can. Leaderboards can't be hidden, so no secret-game ones.
- **Events:** counters you increment, **for our own analytics** in Play Console (not shown to players that I could find).
  Created one at a time. Can be edited and deleted after publishing, so low risk.
- **Game Stats (new, Gamer Profile "You" tab from Sept 2026):** up to 50 stats shown on the player's profile. Needs the
  Play Games library **22.x or newer** (we're on 21.0.0), an event schema CSV and a stats ZIP (with icons) uploaded in the console.
  Stats count from when the player updates (no history), except one progress stat which is absolute. No stat may need a
  purchase or ads.

## 🏆 Leaderboards (proposed 12, all "larger is better", Normal difficulty only)
| Name | Our board | Format |
|---|---|---|
| Ultimate Wildcard: Goals | `ultimate` | whole number, "goals" |
| Ultimate Wildcard: Assists | `ultimateast` | "assists" |
| Ultimate Wildcard: Apps | `ultimateapps` | "apps" |
| CHAOS: Points | `chaos` | "pts" |
| Daily Ultimate | `daily` | "goals" (Google's daily view resets at UTC-7, ours at UTC midnight) |
| Moneyball: Squad Value | `money` | "£m" |
| Dodgy Owner | `owner` | whole number |
| Packed XI | `packedxi` | "goals" |
| Club Hopper | `hopper` | "hops" |
| Higher or Lower | `hilo` | "in a row" |
| Who Am I? | `whoami` | points |
| Guess the Tally | `tally` | points |

Left out on purpose: Hard and Extreme boards (scores aren't comparable; can be added later as their own boards), Target and
Treble (the score is how close you got), the secret games (Hat-Trick, Goal Royale, Reign Check: a leaderboard can't be hidden).

## 📊 Events (proposed 10, analytics only)
Drafts finished · Daily games played · Packs opened · Cards finished · Badges unlocked · Online games finished · Online games
won · Quick games played (Hopper, Higher or Lower, Who Am I?, Grid, Tally) · Money games played (Moneyball, Dodgy Owner,
Transfer Window) · CHAOS games played.

## 📈 Game Stats (proposed 12, shown on the Play Games profile)
Games played · XIs built · Best Ultimate score (max) · Best CHAOS score (max) · Packs opened · Cards finished · Badges earned ·
Daily streak (best, max) · Online games won · Online games played · Players collected · and the one **progress** stat:
**Level** (absolute, so it's right from day one).
Events we send (checked against the console schema): `gameCompleted` {mode, score, isDaily}, `packOpened`, `cardFinished`,
`badgeUnlocked`, `onlineGameFinished` {won}, `progressUpdate` {currentProgress = level}.

## Order of work
1. You say yes/no/changes to the lists above.
2. I make the sheets: icons (512 px), the exact name/format/order for each leaderboard and event, and the two game stats files.
3. You create them in Play Console (leaderboards and events by hand, game stats by zip) and **publish**.
4. I bump the library to 22.x, wire scores, events and stats into `Achievements.java` and `collection.js`, and test.
