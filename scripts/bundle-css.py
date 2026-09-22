#!/usr/bin/env python3
"""Склейка CSS для стенда — только внутри dist/, исходники не трогает.

Зачем: страницы подключают 25–31 отдельный CSS-файл, и на медленной сети
каждый стоит отдельного круга до сервера (Lighthouse: render-blocking
9,4 с суммарно на мобильном). Для каждой страницы dist/*.html собираем
один файл assets/css/bundle-<страница>.css в том же порядке, что и <link>,
и подменяем ссылки одной. Комментарии из CSS убираем: их в ките много,
это треть веса.

Относительные url() внутри секций написаны от assets/css/sections/,
после переезда в assets/css/ им нужен один уровень вверх, а не два.
"""
import re
import sys
from pathlib import Path

dist = Path(sys.argv[1]).resolve()
LINK = re.compile(r'^[ \t]*<link rel="stylesheet" href="(assets/css/[^"]+)">[ \t]*\n', re.M)
COMMENT = re.compile(r'/\*.*?\*/', re.S)

for page in sorted(dist.glob('*.html')):
    html = page.read_text(encoding='utf-8')
    links = LINK.findall(html)
    if len(links) < 2:
        continue
    parts = []
    for href in links:
        src = dist / href
        css = src.read_text(encoding='utf-8')
        css = COMMENT.sub('', css)
        if '/sections/' in href:
            css = css.replace('url("../../', 'url("../').replace("url('../../", "url('../").replace('url(../../', 'url(../')
        css = re.sub(r'\n[ \t]*\n+', '\n', css).strip()
        parts.append(f'/* {href} */\n{css}')
    name = f'bundle-{page.stem}.css'
    (dist / 'assets' / 'css' / name).write_text('\n'.join(parts) + '\n', encoding='utf-8')
    first = True
    def swap(m):
        global first
        if first:
            first = False
            return f'  <link rel="stylesheet" href="assets/css/{name}">\n'
        return ''
    html = LINK.sub(swap, html)
    page.write_text(html, encoding='utf-8')
    size = (dist / 'assets' / 'css' / name).stat().st_size // 1024
    print(f'{page.name}: {len(links)} файлов → {name} ({size} KB)')
