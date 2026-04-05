#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

DOMAIN="${DEPLOY_DOMAIN:-orbitacademyonline.com}"
WWW_DOMAIN="www.${DOMAIN}"
SITE_NAME="${NGINX_SITE_NAME:-orbitacademyonline.com}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"

# SSL_MODE: auto|origin|letsencrypt|http
SSL_MODE="${SSL_MODE:-auto}"
CF_ORIGIN_CERT_PATH="${CF_ORIGIN_CERT_PATH:-/root/.secrets/cloudflare-origin.crt}"
CF_ORIGIN_KEY_PATH="${CF_ORIGIN_KEY_PATH:-/root/.secrets/cloudflare-origin.key}"
CF_SSL_DIR="/etc/ssl/cloudflare"

log() {
    printf '[setup-vps] %s\n' "$1"
}

require_root() {
    if [[ "${EUID}" -ne 0 ]]; then
        echo "Please run as root: sudo ./user-scripts/setup-vps.sh"
        exit 1
    fi
}

require_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "Missing required file: $file"
        exit 1
    fi
}

install_base_packages() {
    log "Installing base packages"
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release nginx git ufw openssl
    systemctl enable nginx
}

install_docker_if_needed() {
    if ! command -v docker >/dev/null 2>&1; then
        log "Installing Docker"
        curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        sh /tmp/get-docker.sh
        rm -f /tmp/get-docker.sh
    fi

    if ! docker compose version >/dev/null 2>&1; then
        log "Installing Docker Compose plugin"
        apt-get install -y docker-compose-plugin
    fi
}

reset_env_file() {
    log "Resetting .env from .env.example.production"
    rm -f "$PROJECT_DIR/.env"
    cp "$PROJECT_DIR/.env.example.production" "$PROJECT_DIR/.env"
}

load_env() {
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.env"
    set +a
}

configure_firewall() {
    log "Configuring firewall"
    ufw allow 22/tcp || true
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw --force enable || true
}

write_cloudflare_realip_snippet() {
    mkdir -p /etc/nginx/snippets
    cat > /etc/nginx/snippets/cloudflare-realip.conf <<'EOF'
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;
real_ip_recursive on;
EOF
}

