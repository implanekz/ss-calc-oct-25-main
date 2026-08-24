import {
  getFra,
  monthlyBenefitAtClaim,
  benefitAfterClaim
} from '../../utils/benefitFormulas';

export const ageInMonths = (birthDate, targetDate) => {
  let years = targetDate.getFullYear() - birthDate.getFullYear();
  let months = targetDate.getMonth() - birthDate.getMonth();
  let totalMonths = years * 12 + months;

  if (targetDate.getDate() < birthDate.getDate()) {
    totalMonths -= 1;
  }

  return totalMonths;
};

export const calculateProjection = ({
  pia,
  dob,
  filingYear,
  filingMonth = 0,
  inflationRate,
  asOfDate = new Date()
}) => {
  const birthDate = new Date(dob);
  const numericPia = Number(pia) || 0;
  const birthYear = birthDate.getFullYear();
  const birthMonthIndex = birthDate.getMonth();
  const claimAgeYears = Number(filingYear) + (Number(filingMonth) || 0) / 12;
  const currentAgeMonths = ageInMonths(birthDate, asOfDate);
  const currentAgeYears = currentAgeMonths / 12;
  const fra = getFra(birthYear);
  const fraYears = fra.years + (fra.months || 0) / 12;

  const baseMonthlyAtClaim = monthlyBenefitAtClaim({
    piaFRA: numericPia,
    claimAgeYears,
    currentAgeYears,
    rate: inflationRate,
    fraYears
  });

  const monthly = {};
  const cumulative = {};
  let runningTotal = 0;

  const startYear = birthYear + 62;
  const endYear = birthYear + 95;
  // filingMonth counts months past the filer's filingYear-th birthday, so it can carry the
  // actual claim into the calendar year AFTER birthYear+filingYear (e.g. a birth month of
  // September plus a filingMonth of 6 claims in March of the following year) -- both the
  // claiming year and the partial-year month count below must reflect that carry, not just
  // birthMonthIndex, or a later filingMonth can silently look like it started collecting
  // months earlier than it actually did.
  const claimMonthOffset = birthMonthIndex + (Number(filingMonth) || 0);
  const claimingCalendarYear = birthYear + Number(filingYear) + Math.floor(claimMonthOffset / 12);
  const claimingMonthIndex = claimMonthOffset % 12;

  for (let year = startYear; year <= endYear; year += 1) {
    let monthlyBenefit = 0;
    let monthsInYear = 12;

    if (year >= claimingCalendarYear) {
      const yearsAfterClaim = year - claimingCalendarYear;
      monthlyBenefit = benefitAfterClaim(baseMonthlyAtClaim, yearsAfterClaim, inflationRate);

      if (year === claimingCalendarYear) {
        monthsInYear = 12 - claimingMonthIndex;
      }
    }

    const roundedMonthly = Number(monthlyBenefit.toFixed(2));
    monthly[year] = roundedMonthly;
    runningTotal = Number((runningTotal + roundedMonthly * monthsInYear).toFixed(2));
    cumulative[year] = runningTotal;
  }

  return { monthly, cumulative, birthYear, claimingCalendarYear };
};

export const combineProjections = ({
  primaryProjection,
  spouseProjection,
  isMarried,
  prematureDeath = false,
  deathYear
}) => {
  if (!isMarried || !spouseProjection) {
    return primaryProjection;
  }

  const allYears = Array.from(new Set([
    ...Object.keys(primaryProjection.monthly || {}),
    ...Object.keys(spouseProjection.monthly || {})
  ])).map(Number).sort((a, b) => a - b);

  const monthly = {};
  const cumulative = {};
  let runningTotal = 0;
  let prevPrimaryCumulative = 0;
  let prevSpouseCumulative = 0;

  allYears.forEach((year) => {
    const primaryMonthly = primaryProjection.monthly?.[year] || 0;
    const spouseMonthly = spouseProjection.monthly?.[year] || 0;
    const combinedMonthly = prematureDeath && year >= deathYear
      ? Math.max(primaryMonthly, spouseMonthly)
      : primaryMonthly + spouseMonthly;

    // Derive each side's dollars received THIS year from the delta of its own cumulative
    // series, rather than combinedMonthly * 12 -- a flat *12 assumes every year is a full 12
    // months of payment, which is wrong for whichever calendar year each person actually
    // starts claiming in (calculateProjection's own cumulative already correctly discounts
    // that partial first year; re-deriving from monthly*12 here silently threw that away).
    const primaryCumulativeThis = primaryProjection.cumulative?.[year] ?? prevPrimaryCumulative;
    const spouseCumulativeThis = spouseProjection.cumulative?.[year] ?? prevSpouseCumulative;
    const primaryAnnual = primaryCumulativeThis - prevPrimaryCumulative;
    const spouseAnnual = spouseCumulativeThis - prevSpouseCumulative;
    const combinedAnnual = prematureDeath && year >= deathYear
      ? Math.max(primaryAnnual, spouseAnnual)
      : primaryAnnual + spouseAnnual;

    monthly[year] = combinedMonthly;
    runningTotal = Number((runningTotal + combinedAnnual).toFixed(2));
    cumulative[year] = runningTotal;

    prevPrimaryCumulative = primaryCumulativeThis;
    prevSpouseCumulative = spouseCumulativeThis;
  });

  return { monthly, cumulative };
};
