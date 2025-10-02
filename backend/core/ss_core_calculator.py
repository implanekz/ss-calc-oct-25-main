"""
Social Security Core Calculator
Foundation classes for Social Security benefit calculations
"""

from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Dict, List, Tuple, Optional
import math

# New import for benefit math helpers
from .benefit_math import (
    monthly_benefit_at_claim,
    benefit_after_claim,
)

class SocialSecurityConstants:
    """Official Social Security calculation constants"""
    
    # Early retirement reduction rates
    EARLY_REDUCTION_RATE_36_MONTHS = 5/9/100  # 5/9 of 1% per month for first 36 months
    EARLY_REDUCTION_RATE_ADDITIONAL = 5/12/100  # 5/12 of 1% per month for months beyond 36
    
    # Delayed retirement credit rate
    DELAYED_CREDIT_RATE = 2/3/100  # 2/3 of 1% per month (8% per year)
    
    # Full Retirement Age by birth year
    FRA_TABLE = {
        1937: (65, 0),   # Age 65, 0 months
        1938: (65, 2),   # Age 65, 2 months
        1939: (65, 4),   # Age 65, 4 months
        1940: (65, 6),   # Age 65, 6 months
        1941: (65, 8),   # Age 65, 8 months
        1942: (65, 10),  # Age 65, 10 months
        # 1943-1954: Age 66
        1943: (66, 0), 1944: (66, 0), 1945: (66, 0), 1946: (66, 0),
        1947: (66, 0), 1948: (66, 0), 1949: (66, 0), 1950: (66, 0),
        1951: (66, 0), 1952: (66, 0), 1953: (66, 0), 1954: (66, 0),
        # Gradual increase for 1955-1959
        1955: (66, 2),   # Age 66, 2 months
        1956: (66, 4),   # Age 66, 4 months
        1957: (66, 6),   # Age 66, 6 months
        1958: (66, 8),   # Age 66, 8 months
        1959: (66, 10),  # Age 66, 10 months
        # 1960 and later: Age 67
        1960: (67, 0),
    }
    
    @classmethod
    def get_fra(cls, birth_year: int) -> Tuple[int, int]:
        """Get Full Retirement Age for birth year"""
        if birth_year <= 1937:
            return (65, 0)
        elif birth_year >= 1960:
            return (67, 0)
        else:
            return cls.FRA_TABLE.get(birth_year, (67, 0))


