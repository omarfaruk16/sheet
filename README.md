# LeafSheets Deployment and Runtime

This repository uses Docker Compose with:

1. `frontend` (Next.js)
2. `backend` (Express + Prisma)
3. `postgres` (PostgreSQL 16)

Nginx is managed on VPS host (not inside Docker) for domain routing and SSL.

## VPS runbook (your flow)

Run directly on VPS:

```bash
ssh root@82.112.238.218
cd /root/sheet
chmod +x user-scripts/*.sh
```

First setup:

```bash
./user-scripts/setup-vps.sh
```

Redeploy updates:

```bash
./user-scripts/pullNredeploy.sh
```

Both scripts enforce:

```bash
rm -f .env
cp .env.example.production .env
```

Then build and run containers.

For detailed Cloudflare + SSL instructions, see `DEPLOY.md`.

## Local development quick start

```bash
cp .env.example.local .env
docker compose up --build -d
```

## Service ports (defaults)

1. Frontend: `3000`
2. Backend: `5000`
3. PostgreSQL: `5433` (host) -> `5432` (container)

## Notes

1. Backend APIs are under `/api/*`.
2. SSLCommerz endpoints are under `/api/payments/sslcommerz/*`.
3. Prisma uses PostgreSQL in this setup.

