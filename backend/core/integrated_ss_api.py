
"""
Integrated Social Security API
Combines optimization calculator with XML processing for complete PIA analysis
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass
import json
import os

# Import our core classes
from .ss_core_calculator import (
    SocialSecurityConstants,
    IndividualSSCalculator,
    HouseholdSSCalculator
)
from .divorced_calculator import DivorcedSSCalculator
from .widow_calculator import WidowSSCalculator
from .ssa_xml_processor import SSAXMLProcessor, EarningsRecord
# from .bcr_generator import generate_bcr_data, bar_chart_race

# Enhanced API Models
class PersonInput(BaseModel):
    birth_date: date
    pia: Optional[float] = None
    name: Optional[str] = None
    
    @validator('birth_date')
    def validate_birth_date(cls, v):
        if v > date.today():
            raise ValueError("Birth date cannot be in the future")
        if v < date(1900, 1, 1):
            raise ValueError("Birth date too far in the past")
        return v

class XMLAnalysisRequest(BaseModel):
    birth_date: date
    modified_earnings: Optional[List[Dict]] = None
    
class XMLAnalysisResponse(BaseModel):
    success: bool
    person_info: Dict
    earnings_summary: Dict
    original_pia: float
    modified_pia: Optional[float] = None
    pia_impact: Optional[Dict] = None
    spreadsheet_data: List[Dict]
    optimization_recommendations: List[str]

class EnhancedCalculationRequest(BaseModel):
    spouse1: PersonInput
    spouse2: Optional[PersonInput] = None
    is_married: bool = False
    
    # Claiming strategy
    spouse1_claiming_age: int = Field(..., ge=62, le=70)
    spouse2_claiming_age: Optional[int] = Field(None, ge=62, le=70)
    
    # Longevity and economics
    spouse1_longevity: int = Field(90, ge=70, le=100)
    spouse2_longevity: Optional[int] = Field(90, ge=70, le=100)
    inflation_rate: float = Field(0.025, ge=0.0, le=0.10)
    
    # Life stages
    go_go_end_age: int = Field(75, ge=65, le=90)
    slow_go_end_age: int = Field(85, ge=70, le=95)
    
    # Death scenario analysis
    premature_death_year: Optional[int] = Field(None, ge=2025, le=2100)

class MonthlyOptimizationRequest(BaseModel):
    """Request for month-by-month optimization analysis"""
    person: PersonInput
    current_age_years: int = Field(..., ge=62, le=70)
    current_age_months: int = Field(0, ge=0, le=11)
    longevity_age: int = Field(90, ge=70, le=100)
    inflation_rate: float = Field(0.025, ge=0.0, le=0.10)

class MonthlyOptimizationResponse(BaseModel):
    """Response for month-by-month optimization"""
    current_monthly_benefit: float
    next_month_benefit: float
    monthly_increase: float
    annual_increase: float
    lifetime_value_of_waiting: float
    recommendation: str

class BenefitBreakdown(BaseModel):
    """Benefit calculation breakdown for one person"""
    pia: float
    claiming_age: int
    monthly_benefit: float
    annual_benefit: float
    lifetime_benefits: float
    reduction_or_credit_percent: float

class ScenarioComparison(BaseModel):
    """Comparison of different claiming scenarios"""
    scenario_name: str
    spouse1_claiming_age: int
    spouse2_claiming_age: Optional[int]
    total_household_benefits: float
    spouse1_breakdown: BenefitBreakdown
    spouse2_breakdown: Optional[BenefitBreakdown]

class CalculationResponse(BaseModel):
    """Response model for Social Security calculations"""
    household_summary: Dict[str, Any]
    spouse1_analysis: Dict[str, Any]
    spouse2_analysis: Optional[Dict[str, Any]]
    scenario_comparisons: List[ScenarioComparison]
    optimization_insights: Dict[str, Any]
    chart_data: Dict[str, Any]

class BCRRequest(BaseModel):
    birth_date: date
    pia: float
    longevity_age: int = 95
    inflation_rate: float = 0.025

class DivorcedCalculationRequest(BaseModel):
    """Request for divorced individual calculation"""
    birth_date: date
    own_pia: float = Field(..., gt=0, description="Person's own PIA")
    ex_spouse_pia: float = Field(..., gt=0, description="Ex-spouse's PIA")
    marriage_duration_years: int = Field(..., ge=0, le=100, description="Length of marriage in years")
    divorce_date: date
    is_remarried: bool = False
    has_child_under_16: bool = False
    child_birth_date: Optional[date] = None
    longevity_age: int = Field(95, ge=70, le=100)
    inflation_rate: float = Field(0.025, ge=0.0, le=0.10)

class DivorcedCalculationResponse(BaseModel):
    """Response for divorced individual calculation"""
    eligible_for_ex_spouse: bool
    eligibility_reason: str
    optimal_strategy: Optional[Dict[str, Any]]
    all_strategies: List[Dict[str, Any]]
    child_in_care_details: Optional[Dict[str, Any]]

class WidowCalculationRequest(BaseModel):
    """Request for widowed individual calculation"""
    birth_date: date
    own_pia: float = Field(..., gt=0, description="Person's own PIA")
    deceased_spouse_pia: float = Field(..., gt=0, description="Deceased spouse's PIA")
    deceased_spouse_death_date: date
    is_remarried: bool = False
    remarriage_date: Optional[date] = None
    longevity_age: int = Field(95, ge=70, le=100)
    inflation_rate: float = Field(0.025, ge=0.0, le=0.10)

class WidowCalculationResponse(BaseModel):
    """Response for widowed individual calculation"""
    eligible_for_survivor: bool
    eligibility_reason: str
    optimal_strategy: Optional[Dict[str, Any]]
    all_strategies: List[Dict[str, Any]]

# Initialize FastAPI app
app = FastAPI(
    title="Social Security K.I.N.D. Platform API",
    description="Complete Social Security optimization with XML earnings analysis",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global session storage (use proper session management in production)
user_sessions = {}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Social Security K.I.N.D. Platform API", "status": "healthy", "version": "2.0.0"}

@app.post("/generate-bcr")
async def generate_bcr_endpoint(request: BCRRequest):
    """
    Generate a bar chart race video from the provided data.
    """
    try:
        df = generate_bcr_data(
            birth_date=request.birth_date,
            pia=request.pia,
            longevity_age=request.longevity_age,
            inflation_rate=request.inflation_rate
        )
        
        output_path = f"/tmp/ss_leaderboard_{datetime.now().timestamp()}.mp4"
        
        bar_chart_race(
            df,
            out_path=output_path,
            title="Social Security: Cumulative Benefits by Filing Age",
            n_bars=6,
            fps=24,
            interval_ms=120,
            value_prefix="$"
        )
        
        return FileResponse(output_path, media_type="video/mp4", filename=os.path.basename(output_path))

    except Exception as e:
        logger.error(f"BCR generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"BCR generation failed: {str(e)}")


@app.post("/upload-ssa-xml", response_model=XMLAnalysisResponse)
async def upload_ssa_xml(
    file: UploadFile = File(...),
    birth_date: date = None
):
    """
    Upload SSA XML file and analyze earnings impact on PIA
    This is the core of the PIA Impact Analyzer
    """
    if not file.filename.endswith('.xml'):
        raise HTTPException(status_code=400, detail="File must be XML format")
    
    try:
        # Read and process XML
        content = await file.read()
        xml_content = content.decode('utf-8')
        
        processor = SSAXMLProcessor()
        parse_result = processor.parse_ssa_xml(xml_content)
        
        # Extract birth date from XML if not provided
        if not birth_date:
            birth_date_str = processor.person_info.get('birth_date', '1960-01-01')
            birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
        
        # Create calculator and calculate original PIA
        calculator = processor.create_calculator_from_earnings(birth_date)
        original_pia = calculator.pia
        
        # Create editable spreadsheet
        spreadsheet = processor.create_editable_spreadsheet()
        
        # Generate optimization recommendations
        recommendations = _generate_pia_recommendations(processor.earnings_history, calculator)
        
        # Store in session
        session_id = f"user_{datetime.now().timestamp()}"
        user_sessions[session_id] = {
            'processor': processor,
            'calculator': calculator,
            'birth_date': birth_date
        }
        
        return XMLAnalysisResponse(
            success=True,
            person_info=processor.person_info,
            earnings_summary=parse_result,
            original_pia=original_pia,
            spreadsheet_data=spreadsheet,
            optimization_recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"XML processing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing XML: {str(e)}")

@app.post("/analyze-earnings-changes")
async def analyze_earnings_changes(request: XMLAnalysisRequest):
    """
    Analyze impact of modified earnings on PIA
    Shows the power of replacing zero years or adding high-earning years
    """
    # In production, use proper session management
    if not user_sessions:
        raise HTTPException(status_code=400, detail="No XML file uploaded. Please upload SSA XML first.")
    
    # Get the most recent session (in production, use proper session ID)
    session = list(user_sessions.values())[-1]
    processor = session['processor']
    original_calculator = session['calculator']
    
    try:
        if request.modified_earnings:
            # Create new earnings history from modifications
            modified_earnings = []
            for entry in request.modified_earnings:
                record = EarningsRecord(
                    year=entry['year'],
                    earnings=entry['earnings'],
                    is_zero=entry['earnings'] == 0,
                    is_projected=entry.get('is_future_projection', False)
                )
                modified_earnings.append(record)
            
            # Create new calculator with modified earnings
            modified_calculator = IndividualSSCalculator(request.birth_date, earnings_history=modified_earnings)
            modified_pia = modified_calculator.calculate_pia_from_earnings()
            
            # Calculate impact
            pia_change = modified_pia - original_calculator.pia
            monthly_change = pia_change
            annual_change = pia_change * 12
            lifetime_25_year = annual_change * 25
            
            # Create impact analysis
            pia_impact = {
                'original_pia': original_calculator.pia,
                'modified_pia': modified_pia,
                'monthly_change': round(monthly_change, 2),
                'annual_change': round(annual_change, 2),
                'lifetime_impact_25_years': round(lifetime_25_year, 2),
                'percentage_change': round((pia_change / original_calculator.pia) * 100, 2),
                'equivalent_investment_4_percent': round(lifetime_25_year / 0.04, 2)
            }
            
            # Generate new recommendations
            recommendations = _generate_optimization_insights(pia_impact, request.modified_earnings)
            
        else:
            modified_pia = None
            pia_impact = None
            recommendations = []
        
        # Update spreadsheet with impact indicators
        spreadsheet = processor.create_editable_spreadsheet()
        
        return XMLAnalysisResponse(
            success=True,
            person_info=processor.person_info,
            earnings_summary={
                'total_years': len(processor.earnings_history),
                'zero_years': sum(1 for e in processor.earnings_history if e.is_zero)
            },
            original_pia=original_calculator.pia,
            modified_pia=modified_pia,
            pia_impact=pia_impact,
            spreadsheet_data=spreadsheet,
            optimization_recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Earnings analysis error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error analyzing changes: {str(e)}")

@app.post("/calculate", response_model=CalculationResponse)
async def calculate_benefits(request: EnhancedCalculationRequest):
    """
    Run full optimization analysis using provided or XML-derived PIA
    Integrates the XML-derived PIA with the main optimization engine
    """
    try:
        # Create calculators
        if request.spouse1.pia is None:
            # Must have uploaded XML first
            if not user_sessions:
                raise HTTPException(status_code=400, detail="No PIA available. Either provide PIA or upload XML file first.")
            
            # Use PIA from XML analysis
            session = list(user_sessions.values())[-1]
            spouse1_pia = session['calculator'].pia
        else:
            spouse1_pia = request.spouse1.pia
        
        spouse1_calc = IndividualSSCalculator(request.spouse1.birth_date, spouse1_pia)
        
        spouse2_calc = None
        if request.is_married and request.spouse2:
            spouse2_calc = IndividualSSCalculator(request.spouse2.birth_date, request.spouse2.pia)
        
        # Calculate scenarios
        scenarios = []
        
        # Current selection
        s1_benefits = spouse1_calc.calculate_lifetime_benefits(
            request.spouse1_claiming_age, request.spouse1_longevity, request.inflation_rate
        )
        
        s2_benefits = None
        if spouse2_calc:
            s2_benefits = spouse2_calc.calculate_lifetime_benefits(
                request.spouse2_claiming_age, request.spouse2_longevity, request.inflation_rate
            )
        
        total_benefits = s1_benefits['total_lifetime_benefits'] + \
                        (s2_benefits['total_lifetime_benefits'] if s2_benefits else 0)
        
        # Pass inflation to get correct adjustment percent
        current_scenario = ScenarioComparison(
            scenario_name='Current Selection',
            spouse1_claiming_age=request.spouse1_claiming_age,
            spouse2_claiming_age=request.spouse2_claiming_age,
            total_household_benefits=total_benefits,
            spouse1_breakdown=BenefitBreakdown(
                pia=spouse1_pia,
                claiming_age=request.spouse1_claiming_age,
                monthly_benefit=s1_benefits['initial_monthly_benefit'],
                annual_benefit=s1_benefits['initial_monthly_benefit'] * 12,
                lifetime_benefits=s1_benefits['total_lifetime_benefits'],
                reduction_or_credit_percent=_calculate_adjustment_percent(spouse1_calc, request.spouse1_claiming_age, request.inflation_rate)
            ),
            spouse2_breakdown=BenefitBreakdown(
                pia=request.spouse2.pia if request.spouse2 else 0,
                claiming_age=request.spouse2_claiming_age or 0,
                monthly_benefit=s2_benefits['initial_monthly_benefit'] if s2_benefits else 0,
                annual_benefit=(s2_benefits['initial_monthly_benefit'] * 12) if s2_benefits else 0,
                lifetime_benefits=s2_benefits['total_lifetime_benefits'] if s2_benefits else 0,
                reduction_or_credit_percent=_calculate_adjustment_percent(spouse2_calc, request.spouse2_claiming_age, request.inflation_rate) if spouse2_calc else 0
            ) if request.is_married else None
        )
        scenarios.append(current_scenario)
        
        # Generate chart data for visualizations
        chart_data = _generate_chart_data(scenarios, request)
        
        # Add premature death analysis if requested
        survivor_analysis = None
        if request.premature_death_year:
            survivor_analysis = _calculate_survivor_impact(
                spouse1_calc, spouse2_calc, request
            )
        
        # Generate optimization insights
        optimization_insights = {
            'best_strategy': current_scenario.scenario_name,
            'optimization_value': 0,  # Would calculate from multiple scenarios
            'key_insights': _generate_key_insights(scenarios, request.is_married),
            'survivor_analysis': survivor_analysis
        }
        
        return CalculationResponse(
            household_summary={
                'is_married': request.is_married,
                'total_scenarios_analyzed': len(scenarios),
                'xml_integration_used': request.spouse1.pia is None
            },
            spouse1_analysis=s1_benefits,
            spouse2_analysis=s2_benefits,
            scenario_comparisons=scenarios,
            optimization_insights=optimization_insights,
            chart_data=chart_data
        )
        
    except Exception as e:
        logger.error(f"Calculation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Calculation failed: {str(e)}")

@app.post("/monthly-optimization", response_model=MonthlyOptimizationResponse)
async def monthly_optimization(request: MonthlyOptimizationRequest):
    """
    Calculate the value of waiting one more month to claim
    Implements the "one day at a time" decision making
    """
    try:
        pia = request.person.pia
        if pia is None:
            if not user_sessions:
                raise HTTPException(status_code=400, detail="No PIA available")
            session = list(user_sessions.values())[-1]
            pia = session['calculator'].pia
        
        calc = IndividualSSCalculator(request.person.birth_date, pia)
        
        # Current benefit
        current_benefit = calc.calculate_monthly_benefit(request.current_age_years, request.current_age_months, request.inflation_rate)
        
        # Next month benefit
        next_month_years = request.current_age_years
        next_month_months = request.current_age_months + 1
        if next_month_months >= 12:
            next_month_years += 1
            next_month_months = 0
            
        next_month_benefit = calc.calculate_monthly_benefit(next_month_years, next_month_months, request.inflation_rate)
        
        # Calculate lifetime value of waiting
        current_lifetime = calc.calculate_lifetime_benefits(
            request.current_age_years, request.longevity_age, request.inflation_rate, request.current_age_months
        )
        
        next_month_lifetime = calc.calculate_lifetime_benefits(
            next_month_years, request.longevity_age, request.inflation_rate, next_month_months
        )
        
        monthly_increase = next_month_benefit - current_benefit
        annual_increase = monthly_increase * 12
        lifetime_value = next_month_lifetime['total_lifetime_benefits'] - current_lifetime['total_lifetime_benefits']
        
        # Generate recommendation
        if lifetime_value > 5000:
            recommendation = f"Consider waiting - one month delay adds ${lifetime_value:,.0f} lifetime value"
        elif lifetime_value > 1000:
            recommendation = f"Moderate benefit to waiting - adds ${lifetime_value:,.0f} over lifetime"
        else:
            recommendation = f"Minimal benefit to waiting - only ${lifetime_value:,.0f} additional lifetime value"
        
        return MonthlyOptimizationResponse(
            current_monthly_benefit=round(current_benefit, 2),
            next_month_benefit=round(next_month_benefit, 2),
            monthly_increase=round(monthly_increase, 2),
            annual_increase=round(annual_increase, 2),
            lifetime_value_of_waiting=round(lifetime_value, 2),
            recommendation=recommendation
        )
        
    except Exception as e:
        logger.error(f"Monthly optimization error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Monthly optimization failed: {str(e)}")

# Helper functions
def _generate_pia_recommendations(earnings_history: List[EarningsRecord], calculator: IndividualSSCalculator) -> List[str]:
    """Generate recommendations for PIA optimization"""
    recommendations = []
    
    zero_years = [e for e in earnings_history if e.is_zero]
    low_years = [e for e in earnings_history if 0 < e.earnings < 20000]
    
    if zero_years:
        recommendations.append(f"You have {len(zero_years)} zero-earning years. Each year you can replace with earnings will increase your PIA.")
    
    if low_years:
        recommendations.append(f"You have {len(low_years)} low-earning years under $20K. Higher earning years will push these out of your top 35.")
    
    current_year = datetime.now().year
    age_62_year = calculator.birth_year + 62
    
    if age_62_year > current_year:
        years_until_62 = age_62_year - current_year
        recommendations.append(f"If you stop working at 62, you\'ll add {years_until_62} zero-earning years to your record.")
    
    recommendations.append("Use the spreadsheet to test different scenarios and see the impact on your PIA.")
    
    return recommendations

def _generate_optimization_insights(pia_impact: Dict, modified_earnings: List[Dict]) -> List[str]:
    """Generate insights from PIA impact analysis"""
    insights = []
    
    monthly_change = pia_impact['monthly_change']
    lifetime_impact = pia_impact['lifetime_impact_25_years']
    
    if monthly_change > 100:
        insights.append(f"Significant improvement: ${monthly_change:.0f} higher monthly benefit for life")
    elif monthly_change > 25:
        insights.append(f"Moderate improvement: ${monthly_change:.0f} higher monthly benefit")
    
    if abs(lifetime_impact) > 50000:
        insights.append(f"25-year lifetime impact: ${lifetime_impact:,.0f}")
    
    return insights

def _calculate_adjustment_percent(calc: IndividualSSCalculator, claiming_age: int, inflation_rate: float) -> float:
    """Calculate the reduction or credit percentage for claiming age, including pre-claiming inflation."""
    # First, get the final monthly benefit, which includes all adjustments (inflation, reduction/credit)
    final_benefit = calc.calculate_monthly_benefit(claiming_age, inflation_rate=inflation_rate)
    
    # The baseline for comparison should be the original, un-inflated PIA
    # This shows the combined effect of both inflation and claiming decision
    adjustment = (final_benefit / calc.pia - 1.0) * 100
    return round(adjustment, 2)

def _generate_key_insights(scenarios: List[ScenarioComparison], is_married: bool) -> List[str]:
    """Generate key insights from scenario comparison"""
    insights = []
    
    insights.append("Social Security optimization can provide equivalent value to hundreds of thousands in investment assets")
    
    if is_married:
        insights.append("Consider survivor benefits when optimizing - the higher earner\'s delay benefits the surviving spouse")
    
    return insights

def _generate_chart_data(scenarios: List[ScenarioComparison], request: EnhancedCalculationRequest) -> Dict[str, Any]:
    """Generate visualization-ready data"""
    return {
        "scenarios": [s.dict() for s in scenarios],
        "life_stage_boundaries": {
            "go_go_end": request.go_go_end_age,
            "slow_go_end": request.slow_go_end_age
        },
        "inflation_rate": request.inflation_rate
    }

def _calculate_survivor_impact(spouse1_calc: IndividualSSCalculator, spouse2_calc: IndividualSSCalculator, request: EnhancedCalculationRequest) -> Dict:
    """Calculate impact of premature death on surviving spouse"""
    if not request.is_married or not spouse2_calc:
        return None

    # Pass inflation to get correct benefit amounts
    spouse1_benefit = spouse1_calc.calculate_monthly_benefit(request.spouse1_claiming_age, inflation_rate=request.inflation_rate)
    spouse2_benefit = spouse2_calc.calculate_monthly_benefit(request.spouse2_claiming_age, inflation_rate=request.inflation_rate)

    survivor_benefit = max(spouse1_benefit, spouse2_benefit)
    lost_benefit = min(spouse1_benefit, spouse2_benefit)

    return {
        'income_before_death': spouse1_benefit + spouse2_benefit,
        'income_after_death': survivor_benefit,
        'monthly_income_loss': lost_benefit,
        'annual_income_loss': lost_benefit * 12,
        'analysis': f"Income drops from ${(spouse1_benefit + spouse2_benefit):,.0f} to ${survivor_benefit:,.0f} per month"
    }

@app.post("/calculate-divorced", response_model=DivorcedCalculationResponse)
async def calculate_divorced(request: DivorcedCalculationRequest):
    """
    Calculate optimal strategy for divorced individual
    Compares own benefits, ex-spouse benefits, and switching strategies
    """
    try:
        # Create divorced calculator
        calc = DivorcedSSCalculator(
            birth_date=request.birth_date,
            own_pia=request.own_pia,
            ex_spouse_pia=request.ex_spouse_pia,
            marriage_duration_years=request.marriage_duration_years,
            divorce_date=request.divorce_date,
            is_remarried=request.is_remarried,
            has_child_under_16=request.has_child_under_16,
            child_birth_date=request.child_birth_date
        )

        # Calculate optimal strategy
        result = calc.calculate_optimal_strategy(
            longevity_age=request.longevity_age,
            inflation_rate=request.inflation_rate
        )

        return DivorcedCalculationResponse(
            eligible_for_ex_spouse=result['eligible_for_ex_spouse'],
            eligibility_reason=result['eligibility_reason'],
            optimal_strategy=result.get('optimal_strategy'),
            all_strategies=result.get('all_strategies', []),
            child_in_care_details=result.get('child_in_care_details')
        )

    except Exception as e:
        logger.error(f"Divorced calculation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Divorced calculation failed: {str(e)}")

@app.post("/calculate-widow", response_model=WidowCalculationResponse)
async def calculate_widow(request: WidowCalculationRequest):
    """
    Calculate optimal strategy for widowed individual
    Compares own benefits, survivor benefits, and crossover strategies
    """
    try:
        # Create widow calculator
        calc = WidowSSCalculator(
            birth_date=request.birth_date,
            own_pia=request.own_pia,
            deceased_spouse_pia=request.deceased_spouse_pia,
            deceased_spouse_death_date=request.deceased_spouse_death_date,
            is_remarried=request.is_remarried,
            remarriage_date=request.remarriage_date
        )

        # Calculate optimal strategy
        result = calc.calculate_optimal_strategy(
            longevity_age=request.longevity_age,
            inflation_rate=request.inflation_rate
        )

        return WidowCalculationResponse(
            eligible_for_survivor=result['eligible_for_survivor'],
            eligibility_reason=result['eligibility_reason'],
            optimal_strategy=result.get('optimal_strategy'),
            all_strategies=result.get('all_strategies', [])
        )

    except Exception as e:
        logger.error(f"Widow calculation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Widow calculation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
