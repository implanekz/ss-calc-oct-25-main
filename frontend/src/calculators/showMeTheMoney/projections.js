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
  const claimingCalendarYear = birthYear + Number(filingYear);

  for (let year = startYear; year <= endYear; year += 1) {
    let monthlyBenefit = 0;
    let monthsInYear = 12;

    if (year >= claimingCalendarYear) {
      const yearsAfterClaim = year - claimingCalendarYear;
      monthlyBenefit = benefitAfterClaim(baseMonthlyAtClaim, yearsAfterClaim, inflationRate);

      if (year === claimingCalendarYear) {
        monthsInYear = 12 - birthMonthIndex;
      }
    }

    const roundedMonthly = Number(monthlyBenefit.toFixed(2));
    monthly[year] = roundedMonthly;
    runningTotal = Number((runningTotal + roundedMonthly * monthsInYear).toFixed(2));
    cumulative[year] = runningTotal;
  }

  return { monthly, cumulative, birthYear };
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

  allYears.forEach((year) => {
    const primaryMonthly = primaryProjection.monthly?.[year] || 0;
    const spouseMonthly = spouseProjection.monthly?.[year] || 0;
    const combinedMonthly = prematureDeath && year >= deathYear
      ? Math.max(primaryMonthly, spouseMonthly)
      : primaryMonthly + spouseMonthly;

    monthly[year] = combinedMonthly;
    runningTotal += combinedMonthly * 12;
    cumulative[year] = runningTotal;
  });

  return { monthly, cumulative };
};
