"""
Divorced Social Security Calculator
Handles ex-spouse benefits, child-in-care benefits, and optimization strategies
for divorced individuals
"""

from datetime import date
from dateutil.relativedelta import relativedelta
from typing import Dict, List, Optional, Tuple

from .base_ss_calculator import BaseSSCalculator, SocialSecurityConstants


class DivorcedSSCalculator(BaseSSCalculator):
    """
    Calculator for divorced individuals
    Handles ex-spouse benefits and optimization strategies
    """

    def __init__(
        self,
        birth_date: date,
        own_pia: float,
        ex_spouse_pia: float,
        marriage_duration_years: int,
        divorce_date: date,
        is_remarried: bool = False,
        has_child_under_16: bool = False,
        child_birth_date: Optional[date] = None
    ):
        """
        Initialize divorced calculator

        Args:
            birth_date: Person's date of birth
            own_pia: Person's own Primary Insurance Amount
            ex_spouse_pia: Ex-spouse's Primary Insurance Amount
            marriage_duration_years: Length of marriage in years
            divorce_date: Date of divorce
            is_remarried: Whether person has remarried
            has_child_under_16: Whether person has child under 16
            child_birth_date: Child's birth date (for child-in-care benefits)
        """
        super().__init__(birth_date, own_pia)
        self.birth_date = birth_date
        self.ex_spouse_pia = ex_spouse_pia
        self.marriage_duration_years = marriage_duration_years
        self.divorce_date = divorce_date
        self.is_remarried = is_remarried
        self.has_child_under_16 = has_child_under_16
        self.child_birth_date = child_birth_date

    def is_eligible_for_ex_spouse_benefit(
        self,
        current_date: Optional[date] = None,
        ignore_age_check: bool = False
    ) -> Tuple[bool, str]:
        """
        Check if eligible for ex-spouse benefits
        
        Args:
            current_date: Date to check eligibility against (defaults to today)
            ignore_age_check: If True, skips the age >= 62 check (useful for future planning)

        Returns:
            Tuple of (is_eligible, reason)
        """
        if current_date is None:
            current_date = date.today()

        # Marriage must have lasted 10+ years
        if self.marriage_duration_years < 10:
            return False, f"Marriage lasted only {self.marriage_duration_years} years (need 10+)"

        # Cannot be remarried (unless subsequent marriage ended)
        if self.is_remarried:
            return False, "Cannot claim ex-spouse benefits while remarried"

        # Must be at least age 62 (unless child-in-care)
        if not ignore_age_check:
            current_age_years = (current_date - self.birth_date).days / 365.25
            if current_age_years < 62 and not self.has_child_under_16:
                return False, f"Must be age 62+ to claim (currently {int(current_age_years)})"

        return True, "Eligible for ex-spouse benefits"

    def is_eligible_for_child_in_care_benefit(self, current_date: Optional[date] = None) -> Tuple[bool, str]:
        """
        Check if eligible for child-in-care benefits
        Can claim at ANY age if caring for child under 16

        Returns:
            Tuple of (is_eligible, reason)
        """
        if current_date is None:
            current_date = date.today()

        if not self.has_child_under_16 or self.child_birth_date is None:
            return False, "No child under 16"

        # Calculate child's age
        child_age_years = (current_date - self.child_birth_date).days / 365.25

        if child_age_years >= 16:
            return False, f"Child is {int(child_age_years)} years old (must be under 16)"

        # Marriage must have lasted 10+ years
        if self.marriage_duration_years < 10:
            return False, f"Marriage lasted only {self.marriage_duration_years} years (need 10+)"

        # Cannot be remarried
        if self.is_remarried:
            return False, "Cannot claim child-in-care benefits while remarried"

        years_until_16 = 16 - child_age_years
        return True, f"Eligible NOW for child-in-care benefits (child under 16 for {years_until_16:.1f} more years)"

    def calculate_ex_spouse_benefit(
        self,
        claiming_age_years: int,
        inflation_rate: float = 0.025
    ) -> float:
        """
        Calculate ex-spouse benefit (50% of ex's PIA, subject to reductions)

        Args:
            claiming_age_years: Age when claiming ex-spouse benefit
            inflation_rate: Annual inflation rate

        Returns:
            Monthly ex-spouse benefit amount
        """
        # Ex-spouse benefit is 50% of ex's PIA
        ex_spouse_inflated_pia = self.ex_spouse_pia * ((1 + inflation_rate) ** max(0, claiming_age_years - 62))
        spousal_pia = ex_spouse_inflated_pia * 0.5

        # Apply early retirement reduction if claiming before own FRA
        claiming_date = self.get_claiming_date(claiming_age_years)

        if claiming_date < self.fra_date:
            reduction_factor = self.calculate_reduction_factor(claiming_date)
            ex_spouse_benefit = spousal_pia * reduction_factor
        else:
            ex_spouse_benefit = spousal_pia

        return ex_spouse_benefit

    def calculate_child_in_care_benefit(self, inflation_rate: float = 0.025) -> Dict:
        """
        Calculate child-in-care benefit (50% of ex's PIA, no age reduction)

        Returns:
            Dictionary with benefit details
        """
        if not self.has_child_under_16 or self.child_birth_date is None:
            return {
                'eligible': False,
                'monthly_benefit': 0,
                'reason': 'No child under 16'
            }

        eligible, reason = self.is_eligible_for_child_in_care_benefit()

        if not eligible:
            return {
                'eligible': False,
                'monthly_benefit': 0,
                'reason': reason
            }

        # Calculate how long benefits last
        current_date = date.today()
        child_age_years = (current_date - self.child_birth_date).days / 365.25
        years_until_16 = 16 - child_age_years
        months_of_benefits = int(years_until_16 * 12)

        # Child-in-care benefit is 50% of ex's PIA (NO reduction for early claiming!)
        # Inflate ex-spouse PIA to current date
        years_since_62 = max(0, ((current_date - self.birth_date).days / 365.25) - 62)
        ex_spouse_inflated_pia = self.ex_spouse_pia * ((1 + inflation_rate) ** years_since_62)
        child_in_care_benefit = ex_spouse_inflated_pia * 0.5

        # Calculate total value
        total_value = child_in_care_benefit * months_of_benefits

        return {
            'eligible': True,
            'monthly_benefit': round(child_in_care_benefit, 2),
            'months_of_benefits': months_of_benefits,
            'years_of_benefits': round(years_until_16, 1),
            'total_lifetime_value': round(total_value, 2),
            'child_current_age': round(child_age_years, 1),
            'reason': reason
        }

    def calculate_optimal_strategy(
        self,
        longevity_age: int = 95,
        inflation_rate: float = 0.025
    ) -> Dict:
        """
        Calculate optimal claiming strategy comparing:
        1. Combined Benefit (Deemed Filing rules)
        2. Switching strategy (Restricted Application, born < 1954)
        3. Child-in-care benefits (if applicable)

        Returns:
            Dictionary with all strategies and recommendation
        """
        # Check basic non-age eligibility (marriage length, etc.)
        eligible, reason = self.is_eligible_for_ex_spouse_benefit(ignore_age_check=True)

        strategies = []
        restricted_application_available = self.birth_date < date(1954, 1, 2)
        
        # Standard Filing Strategies (Used for Deemed Filing OR simple comparisons)
        # For each age, we calculate what you'd get if you filed for everything available.
        for claiming_age in [62, self.fra_years, 70]:
            if claiming_age <= longevity_age:
                # 1. Calculate Own Benefit
                own_benefits = self.calculate_lifetime_benefits(
                    claiming_age, longevity_age, inflation_rate
                )
                own_monthly = own_benefits['initial_monthly_benefit']
                own_lifetime = own_benefits['total_lifetime_benefits']
                
                # 2. Calculate Ex-Spouse Benefit (if eligible)
                ex_spouse_monthly = 0
                if eligible:
                    ex_spouse_monthly = self.calculate_ex_spouse_benefit(claiming_age, inflation_rate)
                
                # 3. Determine actual benefit under Deemed Filing logic
                # You get the higher of the two (technically Own + (Spousal - Own))
                # If ineligible for spousal, you strictly get Own.
                
                final_monthly = max(own_monthly, ex_spouse_monthly)
                
                # Identify the dominant benefit type strictly for labeling
                strategy_type = 'own'
                if eligible and ex_spouse_monthly > own_monthly:
                    strategy_type = 'ex_spouse'
                
                # Build the timeline for the "Max" strategy
                claiming_date = self.get_claiming_date(claiming_age)
                death_date = self.birth_date + relativedelta(years=longevity_age)
                
                timeline = self._build_benefit_timeline(
                    claiming_date,
                    death_date,
                    final_monthly,
                    inflation_rate,
                    strategy_type
                )
                
                label = f"File at {claiming_age}"
                if strategy_type == 'own':
                    label += " (Own Benefit)"
                else: 
                    label += " (Includes Spousal Top-up)"

                strategies.append({
                    'strategy': label,
                    'claiming_age': claiming_age,
                    'type': strategy_type,
                    'initial_monthly': round(final_monthly, 2),
                    'lifetime_total': timeline['total'],
                    'benefit_timeline': timeline['timeline']
                })

        # Restricted Application Strategy (Born before 1954 only)
        # Take ex-spouse early, switch to own later.
        # This is ONLY valid if Restricted Application is available AND eligible for spousal.
        if restricted_application_available and eligible:
            for ex_spouse_age in [62]:
                for switch_age in [self.fra_years, 70]:
                    if switch_age > ex_spouse_age and switch_age <= longevity_age:
                        # Calculate ex-spouse benefits from ex_spouse_age to switch_age
                        # Note: Under restricted application, you file Restricted at FRA (66/67).
                        # But typically the strategy is: Claim Spousal at FRA, Switch to Own at 70.
                        # You CANNOT file Restricted Application before FRA.
                        # If you file before FRA, Deemed Filing applies regardless of birth year.
                        
                        # Correct Logic for Restricted App:
                        # 1. Must wait until FRA to file Restricted Application.
                        # 2. Claim Spousal Benefit ONLY at FRA.
                        # 3. Switch to Own Benefit at 70 (maximized).
                        
                        # We only model the classic FRA -> 70 path here for simplicity of the 'loop'
                        # but user can claim own anytime after FRA.
                        
                        current_ex_claim_age = max(ex_spouse_age, self.fra_years) # Force FRA for restricted app validity
                        
                        if current_ex_claim_age >= switch_age:
                            continue

                        # Spousal benefit at FRA (no reduction)
                        ex_spouse_monthly = self.calculate_ex_spouse_benefit(current_ex_claim_age, inflation_rate)

                        switch_date = self.get_claiming_date(switch_age)
                        death_date = self.birth_date + relativedelta(years=longevity_age)

                        ex_phase = self._build_benefit_timeline(
                            self.get_claiming_date(current_ex_claim_age),
                            switch_date,
                            ex_spouse_monthly,
                            inflation_rate,
                            'ex_spouse'
                        )

                        own_monthly = self.calculate_monthly_benefit(switch_age, 0, inflation_rate)
                        own_phase = self._build_benefit_timeline(
                            switch_date,
                            death_date,
                            own_monthly,
                            inflation_rate,
                            'own'
                        )

                        total_benefits = ex_phase['total'] + own_phase['total']
                        timeline = ex_phase['timeline'] + own_phase['timeline']

                        strategies.append({
                            'strategy': f"Restricted App: Spousal at {current_ex_claim_age}, Own at {switch_age}",
                            'claiming_age': current_ex_claim_age,
                            'switch_age': switch_age,
                            'type': 'switching',
                            'initial_monthly': round(ex_spouse_monthly, 2),
                            'switched_monthly': round(own_monthly, 2),
                            'lifetime_total': round(total_benefits, 2),
                            'benefit_timeline': timeline,
                            'note': 'Available due to birth before 1954'
                        })

        # Strategy 4: Child-in-care benefits
        child_in_care = self.calculate_child_in_care_benefit(inflation_rate)
        if child_in_care['eligible']:
            current_date = date.today()
            end_date = current_date + relativedelta(months=child_in_care['months_of_benefits'])
            timeline = self._build_benefit_timeline(
                current_date,
                end_date,
                child_in_care['monthly_benefit'],
                inflation_rate,
                'child_in_care'
            )
            # Add to the "Best" strategy or present standalone? 
            # Usually this is "Money Now". We add it as a strategy option.
            child_in_care['total_lifetime_value'] = timeline['total']
            child_in_care['benefit_timeline'] = timeline['timeline']

            strategies.append({
                'strategy': f"Child-in-care benefit NOW (until child turns 16)",
                'claiming_age': int((date.today() - self.birth_date).days / 365.25),
                'type': 'child_in_care',
                'initial_monthly': child_in_care['monthly_benefit'],
                'lifetime_total': timeline['total'],
                'years_of_benefits': child_in_care['years_of_benefits'],
                'note': f"Plus additional benefits from age 62+, not included in this total",
                'benefit_timeline': timeline['timeline']
            })

        # Find optimal strategy
        if strategies:
            optimal = max(strategies, key=lambda x: x['lifetime_total'])

            return {
                'eligible_for_ex_spouse': eligible,
                'eligibility_reason': reason,
                'all_strategies': sorted(strategies, key=lambda x: x['lifetime_total'], reverse=True),
                'optimal_strategy': optimal,
                'deemed_filing_applies': not restricted_application_available,
                'child_in_care_details': child_in_care if child_in_care['eligible'] else None
            }
        else:
             return {
                'eligible_for_ex_spouse': eligible,
                'eligibility_reason': reason,
                'all_strategies': [],
                'optimal_strategy': None,
                'deemed_filing_applies': not restricted_application_available,
                'error': 'No valid strategies found'
            }
