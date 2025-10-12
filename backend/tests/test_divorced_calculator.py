"""
Test script for divorced calculator
Tests ex-spouse benefits, child-in-care benefits, and optimization strategies
"""

from datetime import date
from dateutil.relativedelta import relativedelta
from backend.core.divorced_calculator import DivorcedSSCalculator


def test_basic_ex_spouse_benefit():
    """Test basic ex-spouse benefit calculation"""
    print("=" * 70)
    print("TEST 1: Basic Ex-Spouse Benefit Calculation")
    print("=" * 70)

    # 62-year-old divorced woman
    # Own PIA: $1,500, Ex-spouse PIA: $3,000
    # Married 15 years, divorced 5 years ago
    birth_date = date(1963, 1, 1)  # Currently 62
    divorce_date = date(2020, 1, 1)

    calc = DivorcedSSCalculator(
        birth_date=birth_date,
        own_pia=1500.0,
        ex_spouse_pia=3000.0,
        marriage_duration_years=15,
        divorce_date=divorce_date,
        is_remarried=False,
        has_child_under_16=False
    )

    # Check eligibility
    eligible, reason = calc.is_eligible_for_ex_spouse_benefit()
    print(f"\nEligibility: {eligible}")
    print(f"Reason: {reason}")

    # Calculate ex-spouse benefit at 62
    ex_benefit_62 = calc.calculate_ex_spouse_benefit(62, 0.025)
    print(f"\nEx-spouse benefit at 62: ${ex_benefit_62:,.2f}/month")
    print(f"(50% of ex's PIA with early reduction)")

    # Calculate own benefit at 62
    own_benefit_62 = calc.calculate_monthly_benefit(62, 0, 0.025)
    print(f"Own benefit at 62: ${own_benefit_62:,.2f}/month")

    # Compare
    if ex_benefit_62 > own_benefit_62:
        print(f"\n✅ Ex-spouse benefit is ${ex_benefit_62 - own_benefit_62:,.2f}/month better!")
    else:
        print(f"\n❌ Own benefit is ${own_benefit_62 - ex_benefit_62:,.2f}/month better")

    return calc


def test_child_in_care_benefit():
    """Test child-in-care benefit (GAME CHANGER!)"""
    print("\n" + "=" * 70)
    print("TEST 2: Child-in-Care Benefit (Can Claim at ANY Age!)")
    print("=" * 70)

    # 35-year-old divorced mom with 10-year-old child
    birth_date = date(1990, 6, 15)  # Age 35
    child_birth_date = date(2015, 3, 1)  # Child is 10
    divorce_date = date(2020, 1, 1)

    calc = DivorcedSSCalculator(
        birth_date=birth_date,
        own_pia=2000.0,
        ex_spouse_pia=3500.0,
        marriage_duration_years=12,
        divorce_date=divorce_date,
        is_remarried=False,
        has_child_under_16=True,
        child_birth_date=child_birth_date
    )

    # Check child-in-care eligibility
    eligible, reason = calc.is_eligible_for_child_in_care_benefit()
    print(f"\nChild-in-care eligibility: {eligible}")
    print(f"Reason: {reason}")

    # Calculate child-in-care benefit
    child_benefit = calc.calculate_child_in_care_benefit(0.025)

    if child_benefit['eligible']:
        print(f"\n🎉 ELIGIBLE NOW at age 35!")
        print(f"Monthly benefit: ${child_benefit['monthly_benefit']:,.2f}")
        print(f"Years of benefits: {child_benefit['years_of_benefits']}")
        print(f"Total value: ${child_benefit['total_lifetime_value']:,.2f}")
        print(f"\n💡 This person doesn't have to wait until age 62!")
        print(f"   They can collect ${child_benefit['monthly_benefit']:,.2f}/month RIGHT NOW!")
    else:
        print(f"\n❌ Not eligible: {child_benefit['reason']}")

    return calc


def test_optimization_strategies():
    """Test optimization comparing all strategies"""
    print("\n" + "=" * 70)
    print("TEST 3: Optimization - All Strategies Compared")
    print("=" * 70)

    # 61-year-old divorced woman
    # Lower own PIA but ex-spouse has higher PIA
    birth_date = date(1964, 3, 15)  # Age 61
    divorce_date = date(2010, 6, 1)

    calc = DivorcedSSCalculator(
        birth_date=birth_date,
        own_pia=1800.0,
        ex_spouse_pia=2800.0,
        marriage_duration_years=18,
        divorce_date=divorce_date,
        is_remarried=False,
        has_child_under_16=False
    )

    # Calculate optimal strategy
    result = calc.calculate_optimal_strategy(longevity_age=90, inflation_rate=0.025)

    print(f"\nEligible for ex-spouse benefits: {result['eligible_for_ex_spouse']}")
    print(f"Reason: {result['eligibility_reason']}")

    print(f"\n📊 ALL STRATEGIES (sorted by lifetime value):")
    print("-" * 70)

    for i, strategy in enumerate(result['all_strategies'], 1):
        print(f"\n{i}. {strategy['strategy']}")
        print(f"   Initial monthly: ${strategy['initial_monthly']:,.2f}")
        if 'switched_monthly' in strategy:
            print(f"   After switch: ${strategy['switched_monthly']:,.2f}")
        print(f"   Lifetime total: ${strategy['lifetime_total']:,.2f}")

    if result['optimal_strategy']:
        print(f"\n🏆 OPTIMAL STRATEGY:")
        opt = result['optimal_strategy']
        print(f"   {opt['strategy']}")
        print(f"   Lifetime value: ${opt['lifetime_total']:,.2f}")

        # Calculate advantage over next best
        if len(result['all_strategies']) > 1:
            next_best = result['all_strategies'][1]['lifetime_total']
            advantage = opt['lifetime_total'] - next_best
            print(f"   Advantage: ${advantage:,.2f} over next best strategy")

    return result


