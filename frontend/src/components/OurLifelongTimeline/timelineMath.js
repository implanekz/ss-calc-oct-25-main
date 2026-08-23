import { calculateProjection, combineProjections } from '../../calculators/showMeTheMoney/projections';
import { getFra } from '../../utils/benefitFormulas';

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

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

export const getAnnualIncome = (monthlyValue) => monthlyValue * 12;

export const formatBucketValue = (bucket, year) => {
  if (year < bucket.startYear) {
    return { display: `starts ${bucket.startYear}`, muted: true };
  }
  return { display: formatCurrency(bucket.cumulative[year] ?? 0), muted: false };
};

export const getMilestonesForPerson = ({ label, dob, preferredYear }) => {
  const birthYear = new Date(dob).getFullYear();
  const fra = getFra(birthYear);

  const milestones = [
    { year: birthYear + 62, label: `${label} turns 62`, kind: 'age62' },
    { year: birthYear + fra.years, label: `${label} reaches full retirement age`, kind: 'fra' },
    { year: birthYear + 70, label: `${label} turns 70`, kind: 'age70' }
  ];

  const chosenFilingAgeYear = birthYear + Number(preferredYear);
  if (!milestones.some((m) => m.year === chosenFilingAgeYear)) {
    milestones.push({ year: chosenFilingAgeYear, label: `${label}'s chosen filing age`, kind: 'chosenFilingAge' });
  }

  return milestones.sort((a, b) => a.year - b.year);
};

export const isTimelineReachable = ({ isMarried, spouse1Dob, spouse2Dob }) =>
  Boolean(isMarried && spouse1Dob && spouse2Dob);
