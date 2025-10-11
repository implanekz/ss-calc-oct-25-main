# Already Filed Feature - Implementation Plan

## Overview
Allow users to indicate they've already filed for Social Security and enter their current monthly benefit instead of calculating from PIA.

## User Experience

### UI Changes (Left Sidebar)

**For Each Spouse:**
```
┌─────────────────────────────────────┐
│ Primary Filer                        │
├─────────────────────────────────────┤
│ Date of Birth: [MM/DD/YYYY]         │
│ Current Age: 67 years, 3 months     │
│                                      │
│ ☐ Already receiving SS benefits?    │
│                                      │
│ [If UNCHECKED - Default State]      │
│ PIA at FRA ($): [4000]               │
│ [What's This?]                       │
│                                      │
│ Filing Age:                          │
│   Years: [67] Months: [0]           │
│                                      │
│ [If CHECKED - Already Filed]        │
│ Current Monthly Benefit ($): [3200] │
│ [Why this matters?]                  │
│                                      │
│ Age When Filed: [▼ 65]              │
│   (dropdown: 62, 63, 64...70)       │
└─────────────────────────────────────┘
```

### Modal: "Why this matters?"
```
When you're already receiving benefits:

✓ We use your actual current monthly amount
✓ We adjust it forward for COLA/inflation
✓ Filing age helps us calculate:
  - Survivor benefits (if married/widowed)
  - Comparing to other strategies

Where to find your current benefit:
1. Check your bank statement (direct deposit)
2. Log in to SSA.gov
3. Look at your Social Security statement

💡 Enter the gross amount BEFORE Medicare deductions
```

## Technical Implementation

### Frontend Changes

**1. Add State Variables (ShowMeTheMoneyCalculator.jsx)**
```javascript
// Add these to existing useState declarations
const [spouse1AlreadyFiled, setSpouse1AlreadyFiled] = useState(false);
const [spouse1CurrentBenefit, setSpouse1CurrentBenefit] = useState(null);
const [spouse1FiledAge, setSpouse1FiledAge] = useState(65);

const [spouse2AlreadyFiled, setSpouse2AlreadyFiled] = useState(false);
const [spouse2CurrentBenefit, setSpouse2CurrentBenefit] = useState(null);
const [spouse2FiledAge, setSpouse2FiledAge] = useState(65);
```

**2. Update Input Sections**
- Show/hide PIA vs Current Benefit based on checkbox
- Add "Age When Filed" dropdown (62-70, whole years only)
- Update "What's This?" modal for current benefit explanation

**3. Update API Calls**
Send additional parameters to backend:
```javascript
const requestData = {
  spouse1: {
    dob: spouse1Dob,
    alreadyFiled: spouse1AlreadyFiled,
    currentBenefit: spouse1AlreadyFiled ? spouse1CurrentBenefit : null,
    filedAge: spouse1AlreadyFiled ? spouse1FiledAge : null,
    pia: !spouse1AlreadyFiled ? spouse1Pia : null,
    // ... other fields
  },
  spouse2: {
    // ... same structure
  }
}
```

### Backend Changes

**1. Update integrated_ss_api.py**
```python
@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.json

    # Extract already filed status
    spouse1_already_filed = data.get('spouse1', {}).get('alreadyFiled', False)
    spouse1_current_benefit = data.get('spouse1', {}).get('currentBenefit')
    spouse1_filed_age = data.get('spouse1', {}).get('filedAge')

    # Pass to calculator
    calculator = HouseholdSSCalculator(
        spouse1_already_filed=spouse1_already_filed,
        spouse1_current_benefit=spouse1_current_benefit,
        spouse1_filed_age=spouse1_filed_age,
        # ... other params
    )
```

**2. Update Calculator Logic**

**Option A: Modify Existing Calculator**
```python
class IndividualSSCalculator:
    def __init__(self, ..., already_filed=False, current_benefit=None, filed_age=None):
        self.already_filed = already_filed
        self.current_benefit = current_benefit
        self.filed_age = filed_age
        # ... existing params

    def calculate_benefit_at_age(self, age):
        if self.already_filed:
            # Use current benefit, adjust for inflation
            years_since_filed = age - self.filed_age
            inflated_benefit = self.current_benefit * (1 + self.inflation_rate) ** years_since_filed
            return inflated_benefit
        else:
            # Existing PIA-based calculation
            return self._calculate_from_pia(age)
```

**Option B: Create AlreadyFiledCalculator (Cleaner)**
```python
class AlreadyFiledCalculator(IndividualSSCalculator):
    """Calculator for individuals already receiving SS benefits."""

    def __init__(self, current_benefit, filed_age, current_age, inflation_rate):
        self.current_benefit = current_benefit
        self.filed_age = filed_age
        self.current_age = current_age
        self.inflation_rate = inflation_rate

    def calculate_benefit_at_age(self, age):
        """Calculate future benefit from current amount with COLA."""
        years_forward = age - self.current_age
        return self.current_benefit * (1 + self.inflation_rate) ** years_forward

    def get_projections(self):
        """Return single projection - no filing age variations."""
        ages = range(self.current_age, 101)
        projections = {
            'monthly': {},
            'cumulative': {}
        }

        cumulative = 0
        for age in ages:
            monthly = self.calculate_benefit_at_age(age)
            projections['monthly'][age] = monthly
            cumulative += monthly * 12
            projections['cumulative'][age] = cumulative

        return {
            'current': projections,  # Only one scenario
            'filed_age': self.filed_age  # For reference
        }
```

## Data Flow Changes

### Current State (Not Filed)
```
User Input: PIA = $4000, Filing Age = 67
  ↓
Backend calculates:
  - Age 62 scenario (reduced)
  - Age 67 scenario (full PIA)
  - Age 70 scenario (delayed credits)
  ↓
Frontend displays 3 scenarios to compare
```

