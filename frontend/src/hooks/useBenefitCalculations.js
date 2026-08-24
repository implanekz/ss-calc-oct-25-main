import { calculateProjection } from '../calculators/showMeTheMoney/projections';

/**
 * useBenefitCalculations Hook
 *
 * Calculates Social Security benefits for a given filing age (62-70) and the
 * lifetime cumulative income through a given longevity age.
 *
 * Delegates to calculateProjection() -- the same shared engine used by the
 * main calculator, Our Lifelong Timeline, and the Year Detail Modal -- rather
 * than a separate formula, so "One Month at a Time" always agrees with the
 * rest of the app for the same inputs.
 *
 * Part of the "One Month at a Time" feature - MVP Sprint 3
 */

const useBenefitCalculations = ({
  pia = 2500,        // True PIA at FRA (not a benefit-at-62 figure)
  dob = '1960-01-01',
  inflationRate = 0.03
}) => {
  const birthYear = new Date(dob).getFullYear();
  // A malformed or missing dob would otherwise silently zero every figure below (an
  // unparseable date yields NaN, which misses every dict lookup; `null`/`undefined` parses as
  // the 1970 epoch instead of failing loudly) -- fall back to a birth year calculateProjection
  // can still compute against.
  const safeDob = !dob || Number.isNaN(birthYear) ? '1960-01-01' : dob;

  // Monthly benefit if filing at this exact age/month. Reads the projection's own
  // claimingCalendarYear rather than assuming birthYear + years -- a late filingMonth can
  // carry the actual claim into the following calendar year (see projections.js).
  const getBenefitForAge = (years, months) => {
    const projection = calculateProjection({ pia, dob: safeDob, filingYear: years, filingMonth: months, inflationRate });
    return projection.monthly[projection.claimingCalendarYear] || 0;
  };

  // Lifetime cumulative income if filing at (years, months), collected through throughAge.
  const getCumulativeIncome = (years, months, throughAge) => {
    const projection = calculateProjection({ pia, dob: safeDob, filingYear: years, filingMonth: months, inflationRate });
    return projection.cumulative[projection.birthYear + throughAge] || 0;
  };

  return {
    getBenefitForAge,
    getCumulativeIncome
  };
};

export default useBenefitCalculations;
