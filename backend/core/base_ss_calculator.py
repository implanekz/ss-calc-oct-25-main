"""
Base Social Security Calculator
Foundation classes for all Social Security benefit calculations
Provides shared logic for married, divorced, and widowed calculators
"""

from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum

# Import benefit math helpers
from .benefit_math import (
    monthly_benefit_at_claim,
    benefit_after_claim,
)


class ClientType(Enum):
    """Client type enumeration for calculator selection"""
    MARRIED = "married"
    SINGLE = "single"
    DIVORCED = "divorced"
    WIDOWED = "widowed"


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


class BaseSSCalculator:
    """
    Base calculator for Social Security benefits
    Provides core calculation methods shared by all calculator types
    (married, single, divorced, widowed)
    """

    def __init__(self, birth_date: date, pia: float):
        """
        Initialize base calculator for one person

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

    def _age_at_date(self, target_date: date) -> float:
        """Return age in years (one decimal) at a specific date."""
        return round((target_date - self.birth_date).days / 365.25, 1)

    def _months_in_period(self, start_date: date, end_date: date) -> int:
        """
        Count the number of benefit months in [start_date, end_date).
        Benefits are issued monthly, so we advance month by month.
        """
        if start_date >= end_date:
            return 0

        months = 0
        current = start_date
        while current < end_date:
            months += 1
            current = current + relativedelta(months=1)
        return months

    def _build_benefit_timeline(
        self,
        start_date: date,
        end_date: date,
        initial_monthly: float,
        inflation_rate: float,
        phase_label: str
    ) -> Dict[str, Any]:
        """
        Generate year-by-year benefit timeline for a given phase.

        Args:
            start_date: First month benefits are paid for this phase.
            end_date: Date when this phase stops paying (exclusive).
            initial_monthly: Monthly benefit at the start of the phase.
            inflation_rate: Annual COLA assumption applied after claiming.
            phase_label: Identifier for the phase (own, survivor, ex_spouse, etc.).

        Returns:
            Dict with total for the phase, final monthly value, and yearly timeline entries.
        """
        from .benefit_math import benefit_after_claim

        timeline: List[Dict[str, Any]] = []
        total_benefits = 0.0

        current_date = start_date
        years_after_claim = 0
        final_monthly = initial_monthly

        while current_date < end_date:
            current_benefit = benefit_after_claim(initial_monthly, years_after_claim, inflation_rate)
            final_monthly = current_benefit

            next_year_start = date(current_date.year + 1, 1, 1)
            period_end = min(next_year_start, end_date)
            months_in_period = self._months_in_period(current_date, period_end)

            if months_in_period > 0:
                year_benefits = current_benefit * months_in_period
                total_benefits += year_benefits

                timeline.append({
                    'year': current_date.year,
                    'age': self._age_at_date(current_date),
                    'monthly_benefit': round(current_benefit, 2),
                    'annual_total': round(year_benefits, 2),
                    'months_paid': months_in_period,
                    'phase': phase_label
                })

            years_after_claim += 1
            current_date = period_end

        return {
            'timeline': timeline,
            'total': round(total_benefits, 2),
            'final_monthly': round(final_monthly, 2) if timeline else round(initial_monthly, 2)
        }

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
                'annual_total': round(year_benefits, 2),
                'phase': 'own',
                'age': self._age_at_date(current_date)
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