### New State (Already Filed)
```
User Input: Current Benefit = $3200, Filed at 65
  ↓
Backend calculates:
  - Current scenario only (one projection)
  - Apply inflation forward
  - Reference filed age for survivor benefits
  ↓
Frontend displays:
  - Single projection line
  - "You're receiving [amount] now"
  - Future values with COLA
  - Note: "Filed at age 65"
```

## Mixed Scenarios (Key Feature!)

**Primary: Already Filed | Spouse: Not Yet Filed**
```
Primary (Already Filed):
  Current: $2400/month (filed at 62)
  Future: Adjusted for inflation only

Spouse (Not Yet Filed):
  Option A: File at 62 → $1800/month
  Option B: File at 67 → $2400/month
  Option C: File at 70 → $2976/month

Combined View Shows:
  - Primary's locked-in benefit
  - Spouse's 3 scenarios
  - Optimal timing for spouse
  - Total household income at each age
```

## UI/UX Considerations

### Visual Indicators

**1. Charts Show Filed Status**
- Already filed: Solid line (no variations)
- Not yet filed: 3 scenario lines (62, 67, 70)
- Label clearly: "Current benefit" vs "Projected benefit"

**2. Flow Visualization**
- Filed benefit shows as single column (no radio button)
- Unfiled shows normal 3-column selection
- Mixed: One column + three columns side by side

**3. Information Hierarchy**
```
Clear labeling:
✓ "Already receiving: $3,200/month"
✓ "Started benefits at age 62"
✓ "With 2.5% COLA: $3,680 at age 70"
```

### Edge Cases to Handle

1. **Both already filed**: Show combined current benefit, project forward
2. **One filed, one hasn't**: Show locked-in + optimization options
3. **Filed early, now regrets**: Don't offer "what if" scenarios (too painful!)
4. **Invalid dates**: Can't file before age 62, can't file in the future

## Testing Scenarios

### Test Case 1: Single Filer Already Receiving
```
Input:
- DOB: 1958-03-15 (age 67)
- Already Filed: Yes
- Current Benefit: $2,800
- Filed Age: 65

Expected Output:
- Single projection line from 67 to 100
- At age 67: $2,800
- At age 70: $2,800 × (1.025)³ = $3,017
- At age 80: $2,800 × (1.025)¹³ = $3,835
- No scenario comparison (already committed)
```

### Test Case 2: Mixed (Primary Filed, Spouse Not)
```
Input:
- Primary: Already filed, $2,400 at 62
- Spouse: Not filed yet, PIA $1,800, age 60

Expected Output:
- Primary: Single line, inflation-adjusted
- Spouse: 3 scenarios (62, 67, 70)
- Combined view shows:
  - If spouse files at 62: Combined = $2,400 + $1,260 = $3,660
  - If spouse files at 70: Combined = $2,400 + $2,232 = $4,632
- Recommendation: "Spouse should consider waiting to 70"
```

### Test Case 3: Both Already Filed
```
Input:
- Primary: Filed at 67, current $3,200
- Spouse: Filed at 62, current $1,260

Expected Output:
- Two solid lines (no variations)
- Combined household benefit
- "You're currently receiving $4,460/month total"
- Future projections with COLA
- No optimization suggestions (done deal)
```

## Implementation Checklist

### Phase 1: Frontend (Week 1)
- [ ] Add checkbox "Already receiving SS benefits?"
- [ ] Add "Current Monthly Benefit" input field
- [ ] Add "Age When Filed" dropdown (62-70)
- [ ] Show/hide PIA fields based on checkbox
- [ ] Update "What's This?" modal
- [ ] Add validation (can't file before 62, before DOB)
- [ ] Test all state combinations

### Phase 2: Backend (Week 1-2)
- [ ] Update API endpoint to accept new fields
- [ ] Create AlreadyFiledCalculator class
- [ ] Modify HouseholdSSCalculator to handle mixed scenarios
- [ ] Test calculation logic thoroughly
- [ ] Verify inflation adjustments correct

### Phase 3: Integration (Week 2)
- [ ] Connect frontend to updated API
- [ ] Test all scenarios end-to-end
- [ ] Update charts to display filed vs unfiled differently
- [ ] Add labels/indicators for already-filed benefits
- [ ] Update Flow visualization for mixed scenarios

### Phase 4: Polish (Week 2)
- [ ] Add helpful tooltips
- [ ] Clear labeling ("receiving now" vs "projected")
- [ ] Educational content explaining difference
- [ ] Error handling for edge cases
- [ ] User acceptance testing

## Open Questions

1. **What if user filed and then suspended?** (rare but possible)
   - Maybe add third option: "Filed and suspended"?
   - Or handle as "not filed" with note?

2. **Show what-if scenarios for already filed?**
   - Could show "If you had waited to 70..."
   - Might be demotivating though
   - Skip for MVP?

3. **Handle cost-of-living adjustments from SSA?**
   - Real COLA varies annually (not fixed 2.5%)
   - Use historical data or keep 2.5% assumption?
   - Add note: "Projected with 2.5% annual COLA"

4. **Survivor benefits calculation?**
   - If spouse already filed, affects survivor benefit amount
   - Need filed age to calculate correctly
   - This is why we capture filed age!

## Success Metrics

Feature is successful if:
- ✅ Users can enter current benefit easily
- ✅ Calculations are accurate (spot-check against SSA tools)
- ✅ Mixed scenarios (one filed, one not) work correctly
- ✅ Charts clearly distinguish filed vs unfiled
- ✅ No confusion about what inputs to use

---

*Once implemented, this feature unlocks the calculator for ~40% of users who've already filed and want to optimize their spouse's timing or plan their financial future.*
