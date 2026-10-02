# Play Games achievements (100 for launch)

Built from `notes/BADGES.md`. `goal-machine-achievements.zip` is what Play Console's **Import achievements** takes:
`AchievementsMetadata.csv` (name, description, hidden/revealed, points, order), `AchievementsIconsMappings.csv` and 100
512x512 icons (green easy, blue moderate, gold heavy, purple hidden).

1. Play Console > your game > Grow users > Play Games Services > Setup and management > Achievements > **Import achievements**, upload the zip.
`goal-machine-incremental-only.zip` has just the 16 counters (progress-bar achievements), for replacing those in a draft.
2. Check the preview (100 achievements, 880 points, 20 hidden), then **save as draft**. A published achievement can't be deleted
   and can't change between hidden and visible, so read it through before publishing.
3. Copy each achievement's ID (looks like `CgkI...`) into `badge-ids.csv`, last column, and send it back.

The two CSVs have no header row (Play treats every line as an achievement). Icons are made by `make_icons.js`.
