
import pytest
from backend.core.benefit_math import (
    preclaim_cola_factor,
    monthly_benefit_at_claim,
    early_reduction_factor,
    drc_factor
)

class TestBenefitMath:
    def test_cola_freeze_ages_60_61(self):
        """
        Verify that no COLA is applied for ages 60 and 61.
        Scenario:
        - Current age = 60
        - Claim age = 62
        - Inflation rate = 0.03 (3%)
        """
        r = 0.03
        
        # Case 1: Sitting exactly in the freeze window (60 -> 62)
        # Should be 0 adjustment (factor 1.0)
        # preclaim_cola_factor(claim_age, current_age, r)
        # 60 to 62 means current_age=60.
        factor_60_to_62 = preclaim_cola_factor(claim_age_years=62, current_age_years=60, r=r)
        assert factor_60_to_62 == 1.0

        # Case 2: One year of COLA (60 -> 63)
        # Should get 1 year of COLA (for age 62)
        factor_60_to_63 = preclaim_cola_factor(claim_age_years=63, current_age_years=60, r=r)
        # (1.03)^1
        assert abs(factor_60_to_63 - 1.03) < 1e-6

        # Case 3: Start before 60 (e.g., 58) claim at 62
        # 58->59 (cola), 59->60 (cola), 60->61 (freeze), 61->62 (freeze)
        # Wait, the logic is:
        # Pre-60: Years from current to 60 get COLA.
        # 60-62: Freeze.
        # 62+: Years from 62 to claim get COLA.
        
        # If current=58, claim=62.
        # pre60 = 60 - 58 = 2 years.
        # cola_from_62 = 62 - 62 = 0 years.
        # Total = 2 years of COLA.
        factor_58_to_62 = preclaim_cola_factor(claim_age_years=62, current_age_years=58, r=r)
        assert abs(factor_58_to_62 - (1.03**2)) < 1e-6

    def test_pia_4000_claim_70_example(self):
        """
        Verify the specific example from TODO:
        PIA=4000, COLA=3%, Claim=70.
        Assume we are fully past 62 (current age 62), so all COLAs apply.
        """
        pia = 4000
        r = 0.03
        claim_age = 70
        current_age = 62 
        fra = 67
        
        # Manual calc
        # COLAs: 62 through 69 (8 years) -> (1.03)^8
        cola_factor = 1.03 ** 8
        inflated_pia = pia * cola_factor
        
        # DRC: 36 months * (2/3 of 1%)
        # 36 months delayed (67 to 70)
        drc = 1 + (36 * (2/3)/100) # 1.24
        
        expected_total = inflated_pia * drc
        
        calculated = monthly_benefit_at_claim(
            pia_fra=pia,
            claim_age_years=claim_age,
            current_age_years=current_age,
            r=r,
            fra_years=fra
        )
        
        # 4000 * 1.26677 * 1.24 = ~6283
        # Check tolerance
        assert abs(calculated - expected_total) < 0.1 
        
        # Ensure it's in the expected range 6.2k-6.4k
        assert 6200 <= calculated <= 6400

    def test_early_reduction(self):
        """Test early reduction factor logic"""
        # 36 months early -> 20% reduction (factor 0.8)
        assert abs(early_reduction_factor(-36) - 0.8) < 1e-6
        
        # 60 months early -> 30% reduction (factor 0.7)
        assert abs(early_reduction_factor(-60) - 0.7) < 1e-6

