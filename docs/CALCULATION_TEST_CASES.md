# Social Security Calculator - Test Cases & Validation

**Date:** October 26, 2025  
**Purpose:** Validate calculation accuracy against known SSA formulas

---

## Test Case 1: Basic Early Filing (Age 62)

### Scenario
- Birth Year: 1960 (FRA = 67)
- PIA at FRA: $2,500
- Filing Age: 62
- Current Age: 62
- COLA Rate: 0% (to isolate reduction formula)

### Expected Calculation

**Months before FRA:**
- Filing at 62, FRA at 67 = 60 months early

**Reduction Calculation:**
- First 36 months: 36 × (5/9 ÷ 100) = 20.00% reduction
- Remaining 24 months: 24 × (5/12 ÷ 100) = 10.00% reduction
- Total reduction: 30.00%

**Expected Monthly Benefit:**
- $2,500 × (1 - 0.30) = $2,500 × 0.70 = **$1,750/month**

### Validation
✅ Run calculator with these inputs and verify $1,750 monthly benefit

---

## Test Case 2: Filing at FRA (No Reduction/Credit)

### Scenario
- Birth Year: 1960 (FRA = 67)
- PIA at FRA: $2,500
- Filing Age: 67
- Current Age: 67
- COLA Rate: 0%

### Expected Calculation

**Months from FRA:** 0 (filing exactly at FRA)

**Expected Monthly Benefit:**
- $2,500 × 1.00 = **$2,500/month** (100% of PIA)

### Validation
✅ Run calculator with these inputs and verify $2,500 monthly benefit

---

## Test Case 3: Delayed Filing (Age 70)

### Scenario
- Birth Year: 1960 (FRA = 67)
- PIA at FRA: $2,500
- Filing Age: 70
- Current Age: 70
- COLA Rate: 0%

### Expected Calculation

**Months after FRA:**
- Filing at 70, FRA at 67 = 36 months late

**Delayed Credit Calculation:**
- 36 months × (2/3 ÷ 100) = 24.00% increase

**Expected Monthly Benefit:**
- $2,500 × (1 + 0.24) = $2,500 × 1.24 = **$3,100/month**

### Validation
✅ Run calculator with these inputs and verify $3,100 monthly benefit

---

## Test Case 4: Early Filing with COLA

### Scenario
- Birth Year: 1960 (FRA = 67)
- PIA at Age 62: $2,500
- Filing Age: 62
- Current Age: 70 (8 years after filing)
- COLA Rate: 3.0% annual

### Expected Calculation

**Step 1: Apply Early Reduction**
- 60 months early = 30% reduction
- Benefit at age 62: $2,500 × 0.70 = $1,750

**Step 2: Apply 8 Years of COLA**
- $1,750 × (1.03)^8 = $1,750 × 1.2668 = **$2,217/month**

### Alternative Calculation (COLA then reduction - should be same)
- $2,500 × (1.03)^8 = $3,169
- $3,169 × 0.70 = **$2,218/month** (rounding difference)

### Validation
✅ Run calculator and verify approximately $2,217-2,218/month at age 70

---

## Test Case 5: Delayed Filing with COLA

### Scenario
- Birth Year: 1960 (FRA = 67)
- PIA at Age 62: $2,500
- Filing Age: 70
- Current Age: 75 (5 years after filing)
- COLA Rate: 2.5% annual

### Expected Calculation

**Step 1: Apply COLA from 62 to 70 (8 years)**
- $2,500 × (1.025)^8 = $2,500 × 1.2184 = $3,046

**Step 2: Apply Delayed Credits**
- $3,046 × 1.24 = $3,777

**Step 3: Apply COLA from 70 to 75 (5 years)**
- $3,777 × (1.025)^5 = $3,777 × 1.1314 = **$4,273/month**

### Validation
✅ Run calculator and verify approximately $4,273/month at age 75

---

## Test Case 6: Different FRA (Born 1956)

### Scenario
- Birth Year: 1956 (FRA = 66 and 4 months = 66.333 years)
- PIA at FRA: $3,000
- Filing Age: 62
- Current Age: 62
- COLA Rate: 0%

### Expected Calculation

**Months before FRA:**
- FRA at 66.333 years = 66 years + 4 months
- Filing at 62 = 52 months early

**Reduction Calculation:**
- First 36 months: 36 × (5/9 ÷ 100) = 20.00%
- Remaining 16 months: 16 × (5/12 ÷ 100) = 6.67%
- Total reduction: 26.67%

**Expected Monthly Benefit:**
- $3,000 × (1 - 0.2667) = $3,000 × 0.7333 = **$2,200/month**

### Validation
✅ Run calculator and verify $2,200/month

---

## Test Case 7: Cumulative Benefits - Early vs Late

### Scenario
- Birth Year: 1960 (FRA = 67)
- PIA at Age 62: $2,000
- COLA Rate: 2.0% annual
- Longevity: Calculate to age 85

### File at 62 Calculation

**Starting Benefit:** $2,000 × 0.70 = $1,400/month
**Years of benefits:** Age 62 to 85 = 23 years

Year-by-year with COLA:
- Age 62: $1,400 × 12 = $16,800
- Age 63: $1,428 × 12 = $17,136
- Age 64: $1,457 × 12 = $17,484
- ... (continue with 2% growth)
- Age 85: $2,265 × 12 = $27,180

**Total cumulative (approximate):** $538,000

### File at 70 Calculation

**PIA at 70:** $2,000 × (1.02)^8 = $2,343
**Delayed credit:** $2,343 × 1.24 = $2,905
**Years of benefits:** Age 70 to 85 = 15 years

Year-by-year with COLA:
- Age 70: $2,905 × 12 = $34,860
- Age 71: $2,963 × 12 = $35,557
- ... (continue with 2% growth)
- Age 85: $3,893 × 12 = $46,716

