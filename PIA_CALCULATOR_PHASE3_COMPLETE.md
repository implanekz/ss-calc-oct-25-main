# PIA Calculator - Phase 3: What-If Scenarios ✅ COMPLETE

## Overview

Phase 3 adds **What-If Scenario Comparison** to the PIA Calculator, allowing users to model different earning scenarios and instantly see the impact on their monthly benefit and lifetime retirement income.

## Features Implemented

### Frontend (PIACalculator.jsx)

**New State Variables:**
- `whatIfScenario` - Stores the current what-if scenario details
- `whatIfResult` - Stores calculated PIA for what-if scenario
- `showWhatIfModal` - Controls modal visibility
- `whatIfEarnings` - Editable copy of earnings history

**New Functions:**

1. **`createWhatIfScenario()`** ([PIACalculator.jsx:158-168](frontend/src/components/PIACalculator.jsx#L158-L168))
   - Validates that current PIA is calculated
   - Clones current earnings for editing
   - Opens modal for modifications

2. **`calculateWhatIfPIA()`** ([PIACalculator.jsx:170-212](frontend/src/components/PIACalculator.jsx#L170-L212))
   - Calls `/calculate-pia-from-earnings` API with modified earnings
   - Stores result and scenario
   - Closes modal and displays comparison

3. **`updateWhatIfEarnings()`** ([PIACalculator.jsx:214-223](frontend/src/components/PIACalculator.jsx#L214-L223))
   - Updates earnings for specific year in what-if scenario

4. **`closeWhatIf()`** ([PIACalculator.jsx:225-230](frontend/src/components/PIACalculator.jsx#L225-L230))
   - Clears what-if scenario and returns to normal view

**New UI Components:**

### 1. Create What-If Button
([PIACalculator.jsx:573-580](frontend/src/components/PIACalculator.jsx#L573-L580))

```jsx
{calculatedResult && (
    <button
        onClick={createWhatIfScenario}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
    >
        🔮 Create What-If Scenario
    </button>
)}
```

- Appears next to "Calculate PIA" button
- Only visible after PIA is calculated
- Blue color distinguishes it from primary green Calculate button

### 2. What-If Modal
([PIACalculator.jsx:806-901](frontend/src/components/PIACalculator.jsx#L806-L901))

**Features:**
- Full-screen modal overlay with semi-transparent black background
- Scrollable earnings table showing all years
- Color-coded rows:
  - Green background: Projected future years
  - Red background: Zero earnings years
  - White background: Historical years with earnings
- Editable input fields for all years
- Sticky header with instructions
- Cancel and Calculate buttons

**User Experience:**
- Click outside modal or press ✕ to cancel
- Edit any year's earnings
- Focus on future years to model "working longer" scenarios
- Fill in zero years to model "filling gaps" scenarios

### 3. Comparison View
([PIACalculator.jsx:714-803](frontend/src/components/PIACalculator.jsx#L714-L803))

**Three-Card Layout:**

**Card 1: Current Plan** (Gray border)
- Current calculated PIA
- Years of earnings
- Zeros in top 35

**Card 2: What-If Scenario** (Blue border)
- New calculated PIA
- Years of earnings (updated)
- Zeros in top 35 (updated)

**Card 3: Difference** (Green/Red border based on impact)
- Difference in monthly PIA (+/-)
- **Lifetime Impact**: Monthly difference × 12 months × 25 years
- Color coding:
  - Green: Increased benefit
  - Red: Decreased benefit
  - Gray: No change

**Success/Warning Messages:**
- ✅ Green banner if benefit increases
- ⚠️ Red banner if benefit decreases
- Shows exact dollar amounts and lifetime impact

**Close Button:**
- Small ✕ button in top right
- Returns to normal view
- Preserves calculated results

## Example Scenarios

### Scenario 1: Work 3 More Years
**Original:** Born 1962, retire at 62 with 42 years of earnings, PIA = $2,200
**What-If:** Add 3 more years at $100,000 each (years 2024-2026)
**Result:** PIA increases to $2,350, adding $150/month = $45,000 over 25 years

### Scenario 2: Fill Gap Years
**Original:** 35 years of earnings with 5 zeros in top-35, PIA = $1,650
**What-If:** Fill 3 zero years with $50,000 each
**Result:** PIA increases to $1,820, adding $170/month = $51,000 over 25 years

### Scenario 3: Higher Final Years
**Original:** Last 5 years at $80,000, PIA = $2,100
**What-If:** Change last 5 years to $120,000 (promotion scenario)
**Result:** PIA increases to $2,280, adding $180/month = $54,000 over 25 years

## User Flow

1. **Load Earnings**
   - Upload XML file, or
   - Click "Load Sample" for consultant profile, or
   - Manually enter earnings

2. **Calculate Current PIA**
   - Click "Calculate PIA"
   - Review current results (AIME, bend points, PIA)

3. **Create What-If Scenario**
   - Click "🔮 Create What-If Scenario" button
   - Modal opens with editable copy of all earnings

4. **Modify Earnings**
   - Scroll to years you want to change
   - Green rows (projected future) = easiest to modify
   - Red rows (zeros) = filling gaps
   - Edit values directly in table

5. **Calculate What-If**
   - Click "Calculate What-If PIA"
   - Modal closes automatically
   - Comparison view appears below

6. **Review Comparison**
   - See side-by-side cards
   - Check difference (green = good!)
   - Note lifetime impact amount
   - Read summary message

7. **Take Action**
   - Close what-if to try another scenario, or
   - Use insights for retirement planning decision

## Visual Design

**Color Scheme:**
- **Blue** = What-if features (button, modal, card borders)
- **Green** = Positive impact (increases, gains)
- **Red** = Negative impact (decreases, losses, zeros)
- **Cyan** = Comparison section background
- **Gray** = Current/baseline data

**Typography:**
- **3xl bold** = PIA amounts (focal point)
- **lg bold** = Lifetime impact (second focal point)
- **sm** = Descriptive labels
- **xs** = Type badges (Projected/Historical)

**Spacing:**
- Cards use grid with gap-4 for breathing room
- Modal padding ensures content doesn't touch edges
- Sticky headers prevent losing context while scrolling

## API Endpoints Used

### `/calculate-pia-from-earnings`
**Used by:** `calculateWhatIfPIA()` function

**Request:**
```json
{
  "birth_year": 1962,
  "earnings_history": [
    {"year": 1984, "earnings": 28000, "is_projected": false},
    {"year": 1985, "earnings": 32000, "is_projected": false},
    ...
    {"year": 2025, "earnings": 190000, "is_projected": true}
  ]
}
```

**Response:**
```json
{
  "pia": 2350.50,
  "aime": 8500,
  "top_35_years": [...],
  "bend_points": {
    "first": 1226,
    "second": 7391,
    "first_amount": 1103.40,
    "second_amount": 1976.00,
    "third_amount": 123.45
  },
  "zero_years_in_top_35": 0
}
```

## Key Benefits

✅ **Instant Feedback** - See PIA change immediately after editing
✅ **Lifetime Impact** - Understand long-term consequences (25-year view)
✅ **Visual Comparison** - Side-by-side cards make differences obvious
✅ **Risk-Free Exploration** - Try scenarios without losing original data
✅ **Client Education** - Show "what-if I work longer?" in real-time
✅ **Professional Presentation** - Color-coded, clear, easy to understand

## Testing Scenarios

### Test 1: Self-Employed Consultant Profile
1. Load consultant sample profile (42 years, lumpy income)
2. Calculate current PIA (~$2,200)
3. Create what-if: Add 3 steady years at $150,000
4. Expected: PIA increases, zeros in top-35 reduced

### Test 2: Zero Year Replacement
1. Load any profile with zeros
2. Create what-if: Change all zeros to $50,000
3. Expected: Significant PIA increase, lifetime impact $50K+

### Test 3: Lower Earnings Impact
1. Load high-earning profile
2. Create what-if: Reduce recent years to $30,000
3. Expected: PIA decreases, red warning message

## Known Limitations

- Modal doesn't remember previous edits (starts fresh each time)
- Only one what-if scenario active at a time (no scenario library)
- No "Save Scenario" feature yet
- No export of comparison report

## Future Enhancements (Phase 4?)

- [ ] Save multiple scenarios and switch between them
- [ ] Name scenarios ("Work to 67", "Retire at 62", etc.)
- [ ] Export comparison as PDF report
- [ ] Add "Quick scenarios" buttons ("+1 year", "+3 years", "Fill all zeros")
- [ ] Show which specific years were changed (diff highlighting)
- [ ] Add undo/redo in modal
- [ ] Scenario templates based on common patterns

## Files Modified

### Frontend
- `frontend/src/components/PIACalculator.jsx` - Added What-If scenario state, handlers, modal, and comparison UI

### Backend
- No backend changes needed (uses existing `/calculate-pia-from-earnings` endpoint)

## Documentation
- Created `/PIA_CALCULATOR_PHASE3_COMPLETE.md` (this file)

---

**Status:** ✅ **COMPLETE**
**Tested:** Ready for user testing
**Next:** Test with consultant profile, then move to Phase 4 or other enhancements
