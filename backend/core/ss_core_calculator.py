"""
Social Security Core Calculator
Foundation classes for Social Security benefit calculations
"""

from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Dict, List, Tuple, Optional
import math

# Import base calculator and constants
from .base_ss_calculator import (
    BaseSSCalculator,
    SocialSecurityConstants,
    ClientType,
)

# Import benefit math helpers
from .benefit_math import (
    monthly_benefit_at_claim,
    benefit_after_claim,
)


class IndividualSSCalculator(BaseSSCalculator):
    """
    Calculates Social Security benefits for one individual
    Inherits base calculation logic from BaseSSCalculator
    """

    def __init__(self, birth_date: date, pia: float):
        """
        Initialize calculator for one person

        Args:
            birth_date: Person's date of birth
            pia: Primary Insurance Amount at Full Retirement Age
        """
        # Call parent constructor
        super().__init__(birth_date, pia)


class HouseholdSSCalculator:
    """Combines two individual calculators for household analysis"""
    
    def __init__(self, spouse1: IndividualSSCalculator, spouse2: IndividualSSCalculator = None):
        """
        Initialize household calculator
        
        Args:
            spouse1: Primary person's calculator
            spouse2: Spouse's calculator (optional for single person)
        """
        self.spouse1 = spouse1
        self.spouse2 = spouse2
        self.is_married = spouse2 is not None
    
    def calculate_spousal_benefit(self, spouse_calc: IndividualSSCalculator, 
                                primary_calc: IndividualSSCalculator, 
                                spouse_claiming_age: int, primary_claiming_age: int, inflation_rate: float) -> float:
        """
        Calculate spousal benefit (50% of primary's PIA, subject to reductions)
        This is a simplified calculation - actual spousal benefits are more complex
        """
        if not self.is_married:
            return 0
        
        # Spousal benefit is based on 50% of the primary earner's INFLATED PIA at FRA
        primary_inflated_pia = primary_calc._calculate_inflated_pia(primary_claiming_age, inflation_rate)
        spousal_pia = primary_inflated_pia * 0.5
        
        # Apply early retirement reduction if spouse claims before their FRA
        spouse_claiming_date = spouse_calc.get_claiming_date(spouse_claiming_age)
        
        if spouse_claiming_date < spouse_calc.fra_date:
            reduction_factor = spouse_calc.calculate_reduction_factor(spouse_claiming_date)
            spousal_benefit = spousal_pia * reduction_factor
        else:
            spousal_benefit = spousal_pia
        
        # Spousal benefit is reduced by their own benefit
        own_benefit = spouse_calc.calculate_monthly_benefit(spouse_claiming_age, 0, inflation_rate)
        
        return max(0, spousal_benefit - own_benefit)
    
    def calculate_household_benefits(self, spouse1_claiming_age: int, spouse2_claiming_age: int,
                                   longevity_ages: Tuple[int, int], inflation_rate: float = 0.025) -> Dict:
        """
        Calculate combined household Social Security benefits
        
        Args:
            spouse1_claiming_age: When spouse 1 claims
            spouse2_claiming_age: When spouse 2 claims (ignored if single)
            longevity_ages: Tuple of (spouse1_longevity, spouse2_longevity)
            inflation_rate: Annual inflation rate
            
        Returns:
            Dictionary with household benefit analysis
        """
        # Calculate individual benefits
        spouse1_benefits = self.spouse1.calculate_lifetime_benefits(
            spouse1_claiming_age, longevity_ages[0], inflation_rate
        )
        
        household_total = spouse1_benefits['total_lifetime_benefits']
        
        if self.is_married and spouse2_claiming_age:
            spouse2_benefits = self.spouse2.calculate_lifetime_benefits(
                spouse2_claiming_age, longevity_ages[1], inflation_rate
            )
            household_total += spouse2_benefits['total_lifetime_benefits']
            
        return {
            'total_household_benefits': round(household_total, 2),
            'spouse1_benefits': spouse1_benefits,
            'spouse2_benefits': self.spouse2.calculate_lifetime_benefits(
                spouse2_claiming_age, longevity_ages[1], inflation_rate
            ) if self.is_married else None,
            'optimization_scenarios': self._calculate_optimization_scenarios(longevity_ages, inflation_rate)
        }
    
    def _calculate_optimization_scenarios(self, longevity_ages: Tuple[int, int], 
                                        inflation_rate: float) -> Dict:
        """Calculate key optimization scenarios for comparison"""
        scenarios = {}
        
        # Scenario 1: Both file at 62
        scenarios['both_at_62'] = self.calculate_household_benefits(
            62, 62 if self.is_married else None, longevity_ages, inflation_rate
        )
        
        # Scenario 2: Both file at 70
        scenarios['both_at_70'] = self.calculate_household_benefits(
            70, 70 if self.is_married else None, longevity_ages, inflation_rate
        )
        
        # Scenario 3: Mixed strategy (higher earner waits)
        if self.is_married:
            if self.spouse1.pia > self.spouse2.pia:
                scenarios['optimized_mixed'] = self.calculate_household_benefits(
                    70, 62, longevity_ages, inflation_rate
                )
            else:
                scenarios['optimized_mixed'] = self.calculate_household_benefits(
                    62, 70, longevity_ages, inflation_rate
                )
        
        return scenarios


