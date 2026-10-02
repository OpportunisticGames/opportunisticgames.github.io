"""Finds faces for players the Premier League (FPL) and Transfermarkt data have no photo for.

1. premierleague.com: the site keeps headshots of many older players too. The epl-stats data gives each player's
   premierleague.com id; the site's API turns that into the photo code the app already uses for FPL players.
2. Wikipedia: the lead image of the player's article, only when the article is clearly him (a footballer who
   played for one of his clubs, born at a sensible age) and the file is freely licensed on Wikimedia Commons.
   These need crediting, so the author and licence are kept and listed on the in-game Photo credits page.

It looks at everyone in both player files (the 2,039 with 50+ apps and the full 5,000+), most appearances first,
because the Google Play version shows only these freely licensed photos. For the Wikipedia step it tries the lead
image, then the image Wikidata holds for him, then other images on his article and a Commons search, keeping only a
freely licensed file with his name in it.

Writes data/photos.js (loaded by the page) and data/photos_checked.json (who was looked up and when, so the weekly
run only retries misses every couple of months). Needs SRC pointing at the fetched sources (for epl-stats).
Usage: SRC=src python tools/fetch_photos.py [max players to look up]   (FETCH_LIMIT works too; default 1500 a run, so
the weekly runs work through everyone over a few weeks)
"""
import concurrent.futures, csv, datetime, html, json, os, re, sys, threading, time, unicodedata, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA, ALL, OUT, CHECKED = ROOT / 'data/players.js', ROOT / 'data/players_all.js', ROOT / 'data/photos.js', ROOT / 'data/photos_checked.json'
MATCHER = 2  # raise when the finder gets better: earlier misses are then tried again at once
SRC = os.environ.get('SRC', 'src')
UA = 'GoalMachinePhotos/1.0 (https://opportunisticgames.github.io/goal-machine/; fan-made quiz game)'
PL_PHOTO = 'https://resources.premierleague.com/premierleague/photos/players/110x140/p{}.png'
RETRY_DAYS = 60
TODAY = datetime.date.today()
FREE = re.compile(r'^(cc0|cc[ -]by(-sa)?[ -]?[\d.]*( [a-z]+)?|public domain|pd\b.*)$', re.I)
# first words too common to identify a club on their own
AMBIG = {'manchester', 'west', 'sheffield', 'queens', 'crystal', 'aston', 'nottingham', 'wolverhampton', 'brighton',
         'bristol', 'swansea', 'hull', 'stoke', 'norwich', 'leicester', 'birmingham', 'derby', 'coventry', 'cardiff'}


def fold(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s)).strip()


def get(url, headers=None, method='GET', tries=3):
    req = urllib.request.Request(url, method=method, headers={'User-Agent': UA, **(headers or {})})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status, r.read() if method == 'GET' else b''
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 410):
                return e.code, b''
        except Exception:
            pass
        time.sleep(1 + 2 * i)
    return 0, b''


def get_json(url, headers=None):
    st, body = get(url, headers)
    try:
        return json.loads(body) if st == 200 else None
    except ValueError:
        return None


def load_file(path):
    s = path.read_text()
    return json.loads(s[s.index('=') + 1:s.rindex(';')])


def load_players():
    """Everyone, from both player files (the 50+ apps file first), keyed like the app: 'name|first season'."""
    seen, out = set(), []
    for path in (DATA, ALL):
        if not path.exists():
            continue
        d = load_file(path)
        for r in d['players']:
            k = f'{r[0]}|{r[6]}'
            if k in seen:
                continue
            seen.add(k)
            clubs = [d['clubs'][c] for c in r[3]]
            main, bn = clubs[0] if clubs else '', 0
            for part in (r[10] if len(r) > 10 and r[10] else '').split('|'):
                if ':' not in part:
                    continue
                ci, runs = part.split(':')
                n = sum(int(b or a) - int(a) + 1 for a, _, b in (run.partition('-') for run in runs.split('.')))
                if n > bn and d['clubs'][int(ci)] in clubs:
                    main, bn = d['clubs'][int(ci)], n
            out.append(dict(name=r[0], clubs=clubs, main=main, first=r[6], last=r[7], apps=r[4], code=r[8],
                            tm=r[12] if len(r) > 12 else ''))
    return out


def key(p):
    return f"{p['name']}|{p['first']}"


# ------------------------------------------------------------------ premierleague.com
def pl_index():
    idx = {}
    path = Path(SRC) / 'epl-stats/data/all.csv'
    if not path.exists():
        print('no epl-stats at', path, file=sys.stderr)
        return idx
    for row in csv.DictReader(path.open(encoding='utf-8')):
        years = [int(y[:4]) for y in re.findall(r'\d{4}/\d{4}', row['seasons'])]
        if years:
            idx.setdefault(fold(row['name']), []).append((int(row['id']), min(years), max(years)))
    return idx


