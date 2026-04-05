# Deployment Guide

This project is deployed by running scripts directly on the VPS after you SSH in.

## Exact workflow

```bash
ssh root@82.112.238.218
cd /root/sheet
chmod +x user-scripts/*.sh
```

## First-time setup (new VPS or fresh install)

```bash
./user-scripts/setup-vps.sh
```

What this script does:

1. Installs system packages (`nginx`, `docker`, `docker compose`, `ufw`, etc.) if needed.
2. Resets environment file every time:
3. `rm -f .env`
4. `cp .env.example.production .env`
5. Configures Nginx for `orbitacademyonline.com` and `www.orbitacademyonline.com`.
6. Configures SSL in one of these modes:
7. Cloudflare Origin Certificate (`SSL_MODE=origin`) if both cert and key files exist.
8. Let's Encrypt (`SSL_MODE=letsencrypt` or default auto fallback).
9. HTTP only (`SSL_MODE=http`) if explicitly set.
10. Builds and starts Docker containers with clean rebuild.

## Redeploy on new code changes

```bash
./user-scripts/pullNredeploy.sh
```

What redeploy does:

1. Stops existing containers.
2. Pulls latest code by hard-resetting to remote branch (`origin/main` by default).
3. Resets environment file every time:
4. `rm -f .env`
5. `cp .env.example.production .env`
6. Rebuilds images with `--no-cache` and starts containers.

## Optional scripts

```bash
./user-scripts/rebuild.sh
./user-scripts/deploy.sh
```

- `rebuild.sh`: force clean rebuild without git update.
- `deploy.sh`: wrapper that calls `pullNredeploy.sh`.

## Cloudflare SSL guidance (based on your settings)

Your current Cloudflare setup indicates:

1. Universal Edge certificate is active.
2. Always Use HTTPS is enabled.
3. TLS 1.3 is enabled.
4. Automatic HTTPS rewrites is enabled.
5. Authenticated Origin Pulls is disabled.

Recommended SSL mode in Cloudflare dashboard:

1. Set `SSL/TLS -> Overview -> Encryption mode` to `Full (strict)`.

For `Full (strict)` you must have a valid origin certificate on VPS:

1. Either Cloudflare Origin Cert + private key.
2. Or Let's Encrypt certificate.

### Using Cloudflare Origin Certificate in script

Store certificate files on VPS only (do not keep private key in git):

```bash
mkdir -p /root/.secrets
nano /root/.secrets/cloudflare-origin.crt
nano /root/.secrets/cloudflare-origin.key
chmod 600 /root/.secrets/cloudflare-origin.key
chmod 644 /root/.secrets/cloudflare-origin.crt
```

`setup-vps.sh` checks these default paths in `auto` mode.

Then run:

```bash
SSL_MODE=origin ./user-scripts/setup-vps.sh
```

Note: certificate alone is not enough. Private key is required.

### Using Let's Encrypt instead

```bash
SSL_MODE=letsencrypt LETSENCRYPT_EMAIL=you@example.com ./user-scripts/setup-vps.sh
```

## Important DNS fix

Your Cloudflare DNS currently includes:

1. `A` records for root and `www` (proxied) -> good.
2. `AAAA` records for root and `www` as `100::` (DNS only) -> risky.

Recommendation:

1. Remove those `AAAA 100::` records unless your server has working IPv6 and correct AAAA target.
2. Keep proxied `A` records for root and `www`.

## Complete Cloudflare settings to apply

### SSL/TLS -> Overview

1. Encryption mode: `Full (strict)`

### SSL/TLS -> Edge Certificates

1. Always Use HTTPS: `On`
2. TLS 1.3: `On`
3. Automatic HTTPS Rewrites: `On`
4. Minimum TLS Version: `TLS 1.2` (recommended)
5. HTTP Strict Transport Security (HSTS): optional, enable only after HTTPS is stable for 24-48h

### Speed -> Protocol Optimization

1. HTTP/2: `On`
2. HTTP/2 to Origin: `On`
3. HTTP/3 (with QUIC): `On`
4. 0-RTT: optional (`Off` if you want strict replay safety)

### SSL/TLS -> Origin Server

1. Authenticated Origin Pulls: keep `Off` for now (your current setup)
2. Turn `On` only after explicit Nginx client-certificate validation is configured

### DNS

1. Keep proxied `A` records:
2. `orbitacademyonline.com -> 82.112.238.218` (Proxied)
3. `www -> 82.112.238.218` (Proxied)
4. Remove invalid `AAAA` records that point to `100::` unless that is a real reachable IPv6 origin

### Caching -> Cache Rules (important)

Create rules in this order (top to bottom):

1. Rule: `Bypass API cache`
2. If: `URI Path starts with /api/`
3. Then: `Cache eligibility = Bypass cache`

4. Rule: `Bypass admin/auth dynamic pages`
5. If: `URI Path contains /admin` OR `URI Path contains /login` OR `URI Path contains /account`
6. Then: `Cache eligibility = Bypass cache`

7. Rule: `Cache Next static assets`
8. If: `URI Path starts with /_next/static/`
9. Then: `Cache eligibility = Eligible for cache`, `Edge TTL = 1 month`

10. Rule: `Do not cache uploads/download api-like paths`
11. If: `URI Path starts with /uploads/` OR `URI Path starts with /downloads/`
12. Then: `Cache eligibility = Bypass cache` (safer default)

### Security -> WAF (optional baseline)

1. Security Level: `Medium`
2. Browser Integrity Check: `On`
3. Bot Fight Mode: `On` (if available)

### Network

1. WebSockets: `On` (required for upgrade headers and modern app behavior)
2. HTTP/2 to origin: keep On here if exposed in your plan/settings view

## Useful manual commands

```bash
cd /root/sheet
docker compose ps
docker compose logs -f --tail=200
docker compose down --remove-orphans
docker compose build --pull --no-cache
docker compose up -d --remove-orphans

nginx -t
systemctl reload nginx
systemctl status nginx

curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:5000
curl -I https://orbitacademyonline.com
```