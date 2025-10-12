"""
Tests for benefit_math.py calculation functions
Verifies Social Security benefit calculations including:
- Pre-claim COLAs (freeze at 60-61, apply from 62)
- Early retirement reductions
- Delayed retirement credits
- Post-claim COLA adjustments
"""

import pytest
from backend.core.benefit_math import (
    monthly_benefit_at_claim,
    benefit_after_claim,
    preclaim_cola_factor,
    drc_factor,
    early_reduction_factor,
    months_from_fra,
)


class TestPreClaimCOLA:
    """Test pre-claim COLA calculations"""

    def test_cola_freeze_at_60_61(self):
        """Verify 0% COLA at ages 60-61 (freeze period)"""
        # Current age 58, claim at 60: 2 years of COLA before freeze
        factor_60 = preclaim_cola_factor(
            claim_age_years=60.0,
            current_age_years=58.0,
            r=0.03
        )
        assert factor_60 == pytest.approx(1.03 ** 2, rel=1e-4)

        # Current age 58, claim at 61: still just 2 years (60-61 is frozen)
        factor_61 = preclaim_cola_factor(
            claim_age_years=61.0,
            current_age_years=58.0,
            r=0.03
        )
        assert factor_61 == pytest.approx(1.03 ** 2, rel=1e-4)

    def test_cola_from_62_onward(self):
        """Verify COLA resumes from age 62"""
        # Current age 58, claim at 62: 2 years pre-60 + 0 years from 62 = 2 years
        factor_62 = preclaim_cola_factor(
            claim_age_years=62.0,
            current_age_years=58.0,
            r=0.03
        )
        assert factor_62 == pytest.approx(1.03 ** 2, rel=1e-4)

        # Current age 58, claim at 63: 2 years pre-60 + 1 year from 62 = 3 years
        factor_63 = preclaim_cola_factor(
            claim_age_years=63.0,
            current_age_years=58.0,
            r=0.03
        )
        assert factor_63 == pytest.approx(1.03 ** 3, rel=1e-4)

    def test_cola_current_age_over_60(self):
        """Test when current age is already past 60"""
        # Current age 65, claim at 70: 5 years of COLA from 62-67
        factor_70 = preclaim_cola_factor(
            claim_age_years=70.0,
            current_age_years=65.0,
            r=0.03
        )
        # From 62 to 70 is 8 years of COLA
        assert factor_70 == pytest.approx(1.03 ** 8, rel=1e-4)


class TestDelayedRetirementCredits:
    """Test delayed retirement credit calculations"""

    def test_drc_at_fra(self):
        """No DRCs at FRA"""
        factor = drc_factor(months_after_fra=0)
        assert factor == 1.0

    def test_drc_one_year_delay(self):
        """8% increase for one year delay (12 months * 2/3%)"""
        factor = drc_factor(months_after_fra=12)
        assert factor == pytest.approx(1.08, rel=1e-4)

    def test_drc_three_years_delay(self):
        """24% increase for three years delay (36 months * 2/3%)"""
        factor = drc_factor(months_after_fra=36)
        assert factor == pytest.approx(1.24, rel=1e-4)

    def test_drc_negative_months(self):
        """Negative months should return 1.0 (no DRCs before FRA)"""
        factor = drc_factor(months_after_fra=-12)
        assert factor == 1.0


class TestEarlyReductionFactor:
    """Test early retirement reduction calculations"""

    def test_no_reduction_at_fra(self):
        """No reduction at FRA"""
        factor = early_reduction_factor(months_before_fra=0)
        assert factor == 1.0

    def test_reduction_one_year_early(self):
        """12 months early: 12 * 5/9% = 6.67% reduction"""
        factor = early_reduction_factor(months_before_fra=-12)
        expected = 1.0 - (12 * 5/9/100)
        assert factor == pytest.approx(expected, rel=1e-4)

    def test_reduction_three_years_early(self):
        """36 months early (first tier): 36 * 5/9% = 20% reduction"""
        factor = early_reduction_factor(months_before_fra=-36)
        expected = 1.0 - (36 * 5/9/100)
        assert factor == pytest.approx(expected, rel=1e-4)

    def test_reduction_five_years_early(self):
        """60 months early (mixed tiers):
        - First 36 months: 36 * 5/9% = 20%
        - Next 24 months: 24 * 5/12% = 10%
        - Total reduction: 30%
        """
        factor = early_reduction_factor(months_before_fra=-60)
        reduction_36 = 36 * 5/9/100
        reduction_24 = 24 * 5/12/100
        expected = 1.0 - (reduction_36 + reduction_24)
        assert factor == pytest.approx(expected, rel=1e-4)


