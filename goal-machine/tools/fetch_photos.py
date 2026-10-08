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
MATCHER = 7  # raise when the finder gets better: earlier misses are then tried again at once
SRC = os.environ.get('SRC', 'src')
UA = 'GoalMachinePhotos/1.0 (https://opportunisticgames.github.io/goal-machine/; fan-made quiz game)'
PL_PHOTO = 'https://resources.premierleague.com/premierleague/photos/players/110x140/p{}.png'
RETRY_DAYS = 60
# pictures that turned out to be someone else with the same name (a bishop, a senator, a lion keeper…): never used
NOT_ME = {f.replace('_', ' ').removeprefix('File:') for f in json.loads((Path(__file__).resolve().parent.parent / 'data/photos_notme.json').read_text())['files']}
TODAY = datetime.date.today()
FREE = re.compile(r'^(cc0|cc[ -]by(-sa)?[ -]?[\d.]*( [a-z]+)?|public domain|pd\b.*)$', re.I)
# first words too common to identify a club on their own
AMBIG = {'manchester', 'west', 'sheffield', 'queens', 'crystal', 'aston', 'nottingham', 'wolverhampton', 'brighton',
         'bristol', 'swansea', 'hull', 'stoke', 'norwich', 'leicester', 'birmingham', 'derby', 'coventry', 'cardiff'}


def fold(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s)).strip()


_tl = threading.local()   # per thread: did a request give up (network trouble) rather than answer?


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
    _tl.failed = True
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


def image_infos(api, titles):
    """imageinfo (url and licence) for these 'File:' titles from one wiki: {title: info}."""
    out = {}
    for i in range(0, len(titles), 10):
        chunk = titles[i:i + 10]
        img = get_json(api + urllib.parse.urlencode({
            'action': 'query', 'titles': '|'.join(chunk), 'prop': 'imageinfo', 'iiprop': 'url|extmetadata',
            'iiurlwidth': 220, 'format': 'json'}))
        q = (img or {}).get('query', {})
        norm = {n['from']: n['to'] for n in q.get('normalized', [])}
        by = {pg.get('title'): pg for pg in q.get('pages', {}).values()}
        for t in chunk:
            ii = ((by.get(norm.get(t, t)) or {}).get('imageinfo') or [None])[0]
            if ii:
                out[t] = ii
    return out


def commons_free(titles):
    """Files with a free licence, in the order asked: [(title, imageinfo)]. A file can live on Wikimedia Commons or be
    uploaded to English Wikipedia itself (many freely licensed photos are), so both are asked; a file that is only
    there under a fair-use rationale has a non-free licence and is dropped."""
    titles = [t if t.startswith('File:') else 'File:' + t for t in titles]
    found = image_infos(CAPI, titles)
    missing = [t for t in titles if t not in found]
    if missing:
        found.update(image_infos(WAPI, missing))
    out = []
    for t in titles:
        ii = found.get(t)
        if not ii:
            continue
        lic = ii.get('extmetadata', {}).get('LicenseShortName', {}).get('value', '')
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


# a file that isn't the article's own photo or Wikidata's must say it's football (its description or categories), and
# not another sport or job: that's how the rugby coach Dean Richards got in for the Southampton defender
OTHER_JOB = re.compile(r'\b(rugby|cricket|boxer|boxing|golf|tennis|basketball|baseball|ice hockey|nfl|politician|mp for|actor|actress|singer|musician|band|wrestler|jockey|cyclist|athlete|coach of the (?:england|wales) rugby)\b')


def fits_him(title, ii, p, life):
    meta = ii.get('extmetadata', {})
    text = fold(' '.join(re.sub(r'<[^>]+>', ' ', str(meta.get(k, {}).get('value', ''))) for k in ('ImageDescription', 'Categories', 'ObjectName')) + ' ' + title)
    if OTHER_JOB.search(text) or not re.search(r'football|soccer|\bf ?c\b|premier league|' + '|'.join(map(re.escape, club_tests(p['clubs']))), text):
        return False
    # taken while he was alive and old enough to be a footballer
    when = re.search(r'\b(19[5-9]\d|20[0-3]\d)\b', str(meta.get('DateTimeOriginal', {}).get('value', '')) + ' ' + title)
    born, died = life
    return not when or ((not died or int(when.group(1)) <= died) and (not born or int(when.group(1)) >= born + 14))


