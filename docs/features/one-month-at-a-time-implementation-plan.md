# One Month at a Time - Implementation Plan

## Overview

This document breaks down the development of the "One Month at a Time" feature into manageable tasks, identifies reusable components, and provides a phased rollout strategy.

---

## Phase 1: Foundation & Planning (Option 2) ✓

### 1.1 Component Analysis

**Existing Components to Reuse:**
- `Card` component (`frontend/src/components/ui/Card.jsx`)
- `ResultCard` component (`frontend/src/components/ui/ResultCard.jsx`) 
- `InfoBox` component (`frontend/src/components/ui/InfoBox.jsx`)
- Button components from UI library
- Existing chart libraries/utilities

**New Components Needed:**
- `OneMonthAtATimeModal` - Main container component
- `ThreeBarChart` - Visualization component
- `MonthYearControls` - Increment control component
- `SankeyDiagram` - Animation component
- `BenefitCalculator` - Calculation utility

### 1.2 Data Flow Architecture

```
User Input (Age/Month selection)
    ↓
BenefitCalculator (computes benefit for selected age)
    ↓
State Management (stores current selection, cumulative totals)
    ↓
ThreeBarChart (visualizes red/blue/green bars)
    +
SankeyDiagram (shows actual/potential flows)
    +
Output Display (monthly gain, cumulative total)
```

### 1.3 State Management Structure

```javascript
{
  // User input
  selectedAge: 62,
  selectedMonths: 0,
  
  // For married couples
  spouse1: { age: 62, months: 0 },
  spouse2: { age: 62, months: 0 },
  
  // Calculations (pre-computed)
  benefitsByMonth: {
    62_0: 2500,
    62_1: 2510,
    // ... all 96 months
    70_0: 4100
  },
  
  // Output values
  monthlyGain: 10,
  cumulativeTotal: 150000,
  
  // Configuration
  inflationRate: 0.03,
  fraAge: 67,
  fraMonths: 0
}
```

---

## Phase 2: MVP Prototype (Option 3)

**Goal**: Working prototype with core functionality, skipping complex features

### 2.1 Sprint 1: Basic Three-Bar Chart (Days 1-2)

**Tasks:**
- [ ] Create `ThreeBarChart.jsx` component
- [ ] Implement static three-bar visualization
  - Red bar (age 62 - fixed)
  - Blue bar (current selection - variable)
  - Green bar (age 70 - fixed)
- [ ] Add basic styling matching app design
- [ ] Test with hardcoded values

**Acceptance Criteria:**
- Three bars display correctly
- Bars are color-coded (red, blue, green)
- Labels show ages and dollar amounts
- Responsive layout

### 2.2 Sprint 2: Month/Year Controls (Days 3-4)

**Tasks:**
- [ ] Create `MonthYearControls.jsx` component
- [ ] Implement increment buttons
  - "+1 Month" button
  - "+1 Year" button (adds 12 months)
- [ ] Add decrement buttons
  - "-1 Month" button
  - "-1 Year" button
- [ ] Wire controls to state
- [ ] Add validation (prevent going below 62:0 or above 70:0)

**Acceptance Criteria:**
- Buttons increment/decrement correctly
- Blue bar updates when age/month changes
- Display shows current age in years and months (e.g., "62 years, 3 months")
- Boundaries enforced (62:0 to 70:0)

### 2.3 Sprint 3: Basic Benefit Calculations (Days 5-6)

**Tasks:**
- [ ] Create `useBenefitCalculations` hook
- [ ] Implement month-by-month calculation logic
  - Base benefit at age 62
  - Monthly increases to FRA
  - Delayed Retirement Credits after FRA (8% annually = 0.667% monthly)
  - COLA adjustments
- [ ] Pre-calculate all 96 months on component mount
- [ ] Update blue bar value based on selected month

**Calculation Formula:**
```javascript
// Before FRA: Linear increase from age 62 to FRA
// After FRA: +8% per year = +0.667% per month

monthlyBenefit = baseBenefit * adjustmentFactor
adjustmentFactor = (age - 62) / (FRA - 62) * FRAMultiplier + 
                   (age > FRA ? (age - FRA) * 0.08 : 0)
```

**Acceptance Criteria:**
- Accurate calculations for all 96 months
- Blue bar shows correct benefit amount
- Values update in real-time as user increments

### 2.4 Sprint 4: Output Display (Days 7-8)

**Tasks:**
- [ ] Create output display section
- [ ] Show "Monthly Gain from Next Month"
  - Calculate difference between current month and next month
- [ ] Show "Cumulative Lifetime Benefit Increase"
  - Track total additional lifetime income vs. age 62
- [ ] Add formatting for currency display
- [ ] Position to right of chart

**Acceptance Criteria:**
- Monthly gain displays correctly
- Cumulative total updates with each increment
- Currency formatted properly ($X,XXX)
- Clear labels and descriptions

