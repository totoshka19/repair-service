#!/usr/bin/env bash
# race_test.sh — проверка защиты от гонки при одновременном "взятии в работу"
#
# Использование:
#   bash race_test.sh [BASE_URL]
#
# По умолчанию BASE_URL=http://localhost:3000
# Требует: curl, jq (jq можно установить через scoop/brew/apt)

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
COOKIE_FILE="$(mktemp /tmp/race_test_cookies.XXXXXX)"

cleanup() {
  rm -f "$COOKIE_FILE"
}
trap cleanup EXIT

echo "=== Race condition test ==="
echo "Target: $BASE_URL"
echo ""

# 1. Логин под master1
echo "▶ Logging in as master1..."
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -c "$COOKIE_FILE" \
  -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"master1","password":"master123"}')

if [ "$LOGIN_STATUS" != "200" ]; then
  echo "✗ Login failed (HTTP $LOGIN_STATUS). Is the server running at $BASE_URL?"
  exit 1
fi
echo "✓ Logged in (HTTP $LOGIN_STATUS)"
echo ""

# 2. Найти ASSIGNED-заявку, назначенную на master1
echo "▶ Looking for an ASSIGNED request..."
RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/requests?status=ASSIGNED")

# Попробовать извлечь ID через jq, иначе — grep/sed
if command -v jq &>/dev/null; then
  REQUEST_ID=$(echo "$RESPONSE" | jq -r '.requests[0].id // empty')
else
  # Fallback: ищем первый "id":"..." в JSON
  REQUEST_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
fi

if [ -z "$REQUEST_ID" ]; then
  echo "✗ No ASSIGNED requests found."
  echo "  Run 'npm run db:seed' to restore test data, or assign a request via the dispatcher panel."
  exit 1
fi
echo "✓ Found request: $REQUEST_ID"
echo ""

# 3. Два параллельных PATCH /take
echo "▶ Sending two simultaneous PATCH /take requests..."
TMPFILE1="$(mktemp /tmp/race_resp1.XXXXXX)"
TMPFILE2="$(mktemp /tmp/race_resp2.XXXXXX)"

curl -s -b "$COOKIE_FILE" -X PATCH "$BASE_URL/api/requests/$REQUEST_ID/take" \
  -w "\n%{http_code}" > "$TMPFILE1" &
PID1=$!

curl -s -b "$COOKIE_FILE" -X PATCH "$BASE_URL/api/requests/$REQUEST_ID/take" \
  -w "\n%{http_code}" > "$TMPFILE2" &
PID2=$!

wait $PID1
wait $PID2

STATUS1=$(tail -1 "$TMPFILE1")
STATUS2=$(tail -1 "$TMPFILE2")

rm -f "$TMPFILE1" "$TMPFILE2"

echo ""
echo "=== Results ==="
echo "  Request 1: HTTP $STATUS1"
echo "  Request 2: HTTP $STATUS2"
echo ""

# 4. Проверка
STATUSES=$(echo -e "$STATUS1\n$STATUS2" | sort)
if [ "$STATUSES" = "$(echo -e "200\n409")" ]; then
  echo "✓ PASS — один запрос успешен (200), второй отклонён (409 Conflict)."
  echo "  Атомарная защита от гонки работает корректно."
else
  echo "✗ FAIL — неожиданные статусы: $STATUS1 и $STATUS2"
  echo "  Ожидалось: 200 и 409"
  exit 1
fi
