"""
SSA XML File Processor & PIA Impact Analyzer
Processes SSA earnings history XML files and calculates AIME/PIA impact
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Tuple, Optional
from datetime import date, datetime
from dataclasses import dataclass

@dataclass
class EarningsRecord:
    """Individual year earnings record"""
    year: int
    earnings: float
    is_zero: bool
    is_projected: bool = False  # For future years user might add
    
class SSAXMLProcessor:
    """Processes SSA XML files and calculates AIME/PIA"""
    
    # SSA bend points and factors (2024 values - would need annual updates)
    PIA_BEND_POINTS = [1174, 7078]  # First and second bend points for 2024
    PIA_FACTORS = [0.90, 0.32, 0.15]  # 90%, 32%, 15% factors
    
    # Maximum taxable earnings by year (sample - would need complete table)
    TAXABLE_MAXIMUM = {
        2024: 168600, 2023: 160200, 2022: 147000, 2021: 142800,
        2020: 137700, 2019: 132900, 2018: 128400, 2017: 127200,
        2016: 118500, 2015: 118500, 2014: 117000, 2013: 113700,
        2012: 110100, 2011: 106800, 2010: 106800, 2009: 106800,
        2008: 102000, 2007: 97500, 2006: 94200, 2005: 90000,
        # Add more years as needed
    }
    
    # Average Wage Index for indexing historical earnings (sample values)
    AVERAGE_WAGE_INDEX = {
        2024: 70000, 2023: 66621.33, 2022: 63795.13, 2021: 60575.07,
        2020: 55628.60, 2019: 54099.99, 2018: 52145.80, 2017: 50321.89,
        # Add complete AWI table
    }
    
    def __init__(self):
        self.earnings_history = []
        self.indexed_earnings = []
        self.top_35_years = []
        self.current_aime = 0
        self.current_pia = 0
        
    def parse_ssa_xml(self, xml_content: str) -> Dict:
        """
        Parse SSA XML file and extract earnings history
        Note: Actual SSA XML structure may vary - this is a template
        """
        try:
            root = ET.fromstring(xml_content)
            
            # Extract basic info (structure depends on actual SSA XML format)
            person_info = {
                'name': self._safe_find_text(root, './/Name', 'Unknown'),
                'ssn': self._safe_find_text(root, './/SSN', 'XXX-XX-XXXX'),
                'birth_date': self._safe_find_text(root, './/BirthDate', '1900-01-01'),
                'estimated_pia': self._safe_find_text(root, './/EstimatedPIA', '0')
            }
            
            # Extract earnings history
            earnings_elements = root.findall('.//EarningsRecord')
            if not earnings_elements:
                # Try alternative XML structure
                earnings_elements = root.findall('.//YearlyEarnings')
            
            earnings_history = []
            for record in earnings_elements:
                year = int(self._safe_find_text(record, './/Year', '0'))
                earnings = float(self._safe_find_text(record, './/Earnings', '0'))
                
                if year > 0:  # Valid year
                    earnings_record = EarningsRecord(
                        year=year,
                        earnings=earnings,
                        is_zero=(earnings == 0)
                    )
                    earnings_history.append(earnings_record)
            
            # Sort by year
            earnings_history.sort(key=lambda x: x.year)
            self.earnings_history = earnings_history
            
            return {
                'person_info': person_info,
                'earnings_count': len(earnings_history),
                'zero_years': sum(1 for e in earnings_history if e.is_zero),
                'highest_year': max(e.earnings for e in earnings_history) if earnings_history else 0,
                'years_covered': f"{min(e.year for e in earnings_history)}-{max(e.year for e in earnings_history)}" if earnings_history else "None"
            }
            
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML format: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error processing XML: {str(e)}")
    
    def _safe_find_text(self, element, path: str, default: str) -> str:
        """Safely extract text from XML element"""
        found = element.find(path)
        return found.text if found is not None and found.text else default
    
    def calculate_indexed_earnings(self, indexing_year: int = 2024) -> List[Dict]:
        """
        Calculate indexed earnings using SSA wage indexing formula
        """
        if not self.earnings_history:
            raise ValueError("No earnings history loaded")
        
        indexed_earnings = []
        indexing_awi = self.AVERAGE_WAGE_INDEX.get(indexing_year, 70000)
        
        for record in self.earnings_history:
            # Don't index earnings for age 60+ (use actual amounts)
            if record.year >= (indexing_year - 62 + 60):  # Rough age 60 calculation
                indexed_amount = record.earnings
                indexing_factor = 1.0
            else:
                year_awi = self.AVERAGE_WAGE_INDEX.get(record.year, record.earnings)
                if year_awi > 0:
                    indexing_factor = indexing_awi / year_awi
                    indexed_amount = record.earnings * indexing_factor
                else:
                    indexed_amount = record.earnings
                    indexing_factor = 1.0
            
            # Cap at maximum taxable earnings for that year
            max_earnings = self.TAXABLE_MAXIMUM.get(record.year, indexed_amount)
            indexed_amount = min(indexed_amount, max_earnings)
            
            indexed_earnings.append({
                'year': record.year,
                'original_earnings': record.earnings,
                'indexed_earnings': round(indexed_amount, 2),
                'indexing_factor': round(indexing_factor, 3),
                'is_zero': record.is_zero,
                'is_capped': indexed_amount >= max_earnings
            })
        
        self.indexed_earnings = indexed_earnings
        return indexed_earnings
    
    def calculate_aime_and_pia(self) -> Dict:
        """
        Calculate AIME (Average Indexed Monthly Earnings) and PIA (Primary Insurance Amount)
        """
        if not self.indexed_earnings:
            self.calculate_indexed_earnings()
        
        # Get top 35 years of indexed earnings
        sorted_earnings = sorted(self.indexed_earnings, 
                               key=lambda x: x['indexed_earnings'], 
                               reverse=True)
        
        self.top_35_years = sorted_earnings[:35]
        
        # Calculate AIME
        total_indexed_earnings = sum(year['indexed_earnings'] for year in self.top_35_years)
        aime = total_indexed_earnings / (35 * 12)  # Divide by 35 years * 12 months
        self.current_aime = round(aime, 2)
        
        # Calculate PIA using bend point formula
        pia = 0
        remaining_aime = aime
        
        for i, (bend_point, factor) in enumerate(zip(self.PIA_BEND_POINTS + [float('inf')], self.PIA_FACTORS)):
            if i == 0:
                # First bracket: 0 to first bend point
                bracket_amount = min(remaining_aime, bend_point)
            elif i == len(self.PIA_BEND_POINTS):
                # Last bracket: above second bend point
                bracket_amount = remaining_aime
            else:
                # Middle bracket: between bend points
                prev_bend_point = self.PIA_BEND_POINTS[i-1]
                bracket_amount = min(remaining_aime, bend_point - prev_bend_point)
            
            pia += bracket_amount * factor
            remaining_aime -= bracket_amount
            
            if remaining_aime <= 0:
                break
        
        self.current_pia = round(pia, 2)
        
        return {
            'aime': self.current_aime,
            'pia': self.current_pia,
            'top_35_years': self.top_35_years,
            'years_of_zero_in_top_35': sum(1 for year in self.top_35_years if year['is_zero']),
            'lowest_year_in_top_35': min(year['indexed_earnings'] for year in self.top_35_years),
            'calculation_details': {
                'first_bracket': round(min(aime, self.PIA_BEND_POINTS[0]) * self.PIA_FACTORS[0], 2),
                'second_bracket': round(max(0, min(aime - self.PIA_BEND_POINTS[0], 
                                                 self.PIA_BEND_POINTS[1] - self.PIA_BEND_POINTS[0])) * self.PIA_FACTORS[1], 2),
                'third_bracket': round(max(0, aime - self.PIA_BEND_POINTS[1]) * self.PIA_FACTORS[2], 2)
            }
        }
    
    def create_editable_spreadsheet(self) -> List[Dict]:
        """
        Create user-friendly spreadsheet data for editing
        """
        if not self.earnings_history:
            raise ValueError("No earnings history to create spreadsheet")
        
        spreadsheet_data = []
        
        # Fill in all years from first earnings year to current
        if self.earnings_history:
            start_year = min(record.year for record in self.earnings_history)
            end_year = max(max(record.year for record in self.earnings_history), datetime.now().year)
            
            # Create lookup for existing earnings
            earnings_lookup = {record.year: record.earnings for record in self.earnings_history}
            
            for year in range(start_year, end_year + 5):  # Add 5 future years for planning
                earnings = earnings_lookup.get(year, 0)
                is_future = year > datetime.now().year
                
                spreadsheet_data.append({
                    'year': year,
                    'earnings': earnings,
                    'is_zero': earnings == 0,
                    'is_future_projection': is_future,
                    'is_editable': True,
                    'notes': 'Future projection' if is_future else ('Zero earnings year' if earnings == 0 else ''),
                    'max_taxable': self.TAXABLE_MAXIMUM.get(year, 200000)  # Use reasonable default for future years
                })
        
        return spreadsheet_data
    
    def calculate_what_if_scenario(self, modified_earnings: List[Dict]) -> Dict:
        """
        Calculate PIA impact from modified earnings
        """
        # Create temporary earnings history from modified data
        temp_earnings = []
        for entry in modified_earnings:
            record = EarningsRecord(
                year=entry['year'],
                earnings=entry['earnings'],
                is_zero=entry['earnings'] == 0,
                is_projected=entry.get('is_future_projection', False)
            )
            temp_earnings.append(record)
        
        # Store original data
        original_earnings = self.earnings_history
        original_indexed = self.indexed_earnings
        original_aime = self.current_aime
        original_pia = self.current_pia
        
        # Calculate with modified data
        self.earnings_history = temp_earnings
        self.indexed_earnings = []
        
        try:
            new_calculation = self.calculate_aime_and_pia()
            
            # Compare results
            comparison = {
                'original': {
                    'aime': original_aime,
                    'pia': original_pia
                },
                'modified': {
                    'aime': self.current_aime,
                    'pia': self.current_pia
                },
                'impact': {
                    'aime_change': round(self.current_aime - original_aime, 2),
                    'pia_change': round(self.current_pia - original_pia, 2),
                    'monthly_benefit_change': round(self.current_pia - original_pia, 2),
                    'annual_benefit_change': round((self.current_pia - original_pia) * 12, 2),
                    'lifetime_impact_25_years': round((self.current_pia - original_pia) * 12 * 25, 2)
                },
                'analysis': new_calculation
            }
            
        finally:
            # Restore original data
            self.earnings_history = original_earnings
            self.indexed_earnings = original_indexed
            self.current_aime = original_aime
            self.current_pia = original_pia
        
        return comparison


# Example usage and testing
if __name__ == "__main__":
    # Test with sample data
    processor = SSAXMLProcessor()
    
    # Create sample earnings history (like the SSA screenshot)
    sample_earnings = [
        EarningsRecord(1980, 86727, False),
        EarningsRecord(1981, 293632, False),
        EarningsRecord(1991, 41250, False),
        EarningsRecord(2001, 109214, False),
        EarningsRecord(2006, 15120, False),
        EarningsRecord(2007, 15234, False),
        EarningsRecord(2008, 0, True),
        EarningsRecord(2009, 0, True),
        EarningsRecord(2010, 0, True),
        EarningsRecord(2011, 0, True),
        EarningsRecord(2012, 0, True),
        EarningsRecord(2013, 37003, False),
        EarningsRecord(2014, 0, True),
        EarningsRecord(2015, 0, True),
        EarningsRecord(2016, 0, True),
        EarningsRecord(2017, 3902, False),
        EarningsRecord(2018, 0, True),
        EarningsRecord(2019, 0, True),
        EarningsRecord(2020, 0, True),
        EarningsRecord(2021, 0, True),
        EarningsRecord(2022, 0, True),
        EarningsRecord(2023, 0, True),
    ]
    
    processor.earnings_history = sample_earnings
    
    print("=== SSA XML Processor Test ===")
    calculation = processor.calculate_aime_and_pia()
    print(f"AIME: ${calculation['aime']:,.2f}")
    print(f"PIA: ${calculation['pia']:,.2f}")
    print(f"Zero years in top 35: {calculation['years_of_zero_in_top_35']}")
    
    # Test what-if scenario: replace some zero years with $50,000 earnings
    modified_data = []
    for record in sample_earnings:
        if record.year in [2020, 2021, 2022, 2023] and record.is_zero:
            # Replace zero years with $50K earnings
            modified_data.append({
                'year': record.year,
                'earnings': 50000,
                'is_future_projection': False
            })
        else:
            modified_data.append({
                'year': record.year,
                'earnings': record.earnings,
                'is_future_projection': False
            })
    
    print("\n=== What-If Scenario: Replace 4 Zero Years with $50K ===")
    comparison = processor.calculate_what_if_scenario(modified_data)
    print(f"Original PIA: ${comparison['original']['pia']:,.2f}")
    print(f"Modified PIA: ${comparison['modified']['pia']:,.2f}")
    print(f"Monthly increase: ${comparison['impact']['pia_change']:,.2f}")
    print(f"Annual increase: ${comparison['impact']['annual_benefit_change']:,.2f}")
    print(f"25-year lifetime impact: ${comparison['impact']['lifetime_impact_25_years']:,.2f}")
