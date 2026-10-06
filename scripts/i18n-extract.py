"""Extrait tous les textes français à traduire → src/i18n/source.json (liste triée, sans doublons).
Sources : arbres de contenu (pages + coque), catalogue, annuaire, et appels t('…') du code."""
import json, glob, re, os

LETTER = re.compile(r'[A-Za-zÀ-ÿ]')
TEXT_PROPS = ('alt', 'title', 'placeholder', 'aria-label', 'ariaLabel', 'label', 'content', 'successMessage', 'place')
out = set()

def add(s):
    if isinstance(s, str):
        s2 = s.strip()
        if s2 and LETTER.search(s2) and not re.match(r'^(https?://|/|mailto:|tel:|#)', s2) and '@' not in s2[:40]:
            out.add(s2)

def tree(n):
    if isinstance(n, str): add(n)
    elif isinstance(n, list):
        if n and n[0] == 'el':
            props = n[2] if isinstance(n[2], dict) else {}
            for k in TEXT_PROPS: add(props.get(k))
            for c in n[3] or []: tree(c)
        elif n and n[0] == 'link':
            props = n[1] if isinstance(n[1], dict) else {}
            for k in TEXT_PROPS: add(props.get(k))
            for c in n[2] or []: tree(c)
        elif n and n[0] == 'client':
            props = n[2]
            for k in TEXT_PROPS: add(props.get(k))
            if isinstance(props.get('children'), list):
                for c in props['children']: tree(c)
        else:
            for c in n: tree(c)

for f in glob.glob('src/modules/contenus/pages/*.json'):
    tree(json.load(open(f))['content'])
tree(list(json.load(open('src/modules/contenus/shell.json')).values()))

src = open('src/platform/referentiel/catalog.ts').read()
def literal(name):
    m = re.search(r'export const ' + name + r'[^=]*=\s*(\[.*?\n\])', src, re.S) or re.search(r'export const ' + name + r'[^=]*=\s*(\[.*\])', src)
    return json.loads(m.group(1))
for s in literal('SECTORS'):
    add(s['title']); add(s['description'])
    for x in s['categories'] + s['criteria']: add(x)
for g in literal('GUIDES'):
    add(g['title']); add(g['category']); add(g['summary'])
    for x in g['steps']: add(x)
for w in literal('WILAYAS'): add(w['name'])

for l in json.load(open('src/modules/annuaire/listings.json')):
    for k in ('category', 'city', 'sectorTitle', 'intro', 'place'): add(l.get(k))
    for k, v in l.get('criteria', []): add(k); add(v)

# Appels t('…') / t("…") dans le code
for f in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    code = open(f).read()
    for m in re.finditer(r"""\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1""", code):
        add(m.group(2).replace("\\'", "'").replace('\\"', '"'))

json.dump(sorted(out), open('src/i18n/source.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), 'textes,', sum(map(len, out)), 'caractères')