# Test the calculator with example data
if __name__ == "__main__":
    # Test case based on typical scenario
    # Spouse 1: Born Feb 3, 1969, PIA $4,000
    # Spouse 2: Born June 10, 1968, PIA $1,500
    
    spouse1_birth = date(1969, 2, 3)
    spouse1_calc = IndividualSSCalculator(spouse1_birth, 4000)
    
    spouse2_birth = date(1968, 6, 10) 
    spouse2_calc = IndividualSSCalculator(spouse2_birth, 1500)
    
    household = HouseholdSSCalculator(spouse1_calc, spouse2_calc)
    
    # Test individual calculations with new inflation logic
    inflation = 0.03
    print("=== Individual Calculator Tests (3% Inflation) ===")
    print(f"Spouse 1 FRA: {spouse1_calc.fra_years} years, {spouse1_calc.fra_months} months")
    
    # Benefit at 62 (0 inflation years)
    benefit_62 = spouse1_calc.calculate_monthly_benefit(62, 0, inflation)
    print(f"Spouse 1 benefit at 62: ${benefit_62:,.2f}")

    # Benefit at FRA (67) (5 inflation years: 62, 63, 64, 65, 66)
    benefit_fra = spouse1_calc.calculate_monthly_benefit(spouse1_calc.fra_years, spouse1_calc.fra_months, inflation)
    print(f"Spouse 1 benefit at FRA (67): ${benefit_fra:,.2f}")

    # Benefit at 70 (8 inflation years: 62 through 69)
    benefit_70 = spouse1_calc.calculate_monthly_benefit(70, 0, inflation)
    print(f"Spouse 1 benefit at 70: ${benefit_70:,.2f}")
    
    print(f"\nSpouse 2 FRA: {spouse2_calc.fra_years} years, {spouse2_calc.fra_months} months")
    print(f"Spouse 2 benefit at 62: ${spouse2_calc.calculate_monthly_benefit(62, 0, inflation):,.2f}")
    print(f"Spouse 2 benefit at 70: ${spouse2_calc.calculate_monthly_benefit(70, 0, inflation):,.2f}")
    
    # Test lifetime calculations
    print("\n=== Lifetime Benefit Tests (3% Inflation) ===")
    spouse1_lifetime_62 = spouse1_calc.calculate_lifetime_benefits(62, 90, inflation)
    spouse1_lifetime_70 = spouse1_calc.calculate_lifetime_benefits(70, 90, inflation)
    
    print(f"Spouse 1 lifetime benefits (claim at 62, live to 90): ${spouse1_lifetime_62['total_lifetime_benefits']:,.2f}")
    print(f"Spouse 1 lifetime benefits (claim at 70, live to 90): ${spouse1_lifetime_70['total_lifetime_benefits']:,.2f}")
    print(f"Optimization value: ${spouse1_lifetime_70['total_lifetime_benefits'] - spouse1_lifetime_62['total_lifetime_benefits']:,.2f}")
