"""Writes goal-machine/data/fixtures.js: this season's Premier League fixtures still to come, for the matchday features.
Tries the live FPL API first (freshest kick-off times), then falls back to the vaastav FPL repo that fetch_sources.sh
clones (SRC/fpl/data/<season>/fixtures.csv and teams.csv).
Usage: SRC=src OUT=data/fixtures.js python tools/build_fixtures.py"""
import csv, datetime, glob, json, os, sys, urllib.request

CANON = {
    'Bournemouth': 'AFC Bournemouth', 'Brighton': 'Brighton and Hove Albion', 'Man City': 'Manchester City',
    'Man Utd': 'Manchester United', 'Newcastle': 'Newcastle United', 'Norwich': 'Norwich City',
    "Nott'm Forest": 'Nottingham Forest', 'Sheffield Utd': 'Sheffield United', 'Spurs': 'Tottenham Hotspur',
    'Tottenham': 'Tottenham Hotspur', 'West Brom': 'West Bromwich Albion', 'West Ham': 'West Ham United',
    'Wolves': 'Wolverhampton Wanderers', 'Leicester': 'Leicester City', 'Leeds': 'Leeds United',
    'Luton': 'Luton Town', 'Ipswich': 'Ipswich Town', 'Cardiff': 'Cardiff City', 'Huddersfield': 'Huddersfield Town',
    'Hull': 'Hull City', 'Stoke': 'Stoke City', 'Swansea': 'Swansea City', 'Coventry': 'Coventry City',
    'Middlesbrough': 'Middlesbrough', 'Sheffield Weds': 'Sheffield Wednesday', 'QPR': 'Queens Park Rangers',
}
canon = lambda t: CANON.get(t.strip(), t.strip())

def from_api():
    get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20))
    teams = {t['id']: t['name'] for t in get('https://fantasy.premierleague.com/api/bootstrap-static/')['teams']}
    return [(f['kickoff_time'], teams[f['team_h']], teams[f['team_a']]) for f in get('https://fantasy.premierleague.com/api/fixtures/')]

def from_repo(src):
    season = sorted(glob.glob(os.path.join(src, 'fpl', 'data', '20*-*', 'fixtures.csv')))[-1]
    d = os.path.dirname(season)
    teams = {r['id']: r['name'] for r in csv.DictReader(open(os.path.join(d, 'teams.csv'), encoding='utf-8'))}
    return [(r['kickoff_time'], teams[r['team_h']], teams[r['team_a']]) for r in csv.DictReader(open(season, encoding='utf-8'))]

def main():
    src, out = os.environ.get('SRC', 'src'), os.environ.get('OUT', 'data/fixtures.js')
    try:
        rows, where = from_api(), 'FPL API'
    except Exception as e:
        print('FPL API unavailable (%s), using the FPL repo' % e)
        rows, where = from_repo(src), 'FPL repo'
    since = (datetime.datetime.utcnow() - datetime.timedelta(days=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
    fx = sorted([k, canon(h), canon(a)] for k, h, a in rows if k and k >= since)  # postponed games have no kick-off yet
    known = set(json.loads(open(os.path.join(os.path.dirname(out), 'players.js'), encoding='utf-8').read().split('=', 1)[1].rstrip().rstrip(';'))['clubs'])
    odd = {c for f in fx for c in f[1:]} - known
    if odd:
        sys.exit('unknown club names (add them to CANON): %s' % ', '.join(sorted(odd)))
    # international breaks: 11+ free days between PL matchdays in the international windows (Sep, Oct, Nov, Mar; a cup
    # weekend leaves fewer). From the whole season's list, so a break that has already started still shows.
    # Each is [first free day, last free day]
    days = sorted({k[:10] for k, h, a in rows if k})
    d = lambda x: datetime.date.fromisoformat(x)
    breaks = [[(d(a) + datetime.timedelta(days=1)).isoformat(), (d(b) - datetime.timedelta(days=1)).isoformat()]
              for a, b in zip(days, days[1:]) if (d(b) - d(a)).days >= 12 and d(a).month in (8, 9, 10, 11, 3)]
    doc = {'generated': datetime.date.today().isoformat(), 'breaks': breaks, 'fixtures': fx}
    with open(out, 'w', encoding='utf-8') as f:
        f.write('window.PL_FIXTURES=' + json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('%d fixtures and %d international breaks from the %s written to %s' % (len(fx), len(breaks), where, out))
    for b in breaks:
        print('  break', b[0], 'to', b[1])

if __name__ == '__main__':
    main()
