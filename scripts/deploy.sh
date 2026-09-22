#!/bin/sh
# Деплой статики в Cloudflare (Workers Static Assets — бывший Pages).
#   sh scripts/deploy.sh            — прод
#   sh scripts/deploy.sh preview    — превью-версия по отдельной ссылке, прод не трогает
#
# Авторизация: `npx wrangler login` на машине
# либо переменная CLOUDFLARE_API_TOKEN.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
sh "$ROOT/scripts/build-dist.sh"

cd "$ROOT"
if [ "${1:-}" = "preview" ]; then
  # версия загружается, но трафик на неё не переключается
  npx --yes wrangler@latest versions upload
else
  npx --yes wrangler@latest deploy
fi
