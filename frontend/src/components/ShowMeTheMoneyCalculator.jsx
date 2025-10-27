import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bar, Line, Bubble } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, BubbleController } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { Checkbox, Button } from './ui';
import { PillTabs, PillTab } from './ui';
import { useUser } from '../contexts/UserContext.jsx';
import { useDevMode } from '../contexts/DevModeContext.jsx';
import { useCalculatorPersistence } from '../hooks/useCalculatorPersistence';
import { useNavigate } from 'react-router-dom';
import { OneMonthAtATimeModal } from './OneMonthAtATime';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin, SankeyController, Flow, BubbleController);

const FRA_LOOKUP = {
    1937: { years: 65, months: 0 },
    1938: { years: 65, months: 2 },
    1939: { years: 65, months: 4 },
    1940: { years: 65, months: 6 },
    1941: { years: 65, months: 8 },
    1942: { years: 65, months: 10 },
    1943: { years: 66, months: 0 },
    1944: { years: 66, months: 0 },
    1945: { years: 66, months: 0 },
    1946: { years: 66, months: 0 },
    1947: { years: 66, months: 0 },
    1948: { years: 66, months: 0 },
    1949: { years: 66, months: 0 },
    1950: { years: 66, months: 0 },
    1951: { years: 66, months: 0 },
    1952: { years: 66, months: 0 },
    1953: { years: 66, months: 0 },
    1954: { years: 66, months: 0 },
    1955: { years: 66, months: 2 },
    1956: { years: 66, months: 4 },
    1957: { years: 66, months: 6 },
    1958: { years: 66, months: 8 },
    1959: { years: 66, months: 10 },
    1960: { years: 67, months: 0 }
};

const getFra = (birthYear) => {
    if (birthYear <= 1937) {
        return { years: 65, months: 0 };
    }
    if (birthYear >= 1960) {
        return { years: 67, months: 0 };
    }
    return FRA_LOOKUP[birthYear] || { years: 67, months: 0 };
};

const ageInMonths = (birthDate, targetDate) => {
    let years = targetDate.getFullYear() - birthDate.getFullYear();
    let months = targetDate.getMonth() - birthDate.getMonth();
    let totalMonths = years * 12 + months;

    if (targetDate.getDate() < birthDate.getDate()) {
        totalMonths -= 1;
    }

    return totalMonths;
};

const preclaimColaFactor = (claimAgeYears, currentAgeYears, rate) => {
    if (claimAgeYears <= currentAgeYears) {
        return 1;
    }

    const pre60Years = Math.max(0, Math.min(60, claimAgeYears) - currentAgeYears);
    const colaYearsFrom62 = Math.max(0, Math.floor(claimAgeYears) - 62);

    return Math.pow(1 + rate, pre60Years + colaYearsFrom62);
};

const monthsFromFra = (claimAgeYears, fraYears) => Math.round((claimAgeYears - fraYears) * 12);

const delayedRetirementCreditFactor = (monthsAfterFra) => {
    const months = Math.max(0, monthsAfterFra);
    return 1 + ((2 / 3) / 100) * months;
};

const earlyReductionFactor = (monthsBeforeFra) => {
    const months = Math.abs(Math.min(0, monthsBeforeFra));
    const first36 = Math.min(36, months);
    const extra = Math.max(0, months - 36);
    const reduction = first36 * (5 / 9) / 100 + extra * (5 / 12) / 100;
    return Math.max(0, 1 - reduction);
};

const monthlyBenefitAtClaim = ({ piaFRA, claimAgeYears, currentAgeYears, rate, fraYears }) => {
    const base = piaFRA * preclaimColaFactor(claimAgeYears, currentAgeYears, rate);
    const monthsOffset = monthsFromFra(claimAgeYears, fraYears);
    if (monthsOffset >= 0) {
        return base * delayedRetirementCreditFactor(monthsOffset);
    }
    return base * earlyReductionFactor(monthsOffset);
};

