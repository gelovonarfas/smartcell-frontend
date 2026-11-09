#!/bin/sh
# Записки Николаю в Telegram-группу через бота.
#   sh scripts/tg.sh chats              — показать чаты, где бот видел сообщения (узнать chat_id)
#   sh scripts/tg.sh send файл.md       — отправить текст из файла в группу
#   sh scripts/tg.sh send - < файл.md   — то же из stdin
#   sh scripts/tg.sh photo картинка.png "подпись" — отправить картинку
#   sh scripts/tg.sh read               — новые сообщения из группы, с номерами: [123] Имя: текст
#   sh scripts/tg.sh react 123 👍        — реакция на сообщение (эмодзи из списка Telegram; по умолчанию 👍)
#   sh scripts/tg.sh reply 123 файл.md  — ответить на сообщение («Ответить»); файл или - для stdin
#   sh scripts/tg.sh edit 123 файл.md   — исправить своё отправленное сообщение (номер печатают send/reply: ok [123])
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
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok [%s]" % r["result"].get("message_id", "") if r.get("ok") and isinstance(r.get("result"), dict) else ("ok" if r.get("ok") else r))'
    ;;
  photo)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    curl -s "$API/sendPhoto" -F "chat_id=$TELEGRAM_CHAT_ID" -F "photo=@${2:?какую картинку}" \
      -F "caption=${3:-}" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok [%s]" % r["result"].get("message_id", "") if r.get("ok") and isinstance(r.get("result"), dict) else ("ok" if r.get("ok") else r))'
    ;;
  read)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    off=$(cat "$STATE" 2>/dev/null || echo 0)
    curl -s "$API/getUpdates?offset=$off" | python3 -I -c '
import json, sys, os, urllib.request
chat, state, api, inbox = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
last = None
for u in json.load(sys.stdin).get("result", []):
    last = u["update_id"]
    m = u.get("message")
    if not m or m["chat"]["id"] != chat: continue
    who = "[%d] %s:" % (m["message_id"], m["from"].get("first_name", "?"))
    if "reply_to_message" in m: who += " (ответ на %d)" % m["reply_to_message"]["message_id"]
    text = m.get("text") or m.get("caption") or ""
    # фото и файлы скачиваем в inbox, чтобы их можно было открыть
    fid = (m["photo"][-1]["file_id"] if m.get("photo") else (m.get("document") or {}).get("file_id"))
    if fid:
        try:
            info = json.load(urllib.request.urlopen(api + "/getFile?file_id=" + fid))["result"]
            os.makedirs(inbox, exist_ok=True)
            dst = os.path.join(inbox, "%d-%s" % (m["message_id"], os.path.basename(info["file_path"])))
            urllib.request.urlretrieve(api.replace("/bot", "/file/bot") + "/" + info["file_path"], dst)
            text = (text + " " if text else "") + "[файл: %s]" % dst
        except Exception as e:
            text = (text + " " if text else "") + "[файл не скачался: %s]" % e
    print(who, text or "[%s]" % ", ".join(k for k in m if k not in ("message_id", "from", "chat", "date")))
if last is not None: open(state, "w").write(str(last + 1))' "$TELEGRAM_CHAT_ID" "$STATE" "$API" "${TG_INBOX:-${TMPDIR:-/tmp}/sc-tg-inbox}"
    ;;
  react)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    id="${2:?номер сообщения из read}"
    emoji="${3:-👍}"
    reaction=$(python3 -I -c 'import json,sys; print(json.dumps([{"type":"emoji","emoji":sys.argv[1]}]))' "$emoji")
    curl -s "$API/setMessageReaction" --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "message_id=$id" --data-urlencode "reaction=$reaction" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok [%s]" % r["result"].get("message_id", "") if r.get("ok") and isinstance(r.get("result"), dict) else ("ok" if r.get("ok") else r))'
    ;;
  reply)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    id="${2:?номер сообщения из read}"
    src="${3:?какой файл отправить}"
    if [ "$src" = "-" ]; then text=$(cat); else text=$(cat "$src"); fi
    curl -s "$API/sendMessage" --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "text=$text" --data-urlencode "reply_to_message_id=$id" \
      --data-urlencode "disable_web_page_preview=true" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok [%s]" % r["result"].get("message_id", "") if r.get("ok") and isinstance(r.get("result"), dict) else ("ok" if r.get("ok") else r))'
    ;;
  edit)
    : "${TELEGRAM_CHAT_ID:?нет TELEGRAM_CHAT_ID в окружении}"
    id="${2:?номер своего сообщения}"
    src="${3:?какой файл отправить}"
    if [ "$src" = "-" ]; then text=$(cat); else text=$(cat "$src"); fi
    curl -s "$API/editMessageText" --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "message_id=$id" --data-urlencode "text=$text" \
      --data-urlencode "disable_web_page_preview=true" |
      python3 -I -c 'import json,sys; r=json.load(sys.stdin); print("ok" if r.get("ok") else r)'
    ;;
  *)
    sed -n '2,15p' "$0"
    ;;
esac
