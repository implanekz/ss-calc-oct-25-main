import { useState, useEffect, useMemo } from 'react';

/**
 * useBenefitCalculations Hook
 * 
 * Calculates Social Security benefits for each month from age 62 to 70
 * Handles:
 * - Early retirement reductions (before FRA)
 * - Delayed Retirement Credits (after FRA)
 * - COLA/inflation adjustments
 * 
 * Part of the "One Month at a Time" feature - MVP Sprint 3
 */

const useBenefitCalculations = ({
  baseBenefitAt62 = 2500,  // Monthly benefit if filing at 62
  fullRetirementAge = 67,  // Full Retirement Age (typically 67 for those born 1960+)
  inflationRate = 0.03,    // Annual inflation rate (default 3%)
  birthYear = 1960         // Used to determine FRA
}) => {
  // State for all calculated benefits
  const [benefitsByMonth, setBenefitsByMonth] = useState({});

  // Calculate Full Retirement Age based on birth year
  const calculateFRA = (year) => {
    if (year <= 1954) return 66;
    if (year >= 1960) return 67;
    // Born 1955-1959: 66 + 2 months per year
    const monthsToAdd = (year - 1954) * 2;
    return {
      years: 66,
      months: monthsToAdd
    };
  };

  // Get FRA in months from age 62
  const getFRAMonths = () => {
    const fra = calculateFRA(birthYear);
    if (typeof fra === 'number') {
      return (fra - 62) * 12;
    }
    return (fra.years - 62) * 12 + fra.months;
  };

  // Calculate benefit for a specific age in months
  const calculateMonthlyBenefit = (totalMonths) => {
    const fraMonths = getFRAMonths();
    const totalMonthsTo70 = (70 - 62) * 12; // 96 months
    
    // Early retirement reduction factors (before FRA)
    // Benefits are reduced by approximately 6.67% per year (0.556% per month) before FRA
    const earlyReductionPerMonth = 0.00556; // ~6.67% per year / 12
    
    // Delayed Retirement Credits (after FRA)
    // Benefits increase by 8% per year (0.667% per month) after FRA
    const delayedCreditPerMonth = 0.00667; // 8% per year / 12
    
    let benefit = baseBenefitAt62;
    
    if (totalMonths < fraMonths) {
      // Before FRA: Calculate based on early retirement reduction
      // The formula is more complex, but simplified: 
      // FRA benefit = base * (1 / (1 - reduction))
      // Current benefit = FRA benefit * (1 - (months before FRA * monthly reduction))
      
      const monthsBeforeFRA = fraMonths - totalMonths;
      const fullBenefit = baseBenefitAt62 / (1 - (fraMonths * earlyReductionPerMonth));
      benefit = fullBenefit * (1 - (monthsBeforeFRA * earlyReductionPerMonth));
    } else if (totalMonths === fraMonths) {
      // At FRA: Calculate full benefit
      benefit = baseBenefitAt62 / (1 - (fraMonths * earlyReductionPerMonth));
    } else {
      // After FRA: Add Delayed Retirement Credits
      const monthsAfterFRA = totalMonths - fraMonths;
      const fullBenefit = baseBenefitAt62 / (1 - (fraMonths * earlyReductionPerMonth));
      benefit = fullBenefit * (1 + (monthsAfterFRA * delayedCreditPerMonth));
    }
    
    // Apply inflation adjustment (simplified - compounded annually)
    const years = totalMonths / 12;
    const inflationAdjustment = Math.pow(1 + inflationRate, years);
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
        benefits[key] = calculateMonthlyBenefit(month);
      }
      
      setBenefitsByMonth(benefits);
    };

    calculateAllBenefits();
  }, [baseBenefitAt62, fullRetirementAge, inflationRate, birthYear]);

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
