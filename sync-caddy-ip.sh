#!/bin/bash
# Detects this EC2 instance's current public IP and rewrites the Caddyfile's
# nip.io hostname to match, then restarts Caddy if anything changed.
#
# Run on boot via systemd (see restaurant-crm.service) — covers the case
# where AWS assigns a new public IP after a stop/start without an Elastic IP.

set -euo pipefail

cd "$(dirname "$0")"

CURRENT_IP=$(curl -s --max-time 5 https://checkip.amazonaws.com | tr -d '[:space:]')
NEW_DOMAIN="${CURRENT_IP}.nip.io"

# Extract the domain currently in the Caddyfile (first non-comment, non-blank line)
OLD_DOMAIN=$(grep -m1 -E '^\S+\.nip\.io' Caddyfile | awk '{print $1}')

if [ "$OLD_DOMAIN" = "$NEW_DOMAIN" ]; then
    echo "IP unchanged ($CURRENT_IP) — nothing to do."
    exit 0
fi

echo "IP changed: $OLD_DOMAIN -> $NEW_DOMAIN"
sed -i "s/$OLD_DOMAIN/$NEW_DOMAIN/" Caddyfile

docker compose -f docker-compose.prod.yml restart caddy
echo "Caddy restarted with new domain $NEW_DOMAIN"
