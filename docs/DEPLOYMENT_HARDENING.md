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

## Cloudflare WAF And Rate Limits

Initial rules:

- Auth endpoints: rate limit `/api/auth/login`, `/api/auth/signup`, `/api/auth/reset-password` by IP.
- XML upload: rate limit `/upload-ssa-xml` by IP and authenticated user when available.
- Calculation endpoints: rate limit `/calculate-*`, `/calculate`, `/monthly-optimization`, and `/compare-earnings-scenarios` by IP.
- Block obvious non-browser bot traffic except verified monitoring services.

Suggested starting thresholds:

- Auth: 10 requests per minute per IP.
- XML upload: 5 requests per minute per IP.
- Calculations: 120 requests per minute per IP.

Tune thresholds after real traffic begins.
