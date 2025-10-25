# One Month at a Time Modal Feature Specification

## Overview

The "One Month at a Time" modal is an interactive feature that demonstrates the incremental value of delaying Social Security benefits. It shows users month-by-month how waiting one more month increases their lifetime guaranteed income, making the abstract concept of "waiting until 70" into a series of achievable micro-commitments.

## Core Concept

We already have the user's calculations for filing at age 62 as well as filing at age 70. In between there are 96 months — including the bookend months — so the tool is making a stop at each month along the way.

This is a teachable a-ha! moment demonstrating that "one month at a time" is a series of micro-commitments that accrue to a retirement-changing increase in guaranteed monthly income.

## Visual Design

### Three-Bar Chart Display

Use our standard three-bar chart format:
- **Red bar (left)**: Age 62 filing amount (fixed baseline)
- **Blue bar (middle)**: Current selected age/month (variable - this is what changes)
- **Green bar (right)**: Age 70 filing amount (fixed maximum)

When the blue bar defaults to age 62, it will be identical to the red bar.

### Age and Month Controls

Age and month inputs similar to the variable controls that default to:
- Age: 62 years
- Months: 0 months

Users can increment by:
- Individual months (using month button)
- Full years (using year button)

## Behavior

### Single Person

- Total months to track: 96 (from age 62 years 0 months to age 70 years 0 months)
- Blue bar moves progressively toward green bar as user increments age/months
- When blue bar reaches age 70 years 0 months, it becomes identical to the green bar

### Married Couple

For couples in the married tab:
- There are 192 possible stops along the way (96 months × 2 people)
- Separate controls for each spouse
- Aggregate output showing combined household benefit
- Track each user's month-to-month result independently
- Keep it simple regardless of age difference - track each user's progression separately

**Implementation approach**: Regardless of age difference, track each user's month-to-month result. While it doesn't happen over an identical eight-year period for both spouses, the net result demonstrates the same principle.

## Output Display

To the right of the output chart, display:

1. **Dollar value of waiting one more month**
   - Shows incremental gain for next month of delay
   
2. **Running cumulative total**
   - Shows total additional lifetime income gained so far by waiting from age 62 to current selected age

As users click the month or year button, they see:
- The blue bar move incrementally toward the green bar
- The incremental monthly gain
- The cumulative lifetime benefit increase

## Sankey Animation

Include a Sankey diagram animation with two distinct phases:

### Phase 1: Age 62 to Current Selection (Blue Bar)
- **From**: Red bar (age 62)
- **To**: Blue bar (current selection)
- **Label**: "Actual"
- **Color**: Designated color for actual/current status

### Phase 2: Current Selection to Age 70 (Green Bar)
- **From**: Top of blue bar (current selection)
- **To**: Green bar (age 70)
- **Label**: "Potential"
- **Color**: Designated color for potential/future gains

### Full Retirement Age (FRA) Indicator

Include a visual color indication at FRA (typically age 67) when Delayed Retirement Credits (DRCs) kick in. This marks the transition from:
- **Before FRA**: Benefits increasing to full retirement amount
- **After FRA**: 8% annual increase PLUS inflation adjustments (approximately 37% total increase from 67 to 70 with 3% inflation)

## Inflation Calculation

The inflation calculation will default to the chosen number in the variable column in the app (typically 3% annually).

## Legend

Below the visualization, include a legend showing:
- **Actual**: Color representation for the Sankey flow from red to blue bar
- **Potential**: Color representation for the Sankey flow from blue to green bar
- **FRA Marker**: Visual indicator showing when DRCs begin

## Extension to Other Calculators

### Widowed and Divorced Tabs

Implement similar functionality within the widowed and divorced calculator tabs with the following considerations:

- Useful when demonstrating benefits of waiting until Full Retirement Age
- **Important limitation**: In these scenarios, benefits usually do NOT increase after FRA
- No Delayed Retirement Credits apply for survivor/divorced spouse benefits
- Blue bar stops moving at FRA rather than continuing to age 70
- Clear messaging that maximum benefit is achieved at FRA, not age 70

## Key Messaging

### The Core Value Proposition

"If you want more money in retirement, this is a foolproof system to create those funds month by month. No additional savings, risk or investment involved — just using the Social Security system as it was intended."

### Supporting Educational Content

Integrate with RISE and SHINE Method™ messaging:
- **Navigate stage**: This tool embodies the navigation phase (SHINE framework)
- **Micro-commitments**: Each month represents a small, achievable commitment
- **Results in advance**: Users see exactly what each month is worth
- **Building the bridge**: Visual demonstration of bridge construction from 62 to 70

## Technical Considerations

### Data Tracking

Need to determine what output to track:
- Each month's new benefit value?
- Cumulative value since age 62?
- Both monthly increase and lifetime cumulative total?

**Recommendation**: Display both - the incremental monthly gain AND the running cumulative lifetime benefit increase. This provides immediate gratification (monthly gain) while reinforcing the larger goal (cumulative benefit).

### Calculation Requirements

- Calculate benefit amount for each month from 62 to 70
- Account for:
  - Annual COLA adjustments
  - Delayed Retirement Credits (8% annually after FRA)
  - User's specified inflation rate
  - Different FRA based on birth year
  
### Performance

With 96+ months to calculate, ensure:
- Pre-calculate all monthly values for smooth interaction
- Cache calculations for each spouse in married scenarios
- Smooth animation transitions as user increments months

## User Experience Goals

1. **Make waiting feel achievable**: Breaking 8 years into 96 one-month commitments
2. **Provide immediate feedback**: Show the value of each incremental decision
3. **Build momentum**: As cumulative total grows, motivation increases
4. **Highlight the acceleration**: Visual emphasis when DRCs begin at FRA
5. **Celebrate progress**: Clear visual progression from red → blue → green

## Success Metrics

This feature succeeds if it:
- Reduces the psychological barrier of "waiting 8 years"
- Increases user engagement with delay strategies
- Improves understanding of how the system rewards patience
- Leads to more users choosing optimal filing ages
- Demonstrates the RISE and SHINE Method™ in action

## Connection to RISE and SHINE Method™

This feature directly implements several stages:

- **Strategy (RISE)**: Shows results-in-advance with dramatic visual proof
- **Navigate (SHINE)**: Provides the month-by-month navigation tool
- **Income (SHINE)**: Demonstrates what the income bridge builds toward
- **Execute (SHINE)**: Helps users commit to the optimal filing age

The feature transforms the abstract concept of "waiting until 70" into 96 concrete, achievable micro-commitments, each with a clear monetary value.
