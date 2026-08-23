import { calculateProjection, combineProjections } from '../../calculators/showMeTheMoney/projections';

// How far past the later-born spouse's birth year the shared calendar axis extends.
export const AXIS_END_AGE = 100;

export const ageToCalendarYear = (birthYear, age) => birthYear + age;

export const calendarYearToAge = (birthYear, year) => year - birthYear;

export const getAxisEndYear = (birthYearPrimary, birthYearSpouse) =>
  Math.max(birthYearPrimary, birthYearSpouse) + AXIS_END_AGE;

// The three claiming-strategy hypotheticals shown in the timeline cursor's tooltip.
export const BUCKET_FILING_AGES = [62, 67, 70];

export const getHouseholdBucket = ({
  filingAge,
  spouse1Pia,
  spouse1Dob,
  spouse2Pia,
  spouse2Dob,
  inflation
}) => {
  const primaryProjection = calculateProjection({
    pia: spouse1Pia,
    dob: spouse1Dob,
    filingYear: filingAge,
    filingMonth: 0,
    inflationRate: inflation
  });
  const spouseProjection = calculateProjection({
    pia: spouse2Pia,
    dob: spouse2Dob,
    filingYear: filingAge,
    filingMonth: 0,
    inflationRate: inflation
  });
  const combined = combineProjections({ primaryProjection, spouseProjection, isMarried: true });

  // Derive startYear from the same birthYear values that calculateProjection() used for its dictionary keys.
  // This ensures the mask boundary always aligns with the actual calendar years in the .monthly/.cumulative dictionaries.
  const startYear = Math.max(primaryProjection.birthYear, spouseProjection.birthYear) + filingAge;

  const monthly = {};
  const cumulative = {};
  let runningTotal = 0;

  Object.keys(combined.monthly)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((year) => {
      if (year < startYear) {
        monthly[year] = 0;
        cumulative[year] = 0;
        return;
      }
      monthly[year] = combined.monthly[year];
      runningTotal += combined.monthly[year] * 12;
      cumulative[year] = runningTotal;
    });

  return { monthly, cumulative, startYear };
};

export const getHouseholdBuckets = ({ spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation }) =>
  BUCKET_FILING_AGES.map((filingAge) => ({
    filingAge,
    ...getHouseholdBucket({ filingAge, spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation })
  }));
