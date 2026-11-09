#!/bin/sh
# Записки Николаю в Telegram-группу через бота.
#   sh scripts/tg.sh chats              — показать чаты, где бот видел сообщения (узнать chat_id)
#   sh scripts/tg.sh send файл.md       — отправить текст из файла в группу
#   sh scripts/tg.sh send - < файл.md   — то же из stdin
#   sh scripts/tg.sh photo картинка.png "подпись" — отправить картинку
#   sh scripts/tg.sh read               — новые сообщения из группы, с номерами: [123] Имя: текст
#   sh scripts/tg.sh react 123 👍        — реакция на сообщение (эмодзи из списка Telegram; по умолчанию 👍)
#   sh scripts/tg.sh reply 123 файл.md  — ответить на сообщение («Ответить»); файл или - для stdin
#
# Токен и группа — только из окружения (~/.zshrc), в репозиторий не попадают:
#   export TELEGRAM_BOT_TOKEN="…"   — от @BotFather; утёк — /revoke там же
#   export TELEGRAM_CHAT_ID="-100…" — id группы, см. «chats»
set -eu

: "${TELEGRAM_BOT_TOKEN:?нет TELEGRAM_BOT_TOKEN в окружении}"
API="https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN"
STATE="${TMPDIR:-/tmp}/sc-tg-offset"

case "${1:-}" in
  chats)
    curl -s "$API/getUpdates" | python3 -I -c '
import json, sys
seen = {}
for u in json.load(sys.stdin).get("result", []):
    m = u.get("message") or u.get("my_chat_member") or {}
    c = m.get("chat")
    if c: seen[c["id"]] = c.get("title") or c.get("username") or c.get("first_name")
for k, v in seen.items(): print(k, v)
print("чатов:", len(seen))'
    ;;
  send)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    src="${2:?какой файл отправить}"
    # Текст как есть, без разметки: Telegram-Markdown ломается на `_` и `*` в именах классов
    if [ "$src" = "-" ]; then text=$(cat); else text=$(cat "$src"); fi
    curl -s "$API/sendMessage" --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "text=$text" --data-urlencode "disable_web_page_preview=true" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok" if r.get("ok") else r)'
    ;;
  photo)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    curl -s "$API/sendPhoto" -F "chat_id=$TELEGRAM_CHAT_ID" -F "photo=@${2:?какую картинку}" \
      -F "caption=${3:-}" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok" if r.get("ok") else r)'
    ;;
  read)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    off=$(cat "$STATE" 2>/dev/null || echo 0)
    curl -s "$API/getUpdates?offset=$off" | python3 -I -c '
import json, sys, os
chat, state = int(sys.argv[1]), sys.argv[2]
last = None
for u in json.load(sys.stdin).get("result", []):
    last = u["update_id"]
    m = u.get("message")
    if m and m["chat"]["id"] == chat and "text" in m:
        print("[%d]" % m["message_id"], m["from"].get("first_name", "?") + ":", m["text"])
if last is not None: open(state, "w").write(str(last + 1))' "$TELEGRAM_CHAT_ID" "$STATE"
    ;;
  react)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    id="${2:?номер сообщения из read}"
    emoji="${3:-👍}"
    reaction=$(python3 -I -c 'import json,sys; print(json.dumps([{"type":"emoji","emoji":sys.argv[1]}]))' "$emoji")
    curl -s "$API/setMessageReaction" --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "message_id=$id" --data-urlencode "reaction=$reaction" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok" if r.get("ok") else r)'
    ;;
  reply)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    id="${2:?номер сообщения из read}"
    src="${3:?какой файл отправить}"
    if [ "$src" = "-" ]; then text=$(cat); else text=$(cat "$src"); fi
    curl -s "$API/sendMessage" --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "text=$text" --data-urlencode "reply_to_message_id=$id" \
      --data-urlencode "disable_web_page_preview=true" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok" if r.get("ok") else r)'
    ;;
  *)
    sed -n '2,14p' "$0"
    ;;
esac