class IndividualSSCalculator:
    """Calculates Social Security benefits for one individual"""
    
    def __init__(self, birth_date: date, pia: float):
        """
        Initialize calculator for one person
        
        Args:
            birth_date: Person's date of birth
            pia: Primary Insurance Amount at Full Retirement Age
        """
        self.birth_date = birth_date
        self.pia = pia
        self.birth_year = birth_date.year
        self.fra_years, self.fra_months = SocialSecurityConstants.get_fra(self.birth_year)
        
        # Calculate exact FRA date
        self.fra_date = self.birth_date + relativedelta(years=self.fra_years, months=self.fra_months)
    
    def age_in_months(self, target_date: date) -> int:
        """Calculate age in months at target date"""
        delta = relativedelta(target_date, self.birth_date)
        return delta.years * 12 + delta.months
    
    def get_claiming_date(self, claiming_age_years: int, claiming_age_months: int = 0) -> date:
        """Get the date when benefits would start based on claiming age"""
        return self.birth_date + relativedelta(years=claiming_age_years, months=claiming_age_months)
    
    def _calculate_inflated_pia(self, claiming_age_years: int, inflation_rate: float) -> float:
        """
        Calculates the PIA adjusted for COLA from age 62 to the claiming age.
        SSA applies COLAs starting in the year an individual turns 62. These COLAs
        compound annually on the PIA. This method calculates the total growth
        of the PIA from age 62 to the year of claiming.
        """
        # The year the individual turns 62, when COLA adjustments begin.
        year_age_62 = self.birth_year + 62
        
        # The year the individual files for benefits.
        claiming_year = self.birth_year + claiming_age_years
        
        # The number of years to apply the compounded COLA.
        # We apply it for each year from 62 up to, but not including, the claiming year.
        # The benefit received in claiming_year is based on the PIA at the end of the prior year.
        # So, if claiming at 63, you get one COLA (for age 62).
        inflation_years = max(0, claiming_year - year_age_62)
        
        # Apply compound inflation to the base PIA.
        inflated_pia = self.pia * ((1 + inflation_rate) ** inflation_years)
        return inflated_pia

    def calculate_reduction_factor(self, claiming_date: date) -> float:
        """
        Calculate early retirement reduction factor
        Returns factor to multiply PIA by (e.g., 0.75 for 25% reduction)
        """
        if claiming_date >= self.fra_date:
            return 1.0  # No reduction at or after FRA
        
        # Calculate months early
        months_early = relativedelta(self.fra_date, claiming_date).months + \
                      relativedelta(self.fra_date, claiming_date).years * 12
        
        # Apply reduction formula
        if months_early <= 36:
            # First 36 months: 5/9 of 1% per month
            reduction = months_early * SocialSecurityConstants.EARLY_REDUCTION_RATE_36_MONTHS
        else:
            # First 36 months at 5/9 rate, additional months at 5/12 rate
            reduction_36 = 36 * SocialSecurityConstants.EARLY_REDUCTION_RATE_36_MONTHS
            reduction_additional = (months_early - 36) * SocialSecurityConstants.EARLY_REDUCTION_RATE_ADDITIONAL
            reduction = reduction_36 + reduction_additional
        
        return 1.0 - reduction
    
    def calculate_delayed_credit_factor(self, claiming_date: date) -> float:
        """
        Calculate delayed retirement credit factor
        Returns factor to multiply PIA by (e.g., 1.32 for 32% increase)
        """
        if claiming_date <= self.fra_date:
            return 1.0  # No credits before FRA
        
        # Calculate months delayed (max at age 70)
        age_70_date = self.birth_date + relativedelta(years=70)
        effective_claiming_date = min(claiming_date, age_70_date)
        
        months_delayed = relativedelta(effective_claiming_date, self.fra_date).months + \
                        relativedelta(effective_claiming_date, self.fra_date).years * 12
        
        # Apply delayed credit formula
        credit = months_delayed * SocialSecurityConstants.DELAYED_CREDIT_RATE
        return 1.0 + credit
    
    def calculate_monthly_benefit(self, claiming_age_years: int, claiming_age_months: int = 0, inflation_rate: float = 0.0) -> float:
        """
        Calculate monthly benefit for given claiming age
        
        Args:
            claiming_age_years: Age in years when claiming (62-70)
            claiming_age_months: Additional months (0-11)
            inflation_rate: Assumed annual inflation rate before claiming
            
        Returns:
            Monthly benefit amount
        """
        claiming_date = self.get_claiming_date(claiming_age_years, claiming_age_months)
        claim_age_in_months = self.age_in_months(claiming_date)
        claim_age_years = claim_age_in_months / 12
        current_age_in_months = self.age_in_months(date.today())
        current_age_years = current_age_in_months / 12
        fra_years_float = self.fra_years + self.fra_months / 12

        monthly_benefit = monthly_benefit_at_claim(
            pia_fra=self.pia,
            claim_age_years=claim_age_years,
            current_age_years=current_age_years,
            r=inflation_rate,
            fra_years=fra_years_float,
        )

        return monthly_benefit
    
    def calculate_lifetime_benefits(self, claiming_age_years: int, longevity_age: int, 
                                  inflation_rate: float = 0.025, claiming_age_months: int = 0) -> Dict:
        """
        Calculate total lifetime benefits with inflation adjustments
        
        Args:
            claiming_age_years: Age when claiming benefits
            longevity_age: Age at death
            inflation_rate: Annual inflation rate (for pre- and post-claiming)
            claiming_age_months: Additional months when claiming
            
        Returns:
            Dictionary with total benefits and annual breakdown
        """
        # Pass inflation to get the correct initial benefit, including pre-filing COLA
        monthly_benefit = self.calculate_monthly_benefit(claiming_age_years, claiming_age_months, inflation_rate)
        claiming_date = self.get_claiming_date(claiming_age_years, claiming_age_months)
        death_date = self.birth_date + relativedelta(years=longevity_age)
        
        total_benefits = 0
        annual_benefits = []
        
        current_date = claiming_date
        years_after_claim = 0
        current_benefit = monthly_benefit
        final_monthly_benefit = monthly_benefit
        
        while current_date < death_date:
            current_benefit = benefit_after_claim(monthly_benefit, years_after_claim, inflation_rate)
            # Calculate benefits for this year
            year_end = min(
                date(current_date.year + 1, 1, 1) - relativedelta(days=1),
                death_date
            )
            
            months_in_year = relativedelta(year_end, current_date).months + 1
            if current_date.year != year_end.year:
                months_in_year = 12 - current_date.month + 1
            
            year_benefits = current_benefit * months_in_year
            total_benefits += year_benefits
            
            annual_benefits.append({
                'year': current_date.year,
                'monthly_benefit': round(current_benefit, 2),
                'months_paid': months_in_year,
                'annual_total': round(year_benefits, 2)
            })
            
            final_monthly_benefit = current_benefit
            years_after_claim += 1
            current_date = date(current_date.year + 1, 1, 1)
        
        return {
            'total_lifetime_benefits': round(total_benefits, 2),
            'initial_monthly_benefit': round(monthly_benefit, 2),
            'final_monthly_benefit': round(final_monthly_benefit, 2),
            'annual_breakdown': annual_benefits,
            'claiming_date': claiming_date,
            'death_date': death_date,
            'years_of_benefits': longevity_age - claiming_age_years
        }


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
