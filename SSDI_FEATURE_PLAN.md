# Social Security Disability Insurance (SSDI) Feature Plan

## Objective
Add a new module to the Social Security Optimization Platform that helps users estimate SSDI benefits and understand the trade-offs compared to early retirement. The module will match the look and feel of the existing Divorced and Widowed tabs.

## Core Logic (Based on Research)
- **SSDI Benefit Amount**: Essentially equal to 100% of the Primary Insurance Amount (PIA), regardless of the claiming age (as long as the user meets disability definitions).
- **Comparison**: 
  - **SSDI vs. Early Retirement**: SSDI pays full PIA. Early retirement (age 62+) pays a permanently reduced amount.
  - **At FRA**: SSDI automatically converts to a retirement benefit of the same amount. No additional reduction or increase.
- **Delayed Credits**: Users cannot earn delayed retirement credits while on SSDI. To earn credits, they must suspend benefits at FRA (rare but possible strategy).

## Implementation Plan

### 1. Backend Development (`backend/core/`)

**New File: `backend/core/ssdi_calculator.py`**
- Create `SSDICalculator` class.
- **Inputs**: `birth_date`, `pia`.
- **Methods**:
  - `calculate_monthly_benefit()`: Returns full PIA.
  - `compare_with_retirement(current_age)`: Calculates what the retirement benefit would be at the current age (if eligible) to show the "penalty" avoided by SSDI.
  - `get_fra_conversion_info()`: Returns details about automatic conversion at FRA.

**Update: `backend/core/integrated_ss_api.py`**
- Define API Models:
  - `SSDICalculationRequest`: `birth_date`, `pia`, `inflation_rate`, `longevity_age`.
  - `SSDICalculationResponse`: `monthly_benefit`, `comparison_vs_retirement`, `lifetime_value`, `fra_age`, `fra_date`.
- Add Endpoint:
  - `POST /calculate-ssdi`

### 2. Frontend Development (`frontend/src/`)

**New Component: `frontend/src/components/SSDICalculator.jsx`**
- **Structure**: Clone the layout of `DivorcedCalculator.jsx` (Input panel on left, Results on right).
- **Inputs**:
  - Date of Birth
  - Estimated PIA (Primary Insurance Amount)
  - Inflation Rate (slider)
  - Longevity (slider)
- **Visualizations**:
  - **Benefit Card**: Displays the estimated SSDI monthly amount (Full PIA).
  - **Comparison Card**: If user is 62+, show "SSDI vs Early Retirement" comparison (e.g., "$2,000/mo (SSDI) vs $1,400/mo (Retirement)").
  - **Timeline/Flow**: Visual aid showing "SSDI -> Converts to Retirement at FRA".
  - **Insights**: Warning about no delayed credits, but "locking in" full benefit now.

**Update: `frontend/src/App.js`**
- Add "Disability" to `calculatorTypes` array:
  ```javascript
  { id: 'ssdi', label: 'Disability', icon: '♿' }
  ```
- Import `SSDICalculator`.
- Add conditional rendering for `calculatorType === 'ssdi'`.

### 3. User Experience Flow
1. User selects "Disability" from the calculator dropdown.
2. Enters DOB (e.g., 61 years old) and PIA (e.g., $2,000).
3. Clicks "Calculate".
4. View shows:
   - "Your Estimated SSDI Benefit: $2,000/mo"
   - "Why it matters: If you filed for retirement at 62, you'd only get ~$1,400. SSDI protects your full benefit."
   - "At age 67 (FRA), this automatically becomes your retirement benefit."

## Technical Stack
- **Backend**: Python (FastAPI, Pydantic)
- **Frontend**: React (Tailwind CSS, Chart.js)

## Next Steps
- Approve this plan to begin implementation.
