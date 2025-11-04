# Hostinger VPS Backend Deployment Guide

## Your VPS Details
- **IP Address:** 217.196.50.161
- **SSH Username:** root
- **OS:** Ubuntu 24.04 LTS
- **Location:** United States - Phoenix
- **Plan:** KVM 2 (2 CPU, 8GB RAM, 100GB Disk)

---

## Phase 1: Initial SSH Connection

### Step 1: Connect to Your VPS

Open Terminal on your Mac and run:

```bash
ssh root@217.196.50.161
```

- You'll see a message about authenticity of host - type `yes`
- Enter the root password you created during VPS setup
- You should see the Ubuntu welcome screen

---

## Phase 2: Server Setup & Security

### Step 2: Update System Packages

```bash
apt update && apt upgrade -y
```

This updates all system packages to latest versions (takes 2-5 minutes).

### Step 3: Install Required Software

```bash
# Install Python 3.12, pip, git, nginx, and other essentials
apt install -y python3.12 python3.12-venv python3-pip git nginx certbot python3-certbot-nginx ufw curl
```

### Step 4: Configure Firewall

```bash
# Enable firewall with SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

You should see SSH (22), HTTP (80), and HTTPS (443) allowed.

### Step 5: Create Application User (Security Best Practice)

```bash
# Create a dedicated user for the application
adduser --disabled-password --gecos "" ssapp
usermod -aG sudo ssapp

# Switch to the new user
su - ssapp
```

---

## Phase 3: Deploy Backend Code

### Step 6: Clone Your Repository

```bash
# Clone your GitHub repository
git clone https://github.com/implanekz/ss-calc-oct-25-main.git
cd ss-calc-oct-25-main/backend
```

### Step 7: Create Python Virtual Environment

```bash
# Create and activate virtual environment
python3.12 -m venv venv
source venv/bin/activate
```

You should see `(venv)` prefix in your terminal.

### Step 8: Install Python Dependencies

```bash
# Install all backend dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### Step 9: Configure Environment Variables

```bash
# Create .env file with your Supabase credentials
nano .env
```

**Copy your Supabase credentials from `frontend/.env.local`:**

```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Optional: lock down CORS in production (comma-separated)
# Example: https://your-frontend.vercel.app,https://www.yourdomain.com
ALLOWED_ORIGINS=*
```

- Press `Ctrl+X`, then `Y`, then `Enter` to save

### Step 10: Test Backend Locally

```bash
# Test that the backend runs
cd ~/ss-calc-oct-25-main/backend
source venv/bin/activate
python -m uvicorn core.integrated_ss_api:app --host 0.0.0.0 --port 8000
```

- Press `Ctrl+C` to stop after confirming it starts without errors

---

## Phase 4: Configure Gunicorn (Production WSGI Server)

### Step 11: Create Gunicorn Service

Exit back to root user:

```bash
exit  # Exit from ssapp user back to root
```

Create systemd service file:

```bash
nano /etc/systemd/system/ssbackend.service
```

**Paste this content:**

```ini
[Unit]
Description=Social Security Calculator Backend
After=network.target

[Service]
User=ssapp
Group=ssapp
WorkingDirectory=/home/ssapp/ss-calc-oct-25-main/backend
Environment="PATH=/home/ssapp/ss-calc-oct-25-main/backend/venv/bin"
# Optionally load environment variables from .env file
EnvironmentFile=/home/ssapp/ss-calc-oct-25-main/backend/.env
ExecStart=/home/ssapp/ss-calc-oct-25-main/backend/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker core.integrated_ss_api:app --bind 127.0.0.1:8000

[Install]
WantedBy=multi-user.target
```

- Press `Ctrl+X`, then `Y`, then `Enter` to save

### Step 12: Start Gunicorn Service

```bash
# Reload systemd, enable and start the service
systemctl daemon-reload
systemctl enable ssbackend
systemctl start ssbackend
systemctl status ssbackend
curl -s http://127.0.0.1:8000/healthz | jq .
```

You should see "active (running)" in green.

---

## Phase 5: Configure Nginx (Web Server)

### Step 13: Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/ssbackend
```

**Paste this content (we'll add domain later):**

```nginx
server {
    listen 80;
    server_name 217.196.50.161;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- Press `Ctrl+X`, then `Y`, then `Enter` to save

### Step 14: Enable Nginx Configuration

```bash
# Create symbolic link to enable the site
ln -s /etc/nginx/sites-available/ssbackend /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
```

---

## Phase 6: Test Your Backend!

### Step 15: Test the API

From your Mac terminal (new window):

```bash
curl http://217.196.50.161/
```

You should see a JSON response from your backend!

Also try in your browser:
```
http://217.196.50.161/
```

---

## Phase 7: Set Up Domain (api.ret1re.com)

### Step 16: Add DNS A Record in Hostinger

1. Go to Hostinger hPanel → ret1re.com → DNS/Nameservers
2. Click "Add Record"
3. **Type:** A
4. **Name:** api
5. **Points to:** 217.196.50.161
6. **TTL:** 14400
7. Click "Add Record"

Wait 5-15 minutes for DNS propagation.

### Step 17: Update Nginx for Domain

```bash
nano /etc/nginx/sites-available/ssbackend
```

**Update server_name line:**

```nginx
server_name api.ret1re.com 217.196.50.161;
```

```bash
nginx -t
systemctl reload nginx
```

### Step 18: Install SSL Certificate (HTTPS)

```bash
certbot --nginx -d api.ret1re.com
```

- Enter your email when prompted
- Accept terms of service
- Choose whether to share email (optional)
- Select option 2: Redirect HTTP to HTTPS

Your backend is now live with SSL at `https://api.ret1re.com`!

You can also verify health at:
```
curl -s https://api.ret1re.com/healthz | jq .
```

---

## Phase 8: Update Frontend to Use Production API

Update `frontend/src/config/supabase.js` to use production API:

```javascript
// In production, use your Hostinger backend
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.ret1re.com'
  : 'http://localhost:8000';
```

---

## Useful Commands

**Check backend status:**
```bash
systemctl status ssbackend
```

**View backend logs:**
```bash
journalctl -u ssbackend -f
```

**Restart backend:**
```bash
systemctl restart ssbackend
```

**Check nginx status:**
```bash
systemctl status nginx
```

**View nginx logs:**
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

**Pull latest code from GitHub:**
```bash
su - ssapp
cd ~/ss-calc-oct-25-main
git pull origin main
systemctl restart ssbackend
```

---

## Next Steps

1. ✅ Backend deployed to Hostinger VPS
2. ⏭️ Deploy frontend to Vercel
3. ⏭️ Test full application end-to-end
4. ⏭️ Set up monitoring and backups

---

## Troubleshooting

**Can't SSH in:**
- Check firewall allows SSH: `ufw status`
- Verify IP address is correct

**Backend won't start:**
```bash
journalctl -u ssbackend -n 50
```

**Nginx errors:**
```bash
nginx -t
tail -f /var/log/nginx/error.log
```

**Need to update backend code:**
```bash
su - ssapp
cd ~/ss-calc-oct-25-main
git pull
systemctl restart ssbackend
