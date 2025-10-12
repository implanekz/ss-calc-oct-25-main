"""
Widow/Widower Social Security Calculator
Handles survivor benefits and crossover strategies for widowed individuals
"""

from datetime import date
from dateutil.relativedelta import relativedelta
from typing import Dict, List, Optional, Tuple

from .base_ss_calculator import BaseSSCalculator, SocialSecurityConstants


class WidowSSCalculator(BaseSSCalculator):
    """
    Calculator for widowed individuals
    Handles survivor benefits and crossover optimization strategies
    """

    def __init__(
        self,
        birth_date: date,
        own_pia: float,
        deceased_spouse_pia: float,
        deceased_spouse_death_date: date,
        is_remarried: bool = False,
        remarriage_date: Optional[date] = None
    ):
        """
        Initialize widow calculator

        Args:
            birth_date: Person's date of birth
            own_pia: Person's own Primary Insurance Amount
            deceased_spouse_pia: Deceased spouse's Primary Insurance Amount
            deceased_spouse_death_date: Date of spouse's death
            is_remarried: Whether person has remarried
            remarriage_date: Date of remarriage (if applicable)
        """
        super().__init__(birth_date, own_pia)

        self.deceased_spouse_pia = deceased_spouse_pia
        self.deceased_spouse_death_date = deceased_spouse_death_date
        self.is_remarried = is_remarried
        self.remarriage_date = remarriage_date

    def is_eligible_for_survivor_benefits(self, current_date: Optional[date] = None) -> Tuple[bool, str]:
        """
        Check if eligible for survivor benefits

        Returns:
            Tuple of (is_eligible, reason)
        """
        if current_date is None:
            current_date = date.today()

        # Calculate current age
        current_age_years = (current_date - self.birth_date).days / 365.25

        # Check remarriage rules
        if self.is_remarried and self.remarriage_date:
            remarriage_age = (self.remarriage_date - self.birth_date).days / 365.25

            if remarriage_age < 60:
                return False, "Remarried before age 60 (not eligible for survivor benefits)"
            else:
                # Remarried at 60+ is OK
                pass

        # Must be at least age 60 for survivor benefits (age 50 if disabled, but we're not handling that)
        if current_age_years < 60:
            return False, f"Must be age 60+ for survivor benefits (currently {int(current_age_years)})"

        return True, "Eligible for survivor benefits"

    def calculate_survivor_benefit(
        self,
        claiming_age_years: int,
        inflation_rate: float = 0.025
    ) -> float:
        """
        Calculate survivor benefit (up to 100% of deceased spouse's benefit)

        Args:
            claiming_age_years: Age when claiming survivor benefit (60-70)
            inflation_rate: Annual inflation rate

        Returns:
            Monthly survivor benefit amount
        """
        # Survivor benefit is based on what the deceased spouse was receiving
        # or would have received at their FRA

        # Calculate deceased spouse's benefit with COLA inflation
        years_since_death = max(0, claiming_age_years - (self.deceased_spouse_death_date.year - self.birth_date.year))
        deceased_inflated_pia = self.deceased_spouse_pia * ((1 + inflation_rate) ** years_since_death)

        # Survivor can get up to 100% of deceased spouse's benefit
        survivor_base = deceased_inflated_pia

        # Apply early reduction if claiming before own FRA
        claiming_date = self.get_claiming_date(claiming_age_years)

        if claiming_date < self.fra_date:
            # Survivor benefits have different reduction rates
            # Reduced by 28.5% if claimed at 60 (4.75% per year for ages 60-FRA)
            months_early = relativedelta(self.fra_date, claiming_date).months + \
                          relativedelta(self.fra_date, claiming_date).years * 12

            # Survivor benefit reduction: approximately 0.396% per month (4.75% per year)
            reduction_rate = 0.00396  # per month
            reduction = min(months_early * reduction_rate, 0.285)  # Max 28.5% reduction

            survivor_benefit = survivor_base * (1.0 - reduction)
        else:
            # No reduction at or after FRA
            survivor_benefit = survivor_base

        return survivor_benefit

    def calculate_crossover_strategy(
        self,
        survivor_claiming_age: int,
        own_claiming_age: int,
        longevity_age: int = 95,
        inflation_rate: float = 0.025
    ) -> Dict:
        """
        Calculate crossover strategy: Take one benefit early, switch to the other later

        Args:
            survivor_claiming_age: Age to start survivor benefits
            own_claiming_age: Age to start own benefits (and stop survivor)
            longevity_age: Age at death
            inflation_rate: Annual inflation rate

        Returns:
            Dictionary with strategy details and lifetime value
        """
        # Strategy: Take survivor benefits first, then switch to own
        if survivor_claiming_age >= own_claiming_age:
            return {
                'valid': False,
                'reason': 'Survivor claiming age must be before own claiming age for crossover'
            }

        # Calculate survivor benefit amount
        survivor_monthly = self.calculate_survivor_benefit(survivor_claiming_age, inflation_rate)

        # Calculate lifetime value
        survivor_start = self.get_claiming_date(survivor_claiming_age)
        own_start = self.get_claiming_date(own_claiming_age)
        death_date = self.birth_date + relativedelta(years=longevity_age)

        own_monthly = self.calculate_monthly_benefit(own_claiming_age, 0, inflation_rate)
        survivor_phase = self._build_benefit_timeline(
            survivor_start,
            own_start,
            survivor_monthly,
            inflation_rate,
            'survivor'
        )
        own_phase = self._build_benefit_timeline(
            own_start,
            death_date,
            own_monthly,
            inflation_rate,
            'own'
        )

        total_benefits = survivor_phase['total'] + own_phase['total']
        combined_timeline = survivor_phase['timeline'] + own_phase['timeline']

        return {
            'valid': True,
            'survivor_monthly': round(survivor_monthly, 2),
            'own_monthly': round(own_monthly, 2),
            'lifetime_total': round(total_benefits, 2),
            'survivor_years': own_claiming_age - survivor_claiming_age,
            'own_years': longevity_age - own_claiming_age,
            'timeline': combined_timeline
        }

    def calculate_optimal_strategy(
        self,
        longevity_age: int = 95,
        inflation_rate: float = 0.025
    ) -> Dict:
        """
        Calculate optimal claiming strategy comparing:
        1. Own benefit only (62-70)
        2. Survivor benefit only (60-70)
        3. Crossover: Survivor early → Own later
        4. Reverse crossover: Own early → Survivor later

        Returns:
            Dictionary with all strategies and recommendation
        """
        eligible, reason = self.is_eligible_for_survivor_benefits()

        strategies = []

        # Strategy 1: Own benefit only at various ages
        for claiming_age in [62, self.fra_years, 70]:
            if claiming_age <= longevity_age:
                own_benefits = self.calculate_lifetime_benefits(
                    claiming_age, longevity_age, inflation_rate
                )
                strategies.append({
                    'strategy': f"Own benefit only at {claiming_age}",
                    'claiming_age': claiming_age,
                    'type': 'own_only',
                    'initial_monthly': own_benefits['initial_monthly_benefit'],
                    'lifetime_total': own_benefits['total_lifetime_benefits'],
                    'benefit_timeline': own_benefits['annual_breakdown']
                })

        # Strategy 2: Survivor benefit only (if eligible)
        if eligible:
            for claiming_age in [60, 62, self.fra_years, 70]:
                if claiming_age <= longevity_age:
                    survivor_monthly = self.calculate_survivor_benefit(claiming_age, inflation_rate)

                    claiming_date = self.get_claiming_date(claiming_age)
                    death_date = self.birth_date + relativedelta(years=longevity_age)

                    timeline = self._build_benefit_timeline(
                        claiming_date,
                        death_date,
                        survivor_monthly,
                        inflation_rate,
                        'survivor'
                    )

                    strategies.append({
                        'strategy': f"Survivor benefit only at {claiming_age}",
                        'claiming_age': claiming_age,
                        'type': 'survivor_only',
                        'initial_monthly': round(survivor_monthly, 2),
                        'lifetime_total': timeline['total'],
                        'benefit_timeline': timeline['timeline']
                    })

            # Strategy 3: Crossover strategies (if eligible)
            # Survivor early → Own later (MOST COMMON optimal strategy)
            crossover_options = [
                (60, 70),  # Survivor at 60, own at 70
                (62, 70),  # Survivor at 62, own at 70
                (60, self.fra_years),  # Survivor at 60, own at FRA
            ]

            for survivor_age, own_age in crossover_options:
                if own_age <= longevity_age:
                    crossover = self.calculate_crossover_strategy(
                        survivor_age, own_age, longevity_age, inflation_rate
                    )
                    if crossover['valid']:
                        strategies.append({
                            'strategy': f"Survivor at {survivor_age}, switch to own at {own_age}",
                            'claiming_age': survivor_age,
                            'switch_age': own_age,
                            'type': 'crossover',
                            'initial_monthly': crossover['survivor_monthly'],
                            'switched_monthly': crossover['own_monthly'],
                            'lifetime_total': crossover['lifetime_total'],
                            'survivor_years': crossover['survivor_years'],
                            'own_years': crossover['own_years'],
                            'benefit_timeline': crossover.get('timeline', [])
                        })

            # Strategy 4: Reverse crossover (Own early → Survivor later)
            # Less common but possible if own benefit is lower and will grow more
            reverse_options = [
                (62, self.fra_years),  # Own at 62, survivor at FRA
                (62, 70),  # Own at 62, survivor at 70
            ]

            for own_age, survivor_age in reverse_options:
                if survivor_age <= longevity_age and own_age < survivor_age:
                    # Similar calculation but reversed
                    own_monthly = self.calculate_monthly_benefit(own_age, 0, inflation_rate)

                    own_start = self.get_claiming_date(own_age)
                    survivor_start = self.get_claiming_date(survivor_age)
                    death_date = self.birth_date + relativedelta(years=longevity_age)

                    total_benefits = 0

                    own_phase = self._build_benefit_timeline(
                        own_start,
                        survivor_start,
                        own_monthly,
                        inflation_rate,
                        'own'
                    )

                    survivor_monthly = self.calculate_survivor_benefit(survivor_age, inflation_rate)
                    survivor_phase = self._build_benefit_timeline(
                        survivor_start,
                        death_date,
                        survivor_monthly,
                        inflation_rate,
                        'survivor'
                    )

                    total_benefits = own_phase['total'] + survivor_phase['total']
                    timeline = own_phase['timeline'] + survivor_phase['timeline']

                    strategies.append({
                        'strategy': f"Own at {own_age}, switch to survivor at {survivor_age}",
                        'claiming_age': own_age,
                        'switch_age': survivor_age,
                        'type': 'reverse_crossover',
                        'initial_monthly': round(own_monthly, 2),
                        'switched_monthly': round(survivor_monthly, 2),
                        'lifetime_total': round(total_benefits, 2),
                        'benefit_timeline': timeline
                    })

        # Find optimal strategy
        if strategies:
            optimal = max(strategies, key=lambda x: x['lifetime_total'])

            return {
                'eligible_for_survivor': eligible,
                'eligibility_reason': reason,
                'all_strategies': sorted(strategies, key=lambda x: x['lifetime_total'], reverse=True),
                'optimal_strategy': optimal
            }
        else:
            return {
                'eligible_for_survivor': False,
                'eligibility_reason': reason,
                'all_strategies': [],
                'optimal_strategy': None,
                'error': 'Not eligible for survivor benefits'
            }
