# Vercel Deployment Settings Reference

## Project Configuration

**Framework Preset:** Create React App (or select "Other" if not auto-detected)

**Root Directory:** `frontend`

**Build Command:** `npm run build`

**Output Directory:** `build`

**Install Command:** `npm install`

---

## Environment Variables

Add these in the Vercel Environment Variables section:

### 1. REACT_APP_SUPABASE_URL
```
https://jtpbkdzlwvtydpbjmjxc.supabase.co
```

### 2. REACT_APP_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cGJrZHpsd3Z0eWRwYmptanhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODY4NzYsImV4cCI6MjA3NjM2Mjg3Nn0.EFDjuFu3Vz9G-B9_m8lW587yo2_WN__RKn8Q41VIwao
```

### 3. REACT_APP_API_URL
```
https://api.ret1re.com
```

### 4. REACT_APP_DEV_MODE (optional - can skip)
```
false
```

---

## After Deployment

Once deployed, you'll get a URL like: `https://your-project.vercel.app`

Test the connection to your Hostinger backend to ensure everything works together.
