#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

DOMAIN="${DEPLOY_DOMAIN:-documents.orbitacademyonline.com}"
WWW_DOMAIN="www.${DOMAIN}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"

# SSL_MODE: auto|origin|letsencrypt|http
SSL_MODE="${SSL_MODE:-auto}"
CF_ORIGIN_CERT_PATH="${CF_ORIGIN_CERT_PATH:-$SCRIPT_DIR/cloudflare-origin.crt}"
CF_ORIGIN_KEY_PATH="${CF_ORIGIN_KEY_PATH:-$SCRIPT_DIR/cloudflare-origin.key}"

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
    apt-get install -y ca-certificates curl gnupg lsb-release git ufw openssl
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

setup_ssl_certs_for_docker() {
    log "Setting up SSL certificates for Docker"
    
    local ssl_dir="$PROJECT_DIR/nginx/ssl"
    mkdir -p "$ssl_dir"

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
        log "Using Cloudflare Origin Certificate for Docker Nginx"
        install -m 0644 "$CF_ORIGIN_CERT_PATH" "$ssl_dir/cert.pem"
        install -m 0600 "$CF_ORIGIN_KEY_PATH" "$ssl_dir/key.pem"
        return
    fi

    if [[ "$mode" == "letsencrypt" ]]; then
        log "Using Let's Encrypt certificate for Docker Nginx"
        apt-get install -y certbot

        mkdir -p /var/www/certbot

        if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
            log "Requesting certificate from Let's Encrypt"
            if ! certbot certonly \
                --standalone \
                -d "$DOMAIN" \
                -d "$WWW_DOMAIN" \
                --non-interactive \
                --agree-tos \
                -m "$LETSENCRYPT_EMAIL" \
                --keep-until-expiring; then
                log "WARNING: Let's Encrypt issuance failed. Containers will use self-signed certs."
                openssl req -x509 -newkey rsa:2048 -nodes -out "$ssl_dir/cert.pem" -keyout "$ssl_dir/key.pem" -days 365 \
                    -subj "/CN=${DOMAIN}"
                return
            fi
        fi

        # Copy LE certs to Docker volume location
        install -m 0644 "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "$ssl_dir/cert.pem"
        install -m 0600 "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "$ssl_dir/key.pem"
        return
    fi

    log "Generating self-signed certificate (HTTP_MODE)"
    openssl req -x509 -newkey rsa:2048 -nodes -out "$ssl_dir/cert.pem" -keyout "$ssl_dir/key.pem" -days 365 \
        -subj "/CN=${DOMAIN}"
}


deploy_containers() {
    log "Building and starting containers with Docker Compose"
    cd "$PROJECT_DIR"
    docker compose down --remove-orphans || true
    docker compose up -d --build
    
    log "Waiting for containers to stabilize..."
    sleep 10
    
    docker compose ps
}

show_summary() {
    log "Setup finished successfully!"
    echo ""
    echo "=========================================="
    echo "Deployment Summary (Docker-based)"
    echo "=========================================="
    echo "Domain: https://${DOMAIN}"
    echo "Admin Email: ${BACKEND_ADMIN_EMAIL}"
    echo ""
    echo "Verify deployment:"
    echo "  cd ${PROJECT_DIR}"
    echo "  docker compose ps"
    echo "  docker compose logs -f nginx"
    echo ""
    echo "Test connectivity:"
    echo "  curl -I https://${DOMAIN}"
    echo "  curl http://localhost/health/"
    echo ""
    echo "Cloudflare Settings:"
    echo "  - SSL/TLS: Full (strict)"
    echo "  - Always HTTPS: On"
    echo "  - HTTP/2: On"
    echo ""
    echo "Optional: Setup ACME renewal cron job"
    echo "  sudo crontab -e"
    echo "  # Add: 0 2 * * * certbot renew && docker compose -f ${PROJECT_DIR}/docker-compose.yml exec nginx nginx -s reload"
    echo "=========================================="
}

main() {
    require_root
    require_file "$PROJECT_DIR/.env.example.production"
    require_file "$PROJECT_DIR/docker-compose.yml"
    require_file "$PROJECT_DIR/nginx/nginx.conf"

    install_base_packages
    install_docker_if_needed
    configure_firewall

    reset_env_file
    load_env

    setup_ssl_certs_for_docker
    deploy_containers
    show_summary
}

main "$@"