#!/bin/sh
# Собирает dist/ — ровно то, что уезжает на Cloudflare Pages.
# Сборщика в проекте нет и не будет: это копирование с исключениями.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"

rsync -a --exclude-from="$ROOT/.deployignore" \
  --exclude 'dist' \
  "$ROOT/" "$DIST/"

# Правила Pages кладём в корень выгрузки
cp "$ROOT/deploy/_headers" "$DIST/_headers"
cp "$ROOT/deploy/_redirects" "$DIST/_redirects"

# Секции — исходники для переноса в тему, на проде они не нужны:
# разметка уже вставлена копиями в страницы
rm -rf "$DIST/sections"

# Стили каждой страницы склеиваем в один файл (только в dist, исходники
# по блокам остаются): 31 отдельный CSS на медленной сети — 9 с ожидания
python3 "$ROOT/scripts/bundle-css.py" "$DIST"

FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')
SIZE=$(du -sh "$DIST" | cut -f1)
echo "dist готов: $FILES файлов, $SIZE"