### 2.5 Sprint 5: Integration & Testing (Days 9-10)

**Tasks:**
- [ ] Integrate all MVP components
- [ ] Create modal trigger from main app
- [ ] Add close/cancel functionality
- [ ] Test edge cases:
  - Age 62 (blue = red)
  - Age 70 (blue = green)
  - Mid-range values
- [ ] Cross-browser testing
- [ ] Mobile responsiveness

**Deliverable**: Working MVP with core three-bar chart, controls, calculations, and output

---

## Phase 3: Full Implementation (Option 1)

**Goal**: Complete feature with all bells and whistles

### 3.1 Sprint 6: Sankey Diagram - Actual Flow (Days 11-13)

**Tasks:**
- [ ] Research/select Sankey library (D3.js, react-flow, or custom)
- [ ] Create `SankeyDiagram.jsx` component
- [ ] Implement "Actual" flow (age 62 → current selection)
  - Start: Top of red bar
  - End: Top of blue bar
  - Color: "Actual" color (from design system)
  - Label: "Actual"
- [ ] Add smooth animation on increment/decrement
- [ ] Test performance with rapid clicking

**Acceptance Criteria:**
- Sankey flow renders correctly
- Animates smoothly when user changes selection
- Labeled clearly as "Actual"
- Color matches design system

### 3.2 Sprint 7: Sankey Diagram - Potential Flow (Days 14-16)

**Tasks:**
- [ ] Implement "Potential" flow (current selection → age 70)
  - Start: Top of blue bar
  - End: Top of green bar
  - Color: "Potential" color (from design system)
  - Label: "Potential"
- [ ] Ensure both flows work together
- [ ] Add transitions between states
- [ ] Handle edge cases (when blue = green, hide potential flow)

**Acceptance Criteria:**
- Both Actual and Potential flows display
- Potential flow disappears at age 70
- Smooth transitions
- No visual glitches

### 3.3 Sprint 8: FRA Indicator (Days 17-18)

**Tasks:**
- [ ] Add visual marker at Full Retirement Age
- [ ] Calculate FRA based on birth year
  - Born 1955-1959: FRA = 66 + 2 months per year
  - Born 1960+: FRA = 67
- [ ] Add color change or visual indicator when user crosses FRA
- [ ] Add tooltip explaining DRCs begin here
- [ ] Update legend to show FRA marker

**Acceptance Criteria:**
- FRA clearly marked on chart
- Different visual treatment when crossing FRA
- Tooltip provides education about DRCs
- Legend includes FRA explanation

### 3.4 Sprint 9: Inflation Integration (Days 19-20)

**Tasks:**
- [ ] Connect to app's global inflation rate setting
- [ ] Apply inflation to benefit calculations
- [ ] Update cumulative total to account for inflation
- [ ] Add toggle or explanation of inflation impact
- [ ] Test with various inflation rates (0%, 3%, 5%)

**Acceptance Criteria:**
- Inflation rate pulled from app settings
- Calculations accurate with inflation
- User can see inflation's effect
- Documentation explains methodology

### 3.5 Sprint 10: Married Couples Support (Days 21-25)

**Tasks:**
- [ ] Detect if in married tab
- [ ] Add second set of controls for spouse 2
- [ ] Track both spouses' selections independently
- [ ] Calculate combined household benefit
- [ ] Show individual bars for each spouse + combined total
- [ ] Update Sankey to show dual flows
- [ ] Handle age differences elegantly

**Design Options:**
```
Option A: Side-by-side comparison
[Spouse 1 Chart] [Spouse 2 Chart] [Combined Chart]

Option B: Stacked visualization
[Combined Chart with color-coded segments for each spouse]

Option C: Tabbed interface
[Tab: Spouse 1] [Tab: Spouse 2] [Tab: Combined]
```

**Acceptance Criteria:**
- Both spouses can be adjusted independently
- Combined benefit calculated correctly
- Clear visual distinction between spouses
- Intuitive UX for couples

### 3.6 Sprint 11: Widowed/Divorced Adaptations (Days 26-27)