def credit(ii, page_title, src=''):
    meta = ii.get('extmetadata', {})
    lic = meta.get('LicenseShortName', {}).get('value', '')
    artist = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', meta.get('Artist', {}).get('value', 'Unknown')))).strip()
    return {'w': ii['thumburl'], 'a': artist[:80] or 'Unknown', 'l': lic, 'u': ii['descriptionurl'], 't': page_title, 's': src}


def from_wikipedia(p):
    surname = fold(p['name']).split()[-1]
    titles = []
    for q in (f"{p['name']} footballer {p['main']}", f"{p['name']} footballer", f"{p['name']} {' '.join(p['clubs'][:1] + p['clubs'][-1:])} player"):
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
        if not re.search(r'football|soccer', fold(pg.get('description', '')) + ' ' + text[:300]):  # Australian, American and Canadian articles say "soccer"
            continue
        # the article's title is exactly his name (a "(footballer)" or "(born 1975)" tag allowed) and its birth year fits: that's
        # him even if the intro doesn't happen to name one of his clubs; otherwise the intro must mention a club of his
        exact = fold(re.sub(r'\s*\(.*\)$', '', pg['title'])) == fold(p['name'])
        born = re.search(r'born[^)]{0,40}?\b(19\d\d|20\d\d)\b', pg.get('extract', '')[:400])
        if born and not (15 <= p['first'] - int(born.group(1)) <= 40):
            continue
        # "(1865 – 1946)": a life that ended before his Premier League career began is somebody else with the same name
        span = re.search(r'\((?:[^)]{0,30}?)\b(1[5-9]\d\d)\b\s*[–-]\s*(?:[^)]{0,20}?)\b(1[5-9]\d\d|20\d\d)\b', pg.get('extract', '')[:300])
        if span and (int(span.group(2)) < p['first'] or p['first'] - int(span.group(1)) > 40):
            continue
        if not born and re.search(r'\b1[5-8]\d\d\b', pg.get('extract', '')[:200]):
            continue
        if not (exact and born) and not any(t in text for t in tests):
            continue
        # his life, for dating photos: "(born 3 June 1974)" or "(9 June 1974 – 26 February 2011)"
        life = re.search(r'\b(19\d\d|20\d\d)\b[^)]{0,40}?[–-][^)]{0,30}?\b(19\d\d|20\d\d)\b', pg.get('extract', '')[:300])
        life = (int(life.group(1)), int(life.group(2))) if life else (int(born.group(1)) if born else None, None)
        # it's him. Candidate pictures, best first: the article's lead image and Wikidata's image (him by definition),
        # then other images in the article and a Commons search (only if the file has his name in it and fits_him)
        cands = [pg['pageimage']] if pg.get('pageimage') else []
        qid = (pg.get('pageprops') or {}).get('wikibase_item')
        if qid:
            cl = get_json(DAPI + urllib.parse.urlencode({'action': 'wbgetclaims', 'entity': qid, 'property': 'P18', 'format': 'json'}))
            for c in ((cl or {}).get('claims') or {}).get('P18', []):
                v = (((c.get('mainsnak') or {}).get('datavalue') or {}).get('value'))
                if isinstance(v, str):
                    cands.append(v)
        pics = get_json(WAPI + urllib.parse.urlencode({'action': 'query', 'titles': pg['title'], 'prop': 'images', 'imlimit': 50, 'format': 'json'}))
        sure = {('File:' + c.replace('_', ' ')) if not c.startswith('File:') else c.replace('_', ' ') for c in cands}
        for pp in ((pics or {}).get('query', {}).get('pages') or {}).values():
            cands += [i['title'] for i in pp.get('images', []) if named_for(i['title'], p['name'])]
        found = commons_free(list(dict.fromkeys(c.replace('_', ' ') for c in cands))[:12])
        found = [(t, ii, 'lead' if t in sure else 'art') for t, ii in found if t.removeprefix('File:') not in NOT_ME and (t in sure or fits_him(t, ii, p, life))]
        if not found:
            sr = get_json(CAPI + urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': f"{p['name']} footballer", 'srnamespace': 6, 'srlimit': 10, 'format': 'json'}))
            more = [x['title'] for x in (sr or {}).get('query', {}).get('search', []) if named_for(x['title'], p['name'])]
            found = [(t, ii, 'search') for t, ii in commons_free(more[:6]) if t.removeprefix('File:') not in NOT_ME and fits_him(t, ii, p, life)]
        if found:
            return credit(found[0][1], pg['title'], found[0][2])
    return None


# ------------------------------------------------------------------ debugging one player: DEBUG_NAMES="Mark Viduka|Nigel Martyn"
def debug(names):
    """Looks each named player up with every request and answer printed, saving nothing."""
    global get_json
    real = get_json
    def loud(url, headers=None):
        out = real(url, headers)
        print('   GET', urllib.parse.unquote(url)[:230], '\n    ->', json.dumps(out, ensure_ascii=False)[:600], file=sys.stderr)
        return out
    get_json = loud
    by = {p['name']: p for p in load_players()}
    for n in names:
        p = by.get(n)
        print(f'=== {n}: {p and (p["main"], p["clubs"], p["first"], p["last"])}', file=sys.stderr)
        print('   RESULT', from_wikipedia(p) if p else 'not in the data', file=sys.stderr)


# ------------------------------------------------------------------ main
def save(photos, checked):
    OUT.write_text('// Generated by tools/fetch_photos.py - extra player photos (premierleague.com / Wikimedia Commons)\n'
                   'window.GM_PHOTOS=' + json.dumps(dict(sorted(photos.items())), ensure_ascii=False, separators=(',', ':')) + ';\n')
    CHECKED.write_text(json.dumps(dict(sorted(checked.items())), indent=0) + '\n')


def main():
    if os.environ.get('DEBUG_NAMES'):
        return debug([n.strip() for n in os.environ['DEBUG_NAMES'].split('|') if n.strip()])
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
    # RECHECK=1: look again at every photo found before the finder checked where it came from (no 's'), with today's
    # stricter rules; one that no longer passes is dropped (and tried again later), one that can't be checked is kept
    recheck = os.environ.get('RECHECK') == '1'
    # the Play app shows only the freely licensed ('w') photos, so everyone without one is looked up, most appearances first
    todo = ([p for p in players if (photos.get(key(p)) or {}).get('w') and 's' not in photos[key(p)]] if recheck else
            [p for p in players if not (photos.get(key(p)) or {}).get('w') and stale(p)])
    todo.sort(key=lambda p: -p['apps'])
    print(f'{len(todo)} players to look up (limit {limit})', file=sys.stderr)
    found, lock, done = {'pl': 0, 'w': 0}, threading.Lock(), [0]

    def work(p):
        _tl.failed = False
        hit = None
        if not p['code'] and not p['tm'] and not (photos.get(key(p)) or {}).get('pl'):
            hit = from_pl(p, idx)
        try:
            w = from_wikipedia(p)
        except Exception as e:   # one odd record must never stop a long run: it is tried again next time
            print(f'  skipped {p["name"]}: {type(e).__name__}: {e}', file=sys.stderr)
            return p, hit, None, True
        return p, hit, w, _tl.failed

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        for p, hit, w, failed in ex.map(work, todo[:limit]):
            with lock:
                done[0] += 1
                if recheck and not w and not failed:
                    old = photos.get(key(p)) or {}
                    print(f'  dropped {p["name"]}: {old.get("u", "")[-60:]}', file=sys.stderr)
                    keep = {k: v for k, v in old.items() if k == 'pl'}
                    if keep: photos[key(p)] = keep
                    else: photos.pop(key(p), None)
                if hit or w:
                    photos[key(p)] = {**(photos.get(key(p)) or {}), **(hit or {}), **(w or {})}
                    found['pl'] += bool(hit)
                    found['w'] += bool(w)
                    checked.pop(key(p), None)
                if not w and not failed:   # a request that gave up isn't a miss: he's looked up again next time
                    checked[key(p)] = TODAY.isoformat()
                if done[0] % 100 == 0:
                    save(photos, checked)
                    print(f'  {done[0]}/{min(limit, len(todo))} found so far {found}', file=sys.stderr)
    save(photos, checked)
    print(f'found {found}; {sum(1 for v in photos.values() if v.get("w"))} Wikimedia photos in total; {len(checked) - 1} misses to retry later', file=sys.stderr)


if __name__ == '__main__':
    main()