def from_pl(p, idx):
    for pid, a, b in idx.get(fold(p['name']), []):
        if a > p['last'] or b < p['first']:
            continue
        st, body = get(f'https://footballapi.pulselive.com/football/players/{pid}',
                       {'Origin': 'https://www.premierleague.com', 'Referer': 'https://www.premierleague.com/'})
        m = re.search(rb'"opta"\s*:\s*"?p?(\d+)', body) if st == 200 else None
        if not m:
            continue
        code = int(m.group(1))
        st, _ = get(PL_PHOTO.format(code), method='HEAD')
        if st == 200:
            return {'pl': code}
    return None


# ------------------------------------------------------------------ Wikipedia / Commons
WAPI = 'https://en.wikipedia.org/w/api.php?'
CAPI = 'https://commons.wikimedia.org/w/api.php?'
DAPI = 'https://www.wikidata.org/w/api.php?'
NOT_A_FACE = re.compile(r'logo|flag|badge|crest|kit|signature|map|stadium|ground|shirt|icon|symbol|cup|trophy|stats|wiki', re.I)


def club_tests(clubs):
    tests = []
    for c in clubs:
        c = c.replace('&', 'and')
        tests.append(fold(c))
        w = fold(c).split()[0]
        if w not in AMBIG and len(w) > 3:
            tests.append(w)
    return tests


def commons_free(titles):
    """Files on Commons with a free licence, in the order asked: [(title, imageinfo)]."""
    titles = [t if t.startswith('File:') else 'File:' + t for t in titles]
    out = []
    for i in range(0, len(titles), 10):
        chunk = titles[i:i + 10]
        img = get_json(CAPI + urllib.parse.urlencode({
            'action': 'query', 'titles': '|'.join(chunk), 'prop': 'imageinfo', 'iiprop': 'url|extmetadata',
            'iiurlwidth': 220, 'format': 'json'}))
        q = (img or {}).get('query', {})
        norm = {n['from']: n['to'] for n in q.get('normalized', [])}
        by = {pg.get('title'): pg for pg in q.get('pages', {}).values()}
        for t in chunk:
            pg = by.get(norm.get(t, t))
            ii = ((pg or {}).get('imageinfo') or [None])[0]
            if not ii:
                continue  # not on Commons (e.g. a non-free local file)
            meta = ii.get('extmetadata', {})
            lic = meta.get('LicenseShortName', {}).get('value', '')
            if not FREE.match(lic.strip()) or re.search(r'\bN[CD]\b', lic):
                continue
            out.append((t, ii))
    return out


def named_for(title, name):
    """A file name that is plausibly a picture of him: it has his surname and first name in it, and isn't a logo etc."""
    t = fold(title.rsplit('.', 1)[0].replace('File:', '').replace('_', ' '))
    parts = fold(name).split()
    return (re.search(r'\.(jpe?g|png)$', title, re.I) is not None and not NOT_A_FACE.search(t)
            and parts[-1] in t and (len(parts) < 2 or parts[0] in t or parts[0][0] in t.split()))


def credit(ii, page_title):
    meta = ii.get('extmetadata', {})
    lic = meta.get('LicenseShortName', {}).get('value', '')
    artist = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', meta.get('Artist', {}).get('value', 'Unknown')))).strip()
    return {'w': ii['thumburl'], 'a': artist[:80] or 'Unknown', 'l': lic, 'u': ii['descriptionurl'], 't': page_title}


