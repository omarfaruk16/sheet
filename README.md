# LeafSheets Docker + SSLCommerz Setup

This repository now includes a Dockerized stack with:

- `frontend` (Next.js)
- `backend` (Express + Prisma)
- `postgres` (PostgreSQL 16)
- `nginx` (reverse proxy)

It also includes SSLCommerz integration (sandbox for local, live for production via env values).

## 1) Choose environment template

Copy one of the root env templates:

```bash
cp .env.example.local .env
# or
cp .env.example.production .env
```

## 2) Build and run containers

```bash
docker compose up --build -d
```

## 3) Open app

- App URL: `http://localhost`
- API URL through nginx: `http://localhost/api`
- Direct frontend URL: `http://localhost:3000` (Next rewrites proxy `/api`, `/uploads`, `/downloads` to backend)

Ports can be changed from root `.env`:

- `NGINX_HOST_PORT` / `NGINX_CONTAINER_PORT`
- `FRONTEND_HOST_PORT` / `FRONTEND_CONTAINER_PORT`
- `BACKEND_HOST_PORT` / `BACKEND_CONTAINER_PORT`
- `POSTGRES_HOST_PORT` / `POSTGRES_CONTAINER_PORT`
- `BACKEND_ADMIN_EMAIL` / `BACKEND_ADMIN_USERNAME` / `BACKEND_ADMIN_PASSWORD`
- `BACKEND_SERVER_URL` (frontend-side proxy target for `/api`, `/uploads`, `/downloads`)

## 4) Important env files

- Root templates only: `.env.example.local`, `.env.example.production`
- Runtime expects `.env` at workspace root (`./.env`) for local frontend/backend commands.

## Notes

- Prisma datasource is PostgreSQL now.
- Backend creates SSLCommerz payment sessions from `/api/payments/sslcommerz/init`.
- SSLCommerz callbacks are handled under `/api/payments/sslcommerz/*`.
- On successful validation, orders are marked paid and PDF generation is triggered.
- Override payment endpoints with `SSLCOMMERZ_BASE_URL`, `SSLCOMMERZ_SESSION_API_URL`, and `SSLCOMMERZ_VALIDATION_API_URL` when needed.
- On backend start/restart, service checks env-defined admin identity and creates it if missing.
- On subsequent restarts, admin credentials (email and password) are synced with env-defined values.

