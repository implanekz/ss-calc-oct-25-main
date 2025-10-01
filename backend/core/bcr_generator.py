
from datetime import date
from dateutil.relativedelta import relativedelta
import pandas as pd
from backend.core.ss_core_calculator import IndividualSSCalculator
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation, FFMpegWriter
import matplotlib.ticker as mtick

def generate_bcr_data(birth_date: date, pia: float, longevity_age: int = 95, inflation_rate: float = 0.025):
    calculator = IndividualSSCalculator(birth_date, pia)
    fra_years, fra_months = calculator.fra_years, calculator.fra_months

    scenarios = {
        'File at 62': {'age': 62, 'months': 0},
        f'File at FRA ({fra_years}y {fra_months}m)': {'age': fra_years, 'months': fra_months},
        'File at 70': {'age': 70, 'months': 0},
    }

    all_data = []

    for name, params in scenarios.items():
        filing_age_years = params['age']
        filing_age_months = params['months']
        
        lifetime_data = calculator.calculate_lifetime_benefits(
            filing_age_years, 
            longevity_age, 
            inflation_rate,
            filing_age_months
        )
        
        annual_breakdown = lifetime_data['annual_breakdown']
        
        benefits_by_age = {
            d['year'] - birth_date.year: d['annual_total'] 
            for d in annual_breakdown
        }
        
        cumulative_total = 0
        cumulative_from_70 = 0
        
        for age in range(62, longevity_age + 1):
            annual_benefit = benefits_by_age.get(age, 0)
            
            cumulative_total += annual_benefit
            if age >= 70:
                cumulative_from_70 += annual_benefit
                
            period_label = f"Age {age}"
            
            all_data.append({'period': period_label, 'name': name, 'value': round(cumulative_total)})
            
            from_70_name = f"{name} (from 70)"
            all_data.append({'period': period_label, 'name': from_70_name, 'value': round(cumulative_from_70)})

    df = pd.DataFrame(all_data)
    return df

def bar_chart_race(df, out_path="race.mp4", title="Racing Leaderboard",
                   n_bars=8, figsize=(10,6), fps=24, interval_ms=120,
                   value_prefix="$", value_decimals=0):
    periods = list(dict.fromkeys(df["period"].tolist()))
    def maybe_num(p):
        try: return int(str(p).split()[-1])
        except: return p
    try:
        periods.sort(key=lambda x: int(str(x).split()[-1]))
    except:
        try: periods.sort(key=lambda x: maybe_num(x))
        except: periods = sorted(periods)

    names = sorted(df["name"].unique())
    lookups = {
        p: df.loc[df["period"]==p, ["name","value"]].set_index("name")["value"].to_dict()
        for p in periods
    }
    vmax = max(max(lookups[p].values() or [0]) for p in periods) * 1.1

    fig, ax = plt.subplots(figsize=figsize)
    ax.xaxis.set_major_formatter(mtick.FuncFormatter(
        lambda x, pos: f"{value_prefix}{x:,.{value_decimals}f}"))

    def draw_period(p):
        ax.clear()
        
        # Filter out names with 0 value for the current period
        current_period_data = {name: lookups[p].get(name, 0.0) for name in names if lookups[p].get(name, 0.0) > 0}
        
        if not current_period_data:
            # If no data for this period, draw an empty chart
            ax.set_xlim(0, vmax)
            ax.set_title(title, pad=12)
            ax.text(0.98, 0.08, str(p), transform=ax.transAxes,
                ha="right", va="center", fontsize=22, alpha=0.7)
            return

        # Sort the data and get the top N bars
        sorted_data = sorted(current_period_data.items(), key=lambda item: item[1], reverse=True)
        top_names = [item[0] for item in sorted_data[:n_bars]]
        top_vals = [item[1] for item in sorted_data[:n_bars]]
        
        ax.barh(top_names, top_vals)
        ax.invert_yaxis()
        ax.set_xlim(0, vmax)
        ax.set_title(title, pad=12)
        for y, v in enumerate(top_vals):
            ax.text(v, y, f"  {value_prefix}{v:,.0f}", va="center", ha="left")
        ax.text(0.98, 0.08, str(p), transform=ax.transAxes,
                ha="right", va="center", fontsize=22, alpha=0.7)

    ani = FuncAnimation(fig, lambda i: draw_period(periods[i]),
                        frames=len(periods), interval=interval_ms, blit=False)
    writer = FFMpegWriter(fps=fps, bitrate=1800)
    ani.save(out_path, writer=writer)
    plt.close(fig)
    return out_path
