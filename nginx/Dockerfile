# Dockerfile for nginx with environment variable substitution
FROM nginx:alpine

# Install gettext (for envsubst)
RUN apk add --no-cache gettext

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Create certbot directory
RUN mkdir -p /var/www/certbot

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]
