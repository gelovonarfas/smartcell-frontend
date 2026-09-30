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

# Что нужно первому экрану каждой страницы: это уходит инлайном в <head>,
# остальное — в бандл, который грузится неблокирующе (preload + onload).
# Так отрисовка не ждёт ни одного CSS-запроса: PSI показывал 300 мс блокировки
# на бандле при том, что хиро нужна пятая его часть (2026-09-22).
CRITICAL = {
    'index': ['tokens', 'base', 'b00-announcement', 'b00b-header', 'b01-hero'],
    'vm-blog': ['tokens', 'base', 'b00b-header', 'vm-featured', 'vm-rubrics'],
    'vm-blog-rubrics': ['tokens', 'base', 'b00b-header', 'vm-featured', 'vm-rubrics'],
    'vm-category': ['tokens', 'base', 'b00b-header', 'vm-category', 'vm-rubrics'],
    'vm-article': ['tokens', 'base', 'b00b-header', 'vm-article'],
    'vm-article-oblik': ['tokens', 'base', 'b00b-header', 'vm-article'],
}

def minify(css):
    css = COMMENT.sub('', css)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};,>])\s*', r'\1', css)   # двоеточие не трогаем: «a :hover» ≠ «a:hover»
    css = css.replace(';}', '}')
    return css.strip()

for page in sorted(dist.glob('*.html')):
    html = page.read_text(encoding='utf-8')
    links = LINK.findall(html)
    if len(links) < 2:
        continue
    crit_names = CRITICAL.get(page.stem, ['tokens', 'base', 'b00b-header'])
    critical, rest = [], []
    for href in links:
        src = dist / href
        css = src.read_text(encoding='utf-8')
        if '/sections/' in href:
            css = css.replace('url("../../', 'url("../').replace("url('../../", "url('../").replace('url(../../', 'url(../')
        css = minify(css)
        stem = Path(href).stem
        if stem in crit_names:
            # инлайн живёт в HTML: url() считаются от страницы, а не от assets/css/
            critical.append(css.replace('url("../', 'url("assets/').replace("url('../", "url('assets/").replace('url(../', 'url(assets/'))
        else:
            rest.append(css)
    name = f'bundle-{page.stem}.css'
    bundle = ''.join(rest) + '\n'
    # @import шрифта из tokens.css вырезаем: внутри CSS он блокирует отрисовку
    # цепочкой html → бандл → CSS шрифта → файлы. На странице уже стоит
    # <link rel="preload"> на тот же адрес — ниже он становится неблокирующей
    # загрузкой стиля (display=swap: текст рисуется сразу подменным шрифтом).
    # @import шрифта теперь сидит в критической части (tokens.css) — вырезаем оттуда
    crit_css = ''.join(critical)
    imports = re.findall(r'@import\s*url\("([^"]+)"\);', crit_css + bundle)
    crit_css = re.sub(r'@import\s*url\("[^"]+"\);\s*', '', crit_css)
    bundle = re.sub(r'@import\s*url\("[^"]+"\);\s*', '', bundle)
    critical = [crit_css]
    (dist / 'assets' / 'css' / name).write_text(bundle, encoding='utf-8')
    for font_url in imports:
        # display=optional вместо swap — только на стенде: шрифт, не успевший к первой
        # отрисовке, не подменяет системный по ходу, и заголовок хиро не прыгает
        # (Lighthouse CLS 0.08 «Web font loaded»). После первого визита шрифт в кеше
        # и приходит вовремя. На проде правильный путь — self-host + size-adjust
        # у запасного шрифта, см. HANDOFF.
        stand_url = font_url.replace('display=swap', 'display=optional')
        html = html.replace(
            f'<link rel="preload" as="style" href="{font_url}">',
            f'<link rel="preload" as="style" href="{stand_url}" onload="this.onload=null;this.rel=\'stylesheet\'">\n'
            f'  <noscript><link rel="stylesheet" href="{stand_url}"></noscript>')
    first = True
    def swap(m):
        global first
        if first:
            first = False
            return (f'  <style>{"".join(critical)}</style>\n'
                    f'  <link rel="preload" as="style" href="assets/css/{name}" onload="this.onload=null;this.rel=\'stylesheet\'">\n'
                    f'  <noscript><link rel="stylesheet" href="assets/css/{name}"></noscript>\n')
        return ''
    html = LINK.sub(swap, html)
    page.write_text(html, encoding='utf-8')
    size = (dist / 'assets' / 'css' / name).stat().st_size // 1024
    crit_kb = len(''.join(critical).encode()) // 1024
    print(f'{page.name}: {len(links)} файлов → инлайн {crit_kb} KB + {name} ({size} KB)')
