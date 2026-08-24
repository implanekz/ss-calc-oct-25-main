import { calculateProjection, combineProjections } from '../../calculators/showMeTheMoney/projections';
import { getFra } from '../../utils/benefitFormulas';

// How far past the later-born spouse's birth year the shared calendar axis extends.
// Must match the last age calculateProjection() actually has data for (birthYear + 95,
// see projections.js) -- extending past that renders a data gap as a silent $0.
export const AXIS_END_AGE = 95;

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
  inflation,
  prematureDeath = false,
  deathYear
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
  const combined = combineProjections({
    primaryProjection,
    spouseProjection,
    isMarried: true,
    prematureDeath,
    deathYear
  });

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

export const getHouseholdBuckets = ({
  spouse1Pia,
  spouse1Dob,
  spouse2Pia,
  spouse2Dob,
  inflation,
  prematureDeath = false,
  deathYear
}) =>
  BUCKET_FILING_AGES.map((filingAge) => ({
    filingAge,
    ...getHouseholdBucket({
      filingAge,
      spouse1Pia,
      spouse1Dob,
      spouse2Pia,
      spouse2Dob,
      inflation,
      prematureDeath,
      deathYear
    })
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

  const numericPreferredYear = Number(preferredYear);
  // A cleared input (`''`) coerces to 0 via Number(''), which would otherwise place a stray
  // "chosen filing age" milestone at the person's birth year. Skip the milestone entirely
  // when the value isn't a real, in-range filing age.
  if (Number.isFinite(numericPreferredYear) && numericPreferredYear >= 62) {
    const chosenFilingAgeYear = birthYear + numericPreferredYear;
    if (!milestones.some((m) => m.year === chosenFilingAgeYear)) {
      milestones.push({ year: chosenFilingAgeYear, label: `${label}'s chosen filing age`, kind: 'chosenFilingAge' });
    }
  }

  return milestones.sort((a, b) => a.year - b.year);
};

export const isTimelineReachable = ({ isMarried, spouse1Dob, spouse2Dob }) =>
  Boolean(isMarried && spouse1Dob && spouse2Dob);

const MILESTONE_DO_LINES = {
  age62: 'This is the earliest possible filing age — the smallest benefit this household could lock in.',
  fra: 'Filing here locks in your full, unreduced benefit — no early-claim penalty, no delayed-credit bonus.',
  chosenFilingAge: "This is the age you've chosen to file.",
  age70: "This is the last year waiting still grows the benefit — filing later than this doesn't add more."
};

export const buildNarrative = ({
  year,
  primaryLabel,
  primaryAge,
  spouseLabel,
  spouseAge,
  primaryMilestones,
  spouseMilestones,
  monthlyIncome,
  prematureDeath,
  deathYear
}) => {
  const feel = `${year}: ${primaryLabel} is ${primaryAge}, ${spouseLabel} is ${spouseAge}.`;
  const think = `${formatCurrency(monthlyIncome)}/month · ${formatCurrency(getAnnualIncome(monthlyIncome))}/year`;

  // Order matters: primary's milestones are checked first, so when both people land a
  // milestone on the same year, doLine is derived from the primary's entry (array order,
  // not a significance ranking -- see spec "Design > Narrative content").
  const matches = [...primaryMilestones, ...spouseMilestones].filter((m) => m.year === year);
  const milestoneNotes = matches.map((m) => m.label);
  const doLine = matches.length > 0 ? MILESTONE_DO_LINES[matches[0].kind] : undefined;

  const survivorNote =
    prematureDeath && year >= deathYear
      ? `This reflects survivor benefits, assuming ${primaryLabel} has passed by now.`
      : undefined;

  return { feel, milestoneNotes, think, doLine, survivorNote };
};
