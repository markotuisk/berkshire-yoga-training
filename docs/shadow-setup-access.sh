#!/usr/bin/env bash
# One-shot setup for TWA Shadow: DNS CNAME + Cloudflare Access allowlist.
# Requires an API token with:
#   Zone → DNS → Edit (zone berkshireyogatraining.co.uk)
#   Account → Access: Apps and Policies → Edit
#   Account → Cloudflare Pages → Edit (optional)
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   ./docs/shadow-setup-access.sh

set -euo pipefail

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-bc3f6c1145456bef0f781f62744c74ed}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-4f9d56fc4e061dea1f6f2a0c54535621}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"

EMAILS=(
  "markotuisk@gmail.com"
  "Katia.major@thameswellness.com"
  "raili.maripuu@thameswellness.com"
)

api() {
  local method="$1" path="$2"
  shift 2
  curl -sS -X "$method" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4$path" \
    "$@"
}

echo "==> DNS CNAME shadow → berkshire-yoga-training-shadow.pages.dev"
EXISTING=$(api GET "/zones/$ZONE_ID/dns_records?name=shadow.berkshireyogatraining.co.uk")
echo "$EXISTING" | python3 -c "import sys,json; d=json.load(sys.stdin); print('dns success', d.get('success'), 'count', len(d.get('result') or []))"

COUNT=$(echo "$EXISTING" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('result') or []))")
if [[ "$COUNT" = "0" ]]; then
  api POST "/zones/$ZONE_ID/dns_records" --data '{
    "type":"CNAME",
    "name":"shadow",
    "content":"berkshire-yoga-training-shadow.pages.dev",
    "proxied":true,
    "ttl":1
  }' | python3 -m json.tool | head -40
else
  echo "DNS record already present; skipping create."
fi

INCLUDE_JSON=$(python3 - <<'PY'
import json
emails = [
  "markotuisk@gmail.com",
  "Katia.major@thameswellness.com",
  "raili.maripuu@thameswellness.com",
]
print(json.dumps([{"email": {"email": e}} for e in emails]))
PY
)

echo "==> Cloudflare Access app (TWA Shadow review)"
APPS=$(api GET "/accounts/$ACCOUNT_ID/access/apps")
APP_ID=$(echo "$APPS" | python3 -c "import sys,json; apps=json.load(sys.stdin).get('result') or [];
print(next((a['id'] for a in apps if a.get('name')=='TWA Shadow review'), ''))")

BODY=$(python3 - <<PY
import json
include = json.loads('''$INCLUDE_JSON''')
print(json.dumps({
  "name": "TWA Shadow review",
  "type": "self_hosted",
  "session_duration": "24h",
  "auto_redirect_to_identity": False,
  "destinations": [
    {"type": "public", "uri": "shadow.berkshireyogatraining.co.uk"},
    {"type": "public", "uri": "berkshire-yoga-training-shadow.pages.dev"},
    {"type": "public", "uri": "*.berkshire-yoga-training-shadow.pages.dev"},
  ],
  "policies": [{
    "name": "Partners allowlist",
    "decision": "allow",
    "include": include,
  }],
}))
PY
)

if [[ -z "$APP_ID" ]]; then
  echo "$BODY" | api POST "/accounts/$ACCOUNT_ID/access/apps" --data @- | python3 -m json.tool | head -60
else
  echo "App exists ($APP_ID); updating policy include emails."
  echo "$BODY" | api PUT "/accounts/$ACCOUNT_ID/access/apps/$APP_ID" --data @- | python3 -m json.tool | head -60
fi

echo "==> Done. Test in a private window:"
echo "    https://shadow.berkshireyogatraining.co.uk"
echo "    https://berkshire-yoga-training-shadow.pages.dev"
echo "Allowlist: ${EMAILS[*]}"
