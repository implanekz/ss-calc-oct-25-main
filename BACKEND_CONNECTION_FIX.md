# Backend Connection Fix for Vercel Deployment

## Problem
The frontend is trying to connect to `http://localhost:8000` instead of your Hostinger backend at `https://api.ret1re.com`.

## Solution Applied

### ✅ Completed
1. Created `frontend/src/config/api.js` with centralized API configuration
2. Updated `frontend/src/components/WidowCalculator.jsx`

### 🔧 Manual Fixes Required

You need to update these 3 files:

#### 1. DivorcedCalculator.jsx
**Line 3** - Add import:
```javascript
import { API_BASE_URL } from '../config/api';
```

**Line 175** - Change:
```javascript
const response = await axios.post('http://localhost:8000/calculate-divorced', {
```
To:
```javascript
const response = await axios.post(`${API_BASE_URL}/calculate-divorced`, {
```

#### 2. PIACalculator.jsx
**Top of file** - Add import:
```javascript
import { API_BASE_URL } from '../config/api';
```

**Find all instances** of `'http://localhost:8000/` and replace with `` `${API_BASE_URL}/` ``
- `calculate-pia-from-earnings`
- `upload-ssa-xml`

#### 3. ProfileCalculator.jsx
**Top of file** - Add import:
```javascript
import { API_BASE_URL } from '../config/api';
```

**Find** `'http://localhost:8000/calculate-pia-from-earnings'`
**Replace with** `` `${API_BASE_URL}/calculate-pia-from-earnings` ``

## After Making Changes

1. Commit your changes:
```bash
git add .
git commit -m "Connect frontend to Hostinger backend API"
git push
```

2. Vercel will automatically redeploy with the fixes

3. Your app will now connect to `https://api.ret1re.com` in production!

## Environment Variables in Vercel (Already Set)
✅ REACT_APP_SUPABASE_URL
✅ REACT_APP_SUPABASE_ANON_KEY
✅ REACT_APP_API_URL = https://api.ret1re.com
