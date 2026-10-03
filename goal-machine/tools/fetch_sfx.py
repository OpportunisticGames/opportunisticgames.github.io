"""Find free-licence sound effects on Wikimedia Commons (run by .github/workflows/sounds.yml; the cloud sessions can't
reach Commons). For each key in fx/sfx/wanted.json it searches Commons audio, keeps short recordings under a free
licence (public domain, CC0, CC BY, CC BY-SA), and writes up to 4 candidates per key to fx/sfx/cand/: a trimmed,
level-matched mono MP3 (key_n.mp3), a spectrogram (key_n.png, to look at) and index.json (title, licence, author, page).
Picked ones are copied to fx/sfx/<key>.mp3 by hand with their credit in fx/sfx/credits.json."""
import json, pathlib, re, subprocess, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
WANT = json.loads((ROOT / 'fx/sfx/wanted.json').read_text())
OUT = ROOT / 'fx/sfx/cand'
OUT.mkdir(parents=True, exist_ok=True)
API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'GoalMachineSfx/1.0 (https://opportunisticgames.github.io; opportunisticyp@gmail.com)'}
FREE = re.compile(r'^(cc0|cc[- ]by(-sa)?[- ]?[0-9.]*|public domain|pd.*)', re.I)


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()


def search(q):
    p = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:audio', 'gsrnamespace': 6,
         'gsrlimit': 20, 'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata|metadata'}
    j = json.loads(get(API + '?' + urllib.parse.urlencode(p)))
    out = []
    for pg in (j.get('query', {}).get('pages', {}) or {}).values():
        ii = (pg.get('imageinfo') or [{}])[0]
        meta = ii.get('extmetadata', {})
        lic = (meta.get('LicenseShortName', {}) or {}).get('value', '')
        length = next((float(m['value']) for m in (ii.get('metadata') or []) if m.get('name') == 'length' and str(m.get('value', '')).replace('.', '', 1).isdigit()), None)
        if not FREE.match(lic.strip()) or not ii.get('url'):
            continue
        out.append({'title': pg['title'], 'url': ii['url'], 'page': ii.get('descriptionurl'), 'licence': lic, 'length': length,
                    'author': re.sub('<[^>]+>', '', (meta.get('Artist', {}) or {}).get('value', ''))[:120],
                    'desc': re.sub('<[^>]+>', '', (meta.get('ImageDescription', {}) or {}).get('value', ''))[:200], 'size': ii.get('size', 0)})
    return out


index = json.loads((OUT / 'index.json').read_text()) if (OUT / 'index.json').exists() else {}
for key, spec in WANT.items():
    if key.startswith('_') or any(k.startswith(key + '_') for k in index):
        continue
    maxlen, terms = spec[0], spec[1:]
    seen, cands = set(), []
    for t in terms:
        try:
            for c in search(t):
                if c['url'] in seen or c['size'] > 25_000_000:
                    continue
                if c['length'] is not None and not (0.3 <= c['length'] <= 120):
                    continue
                seen.add(c['url']); cands.append(c)
        except Exception as e:
            print('search failed', key, t, e)
    # shorter recordings first (a long field recording is rarely the one sound you want)
    cands.sort(key=lambda c: (c['length'] or 30))
    n = 0
    for c in cands:
        if n >= 4:
            break
        raw = OUT / f'_{key}_raw'
        try:
            raw.write_bytes(get(c['url']))
            mp3 = OUT / f'{key}_{n}.mp3'
            # trim the silence at the start, keep the first maxlen seconds, fade out, even out the loudness, mono 64k
            af = f'silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:{maxlen},afade=t=out:st={max(0.1, maxlen - 0.3)}:d=0.3,loudnorm=I=-16:TP=-1.5'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', af, '-ac', '1', '-ar', '44100', '-b:a', '64k', str(mp3)], check=True)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3), '-lavfi', 'showspectrumpic=s=480x160:legend=0', str(OUT / f'{key}_{n}.png')], check=True)
            dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)], capture_output=True, text=True).stdout.strip() or 0)
            if dur < 0.2:
                mp3.unlink(); continue
            index[f'{key}_{n}'] = {**c, 'seconds': round(dur, 2), 'bytes': mp3.stat().st_size}
            print('ok', key, n, c['title'], c['licence'], round(dur, 2))
            n += 1
        except Exception as e:
            print('failed', key, c['title'], e)
        finally:
            raw.unlink(missing_ok=True)
    if not n:
        print('NONE for', key)
(OUT / 'index.json').write_text(json.dumps(index, indent=1, ensure_ascii=False))
