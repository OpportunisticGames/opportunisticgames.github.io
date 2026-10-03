"""Portraits of the CHAOS managers (run by .github/workflows/managers.yml; the cloud sessions can't reach Wikipedia).
For each manager: the lead photo of his English Wikipedia article, only if Commons says it's under a free licence
(public domain, CC0, CC BY, CC BY-SA), saved to fx/mgr/<key>.jpg (480px wide) with where the face is (face_points.face)
and the credit in fx/mgr/credits.json. A manager with no free photo keeps the drawn one."""
import json, pathlib, re, sys, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from face_points import face  # noqa: E402  (YuNet, falling back to OpenCV's cascades)

OUT = ROOT / 'fx/mgr'
OUT.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'GoalMachineManagers/1.0 (https://opportunisticgames.github.io; opportunisticyp@gmail.com)'}
FREE = re.compile(r'^(cc0|cc[- ]by(-sa)?[- ]?[0-9.]*|public domain|pd.*)', re.I)
ARTICLES = {
    'fergie': 'Alex Ferguson', 'wenger': 'Arsène Wenger', 'mourinho': 'José Mourinho', 'pep': 'Pep Guardiola', 'klopp': 'Jürgen Klopp',
    'ranieri': 'Claudio Ranieri', 'keegan': 'Kevin Keegan', 'allardyce': 'Sam Allardyce', 'redknapp': 'Harry Redknapp', 'moyes': 'David Moyes',
    'ancelotti': 'Carlo Ancelotti', 'hodgson': 'Roy Hodgson', 'warnock': 'Neil Warnock', 'pulis': 'Tony Pulis', 'ange': 'Ange Postecoglou',
    'holloway': 'Ian Holloway', 'dyche': 'Sean Dyche', 'vangaal': 'Louis van Gaal', 'conte': 'Antonio Conte', 'benitez': 'Rafael Benítez',
}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()


def api(host, **p):
    return json.loads(get(f'https://{host}/w/api.php?' + urllib.parse.urlencode({'format': 'json', **p})))


credits = json.loads((OUT / 'credits.json').read_text()) if (OUT / 'credits.json').exists() else {}
for key, title in ARTICLES.items():
    if key in credits and (OUT / f'{key}.jpg').exists():
        continue
    try:
        pages = api('en.wikipedia.org', action='query', prop='pageimages', piprop='name', titles=title, redirects=1)['query']['pages']
        name = next(iter(pages.values())).get('pageimage')
        if not name:
            print('no photo', key); continue
        info = next(iter(api('commons.wikimedia.org', action='query', titles='File:' + name, prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=480)['query']['pages'].values()))
        ii = (info.get('imageinfo') or [{}])[0]; meta = ii.get('extmetadata', {})
        lic = (meta.get('LicenseShortName', {}) or {}).get('value', '')
        if not FREE.match(lic.strip()):
            print('not free', key, name, lic); continue
        data = get(ii.get('thumburl') or ii['url'])
        (OUT / f'{key}.jpg').write_bytes(data)
        credits[key] = {'name': title, 'file': name, 'source': ii.get('descriptionurl'), 'licence': lic,
                        'author': re.sub('<[^>]+>', '', (meta.get('Artist', {}) or {}).get('value', '')).strip()[:100], 'face': face(data)}
        print('ok', key, name, lic, credits[key]['face'])
    except Exception as e:
        print('failed', key, e)
(OUT / 'credits.json').write_text(json.dumps(credits, indent=1, ensure_ascii=False))