**Tasks:**
- [ ] Detect calculator type (widowed/divorced)
- [ ] Limit age range to FRA (benefits don't increase after FRA)
- [ ] Update messaging to reflect survivor/divorced benefits
- [ ] Hide/disable post-FRA controls
- [ ] Add educational note about benefit limitations
- [ ] Adjust green bar to show FRA instead of age 70

**Acceptance Criteria:**
- Feature works in widowed tab
- Feature works in divorced tab
- Clear messaging about FRA limits
- No confusion about age 70 benefits

### 3.7 Sprint 12: Legend & Educational Content (Days 28-29)

**Tasks:**
- [ ] Create comprehensive legend
  - Red bar = Age 62 baseline
  - Blue bar = Current selection
  - Green bar = Age 70 maximum
  - Actual flow color/label
  - Potential flow color/label
  - FRA marker
- [ ] Add educational tooltips
- [ ] Include link to RISE & SHINE Method documentation
- [ ] Add "Why wait?" messaging
- [ ] Integrate K.I.N.D. Gap framework language

**Acceptance Criteria:**
- Legend is clear and complete
- Tooltips provide helpful context
- Educational messaging aligns with RISE & SHINE
- Links to additional resources work

### 3.8 Sprint 13: Polish & Performance (Days 30-32)

**Tasks:**
- [ ] Optimize calculations (memoization, caching)
- [ ] Smooth animations and transitions
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Mobile optimization
- [ ] Loading states for calculations
- [ ] Error handling and edge cases
- [ ] Code cleanup and documentation

**Acceptance Criteria:**
- Smooth 60fps animations
- Accessible to screen readers
- Works on mobile devices
- Fast loading and responsiveness
- Well-documented code

### 3.9 Sprint 14: Testing & QA (Days 33-35)

**Tasks:**
- [ ] Unit tests for calculation functions
- [ ] Component tests for UI elements
- [ ] Integration tests for full workflow
- [ ] E2E tests for user journeys
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing
- [ ] Accessibility audit
- [ ] Performance profiling

**Acceptance Criteria:**
- 90%+ code coverage
- All tests passing
- No console errors
- Passes accessibility audit
- Performance benchmarks met

---

## Technical Specifications

### Dependencies

**Required:**
- React 18+
- Recharts or Victory (for bar charts)
- D3.js or custom SVG (for Sankey diagram)
- Tailwind CSS (existing in project)

**Optional:**
- Framer Motion (for animations)
- React Spring (for physics-based animations)

### File Structure

```
frontend/src/components/
├── OneMonthAtATime/
│   ├── index.js
│   ├── OneMonthAtATimeModal.jsx
│   ├── ThreeBarChart.jsx
│   ├── MonthYearControls.jsx
│   ├── SankeyDiagram.jsx
│   ├── OutputDisplay.jsx
│   ├── Legend.jsx
│   └── __tests__/
│       ├── OneMonthAtATimeModal.test.js
│       ├── ThreeBarChart.test.js
│       └── calculations.test.js
├── hooks/
│   └── useBenefitCalculations.js
└── utils/
    └── benefitCalculations.js
```

### Data Requirements

**Inputs from Parent Component:**
- User's current age
- Base benefit at age 62
- Full Retirement Age (FRA)
- Birth year
- Inflation rate (from app settings)
- Calculator type (single, married, widowed, divorced)
- Spouse data (if married)

**Outputs:**
- Selected filing age
- Projected benefit amount
- Educational insights

---

## Integration Points

### 1. ShowMeTheMoneyCalculator Integration

**Trigger Location:**
Add button/link in results section of ShowMeTheMoneyCalculator:
- After displaying the three filing scenarios
- Near the "optimal filing age" recommendation
- Could be a prominent CTA: "See Month-by-Month Value →"

### 2. Widowed Calculator Integration

**Trigger Location:**
- In survivor benefits section
- When showing FRA benefit amount
- Link text: "See Your Month-by-Month Bridge to FRA →"

### 3. Divorced Calculator Integration

**Trigger Location:**
- Similar to widowed calculator
- After calculating divorced spouse benefits
- Emphasize FRA as the stopping point

---

## Success Metrics

### User Engagement
- Modal open rate (% of users who view results)
- Time spent in modal
- Average number of month increments explored
- Completion rate (users who explore full range)

### Educational Impact
- Increased awareness of delayed filing benefits
- Higher selection of optimal filing ages in main calculator
- Positive feedback on clarity of visualization

### Technical Performance
- Load time < 500ms
- Animation FPS > 55
- No accessibility violations
- Mobile score > 90 on Lighthouse

---

## Risk Mitigation

### Risk 1: Complex Calculations
**Mitigation**: Pre-calculate all 96 months on mount, cache results

### Risk 2: Poor Mobile Experience
**Mitigation**: Mobile-first design, test on real devices early

### Risk 3: Confusing for Users
**Mitigation**: User testing, clear labels, educational tooltips

### Risk 4: Performance Issues
**Mitigation**: Optimize animations, lazy load Sankey library

---

## Timeline

**MVP Prototype (Phase 2)**: 10 days
**Full Implementation (Phase 3)**: 25 days
**Total**: ~35 days (7 weeks)

**Recommended Approach**: 
1. Build MVP first (10 days)
2. Get user feedback
3. Iterate based on feedback
4. Then add advanced features

---

## Next Steps

1. Review this plan with stakeholders
2. Prioritize features (MVP vs nice-to-have)
3. Set up development environment
4. Begin Sprint 1: Basic Three-Bar Chart

---

## Notes

- This is a living document - update as needed
- Adjust timeline based on feedback and priorities
- Consider phased rollout (single calculator first, then married, then widowed/divorced)
- Keep accessibility and mobile experience top of mind throughout