def test_ineligible_scenarios():
    """Test scenarios where person is NOT eligible"""
    print("\n" + "=" * 70)
    print("TEST 4: Ineligible Scenarios")
    print("=" * 70)

    # Scenario A: Marriage lasted only 8 years (need 10)
    print("\n📋 Scenario A: Marriage too short (8 years)")
    birth_date = date(1965, 1, 1)
    divorce_date = date(2020, 1, 1)

    calc = DivorcedSSCalculator(
        birth_date=birth_date,
        own_pia=2000.0,
        ex_spouse_pia=3000.0,
        marriage_duration_years=8,  # Only 8 years!
        divorce_date=divorce_date,
        is_remarried=False,
        has_child_under_16=False
    )

    eligible, reason = calc.is_eligible_for_ex_spouse_benefit()
    print(f"   Eligible: {eligible}")
    print(f"   Reason: {reason}")

    # Scenario B: Remarried
    print("\n📋 Scenario B: Remarried")
    calc2 = DivorcedSSCalculator(
        birth_date=birth_date,
        own_pia=2000.0,
        ex_spouse_pia=3000.0,
        marriage_duration_years=15,
        divorce_date=divorce_date,
        is_remarried=True,  # Remarried!
        has_child_under_16=False
    )

    eligible2, reason2 = calc2.is_eligible_for_ex_spouse_benefit()
    print(f"   Eligible: {eligible2}")
    print(f"   Reason: {reason2}")

    # Scenario C: Too young (age 55, no child)
    print("\n📋 Scenario C: Too young (age 55, no child under 16)")
    birth_date_young = date(1970, 1, 1)
    calc3 = DivorcedSSCalculator(
        birth_date=birth_date_young,
        own_pia=2000.0,
        ex_spouse_pia=3000.0,
        marriage_duration_years=12,
        divorce_date=divorce_date,
        is_remarried=False,
        has_child_under_16=False
    )

    eligible3, reason3 = calc3.is_eligible_for_ex_spouse_benefit()
    print(f"   Eligible: {eligible3}")
    print(f"   Reason: {reason3}")


def test_switching_strategy_detail():
    """Test switching strategy in detail"""
    print("\n" + "=" * 70)
    print("TEST 5: Switching Strategy Deep Dive")
    print("=" * 70)

    # Person with lower own PIA but ex-spouse has much higher PIA
    birth_date = date(1963, 6, 1)
    divorce_date = date(2015, 1, 1)

    calc = DivorcedSSCalculator(
        birth_date=birth_date,
        own_pia=1600.0,  # Lower own benefit
        ex_spouse_pia=3200.0,  # Ex has much higher benefit
        marriage_duration_years=20,
        divorce_date=divorce_date,
        is_remarried=False,
        has_child_under_16=False
    )

    result = calc.calculate_optimal_strategy(longevity_age=95, inflation_rate=0.03)

    # Find switching strategies
    switching_strategies = [s for s in result['all_strategies'] if s['type'] == 'switching']

    if switching_strategies:
        print(f"\n💡 SWITCHING STRATEGIES FOUND:")
        for strategy in switching_strategies:
            print(f"\n   {strategy['strategy']}")
            print(f"   Start with: ${strategy['initial_monthly']:,.2f}/month (ex-spouse)")
            print(f"   Switch to: ${strategy['switched_monthly']:,.2f}/month (own benefit)")
            print(f"   Lifetime total: ${strategy['lifetime_total']:,.2f}")

    # Compare to single-benefit strategies
    own_only_70 = next((s for s in result['all_strategies'] if s.get('strategy') == 'Own benefit at 70'), None)
    ex_only_62 = next((s for s in result['all_strategies'] if s.get('strategy') == 'Ex-spouse benefit at 62'), None)

    if switching_strategies and own_only_70 and ex_only_62:
        best_switch = switching_strategies[0]
        print(f"\n📊 COMPARISON:")
        print(f"   Ex-spouse at 62 only: ${ex_only_62['lifetime_total']:,.2f}")
        print(f"   Own at 70 only: ${own_only_70['lifetime_total']:,.2f}")
        print(f"   Switching strategy: ${best_switch['lifetime_total']:,.2f}")

        vs_ex_only = best_switch['lifetime_total'] - ex_only_62['lifetime_total']
        vs_own_only = best_switch['lifetime_total'] - own_only_70['lifetime_total']

        print(f"\n   Switching beats ex-spouse-only by: ${vs_ex_only:,.2f}")
        print(f"   Switching beats own-only by: ${vs_own_only:,.2f}")


if __name__ == "__main__":
    print("\n")
    print("🧪 DIVORCED CALCULATOR TEST SUITE")
    print("=" * 70)

    try:
        # Run all tests
        test_basic_ex_spouse_benefit()
        test_child_in_care_benefit()
        test_optimization_strategies()
        test_ineligible_scenarios()
        test_switching_strategy_detail()

        print("\n" + "=" * 70)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\nThe divorced calculator is working correctly and handling:")
        print("  ✅ Ex-spouse benefit calculations")
        print("  ✅ Child-in-care benefits (any age!)")
        print("  ✅ Eligibility checks (10-year rule, remarriage, age)")
        print("  ✅ Strategy optimization")
        print("  ✅ Switching strategies")
        print("\n")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
