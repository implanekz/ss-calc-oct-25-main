// Shared Social Security benefit formulas used across components

// FRA lookup table
const FRA_LOOKUP = {
  1937: { years: 65, months: 0 },
  1938: { years: 65, months: 2 },
  1939: { years: 65, months: 4 },
  1940: { years: 65, months: 6 },
  1941: { years: 65, months: 8 },
  1942: { years: 65, months: 10 },
  1943: { years: 66, months: 0 },
  1944: { years: 66, months: 0 },
  1945: { years: 66, months: 0 },
  1946: { years: 66, months: 0 },
  1947: { years: 66, months: 0 },
  1948: { years: 66, months: 0 },
  1949: { years: 66, months: 0 },
  1950: { years: 66, months: 0 },
  1951: { years: 66, months: 0 },
  1952: { years: 66, months: 0 },
  1953: { years: 66, months: 0 },
  1954: { years: 66, months: 0 },
  1955: { years: 66, months: 2 },
  1956: { years: 66, months: 4 },
  1957: { years: 66, months: 6 },
  1958: { years: 66, months: 8 },
  1959: { years: 66, months: 10 },
  1960: { years: 67, months: 0 }
};

export const getFra = (birthYear) => {
  if (birthYear <= 1937) return { years: 65, months: 0 };
  if (birthYear >= 1960) return { years: 67, months: 0 };
  return FRA_LOOKUP[birthYear] || { years: 67, months: 0 };
};

export const getFraYears = (birthYear) => {
  const fra = getFra(birthYear);
  return fra.years + (fra.months || 0) / 12;
};

// Standard SSA early filing reduction factors
// Input: monthsBeforeFra should be negative when before FRA
export const earlyReductionFactor = (monthsBeforeFra) => {
  const months = Math.abs(Math.min(0, monthsBeforeFra));
  const first36 = Math.min(36, months);
  const extra = Math.max(0, months - 36);
  const reduction = first36 * (5 / 9) / 100 + extra * (5 / 12) / 100;
  return Math.max(0, 1 - reduction);
};

// Standard SSA delayed retirement credit factor
// Input: monthsAfterFra should be >= 0 when after FRA
export const delayedRetirementCreditFactor = (monthsAfterFra) => {
  const months = Math.max(0, monthsAfterFra);
  return 1 + ((2 / 3) / 100) * months; // 2/3% per month
};

// Convenience helpers using ages in years (decimals)
export const earlyReductionFromAges = (filingAgeYears, fraYears) => {
  const monthsFromFra = Math.round((filingAgeYears - fraYears) * 12);
  return earlyReductionFactor(monthsFromFra);
};

export const drcIncreaseFromAges = (claimAgeYears, fraYears) => {
  const monthsFromFra = Math.round((claimAgeYears - fraYears) * 12);
  const base = delayedRetirementCreditFactor(monthsFromFra);
  // Return just the increase over PIA (i.e., factor - 1)
  return Math.max(0, base - 1);
};

// Pre-claim COLA adjustment: treat provided PIA as at FRA.
// If claim is after FRA, apply COLA from FRA→claim; if at/before FRA, no pre-claim COLA.
export const adjustPIAForPreClaim = (piaAtFRA, claimAgeYears, fraYears, colaRate) => {
  if (claimAgeYears <= fraYears) return piaAtFRA;
  const yearsAfterFra = claimAgeYears - fraYears;
  return piaAtFRA * Math.pow(1 + colaRate, yearsAfterFra);
};

export default {
  getFra,
  getFraYears,
  earlyReductionFactor,
  delayedRetirementCreditFactor,
  earlyReductionFromAges,
  drcIncreaseFromAges,
  adjustPIAForPreClaim
};

