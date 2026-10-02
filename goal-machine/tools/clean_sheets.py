"""Add each keeper's Premier League clean sheets to the player files (CHAOS counts a keeper's clean sheets).

Usage: SRC=<sources> python3 clean_sheets.py goal-machine/data/players.js [goal-machine/data/players_all.js]
Run after build_players.py (update-data.yml does). Adds column 13 (clean sheets) to every keeper's row; outfield
players get nothing, so the file barely grows.

Sources (fetch_sources.sh puts them in SRC):
  epl-stats   premierleague.com career totals, complete up to GW29 of 2019-20 (our keepers who started before then)
  vaastav FPL season totals (players_raw.csv) from 2016-17, and 2019-20 gameweeks (merged_gw.csv) for GW30 on
A keeper in epl-stats gets: epl-stats + FPL 2019-20 from GW30 + FPL 2020-21 on.
A keeper who isn't (his career began with FPL data, 2016-17 or later) gets every FPL season.
"""
import collections, csv, glob, json, os, re, sys, unicodedata

S = os.environ.get('SRC', os.path.dirname(os.path.abspath(__file__)))
FPL = f'{S}/fpl/data'
CS_COL = 13


def norm(s):
    s = unicodedata.normalize('NFKD', str(s).replace('&#039;', "'"))
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z ]', ' ', s.replace("'", ''))).strip()


def season_start(name):  # '2019-20' -> 2019
    return int(name[:4])


# premierleague.com career totals (keepers only), by name
EPL = collections.defaultdict(list)
for r in csv.DictReader(open(f'{S}/epl-stats/data/all.csv', encoding='utf-8')):
    if r['position'] == 'Goalkeeper':
        years = [int(y[:4]) for y in re.findall(r'\d{4}/\d{4}', r['seasons'])]
        EPL[norm(r['name'])].append({'cs': int(r['clean_sheets'] or 0), 'apps': int(r['apps'] or 0), 'first': min(years) if years else 0})

# FPL season totals by player code; 2019-20 split at GW29 (epl-stats covers up to there)
season_cs = collections.defaultdict(dict)   # code -> {season start: clean sheets}
late_2019 = collections.Counter()           # code -> clean sheets in 2019-20 from GW30
for f in sorted(glob.glob(f'{FPL}/*/players_raw.csv')):
    y = season_start(os.path.basename(os.path.dirname(f)))
    ids = {}
    for r in csv.DictReader(open(f, encoding='utf-8')):
        code = int(r['code'])
        ids[r['id']] = code
        season_cs[code][y] = int(float(r['clean_sheets'] or 0))
    if y == 2019:
        for r in csv.DictReader(open(f'{FPL}/2019-20/gws/merged_gw.csv', encoding='utf-8')):
            if int(r['GW']) > 29 and r['element'] in ids:
                late_2019[ids[r['element']]] += int(float(r['clean_sheets'] or 0))


def clean_sheets(row):
    name, first, code = row[0], row[6], int(row[8] or 0)
    fpl = season_cs.get(code, {})
    cands = [e for e in EPL.get(norm(name), []) if abs(e['first'] - first) <= 1]
    if len(cands) == 1:
        return cands[0]['cs'] + late_2019[code] + sum(v for y, v in fpl.items() if y >= 2020), 'epl'
    if fpl and first >= 2016:
        return sum(fpl.values()), 'fpl'
    if fpl and first >= 2014:  # not on premierleague.com's list (the odd early cameo): FPL's seasons only, flagged
        return sum(fpl.values()), 'fpl, from 2016-17 only'
    return None, 'missing'


def patch(path):
    text = open(path, encoding='utf-8').read()
    head, body = text.split('=', 1)
    data = json.loads(body.rstrip().rstrip(';'))
    n, missing, top = 0, [], []
    for row in data['players']:
        if row[1].split('/')[0] != 'GK':
            continue
        cs, how = clean_sheets(row)
        if cs is None:
            if row[4] >= 50:  # the 50+ app keepers must all have real numbers
                missing.append(f'{row[0]} ({row[6]}, {row[4]} apps)')
            continue
        while len(row) <= CS_COL:
            row.append('' if len(row) == 12 else 0)
        row[CS_COL] = cs
        n += 1
        top.append((cs, row[0], row[4], how))
        if how != 'epl' and how != 'fpl' and row[4] >= 50:
            print(f'  check: {row[0]} ({row[6]}, {row[4]} apps): {cs} ({how})', file=sys.stderr)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(head + '=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'{path}: clean sheets for {n} keepers', file=sys.stderr)
    for cs, name, apps, how in sorted(top, reverse=True)[:8]:
        print(f'  {name}: {cs} in {apps} apps ({how})', file=sys.stderr)
    for m in missing:
        print(f'  ⚠ no clean sheets found: {m}', file=sys.stderr)
    return missing


if __name__ == '__main__':
    bad = [m for p in sys.argv[1:] for m in patch(p)]
    sys.exit(1 if bad and os.environ.get('STRICT') else 0)