class TestMonthlyBenefitAtClaim:
    """Test full monthly benefit calculations"""

    def test_benefit_at_62_no_inflation(self):
        """Claiming at 62 with 0% inflation"""
        # PIA = $4000, FRA = 67, claim at 62 (60 months early)
        benefit = monthly_benefit_at_claim(
            pia_fra=4000.0,
            claim_age_years=62.0,
            current_age_years=62.0,
            r=0.0,
            fra_years=67,
        )
        # 60 months early = 30% reduction
        expected = 4000.0 * 0.7
        assert benefit == pytest.approx(expected, rel=1e-2)

    def test_benefit_at_fra_no_inflation(self):
        """Claiming at FRA with 0% inflation"""
        benefit = monthly_benefit_at_claim(
            pia_fra=4000.0,
            claim_age_years=67.0,
            current_age_years=67.0,
            r=0.0,
            fra_years=67,
        )
        # No reduction or credits at FRA
        assert benefit == pytest.approx(4000.0, rel=1e-2)

    def test_benefit_at_70_no_inflation(self):
        """Claiming at 70 with 0% inflation"""
        benefit = monthly_benefit_at_claim(
            pia_fra=4000.0,
            claim_age_years=70.0,
            current_age_years=70.0,
            r=0.0,
            fra_years=67,
        )
        # 36 months late = 24% increase
        expected = 4000.0 * 1.24
        assert benefit == pytest.approx(expected, rel=1e-2)

    def test_benefit_at_70_with_3pct_inflation(self):
        """Claiming at 70 with 3% inflation (key test from TODO)

        Expected: $6,200 - $6,400/month
        - PIA inflates from 62 to 70: 8 years at 3%
        - Then 24% DRCs applied
        """
        benefit = monthly_benefit_at_claim(
            pia_fra=4000.0,
            claim_age_years=70.0,
            current_age_years=65.0,  # Current age for COLA calculation
            r=0.03,
            fra_years=67,
        )

        # Manual calculation:
        # PIA after 8 years of 3% COLA: 4000 * 1.03^8 = 5,067.47
        # With 24% DRCs: 5,067.47 * 1.24 = 6,283.66

        # Test matches TODO expectation: $6.2k - $6.4k
        assert 6200 <= benefit <= 6400
        assert benefit == pytest.approx(6283.66, rel=1e-1)

    def test_benefit_with_cola_freeze(self):
        """Verify 60-61 freeze is respected in benefit calculation"""
        # Current age 58, claim at 62
        benefit_62 = monthly_benefit_at_claim(
            pia_fra=4000.0,
            claim_age_years=62.0,
            current_age_years=58.0,
            r=0.03,
            fra_years=67,
        )

        # PIA should inflate for 2 years (58-60), freeze at 60-61, no COLA from 62 yet
        # Then 30% reduction for claiming at 62
        pia_inflated = 4000.0 * (1.03 ** 2)  # Only 2 years before freeze
        expected = pia_inflated * 0.7  # 30% reduction

        assert benefit_62 == pytest.approx(expected, rel=1e-2)


class TestPostClaimCOLA:
    """Test post-claim COLA adjustments"""

    def test_benefit_at_claim_year(self):
        """No COLA in year of claim (years_after_claim = 0)"""
        base_benefit = 5000.0
        benefit = benefit_after_claim(base_benefit, years_after_claim=0, r=0.03)
        assert benefit == base_benefit

    def test_benefit_one_year_after(self):
        """3% COLA one year after claim"""
        base_benefit = 5000.0
        benefit = benefit_after_claim(base_benefit, years_after_claim=1, r=0.03)
        expected = 5000.0 * 1.03
        assert benefit == pytest.approx(expected, rel=1e-2)

    def test_benefit_five_years_after(self):
        """Compounded COLA over 5 years"""
        base_benefit = 5000.0
        benefit = benefit_after_claim(base_benefit, years_after_claim=5, r=0.03)
        expected = 5000.0 * (1.03 ** 5)
        assert benefit == pytest.approx(expected, rel=1e-2)

    def test_benefit_ten_years_after(self):
        """Compounded COLA over 10 years"""
        base_benefit = 6000.0
        benefit = benefit_after_claim(base_benefit, years_after_claim=10, r=0.025)
        expected = 6000.0 * (1.025 ** 10)
        assert benefit == pytest.approx(expected, rel=1e-2)


class TestIntegratedScenarios:
    """Test complete scenarios combining multiple calculations"""

    def test_early_filer_scenario(self):
        """Person files at 62, receives benefits with COLA to age 90"""
        # Initial benefit at 62 (30% reduction, no inflation)
        initial_benefit = monthly_benefit_at_claim(
            pia_fra=3000.0,
            claim_age_years=62.0,
            current_age_years=62.0,
            r=0.025,
            fra_years=67,
        )

        # Should be $2,100/month (30% reduction)
        assert initial_benefit == pytest.approx(2100.0, rel=1e-1)

        # Benefit at age 70 (8 years of post-claim COLA)
        benefit_at_70 = benefit_after_claim(initial_benefit, years_after_claim=8, r=0.025)
        expected_at_70 = 2100.0 * (1.025 ** 8)
        assert benefit_at_70 == pytest.approx(expected_at_70, rel=1e-2)

    def test_delayed_filer_scenario(self):
        """Person waits to 70, receives benefits with COLA to age 95"""
        # Initial benefit at 70 (24% DRCs + 8 years pre-claim COLA)
        initial_benefit = monthly_benefit_at_claim(
            pia_fra=4000.0,
            claim_age_years=70.0,
            current_age_years=62.0,
            r=0.03,
            fra_years=67,
        )

        # PIA inflates 8 years: 4000 * 1.03^8 = 5,067.47
        # With 24% DRCs: 5,067.47 * 1.24 = 6,283.66
        assert initial_benefit == pytest.approx(6283.66, rel=1e-1)

        # Benefit at age 85 (15 years of post-claim COLA)
        benefit_at_85 = benefit_after_claim(initial_benefit, years_after_claim=15, r=0.03)
        expected_at_85 = initial_benefit * (1.03 ** 15)
        assert benefit_at_85 == pytest.approx(expected_at_85, rel=1e-2)

    def test_fra_filer_scenario(self):
        """Person files at FRA (67), no reduction or credits"""
        initial_benefit = monthly_benefit_at_claim(
            pia_fra=2500.0,
            claim_age_years=67.0,
            current_age_years=65.0,
            r=0.02,
            fra_years=67,
        )

        # From 62 to 67 is 5 years of pre-claim COLA
        expected_pia = 2500.0 * (1.02 ** 5)
        # No reduction or DRCs at FRA
        assert initial_benefit == pytest.approx(expected_pia, rel=1e-2)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