def from_wikipedia(p):
    surname = fold(p['name']).split()[-1]
    titles = []
    for q in (f"{p['name']} footballer {p['main']}", f"{p['name']} footballer", f"{p['name']} {p['clubs'][0]} {p['clubs'][-1]} player"):
        res = get_json(WAPI + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': q, 'srlimit': 5, 'format': 'json'}))
        for x in (res or {}).get('query', {}).get('search', []):
            if surname in fold(x['title']) and x['title'] not in titles:
                titles.append(x['title'])
        if titles:
            break
    if not titles:
        return None
    info = get_json(WAPI + urllib.parse.urlencode({
        'action': 'query', 'titles': '|'.join(titles[:4]), 'prop': 'pageimages|description|extracts|pageprops', 'piprop': 'name',
        'ppprop': 'wikibase_item', 'exintro': 1, 'explaintext': 1, 'exlimit': 'max', 'redirects': 1, 'format': 'json'}))
    pages = sorted((info or {}).get('query', {}).get('pages', {}).values(), key=lambda x: titles.index(x['title']) if x['title'] in titles else 9)
    tests = club_tests(p['clubs'])
    for pg in pages:
        text = fold(pg.get('extract', ''))
        if 'football' not in fold(pg.get('description', '')) + ' ' + text[:300]:
            continue
        if not any(t in text for t in tests):
            continue
        born = re.search(r'born[^)]{0,40}?\b(19\d\d|20\d\d)\b', pg.get('extract', '')[:400])
        if born and not (15 <= p['first'] - int(born.group(1)) <= 40):
            continue
        # it's him. Candidate pictures, best first: the article's lead image, Wikidata's image, other images in the
        # article and a Commons search (those last three only if the file has his name in it)
        cands = [pg['pageimage']] if pg.get('pageimage') else []
        qid = (pg.get('pageprops') or {}).get('wikibase_item')
        if qid:
            cl = get_json(DAPI + urllib.parse.urlencode({'action': 'wbgetclaims', 'entity': qid, 'property': 'P18', 'format': 'json'}))
            for c in ((cl or {}).get('claims') or {}).get('P18', []):
                v = (((c.get('mainsnak') or {}).get('datavalue') or {}).get('value'))
                if isinstance(v, str):
                    cands.append(v)
        pics = get_json(WAPI + urllib.parse.urlencode({'action': 'query', 'titles': pg['title'], 'prop': 'images', 'imlimit': 50, 'format': 'json'}))
        for pp in ((pics or {}).get('query', {}).get('pages') or {}).values():
            cands += [i['title'] for i in pp.get('images', []) if named_for(i['title'], p['name'])]
        found = commons_free(list(dict.fromkeys(c.replace('_', ' ') for c in cands))[:12])
        if not found:
            sr = get_json(CAPI + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': f"{p['name']} footballer", 'srnamespace': 6, 'srlimit': 10, 'format': 'json'}))
            more = [x['title'] for x in (sr or {}).get('query', {}).get('search', []) if named_for(x['title'], p['name'])]
            found = commons_free(more[:6])
        if found:
            return credit(found[0][1], pg['title'])
    return None


# ------------------------------------------------------------------ main
def save(photos, checked):
    OUT.write_text('// Generated by tools/fetch_photos.py - extra player photos (premierleague.com / Wikimedia Commons)\n'
                   'window.GM_PHOTOS=' + json.dumps(dict(sorted(photos.items())), ensure_ascii=False, separators=(',', ':')) + ';\n')
    CHECKED.write_text(json.dumps(dict(sorted(checked.items())), indent=0) + '\n')


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('FETCH_LIMIT', 1500))
    players = load_players()
    photos = load_file(OUT) if OUT.exists() else {}
    checked = json.loads(CHECKED.read_text()) if CHECKED.exists() else {}
    if checked.get('_matcher') != MATCHER:  # a better finder: try everyone who missed again
        checked = {'_matcher': MATCHER}
    keys = {key(p) for p in players}
    photos = {k: v for k, v in photos.items() if k in keys}  # forget players who dropped out of the data
    idx = pl_index()
    stale = lambda p: key(p) not in checked or (TODAY - datetime.date.fromisoformat(checked[key(p)])).days >= RETRY_DAYS
    # the Play app shows only the freely licensed ('w') photos, so everyone without one is looked up, most appearances first
    todo = [p for p in players if not (photos.get(key(p)) or {}).get('w') and stale(p)]
    todo.sort(key=lambda p: -p['apps'])
    print(f'{len(todo)} players to look up (limit {limit})', file=sys.stderr)
    found, lock, done = {'pl': 0, 'w': 0}, threading.Lock(), [0]

    def work(p):
        hit = None
        if not p['code'] and not p['tm'] and not (photos.get(key(p)) or {}).get('pl'):
            hit = from_pl(p, idx)
        w = from_wikipedia(p)
        return p, hit, w

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        for p, hit, w in ex.map(work, todo[:limit]):
            with lock:
                done[0] += 1
                if hit or w:
                    photos[key(p)] = {**(photos.get(key(p)) or {}), **(hit or {}), **(w or {})}
                    found['pl'] += bool(hit)
                    found['w'] += bool(w)
                    checked.pop(key(p), None)
                if not w:
                    checked[key(p)] = TODAY.isoformat()
                if done[0] % 100 == 0:
                    save(photos, checked)
                    print(f'  {done[0]}/{min(limit, len(todo))} found so far {found}', file=sys.stderr)
    save(photos, checked)
    print(f'found {found}; {sum(1 for v in photos.values() if v.get("w"))} Wikimedia photos in total; {len(checked) - 1} misses to retry later', file=sys.stderr)


if __name__ == '__main__':
    main()
