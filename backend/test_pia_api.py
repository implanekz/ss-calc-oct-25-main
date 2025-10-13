#!/usr/bin/env python3
"""
Test script for PIA calculation API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_calculate_pia():
    """Test the manual PIA calculation endpoint"""
    print("\n=== Testing /calculate-pia-from-earnings ===")

    # Test data: someone born in 1960, worked from 1980-2021, retired at 62
    request_data = {
        "birth_year": 1960,
        "earnings_history": [
            {"year": 1980, "earnings": 15000, "is_projected": False},
            {"year": 1985, "earnings": 25000, "is_projected": False},
            {"year": 1990, "earnings": 35000, "is_projected": False},
            {"year": 1995, "earnings": 45000, "is_projected": False},
            {"year": 2000, "earnings": 55000, "is_projected": False},
            {"year": 2005, "earnings": 65000, "is_projected": False},
            {"year": 2010, "earnings": 75000, "is_projected": False},
            {"year": 2015, "earnings": 85000, "is_projected": False},
            {"year": 2020, "earnings": 95000, "is_projected": False},
            {"year": 2021, "earnings": 100000, "is_projected": False},
            {"year": 2022, "earnings": 0, "is_projected": False},  # Retired at 62
            {"year": 2023, "earnings": 0, "is_projected": False},
            {"year": 2024, "earnings": 0, "is_projected": False},
        ]
    }

    response = requests.post(f"{BASE_URL}/calculate-pia-from-earnings", json=request_data)

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Success!")
        print(f"  AIME: ${result['aime']:,.2f}")
        print(f"  PIA: ${result['pia']:,.2f}")
        print(f"  PIA Year: {result['pia_year']}")
        print(f"  Bend points: ${result['bend_points_used'][0]}, ${result['bend_points_used'][1]}")
        print(f"  Zero years in top 35: {result['years_of_zero_in_top_35']}")
        return result
    else:
        print(f"✗ Failed with status {response.status_code}")
        print(f"  Error: {response.text}")
        return None

def test_what_if_comparison():
    """Test the what-if scenario comparison endpoint"""
    print("\n=== Testing /compare-earnings-scenarios ===")

    # Simplified test: just 3 years to test the logic
    # Original: retired at 62 with zeros
    original_earnings = [
        {"year": 2020, "earnings": 95000, "is_projected": False},
        {"year": 2021, "earnings": 100000, "is_projected": False},
        {"year": 2022, "earnings": 0, "is_projected": False},
        {"year": 2023, "earnings": 0, "is_projected": False},
        {"year": 2024, "earnings": 0, "is_projected": False},
    ]

    # Modified: continue working at $80K through 2024
    modified_earnings = [
        {"year": 2020, "earnings": 95000, "is_projected": False},
        {"year": 2021, "earnings": 100000, "is_projected": False},
        {"year": 2022, "earnings": 80000, "is_projected": True},
        {"year": 2023, "earnings": 80000, "is_projected": True},
        {"year": 2024, "earnings": 80000, "is_projected": True},
    ]

    request_data = {
        "birth_year": 1960,
        "original_earnings": original_earnings,
        "modified_earnings": modified_earnings
    }

    response = requests.post(f"{BASE_URL}/compare-earnings-scenarios", json=request_data)

    if response.status_code == 200:
        result = response.json()
        print(f"✓ Success!")
        print(f"\n  Original PIA: ${result['original']['pia']:,.2f}")
        print(f"  Modified PIA: ${result['modified']['pia']:,.2f}")
        print(f"\n  Impact:")
        print(f"    Monthly increase: ${result['impact']['monthly_change']:,.2f}")
        print(f"    Annual increase: ${result['impact']['annual_change']:,.2f}")
        print(f"    25-year lifetime: ${result['impact']['lifetime_25_years']:,.2f}")
        print(f"    Percent increase: {result['impact']['percent_increase']:.1f}%")
    else:
        print(f"✗ Failed with status {response.status_code}")
        print(f"  Error: {response.text}")

if __name__ == "__main__":
    print("PIA API Endpoint Tests")
    print("=" * 50)
    print("Make sure the FastAPI server is running on localhost:8000")
    print("Start it with: cd backend && python3 -m uvicorn core.integrated_ss_api:app --reload")

    try:
        # Test basic health
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✓ API server is running\n")
        else:
            print("✗ API server not responding")
            exit(1)
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to API server. Is it running?")
        exit(1)

    # Run tests
    test_calculate_pia()
    test_what_if_comparison()

    print("\n" + "=" * 50)
    print("Tests completed!")
