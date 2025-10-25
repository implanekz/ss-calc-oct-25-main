#!/usr/bin/env python3
"""Quick test to debug XML parsing"""

import xml.etree.ElementTree as ET

# Read the test XML file
with open('ssa_projection_pia2500_test.xml', 'r') as f:
    xml_content = f.read()

print("=== XML Parsing Test ===\n")
print(f"XML length: {len(xml_content)} bytes\n")

# Parse it
root = ET.fromstring(xml_content)
print(f"Root tag: {root.tag}\n")

# Try to find earnings elements
earnings_elements = root.findall('.//EarningsRecord')
print(f"Found {len(earnings_elements)} EarningsRecord elements using './/EarningsRecord'\n")

if earnings_elements:
    print("Testing first record:")
    record = earnings_elements[0]
    print(f"  Record tag: {record.tag}")
    
    # Try different methods to get Year
    year_elem_1 = record.find('.//Year')
    year_elem_2 = record.find('Year')
    
    print(f"  find('.//Year'): {year_elem_1}")
    if year_elem_1 is not None:
        print(f"    Text: {year_elem_1.text}")
    
    print(f"  find('Year'): {year_elem_2}")
    if year_elem_2 is not None:
        print(f"    Text: {year_elem_2.text}")
    
    # Same for Earnings
    earnings_elem_1 = record.find('.//Earnings')
    earnings_elem_2 = record.find('Earnings')
    
    print(f"  find('.//Earnings'): {earnings_elem_1}")
    if earnings_elem_1 is not None:
        print(f"    Text: {earnings_elem_1.text}")
    
    print(f"  find('Earnings'): {earnings_elem_2}")
    if earnings_elem_2 is not None:
        print(f"    Text: {earnings_elem_2.text}")
    
    # List all children
    print(f"\n  Children of first EarningsRecord:")
    for child in record:
        print(f"    {child.tag}: {child.text}")

else:
    print("ERROR: No earnings records found!")

print("\n=== Test Complete ===")
