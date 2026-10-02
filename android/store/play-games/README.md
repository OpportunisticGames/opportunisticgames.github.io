# Play Games: leaderboards and game stats

The app finds each leaderboard **by its exact name** (like the achievements), so create them with these names.

## 🏆 Leaderboards (9): Play Console > Play Games Services > Leaderboards > Create leaderboard
For all nine: **Larger is better** (can't change once published), format **Numeric**, 0 decimal places, no unit,
leave score limits empty, **Save as draft**. Icons are in `leaderboard-icons/`. Put Hard first in the list order: it's the most played.

| List order | Name (exact) | Icon | What it takes |
|---|---|---|---|
| 1 | Ultimate Wildcard (Hard) | `lb_ultimate_hard.png` | goals, Hard |
| 2 | Ultimate Wildcard (Normal) | `lb_ultimate_normal.png` | goals |
| 3 | Ultimate Wildcard (Extreme) | `lb_ultimate_extreme.png` | goals, every PL player |
| 4 | CHAOS (Hard) | `lb_chaos_hard.png` | CHAOS points |
| 5 | CHAOS (Normal) | `lb_chaos_normal.png` | CHAOS points |
| 6 | CHAOS (Extreme) | `lb_chaos_extreme.png` | CHAOS points |
| 7 | Purist (Hard) | `lb_purist_hard.png` | goals, no wildcards, Hard |
| 8 | Purist (Normal) | `lb_purist_normal.png` | goals, no wildcards (the "Ultimate" mode) |
| 9 | Purist (Extreme) | `lb_purist_extreme.png` | goals, no wildcards, every PL player |

Suggested description for each: "The highest [game] score on [level] in Goal Machine."

## 📈 Game Stats
1. Play Games Services > **Game Stats**: upload `PlayerGameEvent.csv` first (the event schema: 6 events).
2. Then upload `goal-machine-game-stats.zip` (19 stats: 18 repeating ones and Level as the progress stat). Everything is at the zip's root.
3. Set them "Available to testers", test, then **Review and publish**.
If an upload complains about the header row, delete the first line of the CSV (the achievements import did).

Stats count from the moment a player updates (no history), except Level, which is absolute. Published stats can't be deleted.
