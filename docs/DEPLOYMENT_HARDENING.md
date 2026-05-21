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

## Iframe Embedding

Do not send `X-Frame-Options`.

After the exact embed parent domains are known, set `Content-Security-Policy: frame-ancestors` in `frontend/public/_headers`.

Manual browser checks:

- Chrome normal window: embedded app loads, auth works, calculator saves state.
- Chrome incognito: embedded app loads, expected auth behavior is documented.
- Safari: embedded app loads, auth and local storage behavior are checked.
- Mobile Safari: app is usable inside the iframe dimensions used by the host.
