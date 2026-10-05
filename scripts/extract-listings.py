#!/usr/bin/env python3
"""Extrait les fiches d'adresses du prototype (src/content/pages/adresses__*.json) vers src/content/listings.json."""
import glob, json, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..')

def text(nodes):
    out = ''
    for n in nodes:
        if isinstance(n, (str, int, float)): out += str(n)
        elif isinstance(n, list) and n and n[0] == 'el': out += text(n[3])
        elif isinstance(n, list) and n and n[0] == 'link': out += text(n[2])
    return out

def find(nodes, pred, acc):
    for n in nodes:
        if not isinstance(n, list) or not n: continue
        if pred(n): acc.append(n)
        kids = n[3] if n[0] == 'el' else n[2] if n[0] == 'link' else []
        if isinstance(kids, list): find(kids, pred, acc)
    return acc

listings = []
for f in sorted(glob.glob(os.path.join(ROOT, 'src/content/pages/adresses__*.json'))):
    slug = os.path.basename(f)[len('adresses__'):-5]
    c = json.load(open(f))['content']
    h1 = find(c, lambda n: n[0] == 'el' and n[1] == 'h1', [])[0]
    label = find(c, lambda n: n[0] == 'el' and n[2].get('className') == 'section-label', [])[0]
    crumbs = find(c, lambda n: n[0] == 'link' and str(n[1].get('href', '')).startswith('/annuaire/'), [])
    rows = find(c, lambda n: n[0] == 'el' and n[2].get('className') == 'tracking-row', [])
    src = find(c, lambda n: n[0] == 'el' and n[1] == 'a' and str(n[2].get('href', '')).startswith('http'), [])
    intro = find(c, lambda n: n[0] == 'el' and n[1] == 'p', [])
    info = find(c, lambda n: n[0] == 'el' and n[2].get('className') == 'profile-section', [])
    updated = re.search(r'(\d{4}-\d{2}-\d{2})', json.dumps(c))
    cat, _, city = text(label[3]).partition(' · ')
    place = text(find(info[0][3], lambda n: n[0] == 'el' and n[1] == 'p', [])[0][3]) if info else ''
    listings.append({
        'slug': slug,
        'name': text(h1[3]),
        'category': cat.strip(),
        'city': city.strip(),
        'sector': crumbs[0][1]['href'].split('/')[-1] if crumbs else '',
        'sectorTitle': text(crumbs[0][2]) if crumbs else '',
        'intro': text(intro[0][3]) if intro else '',
        'place': place.strip(' ·,'),
        'criteria': [[text(r[3][0][3]), text(r[3][1][3])] for r in rows],
        'source': src[0][2]['href'] if src else None,
        'updated': updated.group(1) if updated else None,
    })
json.dump(listings, open(os.path.join(ROOT, 'src/content/listings.json'), 'w'), ensure_ascii=False, indent=1)
print(len(listings), 'fiches'); print(json.dumps(listings[0], ensure_ascii=False)[:500])