write_nginx_http_only() {
    local frontend_port="$1"
    local backend_port="$2"

    mkdir -p /var/www/certbot

    cat > "/etc/nginx/sites-available/${SITE_NAME}" <<EOF
server {
        listen 80;
        server_name ${DOMAIN} ${WWW_DOMAIN};

        include /etc/nginx/snippets/cloudflare-realip.conf;

        location /.well-known/acme-challenge/ {
                root /var/www/certbot;
        }

        location / {
                proxy_pass http://127.0.0.1:${frontend_port};
                proxy_http_version 1.1;
                proxy_set_header Upgrade \$http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /api/ {
                proxy_pass http://127.0.0.1:${backend_port};
                proxy_http_version 1.1;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
                proxy_read_timeout 120s;
                proxy_connect_timeout 120s;
                client_max_body_size 100M;
        }
}
EOF
}

write_nginx_with_tls() {
    local frontend_port="$1"
    local backend_port="$2"
    local cert_path="$3"
    local key_path="$4"

    cat > "/etc/nginx/sites-available/${SITE_NAME}" <<EOF
server {
        listen 80;
        server_name ${DOMAIN} ${WWW_DOMAIN};

        include /etc/nginx/snippets/cloudflare-realip.conf;

        location /.well-known/acme-challenge/ {
                root /var/www/certbot;
        }

        location / {
                return 301 https://\$host\$request_uri;
        }
}

server {
        listen 443 ssl http2;
        server_name ${DOMAIN} ${WWW_DOMAIN};

    include /etc/nginx/snippets/cloudflare-realip.conf;

        ssl_certificate ${cert_path};
        ssl_certificate_key ${key_path};
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:10m;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        client_max_body_size 100M;

        location / {
                proxy_pass http://127.0.0.1:${frontend_port};
                proxy_http_version 1.1;
                proxy_set_header Upgrade \$http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
                proxy_read_timeout 120s;
                proxy_connect_timeout 120s;
        }

        location /api/ {
                proxy_pass http://127.0.0.1:${backend_port};
                proxy_http_version 1.1;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
                proxy_read_timeout 120s;
                proxy_connect_timeout 120s;
                client_max_body_size 100M;
        }

        location /health/ {
                access_log off;
                return 200 "healthy\\n";
                add_header Content-Type text/plain;
        }

        location ~ /\.(env|git|ht) {
                deny all;
                access_log off;
                log_not_found off;
        }
}
EOF
}

enable_site_and_reload_nginx() {
    ln -sf "/etc/nginx/sites-available/${SITE_NAME}" "/etc/nginx/sites-enabled/${SITE_NAME}"
    nginx -t
    systemctl reload nginx
}

setup_ssl() {
    local frontend_port="$1"
    local backend_port="$2"

    local mode="$SSL_MODE"
    if [[ "$mode" == "auto" ]]; then
        if [[ -f "$CF_ORIGIN_CERT_PATH" && -f "$CF_ORIGIN_KEY_PATH" ]]; then
            mode="origin"
        elif [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" && -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]]; then
            mode="letsencrypt"
        else
            mode="letsencrypt"
        fi
    fi

    if [[ "$mode" == "origin" ]]; then
        log "Using Cloudflare Origin Certificate"
        mkdir -p "$CF_SSL_DIR"
        install -m 0644 "$CF_ORIGIN_CERT_PATH" "$CF_SSL_DIR/${DOMAIN}.crt"
        install -m 0600 "$CF_ORIGIN_KEY_PATH" "$CF_SSL_DIR/${DOMAIN}.key"
        write_nginx_with_tls "$frontend_port" "$backend_port" "$CF_SSL_DIR/${DOMAIN}.crt" "$CF_SSL_DIR/${DOMAIN}.key"
        enable_site_and_reload_nginx
        return
    fi

    if [[ "$mode" == "letsencrypt" ]]; then
        log "Using Let's Encrypt certificate"
        apt-get install -y certbot
        write_nginx_http_only "$frontend_port" "$backend_port"
        enable_site_and_reload_nginx
        mkdir -p /var/www/certbot

        if ! certbot certonly \
            --webroot \
            -w /var/www/certbot \
            -d "$DOMAIN" \
            -d "$WWW_DOMAIN" \
            --non-interactive \
            --agree-tos \
            -m "$LETSENCRYPT_EMAIL" \
            --keep-until-expiring; then
            log "Let's Encrypt issuance failed. Falling back to HTTP origin."
            write_nginx_http_only "$frontend_port" "$backend_port"
            enable_site_and_reload_nginx
            return
        fi

        write_nginx_with_tls \
            "$frontend_port" \
            "$backend_port" \
            "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" \
            "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
        enable_site_and_reload_nginx
        return
    fi

    log "SSL disabled by configuration (SSL_MODE=http). Using HTTP origin."
    write_nginx_http_only "$frontend_port" "$backend_port"
    enable_site_and_reload_nginx
}

deploy_containers() {
    log "Building and starting containers"
    cd "$PROJECT_DIR"
    docker compose down --remove-orphans || true
    docker compose build --pull --no-cache
    docker compose up -d --remove-orphans
    docker compose ps
}

show_summary() {
    local frontend_port="$1"
    local backend_port="$2"

    log "Setup finished"
    echo
    echo "Run these checks on VPS:"
    echo "  cd $PROJECT_DIR"
    echo "  docker compose ps"
    echo "  docker compose logs -f --tail=100"
    echo "  curl -I http://127.0.0.1:${frontend_port}"
    echo "  curl -I http://127.0.0.1:${backend_port}"
    echo
    echo "Cloudflare recommendation: SSL/TLS encryption mode = Full (strict)"
}

main() {
    require_root
    require_file "$PROJECT_DIR/.env.example.production"
    require_file "$PROJECT_DIR/docker-compose.yml"

    install_base_packages
    install_docker_if_needed
    configure_firewall
    write_cloudflare_realip_snippet

    reset_env_file
    load_env

    local frontend_port="${FRONTEND_HOST_PORT:-3000}"
    local backend_port="${BACKEND_HOST_PORT:-5000}"

    setup_ssl "$frontend_port" "$backend_port"
    deploy_containers
    show_summary "$frontend_port" "$backend_port"
}

main "$@"