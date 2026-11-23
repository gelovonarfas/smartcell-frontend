#!/bin/sh
# Собирает плагин «Клітинна абетка» для передачи Николаю:
# кладёт в папку плагина свежие копии CSV, CSS и JS подсказок из кита и пакует zip.
#   sh scripts/build-abetka-plugin.sh
# Источник правды — кит: assets/css/sections/vm-term-tip.css, assets/js/term-tip.js,
# docs/glossary/smartcell-abetka-terms.csv. Копии в плагине руками не править.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUG="$ROOT/docs/glossary/plugin/smartcell-abetka"

mkdir -p "$PLUG/assets" "$PLUG/data"
cp "$ROOT/assets/css/sections/vm-term-tip.css" "$PLUG/assets/term-tip.css"
cp "$ROOT/assets/js/term-tip.js" "$PLUG/assets/term-tip.js"
cp "$ROOT/docs/glossary/smartcell-abetka-terms.csv" "$PLUG/data/smartcell-abetka-terms.csv"

cd "$ROOT/docs/glossary/plugin"
rm -f smartcell-abetka.zip
zip -qr -X smartcell-abetka.zip smartcell-abetka -x '*.DS_Store'
echo "плагин собран: docs/glossary/plugin/smartcell-abetka.zip ($(du -h smartcell-abetka.zip | cut -f1))"
