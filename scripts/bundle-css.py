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
    bundle = '\n'.join(parts) + '\n'
    # @import шрифта из tokens.css вырезаем: внутри CSS он блокирует отрисовку
    # цепочкой html → бандл → CSS шрифта → файлы. На странице уже стоит
    # <link rel="preload"> на тот же адрес — ниже он становится неблокирующей
    # загрузкой стиля (display=swap: текст рисуется сразу подменным шрифтом).
    imports = re.findall(r'@import\s+url\("([^"]+)"\);', bundle)
    bundle = re.sub(r'@import\s+url\("[^"]+"\);\s*', '', bundle)
    (dist / 'assets' / 'css' / name).write_text(bundle, encoding='utf-8')
    for font_url in imports:
        html = html.replace(
            f'<link rel="preload" as="style" href="{font_url}">',
            f'<link rel="preload" as="style" href="{font_url}" onload="this.onload=null;this.rel=\'stylesheet\'">\n'
            f'  <noscript><link rel="stylesheet" href="{font_url}"></noscript>')
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
