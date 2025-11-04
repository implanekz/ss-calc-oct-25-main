#!/bin/bash
# Script to update all hardcoded localhost:8000 URLs to use API_BASE_URL

echo "Fixing API URLs in remaining components..."

# Note: These files need manual updates:
# - DivorcedCalculator.jsx
# - PIACalculator.jsx  
# - ProfileCalculator.jsx

echo "Done! Please run: npm run build in frontend to test"
