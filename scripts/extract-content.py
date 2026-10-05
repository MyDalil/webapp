#!/usr/bin/env python3
"""
Convertit les flux RSC du prototype DALIL (public/**/*.rsc) en arbres JSON
rendus par Next.js (src/content/pages/*.json).

Format d'un nœud :
  "texte" | nombre | null
  ["el", balise, props, enfants]       élément HTML
  ["link", props, enfants]             lien interne (next/link)
  ["client", Nom, props]               composant interactif (îlot React)
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'legacy')
OUT = os.path.join(ROOT, 'src', 'content')


def parse_rows(text):
    rows = {}
    for line in text.split('\n'):
        if not line:
            continue
        k, _, v = line.partition(':')
        if not k:
            continue
        if v.startswith('I['):
            rows[k] = ('module', json.loads(v[1:])[2])
        elif v.startswith('HL['):
            continue
        else:
            try:
                rows[k] = ('json', json.loads(v))
            except json.JSONDecodeError:
                rows[k] = ('raw', v)
    return rows


SKIP_PROPS = {'children', 'key'}


def convert(v, rows, depth=0):
    if depth > 200:
        return None
    if isinstance(v, str):
        if v == '$undefined':
            return None
        if v.startswith('$$'):
            return v[1:]
        if v.startswith('$L') or (v.startswith('$') and v[1:] in rows):
            ref = v[2:] if v.startswith('$L') else v[1:]
            kind, val = rows.get(ref, ('json', None))
            if kind == 'json':
                return convert(val, rows, depth + 1)
            return None
        return v
    if isinstance(v, (int, float)) or v is None:
        return v
    if isinstance(v, bool):
        return v
    if isinstance(v, list):
        if len(v) == 4 and v[0] == '$' and isinstance(v[1], str):
            t, props = v[1], v[3] or {}
            children = props.get('children')
            kids = convert_children(children, rows, depth)
            clean = {k: convert_data(p, rows, depth + 1) for k, p in props.items() if k not in SKIP_PROPS}
            clean = {k: p for k, p in clean.items() if p is not None}
            if t.startswith('$'):
                ref = t[2:] if t.startswith('$L') else t[1:]
                kind, val = rows.get(ref, (None, None))
                if kind == 'module':
                    if val == 'default':
                        return ['link', clean, kids]
                    if val in ('Children', 'Slot', 'LayoutSegmentProvider', 'RedirectBoundary'):
                        return ['frag', {}, kids]
                    return ['client', val, {**clean, **({'children': kids} if kids else {})}]
                if kind == 'json' and val == '$Sreact.fragment':
                    return ['frag', {}, kids]
                return ['frag', {}, kids]
            return ['el', t, clean, kids]
        return ['frag', {}, [convert(x, rows, depth + 1) for x in v]]
    if isinstance(v, dict):
        return {k: convert(x, rows, depth + 1) for k, x in v.items()}
    return None


def convert_data(v, rows, depth):
    """Props : les listes restent des listes (données), seuls les éléments React sont convertis."""
    if isinstance(v, list) and not (len(v) == 4 and v[0] == '$' and isinstance(v[1], str)):
        return [convert_data(x, rows, depth + 1) for x in v]
    if isinstance(v, dict):
        return {k: convert_data(x, rows, depth + 1) for k, x in v.items()}
    if isinstance(v, str) and (v.startswith('$L') or (v.startswith('$') and v[1:] in rows)):
        ref = v[2:] if v.startswith('$L') else v[1:]
        kind, val = rows.get(ref, ('json', None))
        return convert_data(val, rows, depth + 1) if kind == 'json' else None
    return convert(v, rows, depth)


def convert_children(children, rows, depth):
    if children is None:
        return []
    if isinstance(children, list) and not (len(children) == 4 and children[0] == '$'):
        out = []
        for c in children:
            out.append(convert(c, rows, depth + 1))
        return flatten(out)
    return flatten([convert(children, rows, depth + 1)])


def flatten(nodes):
    out = []
    for n in nodes:
        if isinstance(n, list) and n and n[0] == 'frag':
            out.extend(flatten(n[2]))
        elif n is not None and n != '':
            out.append(n)
    return out


def classes(node):
    if isinstance(node, list) and node and node[0] == 'el':
        return str(node[2].get('className', ''))
    return ''


def main_of(rows):
    kind, val = rows['1']
    tree = convert(val, rows)
    # tree = ['el', 'main', {...}, children]
    return tree


def route_of(path):
    rel = os.path.relpath(path, SRC)[:-4]  # sans .rsc
    if rel == 'index':
        return '/'
    return '/' + rel


def main():
    pages = {}
    shell = None
    for path in sorted(glob.glob(os.path.join(SRC, '**', '*.rsc'), recursive=True)):
        rows = parse_rows(open(path, encoding='utf-8').read())
        tree = main_of(rows)
        route = route_of(path)
        kids = tree[3]
        header = next((k for k in kids if classes(k).startswith('site-header')), None)
        footer = next((k for k in kids if classes(k).startswith('site-footer')), None)
        content = [k for k in kids if k is not header and k is not footer and 'mobile-bottom-nav' not in classes(k)]
        title_m = re.search(r'"__route":"route:([^"]*)"', '')
        pages[route] = {'mainClass': tree[2].get('className', ''), 'content': content}
        if route == '/':
            shell = {'header': header, 'footer': footer}
    os.makedirs(os.path.join(OUT, 'pages'), exist_ok=True)
    for route, data in pages.items():
        name = 'index' if route == '/' else route.strip('/').replace('/', '__')
        with open(os.path.join(OUT, 'pages', f'{name}.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'shell.json'), 'w', encoding='utf-8') as f:
        json.dump(shell, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'routes.json'), 'w', encoding='utf-8') as f:
        json.dump(sorted(pages.keys()), f, ensure_ascii=False, indent=0)
    print(f'{len(pages)} pages extraites')


if __name__ == '__main__':
    main()
