import { useState, useEffect, useMemo } from 'react';

/**
 * useBenefitCalculations Hook
 * 
 * Calculates Social Security benefits for each month from age 62 to 70
 * Uses the same SSA formulas as the main calculator for consistency
 * 
 * Part of the "One Month at a Time" feature - MVP Sprint 3
 */

// SSA reduction/credit formulas - MUST match ShowMeTheMoneyCalculator
const delayedRetirementCreditFactor = (monthsAfterFra) => {
  const months = Math.max(0, monthsAfterFra);
  return 1 + ((2 / 3) / 100) * months;
};

const earlyReductionFactor = (monthsBeforeFra) => {
  const months = Math.abs(Math.min(0, monthsBeforeFra));
  const first36 = Math.min(36, months);
  const extra = Math.max(0, months - 36);
  const reduction = first36 * (5 / 9) / 100 + extra * (5 / 12) / 100;
  return Math.max(0, 1 - reduction);
};

const useBenefitCalculations = ({
  baseBenefitAt62 = 2500,  // Monthly benefit if filing at 62
  fullRetirementAge = 67,  // Full Retirement Age (typically 67 for those born 1960+)
  inflationRate = 0.03,    // Annual inflation rate (default 3%)
  birthYear = 1960         // Used to determine FRA
}) => {
  // State for all calculated benefits
  const [benefitsByMonth, setBenefitsByMonth] = useState({});

  // Calculate Full Retirement Age based on birth year - matches main calculator
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

  const getFra = (birthYear) => {
    if (birthYear <= 1937) {
      return { years: 65, months: 0 };
    }
    if (birthYear >= 1960) {
      return { years: 67, months: 0 };
    }
    return FRA_LOOKUP[birthYear] || { years: 67, months: 0 };
  };

  // Get FRA in years (decimal)
  const getFRAYears = () => {
    const fra = getFra(birthYear);
    return fra.years + (fra.months || 0) / 12;
  };

  // Calculate benefit for a specific age in years (decimal)
  const calculateMonthlyBenefit = (ageYears) => {
    const fraYears = getFRAYears();
    
    // Cap age at 70 - SSA delayed credits stop at age 70
    const cappedAgeYears = Math.min(ageYears, 70);
    
    // Calculate months from FRA
    const monthsFromFra = Math.round((cappedAgeYears - fraYears) * 12);
    
    // Back-calculate PIA from age 62 benefit
    // Age 62 benefit = PIA * earlyReductionFactor(months before FRA at 62)
    const monthsBeforeFraAt62 = Math.round((fraYears - 62) * 12);
    const piaFRA = baseBenefitAt62 / earlyReductionFactor(-monthsBeforeFraAt62);
    
    // Now calculate benefit at the target age (capped at 70)
    let benefit;
    if (monthsFromFra >= 0) {
      // At or after FRA - apply delayed credits (capped at age 70)
      const maxDelayedMonths = Math.round((70 - fraYears) * 12);
      const cappedMonthsFromFra = Math.min(monthsFromFra, maxDelayedMonths);
      benefit = piaFRA * delayedRetirementCreditFactor(cappedMonthsFromFra);
    } else {
      // Before FRA - apply early reduction
      benefit = piaFRA * earlyReductionFactor(monthsFromFra);
    }
    
    // Apply inflation from age 62 to target age (capped at 70 for credit purposes)
    const yearsFromAge62 = cappedAgeYears - 62;
    const inflationAdjustment = Math.pow(1 + inflationRate, yearsFromAge62);
    benefit = benefit * inflationAdjustment;
    
    return Math.round(benefit);
  };

  // Pre-calculate all benefits from age 62 to 70 (96 months)
  useEffect(() => {
    const calculateAllBenefits = () => {
      const benefits = {};
      const totalMonths = (70 - 62) * 12 + 1; // 97 entries (including month 0)
      
      for (let month = 0; month < totalMonths; month++) {
        const years = Math.floor(month / 12) + 62;
        const months = month % 12;
        const key = `${years}_${months}`;
        // Convert to age in years (decimal)
        const ageYears = years + (months / 12);
        benefits[key] = calculateMonthlyBenefit(ageYears);
      }
      
      setBenefitsByMonth(benefits);
    };

    calculateAllBenefits();
  }, [baseBenefitAt62, fullRetirementAge, inflationRate, birthYear]);

  // Get FRA in months from age 62 (for compatibility)
  const getFRAMonths = () => {
    const fraYears = getFRAYears();
    return (fraYears - 62) * 12;
  };

  // Helper function to get benefit for specific age
  const getBenefitForAge = (years, months) => {
    const key = `${years}_${months}`;
    return benefitsByMonth[key] || baseBenefitAt62;
  };

  // Calculate monthly gain (difference from current month to next month)
  const calculateMonthlyGain = (currentYears, currentMonths) => {
    const currentBenefit = getBenefitForAge(currentYears, currentMonths);
    
    // Calculate next month
    let nextMonths = currentMonths + 1;
    let nextYears = currentYears;
    if (nextMonths === 12) {
      nextMonths = 0;
      nextYears++;
    }
    
    // Don't go past age 70
    if (nextYears > 70 || (nextYears === 70 && nextMonths > 0)) {
      return 0;
    }
    
    const nextBenefit = getBenefitForAge(nextYears, nextMonths);
    return nextBenefit - currentBenefit;
  };

  // Calculate cumulative lifetime benefit increase vs age 62
  const calculateCumulativeGain = (currentYears, currentMonths) => {
    const baseBenefit = getBenefitForAge(62, 0);
    const currentBenefit = getBenefitForAge(currentYears, currentMonths);
    const monthlyIncrease = currentBenefit - baseBenefit;
    
    // Assuming life expectancy of 85 years
    const remainingMonths = (85 - currentYears) * 12 - currentMonths;
    
    // Total additional lifetime income
    return monthlyIncrease * remainingMonths;
  };

  return {
    benefitsByMonth,
    getBenefitForAge,
    calculateMonthlyGain,
    calculateCumulativeGain,
    fraMonths: getFRAMonths(),
  };
};

export default useBenefitCalculations;