**Total cumulative (approximate):** $620,000

### Validation
✅ Verify File at 70 provides ~$82,000 more lifetime benefits
✅ Breakeven point should be around age 78-80

---

## Test Case 8: Couple Strategy - 62/70 Hybrid

### Scenario
- Both born 1960 (FRA = 67)
- Primary PIA: $3,000 (higher earner)
- Spouse PIA: $1,800 (lower earner)
- COLA: 2.5%
- Strategy: Lower earner files at 62, higher earner waits until 70

### Expected at Age 70

**Lower Earner (filed at 62, now 70):**
- Starting benefit: $1,800 × 0.70 = $1,260
- With 8 years COLA: $1,260 × (1.025)^8 = $1,535/month

**Higher Earner (filing at 70):**
- PIA with COLA: $3,000 × (1.025)^8 = $3,655
- With delayed credits: $3,655 × 1.24 = $4,532/month

**Combined Household Income at 70:**
- $1,535 + $4,532 = **$6,067/month**

### Validation
✅ Verify combined income matches
✅ Compare to both filing at 62 ($4,200) and both at 70 ($7,708)

---

## Test Case 9: Cumulative "Since Age 70" Calculation

### Scenario
- Birth Year: 1960
- PIA: $2,500
- Filing Age: 62
- Current Age: 80
- COLA: 3%

### Expected Calculation

**Benefit History:**
- Age 62-69: Receiving reduced benefit with COLA
- Age 70: Benefit is $1,750 × (1.03)^8 = $2,217/month
- Age 80: Benefit is $1,750 × (1.03)^18 = $2,979/month

**Cumulative Since Age 70:**
- Sum all benefits from age 70 to age 80
- Each year grows by 3%
- Approximate: $2,217 × 12 + $2,283 × 12 + ... + $2,979 × 12
- **Expected: ~$318,000**

### Validation
✅ Verify "Since Age 70" cumulative calculation
✅ Ensure it doesn't include age 62-69 benefits

---

## Test Case 10: Birth Month Proration

### Scenario
- Birth Date: June 15, 1960 (month index 5)
- PIA: $2,500
- Filing Age: 70
- Filing Year: 2030

### Expected First Year Benefits

**Starting Benefits:**
- Files in 2030 (turns 70 in June)
- Should only receive 7 months of benefits in 2030 (July-December)
- Monthly benefit: $2,500 × 1.24 = $3,100

**First Year Total:**
- $3,100 × 7 months = **$21,700**

### Validation
✅ Verify first year is prorated correctly
✅ Full years (2031+) should be $3,100 × 12 = $37,200

---

## SSA.gov Comparison Test

### Instructions for Manual Validation

1. **Go to:** https://www.ssa.gov/benefits/retirement/estimator.html

2. **Enter Test Profile:**
   - Birth date: January 1, 1960
   - Estimated earnings: Use consistent amount to derive ~$2,500 PIA
   - Filing ages: 62, 67, 70

3. **Compare Results:**
   - SSA estimate at 62: Should be ~$1,750
   - SSA estimate at 67: Should be ~$2,500  
   - SSA estimate at 70: Should be ~$3,100

4. **Document Differences:**
   - Note any discrepancies > $50/month
   - Investigate reasons for differences
   - Update calculations if SSA is authoritative

---

## Regression Test Suite

### Quick Validation Checklist

Run these quick tests after any formula changes:

- [ ] Test 1: Age 62 filing = 70% of PIA ✓
- [ ] Test 2: FRA filing = 100% of PIA ✓
- [ ] Test 3: Age 70 filing = 124% of PIA ✓
- [ ] Test 4: COLA compounds annually ✓
- [ ] Test 5: Birth month proration works ✓
- [ ] Test 6: Different FRAs calculate correctly ✓
- [ ] Test 7: Cumulative totals are accurate ✓
- [ ] Test 8: Couple strategies combine properly ✓

---

## Known Edge Cases

### Edge Case 1: Filing Before Age 62
**Issue:** SSA doesn't allow filing before 62
**Expected:** Calculator should prevent or show $0

### Edge Case 2: Filing After Age 70
**Issue:** No additional delayed credits after 70
**Expected:** Benefit at 71 = Benefit at 70 (plus COLA)

### Edge Case 3: Zero PIA
**Issue:** User enters $0 PIA
**Expected:** All calculations should handle gracefully, show $0

### Edge Case 4: Negative COLA
**Issue:** Rare but possible (2010, 2011, 2016)
**Expected:** Should calculate correctly with negative rates

---

## Automated Test Implementation

### Recommended Test Framework
```javascript
describe('Social Security Calculations', () => {
  test('Early filing at 62 applies 30% reduction for FRA 67', () => {
    const result = calculateBenefit({
      pia: 2500,
      filingAge: 62,
      fra: 67,
      cola: 0
    });
    expect(result).toBe(1750);
  });

  test('Delayed filing at 70 applies 24% increase for FRA 67', () => {
    const result = calculateBenefit({
      pia: 2500,
      filingAge: 70,
      fra: 67,
      cola: 0
    });
    expect(result).toBe(3100);
  });

  // Add more tests...
});
```

---

## Conclusion

These test cases cover:
- ✅ Basic reduction formulas
- ✅ Delayed credit formulas
- ✅ COLA compounding
- ✅ Different FRA scenarios
- ✅ Cumulative calculations
- ✅ Couple strategies
- ✅ Birth month proration
- ✅ Edge cases

**Next Steps:**
1. Run all test cases manually
2. Document any discrepancies
3. Compare against SSA.gov calculator
4. Implement automated tests
5. Add to CI/CD pipeline
