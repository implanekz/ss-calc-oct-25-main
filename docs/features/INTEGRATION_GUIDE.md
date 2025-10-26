# One Month at a Time - Integration Guide

## Quick Start: Add to ShowMeTheMoneyCalculator

Follow these 3 simple steps to add the "One Month at a Time" feature to your calculator.

---

## Step 1: Import the Component

At the top of `frontend/src/components/ShowMeTheMoneyCalculator.jsx`, add:

```javascript
import { OneMonthAtATimeModal } from './OneMonthAtATime';
import { useState } from 'react'; // If not already imported
```

---

## Step 2: Add State to Control the Modal

Inside your `ShowMeTheMoneyCalculator` component function, add this state:

```javascript
const [showOneMonthModal, setShowOneMonthModal] = useState(false);
```

---

## Step 3: Add the Modal and Button

### Option A: Add Button in Results Section

Find where you display calculation results and add a button to trigger the modal:

```javascript
{/* After showing your results */}
<button
  onClick={() => setShowOneMonthModal(true)}
  className="mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
>
  📊 See Month-by-Month Value
</button>

{/* Add the modal at the end of your component's return */}
<OneMonthAtATimeModal
  isOpen={showOneMonthModal}
  onClose={() => setShowOneMonthModal(false)}
  baseBenefitAt62={benefitAt62}  // Use your actual calculated value
  inflationRate={0.03}           // Use your inflation rate setting
  birthYear={1960}               // Use user's birth year
/>
```

### Option B: Complete Example

Here's a minimal complete example:

```javascript
import React, { useState } from 'react';
import { OneMonthAtATimeModal } from './OneMonthAtATime';

function ShowMeTheMoneyCalculator() {
  // Your existing state...
  const [benefitAt62, setBenefitAt62] = useState(2500);
  
  // NEW: Add modal state
  const [showOneMonthModal, setShowOneMonthModal] = useState(false);
  
  return (
    <div>
      {/* Your existing calculator UI */}
      
      {/* Your results section */}
      <div className="results">
        <h3>Your Benefits</h3>
        <p>Age 62: ${benefitAt62}</p>
        {/* ... other results ... */}
        
        {/* NEW: Add trigger button */}
        <button
          onClick={() => setShowOneMonthModal(true)}
          className="mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
        >
          📊 See Month-by-Month Value
        </button>
      </div>
      
      {/* NEW: Add the modal */}
      <OneMonthAtATimeModal
        isOpen={showOneMonthModal}
        onClose={() => setShowOneMonthModal(false)}
        baseBenefitAt62={benefitAt62}
        inflationRate={0.03}
        birthYear={1960}
      />
    </div>
  );
}

export default ShowMeTheMoneyCalculator;
```

---

## Props Explained

The `OneMonthAtATimeModal` accepts these props:

| Prop | Type | Required | Description | Example |
|------|------|----------|-------------|---------|
| `isOpen` | boolean | Yes | Controls modal visibility | `true` or `false` |
| `onClose` | function | Yes | Called when modal closes | `() => setShowModal(false)` |
| `baseBenefitAt62` | number | No | Monthly benefit at age 62 | `2500` |
| `inflationRate` | number | No | Annual inflation rate | `0.03` (for 3%) |
| `birthYear` | number | No | User's birth year | `1960` |

**Default values:**
- `baseBenefitAt62`: 2500
- `inflationRate`: 0.03 (3%)
- `birthYear`: 1960

---

## Where to Add the Button

### Good Placement Options:

1. **After calculation results** - "Want to see how waiting helps?"
2. **Next to filing age recommendations** - "Explore month by month →"
3. **In an educational section** - "Understanding delay benefits"
4. **Floating action button** - Always visible in corner

### Button Text Ideas:

- "📊 See Month-by-Month Value"
- "🔍 Explore Month by Month"
- "💰 Break Down the Numbers"
- "🎯 One Month at a Time"
- "📈 See How Waiting Pays Off"

---

## Styling the Button

### Using Tailwind (matches your app):

```javascript
<button
  onClick={() => setShowOneMonthModal(true)}
  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
>
  📊 See Month-by-Month Value
</button>
```

### Custom CSS:

```css
.one-month-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.one-month-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}
```

---

## Getting Data from Your Calculator

If your calculator already has these values, pass them directly:

```javascript
<OneMonthAtATimeModal
  isOpen={showOneMonthModal}
  onClose={() => setShowOneMonthModal(false)}
  baseBenefitAt62={calculatedBenefitAt62}      // Your calculated value
  inflationRate={userInflationRate}            // From user settings
  birthYear={userBirthYear}                    // From user profile
/>
```

---

## Testing Your Integration

1. **Save the file** after making changes
2. **The app should hot-reload** automatically
3. **Click your new button**
4. **The modal should appear!**

You should see:
- ✅ Three-bar chart showing benefits
- ✅ Month/year controls
- ✅ Real-time benefit calculations
- ✅ Output showing gains

---

## Troubleshooting

### Modal doesn't appear?
- Check that `isOpen={showOneMonthModal}` is set correctly
- Verify state is changing when button is clicked
- Check browser console for errors

### Calculations seem wrong?
- Verify `baseBenefitAt62` is a valid number
- Check that `birthYear` is reasonable (1940-2010)
- Ensure `inflationRate` is a decimal (0.03 not 3)

### Import error?
- Make sure the path is correct: `./OneMonthAtATime`
- If in a different directory, adjust: `../OneMonthAtATime`
- Check that all component files exist

---

## Next Steps

Once basic integration works:

1. **Customize the button** styling to match your app
2. **Pass real user data** instead of default values
3. **Add analytics** to track modal opens
4. **Consider Phase 3 features** (Sankey diagrams, FRA markers, etc.)

---

## Need Help?

- See full implementation plan: `docs/features/one-month-at-a-time-implementation-plan.md`
- Check component source: `frontend/src/components/OneMonthAtATime/`
- Review demo page: `frontend/public/one-month-demo/index.html`
