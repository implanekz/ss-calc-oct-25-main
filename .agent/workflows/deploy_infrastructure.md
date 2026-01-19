---
description: Step-by-step guide to deploying the application to Cloudflare and Railway
---

# Deployment Guide: Cloudflare + Railway

This guide walks you through deploying your modern "Hybrid" stack:
1.  **Frontend**: Cloudflare Pages
2.  **Backend**: Cloudflare Workers (Python) Or Railway (Fallback)
3.  **Automation**: Railway (n8n)

## Prerequisites
- GitHub Account (connected to this repo)
- Cloudflare Account
- Railway Account
- Supabase Account (for API Keys)

---

## Part 1: Deploy Frontend (Cloudflare Pages)

1.  Login to [Cloudflare Dashboard](https://dash.cloudflare.com).
2.  Go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3.  Select your repository (`ss-calc-oct-25-main`).
4.  Standard configuration:
    - **Project Name**: `ss-calc-frontend` (or similar)
    - **Production Branch**: `main`
    - **Framework Preset**: `Create React App` (or `None` if unsure)
    - **Build Command**: `npm run build` (Verify in `package.json` if it's `build` or `dist`)
    - **Output Directory**: `build`
5.  **Environment Variables**:
    - Add `REACT_APP_SUPABASE_URL`: (Your Supabase URL)
    - Add `REACT_APP_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
    - Add `REACT_APP_API_URL`: Leave blank for now, we will update it after deploying the backend.
6.  Click **Save and Deploy**.

---

## Part 2: Deploy Backend (Cloudflare Workers)

This project is configured for Cloudflare Python Workers.

### Option A: Via Wrangler CLI (Recommended)
1.  Open your local terminal.
2.  Install Wrangler: `npm install -g wrangler`
3.  Login: `npx wrangler login`
4.  Navigate to backend: `cd backend`
5.  Deploy: `npx wrangler deploy`
    - Cloudflare will upload your python files and install dependencies.
6.  **Set Secrets (Important)**:
    - `npx wrangler secret put SUPABASE_URL` -> (Paste your URL)
    - `npx wrangler secret put SUPABASE_KEY` -> (Paste your Service Role or Anon Key)
7.  **Success**: You will get a URL like `https://ss-calc-backend.<your-subdomain>.workers.dev`.
8.  **Update Frontend**: Go back to Cloudflare Pages settings and set `REACT_APP_API_URL` to this new URL. Redeploy frontend.

### Option B: Fallback to Railway (If Cloudflare Python fails)
If Cloudflare Python workers prove too experimental for your dependencies:
1.  Login to [Railway](https://railway.app).
2.  **New Project** -> **Deploy from GitHub repo**.
3.  Select this repo.
4.  **Settings** -> **Root Directory**: Set to `backend`.
5.  **Variables**: Add `SUPABASE_URL`, `SUPABASE_KEY`, and `PORT` (8000).
6.  Railway will auto-detect Python and run `python main.py`.
7.  Use the generated Railway URL for your Frontend `REACT_APP_API_URL`.

---

## Part 3: Deploy n8n (Railway)

1.  In Railway, click **New Project**.
2.  Select **Template** -> Search for **n8n**.
3.  Click **Deploy**.
4.  Railway will provision a Postgres database and the n8n container automatically.
5.  Once deployed, open the URL to set up your n8n admin account.
6.  You can now connect n8n to your backend or Supabase securely.

---

## Verification
- Visit your Frontend URL.
- Login.
- Check "Network" tab to ensure requests to `/api/profiles/me` are going to your new Backend URL and returning valid responses (or 401 if not logged in).
