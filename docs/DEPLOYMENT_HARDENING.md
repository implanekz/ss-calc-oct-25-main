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

## Launch Monitoring

Watch during beta:

- Railway CPU and memory.
- Railway request latency and 5xx responses.
- Supabase API errors and auth errors.
- Browser console errors from embedded contexts.
- Cloudflare WAF/rate-limit events.
- XML upload failures by status code.

Operational thresholds:

- If Railway CPU is sustained above 70%, increase `WEB_CONCURRENCY` only if memory allows, otherwise add a replica.
- If memory is sustained above 75%, increase Railway memory or reduce worker count.
- If Supabase latency/errors rise, reduce frontend preference-write frequency before increasing backend capacity.
- If iframe auth fails only in Safari or private browsing, document the limitation and consider a non-embedded login fallback.