const benefitAfterClaim = (baseMonthlyAtClaim, yearsAfterClaim, rate) => {
    const years = Math.max(0, yearsAfterClaim);
    return baseMonthlyAtClaim * Math.pow(1 + rate, years);
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

// Retirement Stages Slider Component
const RetirementStagesSlider = ({
    goGoEndAge,
    setGoGoEndAge,
    slowGoEndAge,
    setSlowGoEndAge,
    isDraggingGoGo,
    setIsDraggingGoGo,
    isDraggingSlowGo,
    setIsDraggingSlowGo
}) => {
    const sliderRef = useRef(null);
    const MIN_AGE = 62;
    const MAX_AGE = 95;

    // Convert age to percentage position (0-100%)
    const ageToPercent = (age) => {
        return ((age - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
    };

    // Convert mouse X position to age
    const xToAge = (clientX) => {
        if (!sliderRef.current) return MIN_AGE;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        return Math.round(MIN_AGE + (percent / 100) * (MAX_AGE - MIN_AGE));
    };

    // Handle mouse/touch events for Go-Go handle
    const handleGoGoMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingGoGo(true);
    };

    const handleSlowGoMouseDown = (e) => {
        e.preventDefault();
        setIsDraggingSlowGo(true);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingGoGo) {
                const newAge = xToAge(e.clientX);
                // Ensure Go-Go ends before Slow-Go
                if (newAge < slowGoEndAge) {
                    setGoGoEndAge(newAge);
                }
            } else if (isDraggingSlowGo) {
                const newAge = xToAge(e.clientX);
                // Ensure Slow-Go ends after Go-Go and before max
                if (newAge > goGoEndAge && newAge <= MAX_AGE) {
                    setSlowGoEndAge(newAge);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDraggingGoGo(false);
            setIsDraggingSlowGo(false);
        };

        if (isDraggingGoGo || isDraggingSlowGo) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingGoGo, isDraggingSlowGo, goGoEndAge, slowGoEndAge, setGoGoEndAge, setSlowGoEndAge, setIsDraggingGoGo, setIsDraggingSlowGo]);

    const goGoWidth = ageToPercent(goGoEndAge);
    const slowGoWidth = ageToPercent(slowGoEndAge) - ageToPercent(goGoEndAge);
    const noGoWidth = 100 - ageToPercent(slowGoEndAge);

    return (
        <div className="w-full opacity-80" style={{ paddingLeft: '60px', paddingRight: '30px' }}>
            <div ref={sliderRef} className="relative h-9 flex rounded-lg overflow-hidden shadow-md border-2 border-gray-300">
                {/* Go-Go Years Section */}
                <div
                    className="relative flex items-center justify-center text-white font-bold text-sm transition-all duration-200"
                    style={{
                        width: `${goGoWidth}%`,
                        background: 'linear-gradient(135deg, #6E5468 0%, #5A4356 100%)',
                    }}
                >
                    <span className="drop-shadow-sm">Go-Go Years</span>
                </div>

                {/* Handle 1: Between Go-Go and Slow-Go */}
                <div
                    className="absolute top-0 bottom-0 w-8 flex items-center justify-center cursor-ew-resize z-10 group"
                    style={{ left: `calc(${goGoWidth}% - 16px)` }}
                    onMouseDown={handleGoGoMouseDown}
                >
                    <div className={`w-1 h-full transition-all ${isDraggingGoGo ? 'bg-gray-800 w-2' : 'bg-gray-600 group-hover:bg-gray-700 group-hover:w-1.5'}`} />
                    {/* Draggable handle indicator */}
                    <div className={`absolute top-1/2 -translate-y-1/2 bg-gray-800 rounded transition-all ${isDraggingGoGo ? 'w-4 h-8 shadow-lg' : 'w-3 h-6 group-hover:w-4 group-hover:h-8 group-hover:shadow-md'}`}>
                        {/* Grip dots */}
                        <div className="flex flex-col items-center justify-center h-full gap-0.5">
                            <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70"></div>
                            <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70"></div>
                            <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70"></div>
                        </div>
                    </div>
                </div>

                {/* Slow-Go Years Section */}
                <div
                    className="relative flex items-center justify-center text-white font-bold text-sm transition-all duration-200"
                    style={{
                        width: `${slowGoWidth}%`,
                        background: 'linear-gradient(135deg, #D4A024 0%, #B8891F 100%)',
                    }}
                >
                    <span className="drop-shadow-sm">Slow-Go Years</span>
                </div>

                {/* Handle 2: Between Slow-Go and No-Go */}
                <div
                    className="absolute top-0 bottom-0 w-8 flex items-center justify-center cursor-ew-resize z-10 group"
                    style={{ left: `calc(${goGoWidth + slowGoWidth}% - 16px)` }}
                    onMouseDown={handleSlowGoMouseDown}
                >
                    <div className={`w-1 h-full transition-all ${isDraggingSlowGo ? 'bg-gray-800 w-2' : 'bg-gray-600 group-hover:bg-gray-700 group-hover:w-1.5'}`} />
                    {/* Draggable handle indicator */}
                    <div className={`absolute top-1/2 -translate-y-1/2 bg-gray-800 rounded transition-all ${isDraggingSlowGo ? 'w-4 h-8 shadow-lg' : 'w-3 h-6 group-hover:w-4 group-hover:h-8 group-hover:shadow-md'}`}>
                        {/* Grip dots */}
                        <div className="flex flex-col items-center justify-center h-full gap-0.5">
                            <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70"></div>
                            <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70"></div>
                            <div className="w-0.5 h-0.5 bg-white rounded-full opacity-70"></div>
                        </div>
                    </div>
                </div>

                {/* No-Go Years Section */}
                <div
                    className="relative flex items-center justify-center text-white font-bold text-sm transition-all duration-200"
                    style={{
                        width: `${noGoWidth}%`,
                        background: 'linear-gradient(135deg, #5a5a5a 0%, #3D3D3D 100%)',
                    }}
                >
                    <span className="drop-shadow-sm">No-Go Years</span>
                </div>
            </div>
        </div>
    );
};

// Flow Visualization Component - Three Scenarios Side-by-Side
const FlowVisualization = ({ scenarioData, age, monthlyNeeds, activeRecordView, isMarried, inflationRate, currentAge, selectedStrategy, setSelectedStrategy, piaStrategy, setPiaStrategy, preferredFilingYear, preferredFilingMonth }) => {
    // Responsive container refs/state must be declared before any early returns (React hooks rule)
    const containerRef = useRef(null);
    const [svgHeight, setSvgHeight] = useState(700);
    const [svgWidth, setSvgWidth] = useState(1200);
    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const update = () => {
            const h = el.clientHeight || 700;
            const computed = Math.max(500, Math.min(800, h - 140));
            setSvgHeight(computed);
            const w = el.clientWidth || 1200;
            const computedW = Math.max(1000, Math.min(1400, w - 48));
            setSvgWidth(computedW);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    if (!scenarioData) {
        return <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>;
    }

    const { primaryProjections, spouseProjections, combinedProjections, birthYearPrimary, earlyLateProjection, preferredLateProjection, bothLateProjection } = scenarioData;

    const projections = activeRecordView === 'primary'
        ? primaryProjections
        : activeRecordView === 'spouse' && spouseProjections
            ? spouseProjections
            : combinedProjections;

    // Calculate the calendar year for the selected age
    const calendarYear = birthYearPrimary + age;

    // Get monthly values for each filing scenario
    // Always use the pure filing age projections (same as Monthly tab)
    const age62Monthly = projections.age62.monthly[calendarYear] || 0;
    const age67Monthly = projections.preferred.monthly[calendarYear] || 0;
    const age70Monthly = projections.age70.monthly[calendarYear] || 0;

    // Apply inflation to monthly needs from current age to selected age
    const yearsFromNow = age - currentAge;
    const inflatedMonthlyNeeds = monthlyNeeds * Math.pow(1 + inflationRate, yearsFromNow);

    // For the hybrid column, we need to show the two individual spouse benefits when married
    const showHybridColumn = isMarried && activeRecordView === 'combined';

    // Get individual spouse values for the hybrid (62/70) column
    let bottomSegmentAmount = 0;  // Person who files at 62 - shown as bottom/first segment
    let topSegmentAmount = 0; // Person who files at 70 - shown as top/second segment (only when age >= 70)

    if (showHybridColumn && primaryProjections && spouseProjections) {
        // Get the benefit amounts for each spouse at the current calendar year
        // These already include proper reduction factors and inflation adjustments
        const primary62AtCurrentAge = primaryProjections.age62.monthly[calendarYear] || 0;
        const spouse62AtCurrentAge = spouseProjections.age62.monthly[calendarYear] || 0;
        const primary70AtCurrentAge = primaryProjections.age70.monthly[calendarYear] || 0;
        const spouse70AtCurrentAge = spouseProjections.age70.monthly[calendarYear] || 0;

        // Determine which spouse has lower PIA based on their age 62 benefits (proxy for PIA)
        const primaryIsLowerPia = primary62AtCurrentAge <= spouse62AtCurrentAge;

        // Hybrid strategy logic: ALWAYS use the optimal strategy
        // - Lower PIA spouse files at 62 and gets reduced benefits ongoing
        // - Higher PIA spouse waits until 70 to file for maximum benefits
        // - At ages before 70, we only show the lower PIA's benefit
        // - At age 70+, we show both: lower PIA (who filed at 62) + higher PIA (filing at 70)

        if (primaryIsLowerPia) {
            // Primary (lower PIA) files at 62
            bottomSegmentAmount = primary62AtCurrentAge;
            // Spouse (higher PIA) files at 70
            topSegmentAmount = age >= 70 ? spouse70AtCurrentAge : 0;
        } else {
            // Spouse (lower PIA) files at 62
            bottomSegmentAmount = spouse62AtCurrentAge;
            // Primary (higher PIA) files at 70
            topSegmentAmount = age >= 70 ? primary70AtCurrentAge : 0;
        }
    }

    const hybridTotalIncome = bottomSegmentAmount + topSegmentAmount;

    // Calculate coverage for each scenario
    const scenarios = [
        {
            label: 'File at 62',
            age: 62,
            income: age62Monthly,
            covered: Math.min(age62Monthly, inflatedMonthlyNeeds),
            gap: Math.max(0, inflatedMonthlyNeeds - age62Monthly),
            color: '#EF4444'
        },
                    {
                        label: `File at ${preferredFilingYear}${preferredFilingMonth > 0 ? `y ${preferredFilingMonth}m` : ''}`,
                        age: preferredFilingYear,
                        income: age67Monthly,
            covered: Math.min(age67Monthly, inflatedMonthlyNeeds),
            gap: Math.max(0, inflatedMonthlyNeeds - age67Monthly),
            color: '#3B82F6'
        },
        {
            label: 'File at 70',
            age: 70,
            income: age70Monthly,
            covered: Math.min(age70Monthly, inflatedMonthlyNeeds),
            gap: Math.max(0, inflatedMonthlyNeeds - age70Monthly),
            color: '#14B8A6'
        }
    ];

    const gapColor = '#9CA3AF'; // Gray for gaps

    const width = svgWidth;
    const height = svgHeight; // was 700 fixed
    const barWidth = 100;
    const barSpacing = 80;
    const startX = 100;
    const rightMargin = Math.max(220, Math.round(width * 0.18));
    const rightX = width - rightMargin;
    const maxValue = Math.max(inflatedMonthlyNeeds, age70Monthly) * 1.1; // Add 10% padding

    // Calculate heights proportional to values - scale with container height
    const availableHeight = Math.max(260, height - 280);
    const getHeight = (value) => Math.max(30, (value / maxValue) * availableHeight);

    // Target bar is 50% taller to give room for swoopy curves
    const getTargetHeight = (value) => getHeight(value) * 1.5;

    // Generate dramatic curved flow path - only for selected strategy
    // Handle hybrid column (index 3) differently
    const selectedScenario = selectedStrategy === 3
        ? {
            label: 'File at 62/70',
            age: age >= 70 ? '62/70' : age >= 67 ? 67 : 62,
            income: hybridTotalIncome,
            covered: Math.min(hybridTotalIncome, inflatedMonthlyNeeds),
            gap: Math.max(0, inflatedMonthlyNeeds - hybridTotalIncome),
            color: '#9333EA'
          }
        : scenarios[selectedStrategy];

    const selectedBarX = selectedStrategy === 3
        ? startX  // Hybrid column is at far left
        : showHybridColumn
            ? startX + (barWidth + barSpacing) + selectedStrategy * (barWidth + barSpacing)  // Shift right when hybrid shown
            : startX + selectedStrategy * (barWidth + barSpacing);  // No shift when hybrid not shown
    const baseY = height - 100; // Increased from 80 to give more space for labels above target bar

    // Calculate control points for swoopy Sankey flow
    // Flow from bottom of strategy bar to bottom of target bar,
    // and from top of strategy bar to the coverage point on target bar
    // Compute target column height, but clamp so it never extends past the SVG top
    // This avoids the right-hand target bar being cut off at the top on some screens
    let targetHeight = getTargetHeight(inflatedMonthlyNeeds);
    const maxTargetHeight = Math.max(120, baseY - 80); // keep ~80px for labels/title
    if (targetHeight > maxTargetHeight) {
        targetHeight = maxTargetHeight;
    }
    // Scale label offsets and sizes based on available headroom
    const headroom = Math.max(60, baseY - targetHeight);
    const labelScale = Math.max(0.75, Math.min(1, headroom / 120));
    const labelY1 = baseY - targetHeight - Math.round(60 * labelScale);
    const labelY2 = baseY - targetHeight - Math.round(42 * labelScale);
    const labelY3 = baseY - targetHeight - Math.round(20 * labelScale);
    const targetBottom = baseY;
    const targetCoveragePoint = selectedScenario ? baseY - (selectedScenario.covered / inflatedMonthlyNeeds) * targetHeight : baseY;

    const strategyBottom = baseY;
    const strategyTop = selectedScenario ? baseY - getHeight(selectedScenario.covered) : baseY;

    const midX = (selectedBarX + barWidth + rightX) / 2;

    // Create swoopy flow path - different logic for hybrid column
    let flowPath = null;
    let flowPathLower = null;
    let flowPathHigher = null;

    if (selectedStrategy === 3 && showHybridColumn) {
        // Two separate flows for the hybrid column (only when age >= 70)
        const lowerHeight = getHeight(bottomSegmentAmount);
        const higherHeight = getHeight(topSegmentAmount);
        const totalCombined = hybridTotalIncome;

        if (totalCombined > 0 && age >= 70 && topSegmentAmount > 0) {
            // Two-segment flow when both spouses have filed
            const lowerTop = baseY - lowerHeight;
            const lowerCoveragePoint = baseY - (bottomSegmentAmount / inflatedMonthlyNeeds) * targetHeight;

            flowPathLower = `
                M ${selectedBarX + barWidth} ${baseY}
                C ${midX} ${baseY},
                  ${midX} ${baseY},
                  ${rightX} ${baseY}
                L ${rightX} ${lowerCoveragePoint}
                C ${midX} ${lowerCoveragePoint},
                  ${midX} ${lowerTop},
                  ${selectedBarX + barWidth} ${lowerTop}
                Z
            `;

            // Higher segment flow (from 70 benefit stacked on top to target)
            const higherBottom = baseY - lowerHeight;
            const higherTop = baseY - lowerHeight - higherHeight;
            const higherCoverageStart = lowerCoveragePoint;
            const higherCoverageEnd = baseY - ((bottomSegmentAmount + topSegmentAmount) / inflatedMonthlyNeeds) * targetHeight;

            flowPathHigher = `
                M ${selectedBarX + barWidth} ${higherBottom}
                C ${midX} ${higherBottom},
                  ${midX} ${higherCoverageStart},
                  ${rightX} ${higherCoverageStart}
                L ${rightX} ${higherCoverageEnd}
                C ${midX} ${higherCoverageEnd},
                  ${midX} ${higherTop},
                  ${selectedBarX + barWidth} ${higherTop}
                Z
            `;
        } else if (totalCombined > 0) {
            // Single flow when only lower PIA has filed (age < 70)
            flowPath = `
                M ${selectedBarX + barWidth} ${strategyBottom}
                C ${midX} ${strategyBottom},
                  ${midX} ${targetBottom},
                  ${rightX} ${targetBottom}
                L ${rightX} ${targetCoveragePoint}
                C ${midX} ${targetCoveragePoint},
                  ${midX} ${strategyTop},
                  ${selectedBarX + barWidth} ${strategyTop}
                Z
            `;
        }
    } else if (selectedScenario && selectedScenario.income > 0) {
        // Standard flow for single-column scenarios
        flowPath = `
            M ${selectedBarX + barWidth} ${strategyBottom}
            C ${midX} ${strategyBottom},
              ${midX} ${targetBottom},
              ${rightX} ${targetBottom}
            L ${rightX} ${targetCoveragePoint}
            C ${midX} ${targetCoveragePoint},
              ${midX} ${strategyTop},
              ${selectedBarX + barWidth} ${strategyTop}
            Z
        `;
    }

    // Calculate coverage percentage for tooltips
    const coveragePercent = inflatedMonthlyNeeds > 0
        ? (selectedScenario.covered / inflatedMonthlyNeeds * 100).toFixed(0)
        : 0;
    const gapPercent = inflatedMonthlyNeeds > 0
        ? (selectedScenario.gap / inflatedMonthlyNeeds * 100).toFixed(0)
        : 0;

    return (
        <div className="h-full flex flex-col p-6">
            <div className="mb-4 ml-8">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                    Impact of Filing Strategy at Age {age}
                </div>
                <div className="text-lg text-gray-600">
                    Monthly Expense Needs: {currencyFormatter.format(Math.round(inflatedMonthlyNeeds))}
                    {yearsFromNow > 0 && (
                        <span className="text-sm text-gray-500 ml-2">
                            ({currencyFormatter.format(Math.round(monthlyNeeds))} today + {(inflationRate * 100).toFixed(1)}% inflation)
                        </span>
                    )}
                </div>
            </div>

            <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto">
                <svg width={width} height={height} className="mx-auto" viewBox={`0 0 ${width} ${height}`}>
                    <style>
                        {`
                            .flow-bar {
                                transition: all 0.7s cubic-bezier(0.4, 0.0, 0.2, 1);
                            }
                            .flow-bar:hover {
                                opacity: 1 !important;
                                filter: brightness(1.1);
                            }
                            .flow-path {
                                transition: all 0.7s cubic-bezier(0.4, 0.0, 0.2, 1);
                            }
                            .flow-path:hover {
                                opacity: 0.7 !important;
                            }
                            .flow-text {
                                transition: all 0.5s ease-in-out;
                            }
                            .tooltip-group {
                                pointer-events: none;
                                opacity: 0;
                                transition: opacity 0.2s ease-in-out;
                            }
                            .flow-bar-group:hover .tooltip-group {
                                opacity: 1;
                            }
                        `}
                    </style>

                    {/* Flow path - only for selected strategy */}
                    {flowPath && (
                        <g>
                            <path
                                d={flowPath}
                                fill={selectedScenario.color}
                                opacity="0.5"
                                className="flow-path"
                            />
                            <title>
                                {`SS Income covers ${coveragePercent}% of monthly needs\n`}
                                {`${currencyFormatter.format(Math.round(selectedScenario.covered))} out of ${currencyFormatter.format(Math.round(inflatedMonthlyNeeds))}\n`}
                                {selectedScenario.gap > 0 && `Remaining ${gapPercent}% must come from savings`}
                            </title>
                        </g>
                    )}

                    {/* Flow paths for hybrid column - two separate flows */}
                    {flowPathLower && (
                        <g>
                            <path
                                d={flowPathLower}
                                fill="#EF4444"
                                opacity="0.5"
                                className="flow-path"
                            />
                            <title>
                                {`Lower PIA files at ${age >= 70 ? 62 : age >= 67 ? 67 : 62}\n`}
                                {`${currencyFormatter.format(Math.round(bottomSegmentAmount))} per month\n`}
                                {`Early filing provides immediate income`}
                            </title>
                        </g>
                    )}
                    {flowPathHigher && (
                        <g>
                            <path
                                d={flowPathHigher}
                                fill="#14B8A6"
                                opacity="0.5"
                                className="flow-path"
                            />
                            <title>
                                {`Higher PIA files at 70\n`}
                                {`${currencyFormatter.format(Math.round(topSegmentAmount))} per month\n`}
                                {`Late filing maximizes lifetime benefits`}
                            </title>
                        </g>
                    )}

                    {/* Hybrid (62/70) Column - only shown when married and viewing combined - positioned at far left */}
                    {showHybridColumn && (
                        <g>
                            {(() => {
                                const hybridX = startX;  // Far left position
                                const lowerHeight = getHeight(bottomSegmentAmount);
                                const higherHeight = getHeight(topSegmentAmount);
                                const isHybridSelected = selectedStrategy === 3;
                                const barOpacity = isHybridSelected ? 1 : 0.1;

                                return (
                                    <>
                                        {/* Radio button */}
                                        <circle
                                            cx={hybridX + barWidth / 2}
                                            cy={baseY - lowerHeight - higherHeight - 30}
                                            r="8"
                                            fill="white"
                                            stroke="#9333EA"
                                            strokeWidth="2"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelectedStrategy(3)}
                                        />
                                        {isHybridSelected && (
                                            <circle
                                                cx={hybridX + barWidth / 2}
                                                cy={baseY - lowerHeight - higherHeight - 30}
                                                r="4"
                                                fill="#9333EA"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedStrategy(3)}
                                            />
                                        )}

                                        {/* Lower PIA segment (bottom, red) */}
                                        {bottomSegmentAmount > 0 && (
                                            <g>
                                                <rect
                                                    x={hybridX}
                                                    y={baseY - lowerHeight}
                                                    width={barWidth}
                                                    height={lowerHeight}
                                                    fill="#EF4444"
                                                    rx="8"
                                                    opacity={barOpacity}
                                                    className="flow-bar"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setSelectedStrategy(3)}
                                                />
                                                <title>
                                                    {`Lower PIA files at ${age >= 70 ? 62 : age >= 67 ? 67 : 62}\n`}
                                                    {`${currencyFormatter.format(Math.round(bottomSegmentAmount))} per month\n`}
                                                    {`Early filing provides immediate income`}
                                                </title>
                                            </g>
                                        )}

                                        {/* Higher PIA segment (top, teal) - only shown when age >= 70 */}
                                        {topSegmentAmount > 0 && (
                                            <g>
                                                <rect
                                                    x={hybridX}
                                                    y={baseY - lowerHeight - higherHeight}
                                                    width={barWidth}
                                                    height={higherHeight}
                                                    fill="#14B8A6"
                                                    rx="8"
                                                    opacity={barOpacity}
                                                    className="flow-bar"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setSelectedStrategy(3)}
                                                />
                                                <title>
                                                    {`Higher PIA files at 70\n`}
                                                    {`${currencyFormatter.format(Math.round(topSegmentAmount))} per month\n`}
                                                    {`Late filing maximizes lifetime benefits`}
                                                </title>
                                            </g>
                                        )}

                                        {/* Label */}
                                        <text
                                            x={hybridX + barWidth / 2}
                                            y={baseY + 25}
                                            textAnchor="middle"
                                            fontSize="14"
                                            fontWeight="600"
                                            fill="#374151"
                                        >
                                            File at 62/70
                                        </text>

                                        {/* Description of hybrid strategy */}
                                        <text x={hybridX + barWidth / 2} y={baseY + 60} textAnchor="middle" fontSize="11" fill="#6B7280">
                                            Lower PIA files @ 62
                                        </text>
                                        <text x={hybridX + barWidth / 2} y={baseY + 75} textAnchor="middle" fontSize="11" fill="#6B7280">
                                            Higher PIA files @ 70
                                        </text>
                                    </>
                                );
                            })()}
                        </g>
                    )}

                    {/* Three scenario bars - shifted right when hybrid column is shown */}
                    {scenarios.map((scenario, i) => {
                        const barX = showHybridColumn
                            ? startX + (barWidth + barSpacing) + i * (barWidth + barSpacing)  // Shift right
                            : startX + i * (barWidth + barSpacing);
                        const totalHeight = getHeight(inflatedMonthlyNeeds);
                        const coveredHeight = getHeight(scenario.covered);
                        const gapHeight = getHeight(scenario.gap);
                        const isSelected = i === selectedStrategy;
                        const barOpacity = isSelected ? 1 : 0.1;

                        // Calculate percentages for this scenario
                        const scenarioCoveragePercent = inflatedMonthlyNeeds > 0
                            ? (scenario.covered / inflatedMonthlyNeeds * 100).toFixed(0)
                            : 0;
                        const scenarioGapPercent = inflatedMonthlyNeeds > 0
                            ? (scenario.gap / inflatedMonthlyNeeds * 100).toFixed(0)
                            : 0;

                        return (
                            <g key={`scenario-${i}`} className="flow-bar-group">
                                {/* Radio button */}
                                <circle
                                    cx={barX + barWidth / 2}
                                    cy={baseY - totalHeight - 30}
                                    r="8"
                                    fill="white"
                                    stroke={scenario.color}
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedStrategy(i)}
                                />
                                {isSelected && (
                                    <circle
                                        cx={barX + barWidth / 2}
                                        cy={baseY - totalHeight - 30}
                                        r="4"
                                        fill={scenario.color}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedStrategy(i)}
                                    />
                                )}

                                {/* Covered portion (SS Income) */}
                                {scenario.covered > 0 && (
                                    <g>
                                        <rect
                                            x={barX}
                                            y={baseY - coveredHeight}
                                            width={barWidth}
                                            height={coveredHeight}
                                            fill={scenario.color}
                                            rx="8"
                                            opacity={barOpacity}
                                            className="flow-bar"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelectedStrategy(i)}
                                        />
                                        <title>
                                            {`${scenario.label}: SS Income Covers ${scenarioCoveragePercent}% of needs\n`}
                                            {`${currencyFormatter.format(Math.round(scenario.income))} per month\n`}
                                            {`SS income does the heavy lifting in retirement!`}
                                        </title>
                                    </g>
                                )}

                                {/* Gap portion (Unfunded) - GRAY */}
                                {scenario.gap > 0 && (
                                    <g>
                                        <rect
                                            x={barX}
                                            y={baseY - coveredHeight - gapHeight}
                                            width={barWidth}
                                            height={gapHeight}
                                            fill={gapColor}
                                            rx="8"
                                            opacity={barOpacity}
                                            className="flow-bar"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelectedStrategy(i)}
                                        />
                                        <title>
                                            {`${scenario.label}: ${scenarioGapPercent}% shortfall\n`}
                                            {`${currencyFormatter.format(Math.round(scenario.gap))} per month from savings\n`}
                                            {`Filing later reduces your savings burden!`}
                                        </title>
                                    </g>
                                )}

                                {/* Labels */}
                                <text
                                    x={barX + barWidth / 2}
                                    y={baseY + 25}
                                    textAnchor="middle"
                                    fontSize="14"
                                    fontWeight="600"
                                    fill="#374151"
                                >
                                    {scenario.label}
                                </text>

                                {/* SS Income amount */}
                                <text
                                    x={barX + barWidth / 2}
                                    y={baseY - coveredHeight / 2 - 8}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="13"
                                    fontWeight="600"
                                    className="flow-text"
                                >
                                    SS: {currencyFormatter.format(Math.round(scenario.income))}
                                </text>

                                {/* Gap amount */}
                                {scenario.gap > 0 && gapHeight > 30 && (
                                    <text
                                        x={barX + barWidth / 2}
                                        y={baseY - coveredHeight - gapHeight / 2}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="12"
                                        fontWeight="600"
                                        className="flow-text"
                                    >
                                        Gap: {currencyFormatter.format(Math.round(scenario.gap))}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Monthly needs reference bar on right - 50% taller for visual flow */}
                    {/* Split into covered portion (SS benefits) and shortfall portion (from savings) */}
                    {selectedScenario && (
                        <g>
                            {/* Covered portion (bottom) - deep dark burnt orange representing SS benefits */}
                            <rect
                                x={rightX}
                                y={baseY - (selectedScenario.covered / inflatedMonthlyNeeds) * targetHeight}
                                width={barWidth}
                                height={(selectedScenario.covered / inflatedMonthlyNeeds) * targetHeight}
                                fill="#C2410C"
                                rx="8"
                                opacity="0.9"
                                className="flow-bar"
                            />
                            <title>
                                {`${coveragePercent}% covered by Social Security\n`}
                                {`${currencyFormatter.format(Math.round(selectedScenario.covered))} per month\n`}
                                {`SS provides reliable retirement income`}
                            </title>

                            {/* Shortfall portion (top) - salmon/coral representing gap that needs savings */}
                            {selectedScenario.gap > 0 && (
                                <g>
                                    <rect
                                        x={rightX}
                                        y={baseY - targetHeight}
                                        width={barWidth}
                                        height={(selectedScenario.gap / inflatedMonthlyNeeds) * targetHeight}
                                        fill="#FB923C"
                                        rx="8"
                                        opacity="0.85"
                                        className="flow-bar"
                                    />
                                    <title>
                                        {`${gapPercent}% shortfall - must come from savings\n`}
                                        {`${currencyFormatter.format(Math.round(selectedScenario.gap))} per month\n`}
                                        {`Consider filing later to reduce this burden`}
                                    </title>
                                    {/* Shortfall amount label */}
                                    {((selectedScenario.gap / inflatedMonthlyNeeds) * targetHeight) > 40 && (
                                        <text
                                            x={rightX + barWidth / 2}
                                            y={baseY - targetHeight + ((selectedScenario.gap / inflatedMonthlyNeeds) * targetHeight) / 2}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="13"
                                            fontWeight="600"
                                            className="flow-text"
                                        >
                                            {currencyFormatter.format(Math.round(selectedScenario.gap))}
                                        </text>
                                    )}
                                </g>
                            )}

                            {/* Labels above the column - stacked with clear hierarchy */}
                            <text x={rightX + barWidth / 2} y={labelY1} textAnchor="middle" fontSize={Math.round(16 * labelScale)} fontWeight="700" fill="#374151">
                                Target
                            </text>
                            <text x={rightX + barWidth / 2} y={labelY2} textAnchor="middle" fontSize={Math.round(13 * labelScale)} fontWeight="600" fill="#6B7280">
                                Monthly Expense Needs
                            </text>
                            <text x={rightX + barWidth / 2} y={labelY3} textAnchor="middle" fontSize={Math.round(18 * labelScale)} fontWeight="700" fill="#374151">
                                {currencyFormatter.format(Math.round(inflatedMonthlyNeeds))}
                            </text>
                        </g>
                    )}

                    {/* Title labels - larger font */}
                    <text x={showHybridColumn ? startX + (barWidth * 4 + barSpacing * 3) / 2 : startX + (barWidth * 3 + barSpacing * 2) / 2} y={25} textAnchor="middle" fontSize="18" fontWeight="700" fill="#374151">
                        Filing Strategies
                    </text>
                </svg>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
                {scenarios.map((scenario, i) => (
                    <div key={i} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs font-semibold text-gray-600 mb-1">{scenario.label}</div>
                        <div className="text-sm">
                            <span className="text-gray-900 font-medium">Gap: </span>
                            <span className={scenario.gap > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                                {scenario.gap > 0 ? currencyFormatter.format(Math.round(scenario.gap)) : 'Covered!'}
                            </span>
                        </div>
                        {scenario.gap > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                                {((scenario.gap / inflatedMonthlyNeeds) * 100).toFixed(0)}% from savings
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Race Track Visualization Component - Animated Bar Chart Race
const RaceTrackVisualization = ({ scenarioData, activeRecordView, isMarried, inflationRate, currentAge }) => {
    // Hooks must come before any early returns
    const raceContainerRef = useRef(null);
    const [raceWidth, setRaceWidth] = useState(1200);
    const [raceContainerHeight, setRaceContainerHeight] = useState(600);
    useEffect(() => {
        if (!raceContainerRef.current) return;
        const el = raceContainerRef.current;
        const update = () => {
            const w = el.clientWidth || 1200;
            const computedW = Math.max(900, Math.min(1400, w - 48));
            setRaceWidth(computedW);
            const h = el.clientHeight || 600;
            setRaceContainerHeight(h);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const [currentRaceAge, setCurrentRaceAge] = useState(62);
    const [isPlaying, setIsPlaying] = useState(false);
    const [raceViewMode, setRaceViewMode] = useState('cumulative'); // 'monthly' or 'cumulative'

    // Calculate fixed max value - MUST be at top level before any conditional logic
    const maxValue = useMemo(() => {
        if (!scenarioData) return 1000000;
        
        const allAges = Array.from({ length: 95 - 62 + 1 }, (_, i) => 62 + i);
        
        const allValues = allAges.flatMap(age => {
            const calendarYear = scenarioData.birthYearPrimary + age;
            const projections = activeRecordView === 'primary'
                ? scenarioData.primaryProjections
                : activeRecordView === 'spouse' && scenarioData.spouseProjections
                    ? scenarioData.spouseProjections
                    : scenarioData.combinedProjections;

            if (raceViewMode === 'monthly') {
                return [
                    projections.age62.monthly[calendarYear] || 0,
                    projections.preferred.monthly[calendarYear] || 0,
                    projections.age70.monthly[calendarYear] || 0
                ];
            } else {
                const values = [
                    projections.age62.cumulative[calendarYear] || 0,
                    projections.preferred.cumulative[calendarYear] || 0,
                    projections.age70.cumulative[calendarYear] || 0
                ];
                if (age >= 70) {
                    values.push(
                        (projections.age62.cumulative[calendarYear] || 0) - (projections.age62.cumulative[scenarioData.birthYearPrimary + 69] || 0),
                        (projections.preferred.cumulative[calendarYear] || 0) - (projections.preferred.cumulative[scenarioData.birthYearPrimary + 69] || 0),
                        (projections.age70.cumulative[calendarYear] || 0) - (projections.age70.cumulative[scenarioData.birthYearPrimary + 69] || 0)
                    );
                }
                return values;
            }
        });
        
        return Math.max(...allValues) * 1.1;
    }, [raceViewMode, scenarioData, activeRecordView]);

    // Animation effect - must be called before any conditional returns
    useEffect(() => {
        if (!isPlaying || !scenarioData) return;

        // 60 seconds total for ages 62-95 (33 years)
        // Base interval: 60000ms / 33 ages = ~1818ms per age
        const baseInterval = (60000 / 33);

        const timer = setInterval(() => {
            setCurrentRaceAge(prev => {
                if (prev >= 95) {
                    setIsPlaying(false);
                    // Stay at 95, don't auto-reset
                    return 95;
                }
                return prev + 1;
            });
        }, baseInterval);

        return () => clearInterval(timer);
    }, [isPlaying, scenarioData]);

    // Handle play button click - reset if at end
    const handlePlayClick = () => {
        if (currentRaceAge === 95 && !isPlaying) {
            // Reset to beginning before playing
            setCurrentRaceAge(62);
            setTimeout(() => setIsPlaying(true), 100);
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    if (!scenarioData) {
        return <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>;
    }

    const { primaryProjections, spouseProjections, combinedProjections, birthYearPrimary, earlyLateProjection, preferredLateProjection, bothLateProjection } = scenarioData;

    // Determine which projections to use based on view
    const projections = activeRecordView === 'primary'
        ? primaryProjections
        : activeRecordView === 'spouse' && spouseProjections
            ? spouseProjections
            : combinedProjections;

    // Calculate data for all ages and scenarios
    const calculateRaceData = (age) => {
        const calendarYear = birthYearPrimary + age;

        if (raceViewMode === 'monthly') {
            // Monthly view: Just show 3 bars with monthly income
            const scenarios = [
                {
                    name: 'File at 62',
                    value: projections.age62.monthly[calendarYear] || 0,
                    color: '#EF4444'
                },
                {
                    name: 'File at 67',
                    value: projections.preferred.monthly[calendarYear] || 0,
                    color: '#3B82F6'
                },
                {
                    name: 'File at 70',
                    value: projections.age70.monthly[calendarYear] || 0,
                    color: '#14B8A6'
                }
            ];
            
            // Sort by value descending (highest at top)
            return scenarios.sort((a, b) => b.value - a.value);
        }

        // Cumulative view: Show 6 bars (Total + Since 70 for each strategy)
        const scenarios = [];

        // File at 62 - Total cumulative
        const age62Value = projections.age62.cumulative[calendarYear] || 0;
        // Use age 69 as baseline so age 70 includes the first year of benefits
        const age62Since70 = age >= 70 ? age62Value - (projections.age62.cumulative[birthYearPrimary + 69] || 0) : 0;
        
        scenarios.push({
            name: 'File at 62 - Total',
            value: age62Value,
            color: '#EF4444',
            isSince70: false
        });
        
        if (age >= 70) {
            scenarios.push({
                name: 'File at 62 - Since 70',
                value: age62Since70,
                color: '#F87171',
                isSince70: true
            });
        }

        // File at 67 (FRA) - Total cumulative
        const age67Value = projections.preferred.cumulative[calendarYear] || 0;
        // Use age 69 as baseline so age 70 includes the first year of benefits
        const age67Since70 = age >= 70 ? age67Value - (projections.preferred.cumulative[birthYearPrimary + 69] || 0) : 0;
        
        scenarios.push({
            name: 'File at 67 - Total',
            value: age67Value,
            color: '#3B82F6',
            isSince70: false
        });
        
        if (age >= 70) {
            scenarios.push({
                name: 'File at 67 - Since 70',
                value: age67Since70,
                color: '#60A5FA',
                isSince70: true
            });
        }

        // File at 70 - Total cumulative
        const age70Value = projections.age70.cumulative[calendarYear] || 0;
        // Use age 69 as baseline so age 70 includes the first year of benefits
        const age70Since70 = age >= 70 ? age70Value - (projections.age70.cumulative[birthYearPrimary + 69] || 0) : 0;
        
        scenarios.push({
            name: 'File at 70 - Total',
            value: age70Value,
            color: '#14B8A6',
            isSince70: false
        });
        
        if (age >= 70) {
            scenarios.push({
                name: 'File at 70 - Since 70',
                value: age70Since70,
                color: '#5EEAD4',
                isSince70: true
            });
        }

        // Sort by value descending (highest at top)
        return scenarios.sort((a, b) => b.value - a.value);
    };

    const raceData = calculateRaceData(currentRaceAge);

    const width = raceWidth;
    // Compute bar height/spacing based on available vertical space so all 6 bars fit
    const numBars = raceData.length;
    const paddingTopForHeader = 110; // room for Play/Age header above SVG
    const paddingBottom = 80;
    const barsArea = Math.max(320, raceContainerHeight - paddingTopForHeader - paddingBottom);
    const barSpacing = Math.max(10, Math.min(18, Math.floor(barsArea / (numBars * 8))));
    const barHeight = Math.max(32, Math.min(60, Math.floor((barsArea - ((numBars - 1) * barSpacing)) / numBars)));
    const leftMargin = Math.max(200, Math.round(width * 0.16)); // Enough space for full label text
    const rightMargin = Math.max(450, Math.round(width * 0.32)); // More space for Gap Tracker
    const topMargin = 80;
    const height = topMargin + (numBars * (barHeight + barSpacing)) + 100;

    const getBarWidth = (value) => {
        return ((value / maxValue) * (width - leftMargin - rightMargin));
    };

    return (
        <div className="h-full flex flex-col p-4">
            {/* Age Display, Play Button, and View Toggle at Top */}
            <div className="flex items-center justify-center gap-4">
                {/* Navigation triangles - simple, no background */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            setIsPlaying(false);
                            setCurrentRaceAge(prev => Math.max(62, prev - 1));
                        }}
                        className={`text-xl transition-colors ${
                            currentRaceAge <= 62 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-gray-700 cursor-pointer'
                        }`}
                        title="Go back one year"
                        disabled={currentRaceAge <= 62}
                    >
                        ◀
                    </button>
                    <button
                        onClick={() => {
                            setIsPlaying(false);
                            setCurrentRaceAge(prev => Math.min(95, prev + 1));
                        }}
                        className={`text-xl transition-colors ${
                            currentRaceAge >= 95 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-gray-700 cursor-pointer'
                        }`}
                        title="Go forward one year"
                        disabled={currentRaceAge >= 95}
                    >
                        ▶
                    </button>
                </div>
                <button
                    onClick={handlePlayClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">
                        {(() => {
                            if (!scenarioData) return currentRaceAge;
                            const primaryAge = currentRaceAge;
                            const spouseBirthYear = isMarried && scenarioData.birthYearSpouse ? scenarioData.birthYearSpouse : null;
                            const primaryBirthYear = scenarioData.birthYearPrimary;
                            
                            if (isMarried && spouseBirthYear) {
                                const spouseAge = currentRaceAge - (primaryBirthYear - spouseBirthYear);
                                return formatCoupleAges(primaryAge, spouseAge);
                            }
                            return `${primaryAge}`;
                        })()}
                    </div>
                    <div className="text-xs font-semibold text-gray-600">Current Age</div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-md border border-gray-300 p-1">
                    <button
                        onClick={() => setRaceViewMode('cumulative')}
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                            raceViewMode === 'cumulative'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Cumulative
                    </button>
                    <button
                        onClick={() => setRaceViewMode('monthly')}
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                            raceViewMode === 'monthly'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            {/* Race Track Visualization */}
            <div ref={raceContainerRef} className="flex-1 flex items-center justify-center overflow-auto">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    <style>
                        {`
                            .race-bar {
                                transition: all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
                            }
                            .race-bar:hover {
                                opacity: 0.8;
                            }
                            .revenue-line {
                                stroke-width: 3;
                                stroke-dasharray: 5, 5;
                                transition: all 0.3s ease-in-out;
                            }
                        `}
                    </style>

                    {/* Title - Only for Cumulative mode, Monthly mode shows it at bottom */}
                    {raceViewMode === 'cumulative' && (
                        <>
                            <text x={width / 2} y={40} textAnchor="middle" fontSize="24" fontWeight="700" fill="#374151">
                                Filing Strategy Race: Cumulative Benefits
                            </text>
                            <text x={width / 2} y={65} textAnchor="middle" fontSize="14" fill="#6B7280">
                                Watching benefits accumulate over time
                            </text>
                        </>
                    )}

                    {/* Bars - Conditional rendering based on view mode */}
                    {raceViewMode === 'monthly' ? (
                        /* Monthly View: Vertical bars growing from bottom */
                        (() => {
                            const availableWidth = width - leftMargin - rightMargin;
                            const barWidth = Math.min(120, availableWidth / 5); // Width for each vertical bar
                            const barSpacing = (availableWidth - (3 * barWidth)) / 4; // Equal spacing
                            const baseY = height - 140; // More space at bottom for title
                            const maxBarHeight = height - topMargin - 160; // Constrain to fit within SVG bounds
                            
                            const result = raceData.map((scenario, index) => {
                                const barX = leftMargin + barSpacing + (index * (barWidth + barSpacing));
                                const barHeightValue = (scenario.value / maxValue) * maxBarHeight;
                                
                                return (
                                    <g key={scenario.name}>
                                        {/* Vertical bar growing from bottom */}
                                        <rect
                                            x={barX}
                                            y={baseY - barHeightValue}
                                            width={barWidth}
                                            height={barHeightValue}
                                            fill={scenario.color}
                                            rx="8"
                                            className="race-bar"
                                        >
                                            <title>{`${scenario.name}: ${currencyFormatter.format(Math.round(scenario.value))}`}</title>
                                        </rect>
                                        
                                        {/* Strategy label (bottom) */}
                                        <text
                                            x={barX + barWidth / 2}
                                            y={baseY + 25}
                                            textAnchor="middle"
                                            fontSize="16"
                                            fontWeight="600"
                                            fill="#374151"
                                        >
                                            {scenario.name}
                                        </text>
                                        
                                        {/* Value label (top of bar) */}
                                        <text
                                            x={barX + barWidth / 2}
                                            y={baseY - barHeightValue - 10}
                                            textAnchor="middle"
                                            fontSize="14"
                                            fontWeight="700"
                                            fill="#374151"
                                        >
                                            {currencyFormatter.format(Math.round(scenario.value))}
                                        </text>
                                    </g>
                                );
                            });
                            
                            // Add title at bottom
                            return (
                                <>
                                    {result}
                                    <text x={width / 2} y={baseY + 65} textAnchor="middle" fontSize="24" fontWeight="700" fill="#374151">
                                        Filing Strategy Race: Monthly Benefits
                                    </text>
                                    <text x={width / 2} y={baseY + 90} textAnchor="middle" fontSize="14" fill="#6B7280">
                                        Comparing monthly income at each age
                                    </text>
                                </>
                            );
                        })()
                    ) : (
                        /* Cumulative View: Horizontal bars (existing) */
                        raceData.map((scenario, index) => {
                            const y = topMargin + index * (barHeight + barSpacing);
                            const barWidth = getBarWidth(scenario.value);

                            return (
                                <g key={scenario.name}>
                                    {/* Bar background */}
                                    <rect
                                        x={leftMargin}
                                        y={y}
                                        width={width - leftMargin - rightMargin}
                                        height={barHeight}
                                        fill="#F3F4F6"
                                        rx="8"
                                    />

                                    {/* Animated bar */}
                                    <rect
                                        x={leftMargin}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        fill={scenario.color}
                                        rx="8"
                                        className="race-bar"
                                    >
                                        <title>{`${scenario.name}: ${currencyFormatter.format(Math.round(scenario.value))}`}</title>
                                    </rect>

                                    {/* Strategy label (left) */}
                                    <text
                                        x={leftMargin - 10}
                                        y={y + barHeight / 2}
                                        textAnchor="end"
                                        alignmentBaseline="middle"
                                        fontSize="16"
                                        fontWeight="600"
                                        fill="#374151"
                                    >
                                        {scenario.name}
                                    </text>

                                    {/* Value label (inside bar or at end) */}
                                    <text
                                        x={leftMargin + barWidth + 10}
                                        y={y + barHeight / 2}
                                        textAnchor="start"
                                        alignmentBaseline="middle"
                                        fontSize="14"
                                        fontWeight="700"
                                        fill="#374151"
                                    >
                                        {currencyFormatter.format(Math.round(scenario.value))}
                                    </text>

                                </g>
                            );
                        })
                    )}

                    {/* Dynamic Difference Tracker - Right Side */}
                    {(() => {
                        const topValue = raceData[0]?.value || 0;
                        const bottomValue = raceData[raceData.length - 1]?.value || 0;
                        const difference = topValue - bottomValue;
                        const topName = raceData[0]?.name || '';
                        const bottomName = raceData[raceData.length - 1]?.name || '';
                        
                        // Position for the difference box - adapt to container width
                        const boxWidth = Math.min(340, Math.max(240, width * 0.22));
                        const boxX = width - boxWidth - 30;
                        const boxY = height / 2 - 200;
                        const boxHeight = 400;
                        
                        return (
                            <g>
                                {/* Background box */}
                                <rect
                                    x={boxX}
                                    y={boxY}
                                    width={boxWidth}
                                    height={boxHeight}
                                    fill={difference >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                                    stroke={difference >= 0 ? '#10B981' : '#EF4444'}
                                    strokeWidth="3"
                                    rx="12"
                                />
                                
                                {/* Title */}
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 40}
                                    textAnchor="middle"
                                    fontSize="24"
                                    fontWeight="700"
                                    fill="#374151"
                                >
                                    Gap Tracker
                                </text>
                                
                                {/* Top vs Bottom label */}
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 70}
                                    textAnchor="middle"
                                    fontSize="18"
                                    fill="#6B7280"
                                >
                                    1st - Last
                                </text>
                                
                                {/* Difference amount */}
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 130}
                                    textAnchor="middle"
                                    fontSize="36"
                                    fontWeight="700"
                                    fill={difference >= 0 ? '#10B981' : '#EF4444'}
                                >
                                    {difference >= 0 ? '+' : ''}{currencyFormatter.format(Math.round(difference))}
                                </text>
                                
                                {/* Leader info */}
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 185}
                                    textAnchor="middle"
                                    fontSize="18"
                                    fill="#059669"
                                    fontWeight="600"
                                >
                                    🏆 {topName.replace(' - Total', '')}
                                </text>
                                
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 215}
                                    textAnchor="middle"
                                    fontSize="20"
                                    fill="#059669"
                                    fontWeight="700"
                                >
                                    {currencyFormatter.format(Math.round(topValue))}
                                </text>
                                
                                {/* Last place info */}
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 255}
                                    textAnchor="middle"
                                    fontSize="18"
                                    fill="#DC2626"
                                    fontWeight="600"
                                >
                                    {bottomName.replace(' - Total', '')}
                                </text>
                                
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 285}
                                    textAnchor="middle"
                                    fontSize="20"
                                    fill="#DC2626"
                                    fontWeight="700"
                                >
                                    {currencyFormatter.format(Math.round(bottomValue))}
                                </text>
                                
                                {/* Separator line */}
                                <line
                                    x1={boxX + 20}
                                    y1={boxY + 310}
                                    x2={boxX + boxWidth - 20}
                                    y2={boxY + 310}
                                    stroke="#9CA3AF"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                                
                                {/* Difference calculation at bottom */}
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 340}
                                    textAnchor="middle"
                                    fontSize="16"
                                    fill="#6B7280"
                                    fontWeight="700"
                                >
                                    {raceViewMode === 'monthly' ? 'Annual Difference: 1st to Last' : 'Difference: 1st to Last'}
                                </text>
                                
                                <text
                                    x={boxX + boxWidth / 2}
                                    y={boxY + 375}
                                    textAnchor="middle"
                                    fontSize="32"
                                    fontWeight="700"
                                    fill={difference >= 0 ? '#10B981' : '#EF4444'}
                                >
                                    {difference >= 0 ? '+' : ''}{currencyFormatter.format(Math.round(raceViewMode === 'monthly' ? difference * 12 : difference))}
                                </text>
                            </g>
                        );
                    })()}

                </svg>
            </div>

            {/* Summary stats - group by strategy */}
            <div className="mt-2 grid grid-cols-3 gap-4">
                {/* File at 62 */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded bg-red-500"></div>
                        <div className="text-sm font-bold text-gray-700">File at 62</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm">
                            <span className="text-gray-600">Total: </span>
                            <span className="font-bold text-gray-900">
                                {currencyFormatter.format(Math.round(projections.age62.cumulative[birthYearPrimary + currentRaceAge] || 0))}
                            </span>
                        </div>
                        {currentRaceAge >= 70 && (
                            <div className="text-sm">
                                <span className="text-gray-600">Since 70: </span>
                                <span className="font-semibold text-gray-700">
                                    {currencyFormatter.format(Math.round((projections.age62.cumulative[birthYearPrimary + currentRaceAge] || 0) - (projections.age62.cumulative[birthYearPrimary + 69] || 0)))}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* File at 67 */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded bg-blue-500"></div>
                        <div className="text-sm font-bold text-gray-700">File at 67</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm">
                            <span className="text-gray-600">Total: </span>
                            <span className="font-bold text-gray-900">
                                {currencyFormatter.format(Math.round(projections.preferred.cumulative[birthYearPrimary + currentRaceAge] || 0))}
                            </span>
                        </div>
                        {currentRaceAge >= 70 && (
                            <div className="text-sm">
                                <span className="text-gray-600">Since 70: </span>
                                <span className="font-semibold text-gray-700">
                                    {currencyFormatter.format(Math.round((projections.preferred.cumulative[birthYearPrimary + currentRaceAge] || 0) - (projections.preferred.cumulative[birthYearPrimary + 69] || 0)))}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* File at 70 */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded bg-teal-500"></div>
                        <div className="text-sm font-bold text-gray-700">File at 70</div>
                        {raceData[0] && raceData[0].name.includes('File at 70') && <span className="ml-auto text-sm font-bold text-green-600">🏆 Leading</span>}
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm">
                            <span className="text-gray-600">Total: </span>
                            <span className="font-bold text-gray-900">
                                {currencyFormatter.format(Math.round(projections.age70.cumulative[birthYearPrimary + currentRaceAge] || 0))}
                            </span>
                        </div>
                        {currentRaceAge >= 70 && (
                            <div className="text-sm">
                                <span className="text-gray-600">Since 70: </span>
                                <span className="font-semibold text-gray-700">
                                    {currencyFormatter.format(Math.round((projections.age70.cumulative[birthYearPrimary + currentRaceAge] || 0) - (projections.age70.cumulative[birthYearPrimary + 69] || 0)))}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const tooltipLabelFormatter = (context) => {
    const datasetLabel = context.dataset?.label ? `${context.dataset.label}: ` : '';
    const value = context.parsed?.y ?? context.raw ?? 0;
    return `${datasetLabel}${currencyFormatter.format(Math.round(value))}`;
};

const formatCurrencyTick = (value) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const CHART_PADDING = { left: 60, right: 30, top: 10, bottom: 10 };

// Helper function to format ages with oldest first - defined outside component
const formatCoupleAges = (primaryAge, spouseAge) => {
    if (primaryAge === spouseAge) {
        return `${primaryAge}`;
    }
    // Show oldest first, youngest second
    const older = Math.max(primaryAge, spouseAge);
    const younger = Math.min(primaryAge, spouseAge);
    return `${older}/${younger}`;
};

const ShowMeTheMoneyCalculator = () => {
    const navigate = useNavigate();
    
    // Get user context data
    const { profile: realProfile, partners: realPartners } = useUser();
    const { isDevMode, devProfile, devPartners } = useDevMode();
    
    // Use dev or real data based on mode
    const profile = isDevMode ? devProfile : realProfile;
    const partners = isDevMode ? devPartners : realPartners;
    
    // Initialize state from profile data
    const getInitialMarriedState = () => {
        if (!profile) return false;
        return ['married', 'divorced', 'widowed'].includes(profile.relationship_status);
    };
    
    const getInitialSpouse1Dob = () => {
        if (profile?.date_of_birth) return profile.date_of_birth;
        return '1965-02-03';
    };
    
    const getInitialSpouse2Dob = () => {
        if (partners && partners.length > 0 && partners[0].date_of_birth) {
            return partners[0].date_of_birth;
        }
        return '1965-06-18';
    };

    // Persistence hook for calculator settings - ALL user inputs
    const { state: persistedState, setState: setPersistedState, isLoaded } = useCalculatorPersistence('showMeTheMoney', {
        isMarried: getInitialMarriedState(),
        spouse1Dob: getInitialSpouse1Dob(),
        spouse1Pia: '',
        spouse1PreferredYear: 67,
        spouse1PreferredMonth: 0,
        spouse2Dob: getInitialSpouse2Dob(),
        spouse2Pia: '',
        spouse2PreferredYear: 65,
        spouse2PreferredMonth: 0,
        inflation: 0.025,
        goGoEndAge: 75,
        slowGoEndAge: 85,
        monthlyNeeds: 7000,
        flowAge: 70,
        bubbleAge: 70
    });

    const [isMarried, setIsMarried] = useState(getInitialMarriedState());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [spouse1Dob, setSpouse1Dob] = useState(getInitialSpouse1Dob());
    const [spouse1Pia, setSpouse1Pia] = useState('');
    const [spouse1PreferredYear, setSpouse1PreferredYear] = useState(67);
    const [spouse1PreferredMonth, setSpouse1PreferredMonth] = useState(0);
    const [spouse2Dob, setSpouse2Dob] = useState(getInitialSpouse2Dob());
    const [spouse2Pia, setSpouse2Pia] = useState('');
    const [spouse2PreferredYear, setSpouse2PreferredYear] = useState(65);
    const [spouse2PreferredMonth, setSpouse2PreferredMonth] = useState(0);
    const [inflation, setInflation] = useState(0.025);
    
    // Retirement stages slider state (purely visual)
    const [goGoEndAge, setGoGoEndAge] = useState(75);
    const [slowGoEndAge, setSlowGoEndAge] = useState(85);
    
    // Additional state variables that need to be declared before the persistence effect
    const [monthlyNeeds, setMonthlyNeeds] = useState(7000);
    const [flowAge, setFlowAge] = useState(70);
    const [bubbleAge, setBubbleAge] = useState(70);
    
    // Track if we've loaded initial persisted state to prevent infinite loop
    const hasLoadedPersistedState = useRef(false);
    
    // Load persisted state when it becomes available (only once on mount)
    useEffect(() => {
        if (isLoaded && persistedState && !hasLoadedPersistedState.current) {
            hasLoadedPersistedState.current = true;
            if (persistedState.isMarried !== undefined) setIsMarried(persistedState.isMarried);
            if (persistedState.spouse1Dob) setSpouse1Dob(persistedState.spouse1Dob);
            if (persistedState.spouse1Pia !== undefined) setSpouse1Pia(persistedState.spouse1Pia);
            if (persistedState.spouse1PreferredYear !== undefined) setSpouse1PreferredYear(persistedState.spouse1PreferredYear);
            if (persistedState.spouse1PreferredMonth !== undefined) setSpouse1PreferredMonth(persistedState.spouse1PreferredMonth);
            if (persistedState.spouse2Dob) setSpouse2Dob(persistedState.spouse2Dob);
            if (persistedState.spouse2Pia !== undefined) setSpouse2Pia(persistedState.spouse2Pia);
            if (persistedState.spouse2PreferredYear !== undefined) setSpouse2PreferredYear(persistedState.spouse2PreferredYear);
            if (persistedState.spouse2PreferredMonth !== undefined) setSpouse2PreferredMonth(persistedState.spouse2PreferredMonth);
            if (persistedState.inflation !== undefined) setInflation(persistedState.inflation);
            if (persistedState.goGoEndAge !== undefined) setGoGoEndAge(persistedState.goGoEndAge);
            if (persistedState.slowGoEndAge !== undefined) setSlowGoEndAge(persistedState.slowGoEndAge);
            if (persistedState.monthlyNeeds !== undefined) setMonthlyNeeds(persistedState.monthlyNeeds);
            if (persistedState.flowAge !== undefined) setFlowAge(persistedState.flowAge);
            if (persistedState.bubbleAge !== undefined) setBubbleAge(persistedState.bubbleAge);
        }
    }, [isLoaded, persistedState]);
    
    // Persist ALL state changes
    useEffect(() => {
        if (isLoaded) {
            setPersistedState({
                isMarried,
                spouse1Dob,
                spouse1Pia,
                spouse1PreferredYear,
                spouse1PreferredMonth,
                spouse2Dob,
                spouse2Pia,
                spouse2PreferredYear,
                spouse2PreferredMonth,
                inflation,
                goGoEndAge,
                slowGoEndAge,
                monthlyNeeds,
                flowAge,
                bubbleAge
            });
        }
    }, [isMarried, spouse1Dob, spouse1Pia, spouse1PreferredYear, spouse1PreferredMonth, spouse2Dob, spouse2Pia, spouse2PreferredYear, spouse2PreferredMonth, inflation, goGoEndAge, slowGoEndAge, monthlyNeeds, flowAge, bubbleAge, isLoaded, setPersistedState]);
    
    const [chartView, setChartView] = useState('monthly'); // monthly, cumulative, combined, earlyLate, post70, sscuts
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [chartOptions, setChartOptions] = useState({});
    const [prematureDeath, setPrematureDeath] = useState(false);
    const [deathAge, setDeathAge] = useState(75);
    const [activeRecordView, setActiveRecordView] = useState('combined');
    const [showMonthlyCashflow, setShowMonthlyCashflow] = useState(false);
    const [post70View, setPost70View] = useState('cumulative');
    const [ssCutYear, setSsCutYear] = useState(2034);
    const [ssCutPercentage, setSsCutPercentage] = useState(21);
    const [ssCutsActive, setSsCutsActive] = useState(false);
    const [ssCutsChartData, setSsCutsChartData] = useState(null);
    const [ssCutsSummary, setSsCutsSummary] = useState([]);
    const [ssCutsPayload, setSsCutsPayload] = useState(null);
    const [showSsCutInfo, setShowSsCutInfo] = useState(false);
    const [ssCutsAxisRanges, setSsCutsAxisRanges] = useState(null);
    const [selectedStrategy, setSelectedStrategy] = useState(2); // 0=62, 1=67, 2=70
    const [piaStrategy, setPiaStrategy] = useState('late'); // 'early' or 'late'
    const [showPiaFraModal, setShowPiaFraModal] = useState(false);
    const [isDraggingGoGo, setIsDraggingGoGo] = useState(false);
    const [isDraggingSlowGo, setIsDraggingSlowGo] = useState(false);

    // One Month at a Time modal state
    const [showOneMonthModal, setShowOneMonthModal] = useState(false);

    // Already Filed state variables
    const [spouse1AlreadyFiled, setSpouse1AlreadyFiled] = useState(false);
    const [spouse1CurrentBenefit, setSpouse1CurrentBenefit] = useState(null);
    const [spouse1FiledAge, setSpouse1FiledAge] = useState(65);
    const [spouse2AlreadyFiled, setSpouse2AlreadyFiled] = useState(false);
    const [spouse2CurrentBenefit, setSpouse2CurrentBenefit] = useState(null);
    const [spouse2FiledAge, setSpouse2FiledAge] = useState(65);
    const [showAlreadyFiledModal, setShowAlreadyFiledModal] = useState(false);
    // bubbleAge already declared above with other persistent state
    
    // "Show me just this year" feature
    const [showYearView, setShowYearView] = useState(false);
    const [selectedYearAge, setSelectedYearAge] = useState(70);
    const [showYearModal, setShowYearModal] = useState(false);

    // Update state when profile data changes
    useEffect(() => {
        if (profile) {
            const shouldBeMarried = ['married', 'divorced', 'widowed'].includes(profile.relationship_status);
            setIsMarried(shouldBeMarried);
            
            if (profile.date_of_birth) {
                setSpouse1Dob(profile.date_of_birth);
            }
        }
    }, [profile]);

    // Update spouse DOB when partners data changes
    useEffect(() => {
        if (partners && partners.length > 0 && partners[0].date_of_birth) {
            setSpouse2Dob(partners[0].date_of_birth);
        }
    }, [partners]);

    useEffect(() => {
        if (!isMarried && activeRecordView === 'spouse') {
            setActiveRecordView('combined');
        }
    }, [isMarried, activeRecordView]);

    const formatAge = (dob) => {
        const birthDate = new Date(dob);
        if (Number.isNaN(birthDate.getTime())) {
            return '';
        }

        const now = new Date();
        let years = now.getFullYear() - birthDate.getFullYear();
        let months = now.getMonth() - birthDate.getMonth();

        if (now.getDate() < birthDate.getDate()) {
            months -= 1;
        }

        if (months < 0) {
            years -= 1;
            months += 12;
        }

        return `${years}y ${months}m`;
    };

    const calculateProjections = (pia, dob, filingYear, filingMonth, inflationRate) => {
        const birthDate = new Date(dob);
        const birthYear = birthDate.getFullYear();
        const birthMonthIndex = birthDate.getMonth(); // 0-11
        const claimAgeYears = filingYear + (filingMonth || 0) / 12;
        const currentAgeMonths = ageInMonths(birthDate, new Date());
        const currentAgeYears = currentAgeMonths / 12;
        const fra = getFra(birthYear);
        const fraYears = fra.years + (fra.months || 0) / 12;

        const baseMonthlyAtClaim = monthlyBenefitAtClaim({
            piaFRA: pia,
            claimAgeYears,
            currentAgeYears,
            rate: inflationRate,
            fraYears
        });

        const monthlyProjection = {};
        const cumulativeProjection = {};
        let cumulative = 0;

        const startYear = birthYear + 62;
        const endYear = birthYear + 95;
        const claimingCalendarYear = birthYear + filingYear;

        for (let year = startYear; year <= endYear; year++) {
            let monthlyBenefit = 0;
            let monthsInYear = 12;

            if (year >= claimingCalendarYear) {
                const yearsAfterClaim = year - claimingCalendarYear;
                monthlyBenefit = benefitAfterClaim(baseMonthlyAtClaim, yearsAfterClaim, inflationRate);
                
                // In the claiming year, only count months after birthday month
                if (year === claimingCalendarYear) {
                    monthsInYear = 12 - birthMonthIndex; // e.g., if born in June (month 5), get 7 months
                }
            }

            const roundedMonthly = Number(monthlyBenefit.toFixed(2));
            monthlyProjection[year] = roundedMonthly;
            cumulative = Number((cumulative + roundedMonthly * monthsInYear).toFixed(2));
            cumulativeProjection[year] = cumulative;
        }

        return { monthly: monthlyProjection, cumulative: cumulativeProjection };
    };


    const scenarioData = useMemo(() => {
        const primaryAge62 = calculateProjections(spouse1Pia, spouse1Dob, 62, 0, inflation);
        const primaryPreferred = calculateProjections(spouse1Pia, spouse1Dob, spouse1PreferredYear, spouse1PreferredMonth, inflation);
        const primaryAge70 = calculateProjections(spouse1Pia, spouse1Dob, 70, 0, inflation);

        const primaryProjections = {
            age62: primaryAge62,
            preferred: primaryPreferred,
            age70: primaryAge70
        };

        // Convert death age to calendar year based on primary person's birth year
        const primaryBirthYear = new Date(spouse1Dob).getFullYear();
        const deathYearNumber = primaryBirthYear + deathAge;

        const combineMonthlyProjection = (primaryScenario, spouseScenario) => {
            if (!isMarried || !spouseScenario) {
                return primaryScenario;
            }

            const allYears = Array.from(new Set([
                ...Object.keys(primaryScenario.monthly || {}),
                ...Object.keys(spouseScenario.monthly || {})
            ])).map(Number).sort((a, b) => a - b);

            const monthly = {};
            const cumulative = {};
            let runningTotal = 0;

            allYears.forEach(year => {
                const primaryMonthly = primaryScenario.monthly?.[year] || 0;
                const spouseMonthly = spouseScenario.monthly?.[year] || 0;
                const combinedMonthly = prematureDeath && year >= deathYearNumber
                    ? Math.max(primaryMonthly, spouseMonthly)
                    : primaryMonthly + spouseMonthly;

                monthly[year] = combinedMonthly;
                runningTotal += combinedMonthly * 12;
                cumulative[year] = runningTotal;
            });

            return { monthly, cumulative };
        };

        let spouseProjections = null;
        let combinedProjections = primaryProjections;

        if (isMarried) {
            const spouseAge62 = calculateProjections(spouse2Pia, spouse2Dob, 62, 0, inflation);
            const spousePreferredScenario = calculateProjections(spouse2Pia, spouse2Dob, spouse2PreferredYear, spouse2PreferredMonth, inflation);
            const spouseAge70 = calculateProjections(spouse2Pia, spouse2Dob, 70, 0, inflation);

            spouseProjections = {
                age62: spouseAge62,
                preferred: spousePreferredScenario,
                age70: spouseAge70
            };

            combinedProjections = {
                age62: combineMonthlyProjection(primaryAge62, spouseAge62),
                preferred: combineMonthlyProjection(primaryPreferred, spousePreferredScenario),
                age70: combineMonthlyProjection(primaryAge70, spouseAge70)
            };
        }

        const primaryIsLowerPia = !isMarried || spouse1Pia <= spouse2Pia;

        let earlyLateProjection = primaryProjections.age62;
        let preferredLateProjection = primaryProjections.preferred;
        let bothLateProjection = primaryProjections.age70;

        if (isMarried && spouseProjections) {
            // ALWAYS use optimal strategy: Lower PIA files at 62, Higher PIA files at 70
            // This maximizes delayed retirement credits on the higher benefit while providing
            // immediate income from the lower benefit
            
            if (primaryIsLowerPia) {
                // Primary has lower PIA - Primary files at 62, Spouse files at 70
                earlyLateProjection = combineMonthlyProjection(primaryProjections.age62, spouseProjections.age70);
                preferredLateProjection = combineMonthlyProjection(primaryProjections.preferred, spouseProjections.age70);
            } else {
                // Spouse has lower PIA - Spouse files at 62, Primary files at 70
                earlyLateProjection = combineMonthlyProjection(primaryProjections.age70, spouseProjections.age62);
                preferredLateProjection = combineMonthlyProjection(primaryProjections.age70, spouseProjections.preferred);
            }
            bothLateProjection = combineMonthlyProjection(primaryProjections.age70, spouseProjections.age70);
        }

        const birthYearPrimary = new Date(spouse1Dob).getFullYear();
        const birthYearSpouse = isMarried ? new Date(spouse2Dob).getFullYear() : null;
        const displayAges = [62, 67, 70, 75, 80, 85, 90, 95];
        const primaryYears = displayAges.map(age => birthYearPrimary + age);
        const spouseYears = isMarried && birthYearSpouse ? displayAges.map(age => birthYearSpouse + age) : null;

        return {
            primaryProjections,
            spouseProjections,
            combinedProjections,
            earlyLateProjection,
            preferredLateProjection,
            bothLateProjection,
            birthYearPrimary,
            birthYearSpouse,
            primaryYears,
            spouseYears
        };
    }, [isMarried, spouse1Dob, spouse1Pia, spouse1PreferredYear, spouse1PreferredMonth, spouse2Dob, spouse2Pia, spouse2PreferredYear, spouse2PreferredMonth, inflation, prematureDeath, deathAge, piaStrategy]);

    // Bubble Chart Data - Calculate 4% Rule Equivalents at selected age
    const bubbleChartData = useMemo(() => {
        if (!scenarioData) return null;

        const { primaryProjections, spouseProjections, combinedProjections, birthYearPrimary } = scenarioData;

        // Select the right projections based on view
        let projections = primaryProjections;
        let birthYear = birthYearPrimary;

        if (activeRecordView === 'spouse' && spouseProjections) {
            projections = spouseProjections;
            birthYear = scenarioData.birthYearSpouse;
        } else if (activeRecordView === 'combined') {
            projections = combinedProjections;
        }

        // Calculate year from age
        const currentYear = birthYear + bubbleAge;

        // Get monthly benefit at the selected age for filing at 62
        const age62Monthly = projections.age62?.monthly?.[currentYear] || 0;
        const age62Annual = age62Monthly * 12;
        const age62AssetEquiv = age62Annual / 0.04;

        // Get monthly benefit at the selected age for filing at 70
        const age70Monthly = projections.age70?.monthly?.[currentYear] || 0;
        const age70Annual = age70Monthly * 12;
        const age70AssetEquiv = age70Annual / 0.04;

        return {
            age62: {
                monthly: age62Monthly,
                annual: age62Annual,
                assetEquiv: age62AssetEquiv
            },
            age70: {
                monthly: age70Monthly,
                annual: age70Annual,
                assetEquiv: age70AssetEquiv
            }
        };
    }, [scenarioData, activeRecordView, bubbleAge]);

    useEffect(() => {
        if (!scenarioData) {
            setChartData({ labels: [], datasets: [] });
            setChartOptions({});
            return;
        }

        const {
            primaryProjections,
            spouseProjections,
            combinedProjections,
            earlyLateProjection,
            preferredLateProjection,
            bothLateProjection,
            birthYearPrimary,
            birthYearSpouse,
            primaryYears,
            spouseYears
        } = scenarioData;

        const projections =
            activeRecordView === 'primary'
                ? primaryProjections
                : activeRecordView === 'spouse' && spouseProjections
                    ? spouseProjections
                    : combinedProjections;

        let displayYearsForData = primaryYears;
        let labels = primaryYears.map(year => `Age ${year - birthYearPrimary}`);

        if (activeRecordView === 'spouse' && spouseYears) {
            displayYearsForData = spouseYears;
            labels = spouseYears.map(year => `Age ${year - birthYearSpouse}`);
        } else if (activeRecordView === 'combined' && isMarried && birthYearSpouse !== null) {
            displayYearsForData = primaryYears;
            labels = primaryYears.map(year => {
                const age1 = year - birthYearPrimary;
                const age2 = year - birthYearSpouse;
                return `Ages ${formatCoupleAges(age1, age2)}`;
            });
        }

        let newChartData;
        let newChartOptions;

        if (chartView === 'sscuts') {
            const comparisonLabel = ssCutsActive ? 'Projected Cuts Applied' : 'Baseline (No Cuts)';
            newChartData = ssCutsChartData || { labels: [], datasets: [] };

            // Build scales with fixed ranges if available
            let yMonthlyScale = {
                type: 'linear',
                display: true,
                position: 'left',
                title: { text: 'Monthly Benefit ($)', display: true },
                ticks: {
                    callback: formatCurrencyTick,
                    precision: 0
                },
                bounds: 'data'
            };

            // Apply fixed ranges if they exist - FORCE the axis limits
            if (ssCutsAxisRanges) {
                console.log('Applying fixed Y-axis ranges:', ssCutsAxisRanges);
                const monthlyMin = ssCutsAxisRanges.monthly.min;
                const monthlyMax = ssCutsAxisRanges.monthly.max;

                yMonthlyScale.min = monthlyMin;
                yMonthlyScale.max = monthlyMax;
                yMonthlyScale.beginAtZero = false;
            } else {
                console.log('No ssCutsAxisRanges found');
            }

            newChartOptions = {
                plugins: {
                    title: { display: true, text: `SS Reserve Fund Cuts – ${comparisonLabel}` },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } },
                    legend: { position: 'bottom' }
                },
                animation: {
                    duration: 700,
                    easing: 'easeInOutQuart'
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                    y: yMonthlyScale
                },
                maintainAspectRatio: false,
                responsive: true
            };

            console.log('Final chart options for sscuts:', JSON.stringify(newChartOptions.scales, null, 2));

            setChartData(newChartData);
            setChartOptions(newChartOptions);
            return;
        }

        if (chartView === 'monthly') {
            const monthlyBarStyle = { barPercentage: 0.6, categoryPercentage: 0.72, borderRadius: 4, maxBarThickness: 55 };
            newChartData = {
                labels,
                datasets: [
                    { label: 'File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.monthly[year] || 0)), backgroundColor: 'rgba(255, 99, 132, 0.9)', ...monthlyBarStyle },
                    { label: 'Preferred Filing Age', data: displayYearsForData.map(year => Math.round(projections.preferred.monthly[year] || 0)), backgroundColor: 'rgba(54, 162, 235, 0.9)', ...monthlyBarStyle },
                    { label: 'File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.monthly[year] || 0)), backgroundColor: 'rgba(75, 192, 192, 0.9)', ...monthlyBarStyle },
                ]
            };
            newChartOptions = {
                plugins: {
                    title: { display: true, text: 'Monthly View' },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Year' }, ticks: { autoSkip: false } },
                    y: {
                        title: { text: 'Monthly Benefit ($)' },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        } else if (chartView === 'cumulative') {
            newChartData = {
                labels,
                datasets: [
                    { label: 'File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.cumulative[year] || 0)), borderColor: 'red', fill: false },
                    { label: 'Preferred Filing Age', data: displayYearsForData.map(year => Math.round(projections.preferred.cumulative[year] || 0)), borderColor: 'blue', fill: false },
                    { label: 'File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.cumulative[year] || 0)), borderColor: 'green', fill: false },
                ]
            };
            newChartOptions = {
                plugins: {
                    title: { display: true, text: 'Cumulative View' },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Year' }, ticks: { autoSkip: false } },
                    y: {
                        title: { text: 'Cumulative Benefits ($)' },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        } else if (chartView === 'earlyLate') {
            const cashflowYears = primaryYears;
            const cashflowLabels = cashflowYears.map(year => `Age ${year - birthYearPrimary}`);

            const valueMapper = (projection) => cashflowYears.map(year => {
                const monthlyValue = projection.monthly?.[year] || 0;
                return Math.round(monthlyValue * (showMonthlyCashflow ? 1 : 12));
            });

            const yAxisLabel = showMonthlyCashflow
                ? 'Monthly Household Income ($)'
                : 'Annual Household Income ($)';

            // Create title with toggle switch
            const earlyLateTitle = {
                display: true,
                text: 'Early vs Late Filing Cash Flow',
                padding: { bottom: 20 }
            };

            newChartData = {
                labels: cashflowLabels,
                datasets: [
                    {
                        label: 'Lower PIA @62, Higher PIA @70',
                        data: valueMapper(earlyLateProjection),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.12)',
                        fill: false,
                        tension: 0.35,
                        pointRadius: 3
                    },
                    {
                        label: 'Lower PIA @67, Higher PIA @70',
                        data: valueMapper(preferredLateProjection),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.12)',
                        fill: false,
                        tension: 0.35,
                        pointRadius: 3
                    },
                    {
                        label: 'Both @70',
                        data: valueMapper(bothLateProjection),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.12)',
                        fill: false,
                        tension: 0.35,
                        pointRadius: 3
                    }
                ]
            };
            newChartOptions = {
                plugins: {
                    title: earlyLateTitle,
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                    y: {
                        title: { text: yAxisLabel },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        } else if (chartView === 'post70') {
            const post70Years = primaryYears.filter(year => (year - birthYearPrimary) >= 70);
            const yearsToUse = post70Years.length > 0 ? post70Years : primaryYears;
            const labelsPost70 = yearsToUse.map(year => `Age ${year - birthYearPrimary}`);

            const baselineYear = yearsToUse[0] - 1;

            const monthlyValues = (projection) => yearsToUse.map(year => projection.monthly?.[year] || 0);

            const cumulativeAfter70 = (projection) => yearsToUse.map(year => {
                const total = projection.cumulative?.[year] || 0;
                const baseline = projection.cumulative?.[baselineYear] || 0;
                return Math.max(0, total - baseline);
            });

            const monthlyDatasets = [
                {
                    label: 'File at 62',
                    data: monthlyValues(combinedProjections.age62),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'Preferred Filing Age',
                    data: monthlyValues(combinedProjections.preferred),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'File at 70',
                    data: monthlyValues(combinedProjections.age70),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                }
            ];

            const cumulativeDatasets = [
                {
                    label: 'File at 62',
                    data: cumulativeAfter70(combinedProjections.age62),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'Preferred Filing Age',
                    data: cumulativeAfter70(combinedProjections.preferred),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'File at 70',
                    data: cumulativeAfter70(combinedProjections.age70),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                }
            ];

            if (post70View === 'monthly') {
                newChartData = {
                    labels: labelsPost70,
                    datasets: monthlyDatasets
                };
                newChartOptions = {
                    plugins: {
                        title: { display: true, text: 'Post-70 Monthly Income' },
                        tooltip: { callbacks: { label: tooltipLabelFormatter } }
                    },
                    layout: { padding: CHART_PADDING },
                    scales: {
                        x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                        y: { title: { text: 'Monthly Income ($)' }, ticks: { callback: formatCurrencyTick } }
                    }
                };
            } else if (post70View === 'cumulative') {
                // Calculate key milestone differences
                const annotations = {};
                const milestoneAges = [75, 80, 85, 90, 95];

                milestoneAges.forEach(age => {
                    const labelIndex = labelsPost70.findIndex(label => label === `Age ${age}`);
                    if (labelIndex !== -1) {
                        const age62Value = cumulativeAfter70(combinedProjections.age62)[labelIndex] || 0;
                        const age70Value = cumulativeAfter70(combinedProjections.age70)[labelIndex] || 0;
                        const diff = age70Value - age62Value;

                        if (Math.abs(diff) > 1000) {
                            // Create a flag label positioned above the line
                            const boxHeight = age === 75 ? 0 : age === 80 ? 85 : age === 85 ? 170 : age === 90 ? 255 : 340;
                            annotations[`box${age}`] = {
                                type: 'label',
                                xValue: labelIndex,
                                yValue: 'max',
                                yAdjust: -(boxHeight + 75),
                                xAdjust: -75,
                                content: [
                                    `💡 Age ${age}`,
                                    `Filing at 70: ${currencyFormatter.format(age70Value)}`,
                                    `Filing at 62: ${currencyFormatter.format(age62Value)}`,
                                    `Advantage: ${currencyFormatter.format(Math.abs(diff))}`
                                ],
                                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                                color: 'white',
                                font: {
                                    size: 11,
                                    weight: 'bold'
                                },
                                padding: 8,
                                borderRadius: 6,
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                borderWidth: 1,
                                textAlign: 'center',
                                position: 'center'
                            };

                            // Vertical line starting from bottom of flag
                            annotations[`line${age}`] = {
                                type: 'line',
                                xMin: labelIndex,
                                xMax: labelIndex,
                                yMin: 0,
                                yMax: 'max',
                                yScaleID: 'y',
                                adjustScaleRange: false,
                                borderColor: 'rgba(147, 51, 234, 0.5)',
                                borderWidth: 2,
                                borderDash: [6, 4],
                                display: true
                            };
                        }
                    }
                });

                newChartData = {
                    labels: labelsPost70,
                    datasets: cumulativeDatasets
                };
                newChartOptions = {
                    plugins: {
                        title: { display: true, text: 'Post-70 Cumulative Income - Filing Strategy Impact' },
                        tooltip: {
                            callbacks: {
                                label: tooltipLabelFormatter
                            }
                        },
                        annotation: {
                            annotations
                        }
                    },
                    layout: { padding: CHART_PADDING },
                    scales: {
                        x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                        y: { title: { text: 'Cumulative Income Since Age 70 ($)' }, ticks: { callback: formatCurrencyTick } }
                    }
                };
            } else {
                newChartData = {
                    labels: labelsPost70,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'File at 62',
                            data: monthlyValues(combinedProjections.age62),
                            backgroundColor: 'rgba(255, 99, 132, 0.65)',
                            yAxisID: 'y_monthly',
                            barPercentage: 0.65,
                            categoryPercentage: 0.8
                        },
                        {
                            type: 'bar',
                            label: 'Preferred Filing Age',
                            data: monthlyValues(combinedProjections.preferred),
                            backgroundColor: 'rgba(54, 162, 235, 0.65)',
                            yAxisID: 'y_monthly',
                            barPercentage: 0.65,
                            categoryPercentage: 0.8
                        },
                        {
                            type: 'bar',
                            label: 'File at 70',
                            data: monthlyValues(combinedProjections.age70),
                            backgroundColor: 'rgba(75, 192, 192, 0.65)',
                            yAxisID: 'y_monthly',
                            barPercentage: 0.65,
                            categoryPercentage: 0.8
                        },
                        {
                            type: 'line',
                            label: 'Cumulative File at 62',
                            data: cumulativeAfter70(combinedProjections.age62),
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'transparent',
                            yAxisID: 'y_cumulative',
                            tension: 0.25,
                            fill: false,
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Cumulative Preferred Filing Age',
                            data: cumulativeAfter70(combinedProjections.preferred),
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'transparent',
                            yAxisID: 'y_cumulative',
                            tension: 0.25,
                            fill: false,
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Cumulative File at 70',
                            data: cumulativeAfter70(combinedProjections.age70),
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'transparent',
                            yAxisID: 'y_cumulative',
                            tension: 0.25,
                            fill: false,
                            order: 2
                        }
                    ]
                };
                newChartOptions = {
                    plugins: {
                        title: { display: true, text: 'Post-70 Combined View' },
                        tooltip: { callbacks: { label: tooltipLabelFormatter } }
                    },
                    layout: { padding: CHART_PADDING },
                    scales: {
                        x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                        y_monthly: {
                            type: 'linear',
                            position: 'left',
                            title: { text: 'Monthly Income ($)', display: true },
                            ticks: { callback: formatCurrencyTick }
                        },
                        y_cumulative: {
                            type: 'linear',
                            position: 'right',
                            title: { text: 'Cumulative Income Since Age 70 ($)', display: true },
                            grid: { drawOnChartArea: false },
                            ticks: { callback: formatCurrencyTick }
                        }
                    }
                };
            }
        } else {
            newChartData = {
                labels,
                datasets: [
                    { type: 'bar', label: 'Monthly File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.monthly[year] || 0)), backgroundColor: 'rgba(255, 99, 132, 0.9)', yAxisID: 'y_monthly', barPercentage: 0.65, categoryPercentage: 0.8, maxBarThickness: 70, borderRadius: 4 },
                    { type: 'bar', label: 'Monthly Preferred Filing Age', data: displayYearsForData.map(year => Math.round(projections.preferred.monthly[year] || 0)), backgroundColor: 'rgba(54, 162, 235, 0.9)', yAxisID: 'y_monthly', barPercentage: 0.65, categoryPercentage: 0.8, maxBarThickness: 70, borderRadius: 4 },
                    { type: 'bar', label: 'Monthly File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.monthly[year] || 0)), backgroundColor: 'rgba(75, 192, 192, 0.9)', yAxisID: 'y_monthly', barPercentage: 0.65, categoryPercentage: 0.8, maxBarThickness: 70, borderRadius: 4 },
                    { type: 'line', label: 'Cumulative File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.cumulative[year] || 0)), borderColor: 'red', yAxisID: 'y_cumulative', fill: false, order: 2, borderWidth: 2 },
                    { type: 'line', label: 'Cumulative Preferred Filing Age', data: displayYearsForData.map(year => Math.round(projections.preferred.cumulative[year] || 0)), borderColor: 'blue', yAxisID: 'y_cumulative', fill: false, order: 2, borderWidth: 2 },
                    { type: 'line', label: 'Cumulative File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.cumulative[year] || 0)), borderColor: 'green', yAxisID: 'y_cumulative', fill: false, order: 2, borderWidth: 2 },
                ]
            };
            newChartOptions = {
                plugins: {
                    title: { display: true, text: 'Combined View' },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Year' }, ticks: { autoSkip: false } },
                    y_monthly: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { text: 'Monthly Benefit ($)', display: true },
                        ticks: { callback: formatCurrencyTick }
                    },
                    y_cumulative: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { text: 'Cumulative Benefits ($)', display: true },
                        grid: { drawOnChartArea: false },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        }

        setChartData(newChartData);
        setChartOptions(newChartOptions);

    }, [scenarioData, chartView, activeRecordView, showMonthlyCashflow, post70View, ssCutsChartData, ssCutsActive, isMarried, ssCutsAxisRanges]);

    useEffect(() => {
        setSsCutsChartData(null);
        setSsCutsSummary([]);
        setSsCutsPayload(null);
        setSsCutsActive(false);
        setSsCutsAxisRanges(null);
    }, [scenarioData, activeRecordView]);

    // Auto-calculate and show baseline when switching to SS Cuts tab
    useEffect(() => {
        if (chartView === 'sscuts' && !ssCutsPayload && scenarioData) {
            // Automatically calculate the baseline when tab is opened
            const calculateSsCuts = () => {
                const {
                    primaryProjections,
                    spouseProjections,
                    combinedProjections,
                    birthYearPrimary,
                    birthYearSpouse,
                    primaryYears,
                    spouseYears
                } = scenarioData;

                const baseProjections =
                    activeRecordView === 'primary'
                        ? primaryProjections
                        : activeRecordView === 'spouse' && spouseProjections
                            ? spouseProjections
                            : combinedProjections;

                let displayYearsForData = primaryYears;
                let labels = primaryYears.map(year => `Age ${year - birthYearPrimary}`);

                if (activeRecordView === 'spouse' && spouseYears) {
                    displayYearsForData = spouseYears;
                    labels = spouseYears.map(year => `Age ${year - birthYearSpouse}`);
                } else if (activeRecordView === 'combined' && isMarried && birthYearSpouse !== null) {
                    displayYearsForData = primaryYears;
                    labels = primaryYears.map(year => {
                        const age1 = year - birthYearPrimary;
                        const age2 = year - birthYearSpouse;
                        return `Ages ${age1}/${age2}`;
                    });
                }

                const scenarioConfigs = [
                    { key: 'age62', label: 'File at 62', barColor: 'rgba(239, 68, 68, 0.78)', lineColor: 'rgba(239, 68, 68, 1)' },
                    { key: 'preferred', label: 'Preferred Filing Age', barColor: 'rgba(59, 130, 246, 0.78)', lineColor: 'rgba(59, 130, 246, 1)' },
                    { key: 'age70', label: 'File at 70', barColor: 'rgba(45, 212, 191, 0.78)', lineColor: 'rgba(20, 184, 166, 1)' },
                ];

                const reductionFactor = Math.min(1, Math.max(0, 1 - (Number(ssCutPercentage) || 0) / 100));
                const cutYearValue = Number(ssCutYear) || ssCutYear;

                const applyCuts = (projection) => {
                    const yearKeys = Array.from(new Set([
                        ...Object.keys(projection.monthly || {}),
                        ...Object.keys(projection.cumulative || {})
                    ])).map(Number).sort((a, b) => a - b);

                    const monthly = {};
                    const cumulative = {};
                    let running = 0;

                    yearKeys.forEach(year => {
                        const baseMonthly = projection.monthly?.[year] || 0;
                        const adjustedMonthly = year >= cutYearValue ? baseMonthly * reductionFactor : baseMonthly;
                        const roundedMonthly = Number(adjustedMonthly.toFixed(2));
                        monthly[year] = roundedMonthly;
                        running = Number((running + roundedMonthly * 12).toFixed(2));
                        cumulative[year] = running;
                    });

                    return { monthly, cumulative };
                };

                const scenarios = [];

                scenarioConfigs.forEach((config) => {
                    const baseProjection = baseProjections?.[config.key];
                    if (!baseProjection) return;

                    const cutProjection = applyCuts(baseProjection);

                    const baselineMonthly = displayYearsForData.map(year => Number((baseProjection.monthly?.[year] || 0).toFixed(2)));
                    const baselineCumulative = displayYearsForData.map(year => Number((baseProjection.cumulative?.[year] || 0).toFixed(2)));
                    const cutMonthly = displayYearsForData.map(year => Number((cutProjection.monthly?.[year] || 0).toFixed(2)));
                    const cutCumulative = displayYearsForData.map(year => Number((cutProjection.cumulative?.[year] || 0).toFixed(2)));

                    const baselineTotal = baselineCumulative[baselineCumulative.length - 1] || 0;
                    const cutTotal = cutCumulative[cutCumulative.length - 1] || 0;

                    scenarios.push({
                        label: config.label,
                        barColor: config.barColor,
                        lineColor: config.lineColor,
                        baselineMonthly,
                        baselineCumulative,
                        cutMonthly,
                        cutCumulative,
                        baselineTotal,
                        cutTotal
                    });
                });

                if (!scenarios.length) return;

                const summary = scenarios.map((scenario) => ({
                    label: scenario.label,
                    baseline: Math.round(scenario.baselineTotal),
                    projected: Math.round(scenario.cutTotal),
                    delta: Math.round(scenario.cutTotal - scenario.baselineTotal)
                }));

                // Calculate min/max across both baseline and cuts to freeze the Y-axis
                let minMonthly = Infinity;
                let maxMonthly = -Infinity;
                let minCumulative = Infinity;
                let maxCumulative = -Infinity;

                scenarios.forEach((scenario) => {
                    [...scenario.baselineMonthly, ...scenario.cutMonthly].forEach(val => {
                        minMonthly = Math.min(minMonthly, val);
                        maxMonthly = Math.max(maxMonthly, val);
                    });

                    [...scenario.baselineCumulative, ...scenario.cutCumulative].forEach(val => {
                        minCumulative = Math.min(minCumulative, val);
                        maxCumulative = Math.max(maxCumulative, val);
                    });
                });

                const monthlyPadding = (maxMonthly - minMonthly) * 0.1;
                const cumulativePadding = (maxCumulative - minCumulative) * 0.1;

                const yAxisRanges = {
                    monthly: {
                        min: 0,
                        max: Math.ceil(maxMonthly + monthlyPadding)
                    },
                    cumulative: {
                        min: 0,
                        max: Math.ceil(maxCumulative + cumulativePadding)
                    }
                };

                const payload = {
                    labels,
                    scenarios,
                    summary,
                    yAxisRanges
                };

                setSsCutsAxisRanges(yAxisRanges);
                setSsCutsPayload(payload);
                applySsCutsMode(false, payload); // Show baseline initially
            };

            calculateSsCuts();
        }
    }, [chartView, ssCutsPayload, scenarioData, activeRecordView, isMarried, ssCutYear, ssCutPercentage]);

    const handlePrimaryOnlyToggle = (event) => {
        setActiveRecordView(event.target.checked ? 'primary' : 'combined');
    };

    const handleSpouseOnlyToggle = (event) => {
        setActiveRecordView(event.target.checked ? 'spouse' : 'combined');
    };

    const applySsCutsMode = (projected, payload) => {
        if (!payload || !payload.scenarios.length) {
            setSsCutsChartData(null);
            setSsCutsActive(false);
            setSsCutsSummary([]);
            return;
        }

        console.log('applySsCutsMode called with projected:', projected);
        console.log('Payload yAxisRanges:', payload.yAxisRanges);

        const datasets = [];

        payload.scenarios.forEach((scenario) => {
            if (!scenario) {
                return;
            }
            const monthlyValues = projected ? scenario.cutMonthly : scenario.baselineMonthly;

            datasets.push({
                type: 'bar',
                label: scenario.label,
                data: monthlyValues.map(value => Math.round(value)),
                backgroundColor: scenario.barColor,
                borderColor: scenario.lineColor,
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.55,
                categoryPercentage: 0.72,
                order: 1
            });
        });

        setSsCutsChartData({
            labels: payload.labels,
            datasets,
            yAxisRanges: payload.yAxisRanges // Use the ranges from the payload
        });
        setSsCutsSummary(payload.summary);
        setSsCutsActive(projected);
    };

    const handleProjectCuts = () => {
        if (!scenarioData) {
            return;
        }

        const {
            primaryProjections,
            spouseProjections,
            combinedProjections,
            birthYearPrimary,
            birthYearSpouse,
            primaryYears,
            spouseYears
        } = scenarioData;

        const baseProjections =
            activeRecordView === 'primary'
                ? primaryProjections
                : activeRecordView === 'spouse' && spouseProjections
                    ? spouseProjections
                    : combinedProjections;

        let displayYearsForData = primaryYears;
        let labels = primaryYears.map(year => `Age ${year - birthYearPrimary}`);

        if (activeRecordView === 'spouse' && spouseYears) {
            displayYearsForData = spouseYears;
            labels = spouseYears.map(year => `Age ${year - birthYearSpouse}`);
        } else if (activeRecordView === 'combined' && isMarried && birthYearSpouse !== null) {
            displayYearsForData = primaryYears;
            labels = primaryYears.map(year => {
                const age1 = year - birthYearPrimary;
                const age2 = year - birthYearSpouse;
                return `Ages ${age1}/${age2}`;
            });
        }

        const scenarioConfigs = [
            { key: 'age62', label: 'File at 62', barColor: 'rgba(239, 68, 68, 0.78)', lineColor: 'rgba(239, 68, 68, 1)' },
            { key: 'preferred', label: 'Preferred Filing Age', barColor: 'rgba(59, 130, 246, 0.78)', lineColor: 'rgba(59, 130, 246, 1)' },
            { key: 'age70', label: 'File at 70', barColor: 'rgba(45, 212, 191, 0.78)', lineColor: 'rgba(20, 184, 166, 1)' },
        ];

        const reductionFactor = Math.min(1, Math.max(0, 1 - (Number(ssCutPercentage) || 0) / 100));
        const cutYearValue = Number(ssCutYear) || ssCutYear;

        const applyCuts = (projection) => {
            const yearKeys = Array.from(new Set([
                ...Object.keys(projection.monthly || {}),
                ...Object.keys(projection.cumulative || {})
            ])).map(Number).sort((a, b) => a - b);

            const monthly = {};
            const cumulative = {};
            let running = 0;

            yearKeys.forEach(year => {
                const baseMonthly = projection.monthly?.[year] || 0;
                const adjustedMonthly = year >= cutYearValue ? baseMonthly * reductionFactor : baseMonthly;
                const roundedMonthly = Number(adjustedMonthly.toFixed(2));
                monthly[year] = roundedMonthly;
                running = Number((running + roundedMonthly * 12).toFixed(2));
                cumulative[year] = running;
            });

            return { monthly, cumulative };
        };

        const scenarios = [];

        scenarioConfigs.forEach((config) => {
            const baseProjection = baseProjections?.[config.key];
            if (!baseProjection) {
                return;
            }

            const cutProjection = applyCuts(baseProjection);

            const baselineMonthly = displayYearsForData.map(year => Number((baseProjection.monthly?.[year] || 0).toFixed(2)));
            const baselineCumulative = displayYearsForData.map(year => Number((baseProjection.cumulative?.[year] || 0).toFixed(2)));
            const cutMonthly = displayYearsForData.map(year => Number((cutProjection.monthly?.[year] || 0).toFixed(2)));
            const cutCumulative = displayYearsForData.map(year => Number((cutProjection.cumulative?.[year] || 0).toFixed(2)));

            const baselineTotal = baselineCumulative[baselineCumulative.length - 1] || 0;
            const cutTotal = cutCumulative[cutCumulative.length - 1] || 0;

            scenarios.push({
                label: config.label,
                barColor: config.barColor,
                lineColor: config.lineColor,
                baselineMonthly,
                baselineCumulative,
                cutMonthly,
                cutCumulative,
                baselineTotal,
                cutTotal
            });
        });

        if (!scenarios.length) {
            setSsCutsPayload(null);
            applySsCutsMode(false, null);
            setChartView('sscuts');
            return;
        }

        const summary = scenarios.map((scenario) => ({
            label: scenario.label,
            baseline: Math.round(scenario.baselineTotal),
            projected: Math.round(scenario.cutTotal),
            delta: Math.round(scenario.cutTotal - scenario.baselineTotal)
        }));

        // Calculate min/max across both baseline and cuts to freeze the Y-axis
        let minMonthly = Infinity;
        let maxMonthly = -Infinity;
        let minCumulative = Infinity;
        let maxCumulative = -Infinity;

        scenarios.forEach((scenario) => {
            // Check both baseline and cuts for min/max
            [...scenario.baselineMonthly, ...scenario.cutMonthly].forEach(val => {
                minMonthly = Math.min(minMonthly, val);
                maxMonthly = Math.max(maxMonthly, val);
            });

            [...scenario.baselineCumulative, ...scenario.cutCumulative].forEach(val => {
                minCumulative = Math.min(minCumulative, val);
                maxCumulative = Math.max(maxCumulative, val);
            });
        });

        // Add 10% padding to the ranges
        const monthlyPadding = (maxMonthly - minMonthly) * 0.1;
        const cumulativePadding = (maxCumulative - minCumulative) * 0.1;

        const yAxisRanges = {
            monthly: {
                min: 0, // Start monthly at 0 for clear visual comparison
                max: Math.ceil(maxMonthly + monthlyPadding)
            },
            cumulative: {
                min: 0, // Start cumulative at 0 for clear visual comparison
                max: Math.ceil(maxCumulative + cumulativePadding)
            }
        };

        console.log('Calculated Y-axis ranges for SS Cuts:', yAxisRanges);
        console.log('Monthly range:', minMonthly, 'to', maxMonthly);
        console.log('Cumulative range:', minCumulative, 'to', maxCumulative);

        const payload = {
            labels,
            scenarios,
            summary,
            yAxisRanges
        };

        // Store axis ranges in persistent state
        setSsCutsAxisRanges(yAxisRanges);
        setSsCutsPayload(payload);
        applySsCutsMode(true, payload);
        setChartView('sscuts');
    };

    const handleShowBaseline = () => {
        if (!ssCutsPayload) {
            return;
        }
        applySsCutsMode(false, ssCutsPayload);
        setChartView('sscuts');
    };

    const chartTabs = [
        { key: 'monthly', label: 'Monthly Benefit' },
        { key: 'cumulative', label: 'Cumulative Benefit' },
        { key: 'combined', label: 'Combined' },
        { key: 'earlyLate', label: 'Early/Late' },
        { key: 'post70', label: 'Post-70' },
        { key: 'sscuts', label: 'SS Cuts' },
        { key: 'flow', label: 'Flow' },
        { key: 'bubble', label: 'Bubbles', tooltip: '4% Rule Equivalent' },
        { key: 'race', label: 'Race' },
    ];

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
            {/* Compact Sidebar */}
            <div className={`relative bg-white border-r border-gray-200 transition-all duration-300 ${
                sidebarCollapsed ? 'w-0 lg:w-12' : 'lg:w-80 xl:w-96'
            }`}>
                <div className={`h-full ${sidebarCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {!sidebarCollapsed && (
                    <div>
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50 flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Controls</h2>
                                <p className="text-xs text-gray-600">Adjust your inputs</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="p-1.5 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition-all hover:scale-110"
                                    title="Settings"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setSidebarCollapsed(true)}
                                    className="hidden lg:flex p-1.5 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all hover:scale-110"
                                    title="Collapse controls"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                    {/* Primary Filer - Compact */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="mb-2 flex items-start justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Primary Filer</h3>
                                <p className="text-xs text-gray-600">DOB: {spouse1Dob} • Age: {formatAge(spouse1Dob)}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="flex items-center gap-1 cursor-pointer" title="This setting can also be changed in the Settings/gear icon">
                                    <input
                                        type="checkbox"
                                        checked={!isMarried}
                                        onChange={(e) => setIsMarried(!e.target.checked)}
                                        className="w-3 h-3 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-xs text-gray-700">Single?</span>
                                </label>
                                {isMarried && (
                                    <label className="flex items-center gap-1 cursor-pointer" title="This setting can also be changed in the Settings/gear icon">
                                        <input
                                            type="checkbox"
                                            checked={isMarried}
                                            onChange={(e) => setIsMarried(e.target.checked)}
                                            className="w-3 h-3 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-xs text-gray-700">Married?</span>
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                                    PIA at FRA ($)
                                    <button
                                        type="button"
                                        onClick={() => setShowPiaFraModal(true)}
                                        className="text-primary-600 hover:text-primary-700 underline text-xs"
                                    >
                                        What's This?
                                    </button>
                                </label>
                                <input
                                    type="number"
                                    value={spouse1Pia}
                                    onChange={e => setSpouse1Pia(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Enter PIA here"
                                />
                            </div>

                            <div className="bg-primary-100 rounded p-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Filing Age</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <input
                                            type="number"
                                            value={spouse1PreferredYear}
                                            onChange={e => setSpouse1PreferredYear(Number(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                            placeholder="Yr"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            value={spouse1PreferredMonth}
                                            onChange={e => setSpouse1PreferredMonth(Number(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                            placeholder="Mo"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* View Only Checkbox - At Bottom */}
                            <div className="pt-3 mt-3 border-t border-gray-200">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={activeRecordView === 'primary'}
                                        onChange={handlePrimaryOnlyToggle}
                                        className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span title="This setting can also be changed in the Settings section">Show only this person</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Spouse - Compact - Always visible when married */}
                    {isMarried && (
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="mb-2">
                                <h3 className="text-sm font-semibold text-gray-900">Spouse Filer</h3>
                                <p className="text-xs text-gray-600">DOB: {spouse2Dob} • Age: {formatAge(spouse2Dob)}</p>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1">
                                        PIA at FRA ($)
                                        <button
                                            type="button"
                                            onClick={() => setShowPiaFraModal(true)}
                                            className="text-primary-600 hover:text-primary-700 underline text-xs"
                                        >
                                            What's This?
                                        </button>
                                    </label>
                                    <input
                                        type="number"
                                        value={spouse2Pia}
                                        onChange={e => setSpouse2Pia(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Enter PIA here"
                                    />
                                </div>

                                <div className="bg-primary-100 rounded p-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Filing Age</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <input
                                                type="number"
                                                value={spouse2PreferredYear}
                                                onChange={e => setSpouse2PreferredYear(Number(e.target.value))}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                                placeholder="Yr"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={spouse2PreferredMonth}
                                                onChange={e => setSpouse2PreferredMonth(Number(e.target.value))}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                                placeholder="Mo"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* View Only Checkbox - At Bottom */}
                            <div className="pt-3 mt-3 border-t border-gray-200">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={activeRecordView === 'spouse'}
                                        onChange={handleSpouseOnlyToggle}
                                        className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span title="This setting can also be changed in the Settings section">Show only this person</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Show Me Just This Single Year - Between Spouse and Options */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Show Me Just This Single Year</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={showYearView}
                                    onChange={(e) => setShowYearView(e.target.checked)}
                                    className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <span>Enable year view</span>
                            </label>
                            
                            {showYearView && (
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Select age:</label>
                                    <select
                                        value={selectedYearAge}
                                        onChange={(e) => {
                                            setSelectedYearAge(Number(e.target.value));
                                            setShowYearModal(true);
                                        }}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                    >
                                        {Array.from({ length: 95 - 62 + 1 }, (_, i) => 62 + i).map(age => {
                                            // Calculate ages for both spouses if married
                                            const primaryAge = age;
                                            const spouseBirthYear = isMarried ? new Date(spouse2Dob).getFullYear() : null;
                                            const primaryBirthYear = new Date(spouse1Dob).getFullYear();
                                            
                                            let label;
                                            if (isMarried && spouseBirthYear) {
                                                const spouseAge = age - (primaryBirthYear - spouseBirthYear);
                                                label = formatCoupleAges(primaryAge, spouseAge);
                                            } else {
                                                label = `${primaryAge}`;
                                            }
                                            
                                            return (
                                                <option key={age} value={age}>{label}</option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Options - Compact */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Options</h3>
                        <div className="space-y-2">
                            {isMarried && (
                                <div className="space-y-2">
                                    <Checkbox
                                        label={<span className="text-xs">Potential Premature Death</span>}
                                        checked={prematureDeath}
                                        onChange={e => setPrematureDeath(e.target.checked)}
                                    />
                                    {prematureDeath && (
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">
                                                {isMarried ? 'Death at ages:' : 'Death at age:'}
                                            </label>
                                            <select
                                                value={deathAge}
                                                onChange={e => setDeathAge(Number(e.target.value))}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                            >
                                                {Array.from({ length: 100 - 62 + 1 }, (_, idx) => 62 + idx).map(age => {
                                                    const primaryAge = age;
                                                    const spouseBirthYear = isMarried ? new Date(spouse2Dob).getFullYear() : null;
                                                    const primaryBirthYear = new Date(spouse1Dob).getFullYear();
                                                    
                                                    let label;
                                                    if (isMarried && spouseBirthYear) {
                                                        const spouseAge = age - (primaryBirthYear - spouseBirthYear);
                                                        label = formatCoupleAges(primaryAge, spouseAge);
                                                    } else {
                                                        label = `${primaryAge}`;
                                                    }
                                                    
                                                    return (
                                                        <option key={age} value={age}>{label}</option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-medium text-gray-700">Inflation (COLA)</label>
                                        <div className="group relative">
                                            <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
                                                <div className="font-semibold mb-1">How COLA is Applied:</div>
                                                <ul className="space-y-1 text-xs">
                                                    <li>• <span className="font-medium">Before age 60:</span> Applied annually</li>
                                                    <li>• <span className="font-medium">Ages 60-61:</span> Frozen at 0%</li>
                                                    <li>• <span className="font-medium">Age 62 onward:</span> Your rate applies annually</li>
                                                    <li>• <span className="font-medium">After claiming:</span> Continues annually</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-primary-600">
                                        {(inflation * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    value={inflation}
                                    onChange={e => setInflation(Number(e.target.value))}
                                    min="0"
                                    max="0.1"
                                    step="0.001"
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Tools & Resources
                            </span>
                        </div>
                    </div>

                    {/* Quick Access Tools */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-white to-gray-50 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Core Features</h3>
                        <div className="space-y-2">
                            {/* Featured: PIA Calculator - UPGRADED */}
                            <div className="p-4 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 border-2 border-teal-300 rounded-xl shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xl">🧮</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-base font-bold text-teal-900 mb-1">PIA Calculator</h4>
                                        <p className="text-xs text-teal-700">Calculate your Primary Insurance Amount from your earnings record</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/pia-calculator')}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold rounded-lg shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                                >
                                    Refine your PIA
                                </button>
                                <p className="text-xs text-teal-600 mt-2 text-center italic">
                                    ⚡ Essential: Get your exact benefit amount
                                </p>
                            </div>

                            {/* Featured: One Month at a Time - MOVED UP */}
                            <div className="p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-300 rounded-xl shadow-lg">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xl">🎯</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-base font-bold text-indigo-900 mb-1">One Month at a Time</h4>
                                        <p className="text-xs text-indigo-700">See how each month of waiting builds guaranteed retirement income</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowOneMonthModal(true)}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                                >
                                    📊 Explore Month-by-Month Value
                                </button>
                                <p className="text-xs text-indigo-600 mt-2 text-center italic">
                                    ✨ NEW: Interactive bridge-building tool
                                </p>
                            </div>

                        </div>
                        
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 mt-4">Helper Apps</h3>
                        <div className="space-y-2">
                            {/* Sequence of Returns */}
                            <button
                                onClick={() => navigate('/sequence-risk')}
                                className="w-full text-left px-3 py-2 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 rounded-lg transition-all hover:shadow-md group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-purple-900">Sequence of Returns</div>
                                        <div className="text-xs text-purple-700 mt-0.5">Market timing impact</div>
                                    </div>
                                    <svg className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Longevity Spending */}
                            <button
                                onClick={() => navigate('/longevity-spending')}
                                className="w-full text-left px-3 py-2 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 rounded-lg transition-all hover:shadow-md group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-green-900">Longevity Spending</div>
                                        <div className="text-xs text-green-700 mt-0.5">Plan retirement phases</div>
                                    </div>
                                    <svg className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Income Target */}
                            <button
                                onClick={() => navigate('/income-target')}
                                className="w-full text-left px-3 py-2 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border border-orange-200 rounded-lg transition-all hover:shadow-md group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-orange-900">Income Target</div>
                                        <div className="text-xs text-orange-700 mt-0.5">Set retirement goals</div>
                                    </div>
                                    <svg className="w-4 h-4 text-orange-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Budget Worksheet */}
                            <button
                                onClick={() => navigate('/budget-worksheet')}
                                className="w-full text-left px-3 py-2 bg-gradient-to-r from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 border border-pink-200 rounded-lg transition-all hover:shadow-md group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-pink-900">Budget Worksheet</div>
                                        <div className="text-xs text-pink-700 mt-0.5">Track monthly expenses</div>
                                    </div>
                                    <svg className="w-4 h-4 text-pink-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </div>
                        </div>
                    </div>
                )}
                </div>

                {/* Expand Button - Only shown when collapsed */}
                {sidebarCollapsed && (
                    <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="hidden lg:flex absolute top-4 left-1 p-1.5 bg-primary-600 text-white rounded-lg shadow-lg hover:bg-primary-700 transition-all hover:scale-110 z-10"
                        title="Expand controls"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Main Chart Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                <div className="border-b border-gray-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <PillTabs className="flex-wrap">
                            {chartTabs.filter(tab => tab.key !== 'combined' && tab.key !== 'earlyLate').map(tab => (
                                <PillTab
                                    key={tab.key}
                                    active={chartView === tab.key}
                                    onClick={() => setChartView(tab.key)}
                                    title={tab.tooltip || ''}
                                >
                                    <span className="text-xs">{tab.label}</span>
                                </PillTab>
                            ))}
                        </PillTabs>

                    </div>

                    {chartView === 'sscuts' && (
                        <div className="mt-3 flex flex-wrap gap-3 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Insolvency Year</label>
                                <select
                                    value={ssCutYear}
                                    onChange={e => setSsCutYear(Number(e.target.value))}
                                    className="px-3 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white hover:border-gray-400 transition-colors"
                                >
                                    {Array.from({ length: 21 }, (_, idx) => 2030 + idx).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Benefit Cut</label>
                                <select
                                    value={ssCutPercentage}
                                    onChange={e => setSsCutPercentage(Number(e.target.value))}
                                    className="px-3 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white hover:border-gray-400 transition-colors"
                                >
                                    {Array.from({ length: 26 }, (_, idx) => 10 + idx).map(percent => (
                                        <option key={percent} value={percent}>{percent}%</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={ssCutsActive ? handleShowBaseline : handleProjectCuts}
                                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${
                                    ssCutsActive
                                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                                        : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800'
                                }`}
                            >
                                {ssCutsActive ? 'Show Baseline' : 'Project Cuts'}
                            </button>
                            <button
                                onClick={() => setShowSsCutInfo(true)}
                                className="w-8 h-8 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                                title="Learn more about SS cuts"
                            >
                                <span className="text-sm font-bold">i</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Chart Container */}
                <div className="flex-1 p-4 overflow-auto">

                    {/* Early/Late Toggle Switch */}
                    {chartView === 'earlyLate' && (
                        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center justify-center gap-2">
                                <span className={`text-sm font-medium transition-colors ${!showMonthlyCashflow ? 'text-primary-600' : 'text-gray-500'}`}>
                                    Annual
                                </span>
                                <button
                                    onClick={() => setShowMonthlyCashflow(!showMonthlyCashflow)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                        showMonthlyCashflow ? 'bg-primary-600' : 'bg-gray-300'
                                    }`}
                                    role="switch"
                                    aria-checked={showMonthlyCashflow}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            showMonthlyCashflow ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                                <span className={`text-sm font-medium transition-colors ${showMonthlyCashflow ? 'text-primary-600' : 'text-gray-500'}`}>
                                    Monthly
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Flow View Controls */}
                    {chartView === 'flow' && (
                        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Age: <span className="text-primary-600 font-bold">{flowAge}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="8"
                                        value={[62, 67, 70, 75, 80, 85, 90, 95, 100].indexOf(flowAge)}
                                        onChange={(e) => setFlowAge([62, 67, 70, 75, 80, 85, 90, 95, 100][parseInt(e.target.value)])}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                        step="1"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>62</span>
                                        <span>67</span>
                                        <span>70</span>
                                        <span>75</span>
                                        <span>80</span>
                                        <span>85</span>
                                        <span>90</span>
                                        <span>95</span>
                                        <span>100</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="text-sm font-medium text-gray-700">Monthly Expense Needs:</label>
                                    <input
                                        type="number"
                                        value={monthlyNeeds}
                                        onChange={(e) => setMonthlyNeeds(Number(e.target.value))}
                                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-32"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style={{ height: ['monthly', 'cumulative', 'combined', 'earlyLate', 'post70'].includes(chartView) ? 'calc(100% - 80px)' : '100%' }}>
                        {
                            chartView === 'flow' ? (
                                <FlowVisualization
                                    scenarioData={scenarioData}
                                    age={flowAge}
                                    monthlyNeeds={monthlyNeeds}
                                    activeRecordView={activeRecordView}
                                    isMarried={isMarried}
                                    inflationRate={inflation}
                                    piaStrategy={piaStrategy}
                                    setPiaStrategy={setPiaStrategy}
                                    preferredFilingYear={spouse1PreferredYear}
                                    preferredFilingMonth={spouse1PreferredMonth}
                                    currentAge={(() => {
                                        const dob = new Date(spouse1Dob);
                                        const today = new Date();
                                        let age = today.getFullYear() - dob.getFullYear();
                                        const monthDiff = today.getMonth() - dob.getMonth();
                                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                                            age--;
                                        }
                                        return age;
                                    })()}
                                    selectedStrategy={selectedStrategy}
                                    setSelectedStrategy={setSelectedStrategy}
                                />
                            ) : chartView === 'race' ? (
                                <RaceTrackVisualization
                                    scenarioData={scenarioData}
                                    activeRecordView={activeRecordView}
                                    isMarried={isMarried}
                                    inflationRate={inflation}
                                    currentAge={(() => {
                                        const dob = new Date(spouse1Dob);
                                        const today = new Date();
                                        let age = today.getFullYear() - dob.getFullYear();
                                        const monthDiff = today.getMonth() - dob.getMonth();
                                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                                            age--;
                                        }
                                        return age;
                                    })()}
                                />
                            ) : chartView === 'sscuts'
                                ? (ssCutsChartData && ssCutsChartData.labels && ssCutsChartData.labels.length > 0
                                    ? <Bar key="sscuts-chart" data={chartData} options={chartOptions} />
                                    : (
                                        <div className="h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                                            <p className="text-center px-8 text-sm">
                                                Adjust the year or percentage and press "Project" to see the impact of a trust-fund cut.<br />
                                                Then toggle to the baseline to compare.
                                            </p>
                                        </div>
                                    ))
                                : chartView === 'monthly' ? <Bar data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  chartView === 'cumulative' ? <Line data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  chartView === 'combined' ? <Bar data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  chartView === 'earlyLate' ? <Line data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  chartView === 'bubble' ? (
                                      <div className="h-full flex flex-col p-6 bg-white overflow-auto">
                                          {/* Age Slider */}
                                          <div className="mb-8">
                                              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Age to View</h3>
                                              <div className="flex items-center gap-4">
                                                  <div className="flex-1 relative">
                                                      {(() => {
                                                          const keyAges = [62, 67, 70, 75, 80, 85, 90, 95, 100];
                                                          const currentIndex = keyAges.indexOf(bubbleAge);
                                                          const sliderIndex = currentIndex !== -1 ? currentIndex : keyAges.indexOf(70);
                                                          
                                                          return (
                                                              <>
                                                                  <input
                                                                      type="range"
                                                                      min="0"
                                                                      max="8"
                                                                      step="1"
                                                                      value={sliderIndex}
                                                                      onChange={(e) => setBubbleAge(keyAges[Number(e.target.value)])}
                                                                      className="w-full"
                                                                  />
                                                                  {/* Age markers */}
                                                                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                                                                      {keyAges.map(age => (
                                                                          <button
                                                                              key={age}
                                                                              onClick={() => setBubbleAge(age)}
                                                                              className={`hover:text-primary-600 hover:font-semibold transition-colors ${bubbleAge === age ? 'text-primary-600 font-semibold' : ''}`}
                                                                          >
                                                                              {age}
                                                                          </button>
                                                                      ))}
                                                                  </div>
                                                              </>
                                                          );
                                                      })()}
                                                  </div>
                                                  <div className="text-2xl font-bold text-primary-600 min-w-[80px] text-center">
                                                      Age {bubbleAge}
                                                  </div>
                                              </div>
                                          </div>

                                          {/* Bubble Visualization - Stacked Vertically */}
                                          <div className="flex-1 flex flex-col justify-center gap-16 py-8">
                                              {bubbleChartData && (() => {
                                                  // Dramatic bubble sizes - Moon → Earth → Sun effect
                                                  const monthlySize = 80;   // Moon
                                                  const annualSize = 200;   // Earth (2.5x)
                                                  const assetSize = 400;    // Sun (5x)

                                                  // Filing at 70 sizes
                                                  const size70Monthly = monthlySize;
                                                  const size70Annual = annualSize;
                                                  const size70Asset = assetSize;

                                                  // Filing at 62 sizes
                                                  const size62Monthly = monthlySize;
                                                  const size62Annual = annualSize;
                                                  const size62Asset = assetSize;

                                                  return (
                                                      <>
                                                          {/* Filing at 70 - Top */}
                                                          <div className="flex flex-col items-center">
                                                              <h4 className="text-xl font-semibold text-green-600 mb-6">Filing at Age 70</h4>
                                                              <div className="relative w-full h-80 flex items-center justify-center">
                                                                  {/* Monthly bubble - Left */}
                                                                  <div
                                                                      className="absolute rounded-full flex items-center justify-center text-gray-900 font-bold transition-all duration-500 ease-in-out"
                                                                      style={{
                                                                          width: `${size70Monthly}px`,
                                                                          height: `${size70Monthly}px`,
                                                                          left: '20%',
                                                                          top: '50%',
                                                                          transform: 'translate(-50%, -50%)',
                                                                          background: 'radial-gradient(circle at 30% 30%, rgba(74, 222, 128, 0.9), rgba(34, 197, 94, 0.7))',
                                                                          boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4)',
                                                                          opacity: 0.9
                                                                      }}
                                                                  >
                                                                      <div className="text-center px-1">
                                                                          <div className="text-xs">Monthly</div>
                                                                          <div className="text-sm font-bold">{currencyFormatter.format(bubbleChartData.age70.monthly)}</div>
                                                                      </div>
                                                                  </div>
                                                                  {/* Annual bubble - Center */}
                                                                  <div
                                                                      className="absolute rounded-full flex items-center justify-center text-gray-900 font-bold transition-all duration-500 ease-in-out"
                                                                      style={{
                                                                          width: `${size70Annual}px`,
                                                                          height: `${size70Annual}px`,
                                                                          left: '50%',
                                                                          top: '50%',
                                                                          transform: 'translate(-50%, -50%)',
                                                                          background: 'radial-gradient(circle at 30% 30%, rgba(134, 239, 172, 0.85), rgba(74, 222, 128, 0.65))',
                                                                          boxShadow: '0 8px 32px rgba(74, 222, 128, 0.4)',
                                                                          opacity: 0.9
                                                                      }}
                                                                  >
                                                                      <div className="text-center px-1">
                                                                          <div className="text-xs">Annual</div>
                                                                          <div className="text-lg font-bold">{currencyFormatter.format(bubbleChartData.age70.annual)}</div>
                                                                      </div>
                                                                  </div>
                                                                  {/* Asset equivalent bubble - Right */}
                                                                  <div
                                                                      className="absolute rounded-full flex items-center justify-center text-gray-900 font-bold transition-all duration-500 ease-in-out"
                                                                      style={{
                                                                          width: `${size70Asset}px`,
                                                                          height: `${size70Asset}px`,
                                                                          left: '80%',
                                                                          top: '50%',
                                                                          transform: 'translate(-50%, -50%)',
                                                                          background: 'radial-gradient(circle at 30% 30%, rgba(187, 247, 208, 0.8), rgba(134, 239, 172, 0.6))',
                                                                          boxShadow: '0 8px 32px rgba(134, 239, 172, 0.4)',
                                                                          opacity: 0.9
                                                                      }}
                                                                  >
                                                                      <div className="text-center px-2">
                                                                          <div className="text-xs">4% Asset</div>
                                                                          <div className="text-base font-bold">{currencyFormatter.format(bubbleChartData.age70.assetEquiv)}</div>
                                                                      </div>
                                                                  </div>
                                                              </div>
                                                              <div className="text-xs text-gray-600 mt-4 text-center space-y-1">
                                                                  <p>Monthly: {currencyFormatter.format(bubbleChartData.age70.monthly)}</p>
                                                                  <p>Annual: {currencyFormatter.format(bubbleChartData.age70.annual)}</p>
                                                                  <p>Asset Equivalent: {currencyFormatter.format(bubbleChartData.age70.assetEquiv)}</p>
                                                              </div>
                                                          </div>

                                                          {/* Filing at 62 - Bottom */}
                                                          <div className="flex flex-col items-center">
                                                              <h4 className="text-xl font-semibold text-red-600 mb-6">Filing at Age 62</h4>
                                                              <div className="relative w-full h-80 flex items-center justify-center">
                                                                  {/* Monthly bubble - Left */}
                                                                  <div
                                                                      className="absolute rounded-full flex items-center justify-center text-gray-900 font-bold transition-all duration-500 ease-in-out"
                                                                      style={{
                                                                          width: `${size62Monthly}px`,
                                                                          height: `${size62Monthly}px`,
                                                                          left: '20%',
                                                                          top: '50%',
                                                                          transform: 'translate(-50%, -50%)',
                                                                          background: 'radial-gradient(circle at 30% 30%, rgba(248, 113, 113, 0.9), rgba(239, 68, 68, 0.7))',
                                                                          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
                                                                          opacity: 0.9
                                                                      }}
                                                                  >
                                                                      <div className="text-center px-1">
                                                                          <div className="text-xs">Monthly</div>
                                                                          <div className="text-sm font-bold">{currencyFormatter.format(bubbleChartData.age62.monthly)}</div>
                                                                      </div>
                                                                  </div>
                                                                  {/* Annual bubble - Center */}
                                                                  <div
                                                                      className="absolute rounded-full flex items-center justify-center text-gray-900 font-bold transition-all duration-500 ease-in-out"
                                                                      style={{
                                                                          width: `${size62Annual}px`,
                                                                          height: `${size62Annual}px`,
                                                                          left: '50%',
                                                                          top: '50%',
                                                                          transform: 'translate(-50%, -50%)',
                                                                          background: 'radial-gradient(circle at 30% 30%, rgba(252, 165, 165, 0.85), rgba(248, 113, 113, 0.65))',
                                                                          boxShadow: '0 8px 32px rgba(248, 113, 113, 0.4)',
                                                                          opacity: 0.9
                                                                      }}
                                                                  >
                                                                      <div className="text-center px-1">
                                                                          <div className="text-xs">Annual</div>
                                                                          <div className="text-lg font-bold">{currencyFormatter.format(bubbleChartData.age62.annual)}</div>
                                                                      </div>
                                                                  </div>
                                                                  {/* Asset equivalent bubble - Right */}
                                                                  <div
                                                                      className="absolute rounded-full flex items-center justify-center text-gray-900 font-bold transition-all duration-500 ease-in-out"
                                                                      style={{
                                                                          width: `${size62Asset}px`,
                                                                          height: `${size62Asset}px`,
                                                                          left: '80%',
                                                                          top: '50%',
                                                                          transform: 'translate(-50%, -50%)',
                                                                          background: 'radial-gradient(circle at 30% 30%, rgba(254, 202, 202, 0.8), rgba(252, 165, 165, 0.6))',
                                                                          boxShadow: '0 8px 32px rgba(252, 165, 165, 0.4)',
                                                                          opacity: 0.9
                                                                      }}
                                                                  >
                                                                      <div className="text-center px-2">
                                                                          <div className="text-xs">4% Asset</div>
                                                                          <div className="text-base font-bold">{currencyFormatter.format(bubbleChartData.age62.assetEquiv)}</div>
                                                                      </div>
                                                                  </div>
                                                              </div>
                                                              <div className="text-xs text-gray-600 mt-4 text-center space-y-1">
                                                                  <p>Monthly: {currencyFormatter.format(bubbleChartData.age62.monthly)}</p>
                                                                  <p>Annual: {currencyFormatter.format(bubbleChartData.age62.annual)}</p>
                                                                  <p>Asset Equivalent: {currencyFormatter.format(bubbleChartData.age62.assetEquiv)}</p>
                                                              </div>
                                                          </div>
                                                      </>
                                                  );
                                              })()}
                                          </div>
                                      </div>
                                  ) :
                                  post70View === 'combined' ? <Bar data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  <Line data={chartData} options={{...chartOptions, maintainAspectRatio: false}} />
                        }
                    </div>

                    {/* Retirement Stages Slider - Below chart */}
                    {['monthly', 'cumulative', 'combined', 'earlyLate', 'post70', 'sscuts'].includes(chartView) && (
                        <div>
                            <RetirementStagesSlider
                                goGoEndAge={goGoEndAge}
                                setGoGoEndAge={setGoGoEndAge}
                                slowGoEndAge={slowGoEndAge}
                                setSlowGoEndAge={setSlowGoEndAge}
                                isDraggingGoGo={isDraggingGoGo}
                                setIsDraggingGoGo={setIsDraggingGoGo}
                                isDraggingSlowGo={isDraggingSlowGo}
                                setIsDraggingSlowGo={setIsDraggingSlowGo}
                            />
                        </div>
                    )}

                    {/* SS Cuts Summary */}
                    {chartView === 'sscuts' && ssCutsSummary.length > 0 && (
                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">Summary</h4>
                            <p className="text-xs text-gray-600 mb-2">
                                {ssCutsActive ? 'Cuts Applied' : 'Baseline (No Cuts)'}
                            </p>
                            <ul className="space-y-1">
                                {ssCutsSummary.map(item => {
                                    const diff = item.delta;
                                    return (
                                        <li key={item.label} className="text-xs">
                                            <span className="font-medium">{item.label}:</span>{' '}
                                            {currencyFormatter.format(Math.round(item.baseline))} ➝{' '}
                                            {currencyFormatter.format(Math.round(item.projected))}
                                            <span className={`ml-1 font-semibold ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ({currencyFormatter.format(Math.round(diff))})
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* SS Cuts Info Modal */}
            {showSsCutInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-6 animate-slide-in">
                        <h3 className="text-2xl font-bold text-primary-700 mb-4">About the SS Cuts Scenario</h3>
                        <div className="space-y-3 text-gray-700 leading-relaxed">
                            <p>
                                <strong>The default values (2034, 21% cut)</strong> represent the most recent consensus projection from the Social Security Board of Trustees regarding when the trust fund reserves may be depleted and the expected benefit reduction if no legislative action is taken.
                            </p>
                            <p>
                                When trust fund reserves are exhausted, incoming payroll taxes would only cover a portion of scheduled benefits, resulting in an automatic across-the-board reduction unless Congress intervenes. This tool lets you model different scenarios by adjusting the year and percentage to stress-test your claiming strategy.
                            </p>
                            <p>
                                Use this projection to explore how delaying benefits, coordinating with a spouse, or using bridge income may help offset a potential future cut. The calculation maintains your inflation assumption and applies the reduction to both monthly payments and lifetime totals from the selected year forward.
                            </p>
                        </div>
                        <div className="flex justify-end mt-6">
                            <Button onClick={() => setShowSsCutInfo(false)} variant="primary">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIA & FRA Information Modal */}
            {showPiaFraModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">Understanding PIA & FRA</h2>
                                <button
                                    onClick={() => setShowPiaFraModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            {/* What is PIA? - MOVED TO TOP */}
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold text-primary-600 mb-3">What is PIA?</h3>
                                <p className="text-gray-700 mb-3">
                                    <strong>PIA (Primary Insurance Amount)</strong> is your monthly benefit amount at Full Retirement Age. It's calculated based on your 35 highest-earning years.
                                </p>
                                <p className="text-gray-700 mb-4">
                                    If you claim before FRA, your benefit is reduced. If you wait until after FRA, your benefit is increased.
                                </p>
                            </div>

                            {/* How to Find Your PIA */}
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold text-primary-600 mb-3">How to Find Your PIA</h3>
                                <p className="text-gray-700 mb-3">
                                    You can get your specific benefit estimate at{' '}
                                    <a
                                        href="https://www.ssa.gov"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:text-primary-700 underline font-medium"
                                    >
                                        SSA.gov
                                    </a>{' '}
                                    by creating a "my Social Security" account.
                                </p>

                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-semibold text-gray-900">Don't know your number?</p>
                                            <p className="text-sm text-gray-700 mt-1">
                                                The average individual Social Security benefit in 2025 is $2,006/month. Use this as a starting point, then get your actual estimate from SSA.gov for more accurate planning.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* What is FRA? - MOVED TO BOTTOM */}
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold text-primary-600 mb-3">What is FRA?</h3>
                                <p className="text-gray-700 mb-4">
                                    <strong>FRA (Full Retirement Age)</strong> is the age at which you're entitled to receive 100% of your Social Security benefit.
                                </p>

                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-semibold text-gray-900">We calculate your FRA automatically</p>
                                            <p className="text-sm text-gray-700 mt-1">
                                                Based on your date of birth, we automatically determine your Full Retirement Age and use it in all calculations.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold text-gray-900 mb-3">Your FRA by Birth Year:</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead>
                                                <tr className="bg-primary-600 text-white">
                                                    <th className="px-4 py-2 text-left text-sm font-semibold">Year of Birth</th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold">Full Retirement Age</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                <tr>
                                                    <td className="px-4 py-2 text-sm text-gray-900">1955</td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">66 and 2 months</td>
                                                </tr>
                                                <tr className="bg-gray-50">
                                                    <td className="px-4 py-2 text-sm text-gray-900">1956</td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">66 and 4 months</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2 text-sm text-gray-900">1957</td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">66 and 6 months</td>
                                                </tr>
                                                <tr className="bg-gray-50">
                                                    <td className="px-4 py-2 text-sm text-gray-900">1958</td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">66 and 8 months</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-2 text-sm text-gray-900">1959</td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">66 and 10 months</td>
                                                </tr>
                                                <tr className="bg-primary-50">
                                                    <td className="px-4 py-2 text-sm font-semibold text-primary-700">1960 or later</td>
                                                    <td className="px-4 py-2 text-sm font-semibold text-primary-700">67</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-sm italic text-gray-600 mt-3">
                                        For 95% of people planning today, FRA is age 67.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end mt-6">
                                <Button onClick={() => setShowPiaFraModal(false)} variant="primary">
                                    Got It
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Year Detail Modal */}
            {showYearModal && scenarioData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">
                                        Benefits at Age {(() => {
                                            const primaryAge = selectedYearAge;
                                            const spouseBirthYear = isMarried ? new Date(spouse2Dob).getFullYear() : null;
                                            const primaryBirthYear = new Date(spouse1Dob).getFullYear();
                                            
                                            if (isMarried && spouseBirthYear) {
                                                const spouseAge = selectedYearAge - (primaryBirthYear - spouseBirthYear);
                                                if (primaryAge === spouseAge) {
                                                    return `${primaryAge}`;
                                                } else {
                                                    return `${primaryAge}/${spouseAge}`;
                                                }
                                            }
                                            return `${primaryAge}`;
                                        })()}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">Comparing three filing strategies</p>
                                </div>
                                <button
                                    onClick={() => setShowYearModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Three columns for three strategies */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(() => {
                                    const primaryBirthYear = new Date(spouse1Dob).getFullYear();
                                    const calendarYear = primaryBirthYear + selectedYearAge;
                                    
                                    const projections = activeRecordView === 'primary'
                                        ? scenarioData.primaryProjections
                                        : activeRecordView === 'spouse' && scenarioData.spouseProjections
                                            ? scenarioData.spouseProjections
                                            : scenarioData.combinedProjections;

                                    // Calculate cumulative since age 70 for each strategy
                                    // Use age 69 as baseline so age 70 is fully included in "since 70"
                                    const age69CalendarYear = primaryBirthYear + 69;
                                    const cumulativeSince70 = (projection) => {
                                        if (selectedYearAge < 70) return 0;
                                        const currentCumulative = projection.cumulative[calendarYear] || 0;
                                        const age69Cumulative = projection.cumulative[age69CalendarYear] || 0;
                                        return Math.max(0, currentCumulative - age69Cumulative);
                                    };

                                    const strategies = [
                                        {
                                            name: 'File at 70',
                                            color: 'green',
                                            gradient: 'from-green-500 to-green-600',
                                            monthly: projections.age70.monthly[calendarYear] || 0,
                                            cumulative: cumulativeSince70(projections.age70),
                                            filingAge: 70,
                                            started: (projections.age70.monthly[calendarYear] || 0) > 0
                                        },
                                        {
                                            name: 'File at 67',
                                            color: 'blue',
                                            gradient: 'from-blue-500 to-blue-600',
                                            monthly: projections.preferred.monthly[calendarYear] || 0,
                                            cumulative: cumulativeSince70(projections.preferred),
                                            filingAge: 67,
                                            started: (projections.preferred.monthly[calendarYear] || 0) > 0
                                        },
                                        {
                                            name: 'File at 62',
                                            color: 'red',
                                            gradient: 'from-red-500 to-red-600',
                                            monthly: projections.age62.monthly[calendarYear] || 0,
                                            cumulative: cumulativeSince70(projections.age62),
                                            filingAge: 62,
                                            started: (projections.age62.monthly[calendarYear] || 0) > 0
                                        }
                                    ];

                                    // Find the best strategy
                                    const bestStrategy = strategies.reduce((best, current) => 
                                        current.monthly > best.monthly ? current : best
                                    , strategies[0]);

                                    return strategies.map((strategy, idx) => {
                                        const annual = strategy.monthly * 12;
                                        const isBest = strategy === bestStrategy && strategy.monthly > 0;

                                        return (
                                            <div
                                                key={idx}
                                                className={`relative border-2 rounded-xl p-6 transition-all ${
                                                    isBest
                                                        ? 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200'
                                                        : strategy.started
                                                            ? 'border-gray-200 bg-white hover:shadow-md'
                                                            : 'border-gray-200 bg-gray-50 opacity-75'
                                                }`}
                                            >
                                                {/* Best badge */}
                                                {isBest && (
                                                    <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                                        🏆 Best
                                                    </div>
                                                )}

                                                {/* Header */}
                                                <div className="text-center mb-4">
                                                    <div className={`text-lg font-bold bg-gradient-to-r ${strategy.gradient} text-transparent bg-clip-text`}>
                                                        {strategy.name}
                                                    </div>
                                                </div>

                                                {/* Status indicator */}
                                                {!strategy.started ? (
                                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <p className="text-sm font-semibold text-yellow-800 text-center">
                                                            ⏳ Not yet eligible
                                                        </p>
                                                        <p className="text-xs text-yellow-700 text-center mt-1">
                                                            Benefits start at age {strategy.filingAge}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                        <p className="text-sm font-semibold text-green-800 text-center">
                                                            ✓ Receiving benefits
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Monthly benefit */}
                                                <div className="space-y-3">
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                                            Monthly
                                                        </p>
                                                        <p className={`text-2xl font-bold ${strategy.started ? `text-${strategy.color}-600` : 'text-gray-400'}`}>
                                                            {strategy.started ? currencyFormatter.format(Math.round(strategy.monthly)) : '$0'}
                                                        </p>
                                                    </div>

                                                    {/* Annual benefit */}
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                                            Annual
                                                        </p>
                                                        <p className={`text-xl font-bold ${strategy.started ? `text-${strategy.color}-600` : 'text-gray-400'}`}>
                                                            {strategy.started ? currencyFormatter.format(Math.round(annual)) : '$0'}
                                                        </p>
                                                    </div>

                                                    {/* Cumulative Since Age 70 */}
                                                    {selectedYearAge >= 70 && (
                                                        <div className="bg-gray-50 rounded-lg p-4">
                                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                                                Cumulative Since Age 70
                                                            </p>
                                                            <p className={`text-lg font-bold ${strategy.started ? `text-${strategy.color}-600` : 'text-gray-400'}`}>
                                                                {currencyFormatter.format(Math.round(strategy.cumulative))}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Years receiving (if applicable) */}
                                                    {strategy.started && (
                                                        <div className="pt-3 border-t border-gray-200">
                                                            <p className="text-xs text-gray-600">
                                                                <span className="font-semibold">Receiving for:</span> {selectedYearAge - strategy.filingAge} years
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Summary comparison */}
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-semibold text-blue-900 mb-2">
                                    💡 Key Insight
                                </p>
                                <p className="text-sm text-blue-800">
                                    {(() => {
                                        const primaryBirthYear = new Date(spouse1Dob).getFullYear();
                                        const calendarYear = primaryBirthYear + selectedYearAge;
                                        
                                        const projections = activeRecordView === 'primary'
                                            ? scenarioData.primaryProjections
                                            : activeRecordView === 'spouse' && scenarioData.spouseProjections
                                                ? scenarioData.spouseProjections
                                                : scenarioData.combinedProjections;

                                        const monthly62 = projections.age62.monthly[calendarYear] || 0;
                                        const monthly70 = projections.age70.monthly[calendarYear] || 0;

                                        if (selectedYearAge < 62) {
                                            return "No benefits are available before age 62.";
                                        } else if (selectedYearAge < 67) {
                                            return "Only early filing (age 62) provides income at this age. Later filing strategies require waiting longer.";
                                        } else if (selectedYearAge < 70) {
                                            return "File at 70 strategy hasn't started yet. Early and preferred filing age provide income now.";
                                        } else if (monthly70 > monthly62) {
                                            const difference = monthly70 - monthly62;
                                            const percentIncrease = ((difference / monthly62) * 100).toFixed(0);
                                            return `Filing at 70 provides ${currencyFormatter.format(Math.round(difference))} more per month (${percentIncrease}% increase) compared to filing at 62.`;
                                        } else {
                                            return "All filing strategies are now providing benefits.";
                                        }
                                    })()}
                                </p>
                            </div>

                            <div className="flex justify-end mt-6">
                                <Button onClick={() => setShowYearModal(false)} variant="primary">
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Already Filed Modal */}
            {showAlreadyFiledModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">Already Receiving Benefits?</h2>
                                <button
                                    onClick={() => setShowAlreadyFiledModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            {/* What We Do */}
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold text-primary-600 mb-3">How This Works</h3>
                                <p className="text-gray-700 mb-4">
                                    When you're already receiving Social Security benefits, we use a different calculation approach:
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">We use your actual current monthly amount</p>
                                            <p className="text-sm text-gray-600">No need to calculate from PIA - we start with what you're receiving now</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">We adjust it forward for COLA/inflation</p>
                                            <p className="text-sm text-gray-600">Your benefit grows with cost-of-living adjustments over time</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Filing age helps us calculate survivor benefits</p>
                                            <p className="text-sm text-gray-600">If married/widowed, we need to know when you filed for accurate planning</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Where to Find Current Benefit */}
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold text-primary-600 mb-3">Where to Find Your Current Benefit</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <p className="text-sm text-gray-700"><strong>1. Check your bank statement</strong> - Look for the monthly direct deposit from Social Security</p>
                                    <p className="text-sm text-gray-700"><strong>2. Log in to{' '}
                                        <a
                                            href="https://www.ssa.gov"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-600 hover:text-primary-700 underline"
                                        >
                                            SSA.gov
                                        </a>
                                    </strong> - Your benefit details are in your "my Social Security" account</p>
                                    <p className="text-sm text-gray-700"><strong>3. Review your Social Security statement</strong> - The mailed or online statement shows your current benefit</p>
                                </div>
                            </div>

                            {/* Important Note */}
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-semibold text-gray-900">Important: Use Gross Amount</p>
                                        <p className="text-sm text-gray-700 mt-1">
                                            Enter the gross amount BEFORE any deductions (Medicare premiums, taxes, etc.). We want your full Social Security benefit amount.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end mt-6">
                                <Button onClick={() => setShowAlreadyFiledModal(false)} variant="primary">
                                    Got It
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* One Month at a Time Modal */}
            <OneMonthAtATimeModal
                isOpen={showOneMonthModal}
                onClose={() => setShowOneMonthModal(false)}
                baseBenefitAt62={(() => {
                    if (!spouse1Pia) return 2500;
                    const birthYear = new Date(spouse1Dob).getFullYear();
                    const fra = getFra(birthYear);
                    const fraYears = fra.years + (fra.months || 0) / 12;
                    const currentAgeMonths = ageInMonths(new Date(spouse1Dob), new Date());
                    const currentAgeYears = currentAgeMonths / 12;
                    return monthlyBenefitAtClaim({
                        piaFRA: spouse1Pia,
                        claimAgeYears: 62,
                        currentAgeYears,
                        rate: inflation,
                        fraYears
                    });
                })()}
                inflationRate={inflation}
                birthYear={new Date(spouse1Dob).getFullYear()}
                isMarried={isMarried}
                spouseBenefitAt62={(() => {
                    if (!isMarried || !spouse2Pia) return 2000;
                    const birthYear = new Date(spouse2Dob).getFullYear();
                    const fra = getFra(birthYear);
                    const fraYears = fra.years + (fra.months || 0) / 12;
                    const currentAgeMonths = ageInMonths(new Date(spouse2Dob), new Date());
                    const currentAgeYears = currentAgeMonths / 12;
                    return monthlyBenefitAtClaim({
                        piaFRA: spouse2Pia,
                        claimAgeYears: 62,
                        currentAgeYears,
                        rate: inflation,
                        fraYears
                    });
                })()}
                spouseBirthYear={new Date(spouse2Dob).getFullYear()}
            />
        </div>
    );
};

export default ShowMeTheMoneyCalculator;
