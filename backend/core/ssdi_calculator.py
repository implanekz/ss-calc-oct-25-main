from datetime import date
from dateutil.relativedelta import relativedelta
from .base_ss_calculator import BaseSSCalculator
from .benefit_math import drc_factor, early_reduction_factor

class SSDICalculator(BaseSSCalculator):
    def __init__(self, birth_date: date, pia: float):
        super().__init__(birth_date, pia)

    def calculate_ssdi_comparison(self, inflation_rate: float = 0.0, longevity_age: int = 90):
        """
        Calculates SSDI benefits and compares with:
        1. Early retirement (if currently eligible)
        2. Suspension at FRA strategy
        """
        fra_date = self.fra_date
        fra_age_years = self.fra_years
        fra_age_months = self.fra_months
        current_date = date.today()
        
        # Calculate numeric FRA
        fra_numeric = fra_age_years + (fra_age_months / 12.0)
        
        # Determine current age
        age_delta = relativedelta(current_date, self.birth_date)
        current_age_years = age_delta.years
        current_age_months = age_delta.months
        current_age_numeric = current_age_years + (current_age_months / 12.0)
        
        # 1. SSDI Amount (Always 100% PIA)
        # Note: If they are already past FRA, SSDI is just retirement, but we assume they are asking before 70
        ssdi_monthly = self.pia
        
        # 2. Early Retirement Comparison
        # What would they get if they filed for retirement TODAY vs SSDI?
        early_retirement_amount = 0
        early_retirement_eligible = False
        retirement_reduction_percent = 0
        
        if current_age_numeric >= 62:
            early_retirement_eligible = True
            # Calculate reduction
            # Months early from FRA (negative for early)
            months_offset = int(round((current_age_numeric - fra_numeric) * 12))
            
            if months_offset < 0:
                # Use shared reduction logic
                # early_reduction_factor returns multiplier (e.g. 0.70), so reduction is 1 - multiplier
                multiplier = early_reduction_factor(months_offset)
                early_retirement_amount = self.pia * multiplier
                retirement_reduction_percent = (1.0 - multiplier) * 100
            else:
                early_retirement_amount = self.pia # At or past FRA
        
        # 3. Strategy Analysis: Continue vs Suspend
        # Strategy A: Standard (SSDI -> Retirement at FRA -> No Suspension)
        # Strategy B: Suspension (SSDI -> Retirement at FRA -> Suspend -> Reinstate at 70)
        
        # We need to simulate year by year to get lifetime totals
        # Start from current age up to longevity
        
        # DRC potential: ~8% per year from FRA to 70
        # Max DRC months = (70 - FRA) * 12
        months_fra_to_70 = int(round((70 - fra_numeric) * 12))
        # Use shared DRC logic
        max_drc_factor = drc_factor(months_fra_to_70)
        
        cumulative_std = 0
        cumulative_suspend = 0
        break_even_age = None
        
        strategy_std_lifetime = 0
        strategy_suspend_lifetime = 0
        
        # Monthly values for graph/display (simplified to annual steps for response)
        timeline_data = []

        # Calculate monthly needs
        for age in range(current_age_years, longevity_age + 1):
            year_data = {
                "age": age,
                "std_monthly": 0,
                "suspend_monthly": 0
            }
            
            # For each month in this year
            for month in range(12):
                # Actual numeric age at this month
                sim_age = age + (month / 12.0)
                
                # Inflation adjustment from today
                # Years from "now"
                years_from_now = sim_age - current_age_numeric
                if years_from_now < 0: continue # Skip past
                
                inflation_factor = (1 + inflation_rate) ** years_from_now
                
                # Logic for amounts
                
                # STANDARD PATH:
                std_monthly = self.pia * inflation_factor
                
                # SUSPENSION PATH:
                suspend_path_monthly = 0
                if sim_age < fra_numeric:
                    suspend_path_monthly = self.pia * inflation_factor
                elif sim_age >= 70:
                    suspend_path_monthly = self.pia * max_drc_factor * inflation_factor
                else:
                    # SUSPENDED
                    suspend_path_monthly = 0
                
                # Update totals for lifetime
                strategy_std_lifetime += std_monthly
                strategy_suspend_lifetime += suspend_path_monthly
                
                # Update totals for break-even tracking
                cumulative_std += std_monthly
                cumulative_suspend += suspend_path_monthly

                # Check crossover only after age 70 (when they start earning back the lost income)
                if break_even_age is None and sim_age >= 70:
                    if cumulative_suspend >= cumulative_std:
                        break_even_age = sim_age
                
                # Capture annual snapshot (use mid-year or January)
                if month == 0:
                    year_data["std_monthly"] = std_monthly
                    year_data["suspend_monthly"] = suspend_path_monthly
            
            timeline_data.append(year_data)

        # Difference at age 70 (monthly)
        # Calculate explicit Age 70 benefits in today's dollars (no inflation) for clear comparison
        benefit_at_70_std = self.pia 
        benefit_at_70_suspend = self.pia * max_drc_factor
        
        return {
            "current_age": current_age_numeric,
            "fra_age": fra_numeric,
            "ssdi_monthly_benefit": self.pia,
            "early_retirement": {
                "eligible": early_retirement_eligible,
                "monthly_amount": early_retirement_amount,
                "reduction_percent": retirement_reduction_percent
            },
            "strategies": {
                "standard": {
                    "monthly_at_70": benefit_at_70_std, # Today's dollars
                    "lifetime_total": strategy_std_lifetime
                },
                "suspension": {
                    "monthly_at_70": benefit_at_70_suspend, # Today's dollars
                    "lifetime_total": strategy_suspend_lifetime,
                    "break_even_age": break_even_age
                }
            },
            "timeline": timeline_data
        }
