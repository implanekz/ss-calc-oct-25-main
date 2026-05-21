# Deployment Hardening

## Railway Backend

Environment variables:

- `ENVIRONMENT=production`
- `WEB_CONCURRENCY=2`
- `WORKER_TIMEOUT=60`
- `ALLOWED_ORIGINS=<actual Cloudflare Pages or custom frontend domain>`
- `SUPABASE_URL=<set in Railway>`
- `SUPABASE_KEY=<set in Railway>`

Recommended launch settings:

- Start with one Railway replica and two Gunicorn/Uvicorn workers.
- Add a second replica only if Railway CPU, memory, or response latency shows sustained pressure.
- Use `/healthz` as the health check endpoint.
