import React, { useState, useEffect } from 'react';

/**
 * ThreeBarChart Component
 * 
 * Displays three bars representing Social Security benefits at different preferred filing ages:
 * - Red Bar: Age 62 (minimum preferred filing age baseline)
 * - Blue Bar: Currently selected age (variable based on user input)
 * - Green Bar: Age 70 (maximum benefit)
 * 
 * With Sankey Flow Enhancement:
 * - Shows animated flows representing gains already made (green) and potential remaining (blue)
 * 
 * Part of the "One Month at a Time" feature - MVP Sprint 5
 */

const ThreeBarChart = ({ 
  baselineBenefit = 2500,  // Age 62 benefit
  currentBenefit = 2500,   // Current selection benefit
  maxBenefit = 4100,       // Age 70 benefit
  currentAge = 62,
  currentMonths = 0,
  showSankeyFlow = false,
  gainAlreadyMade = 0,     // Difference between current and baseline
  potentialRemaining = 0   // Difference between max and current
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);

  // Animate the flow paths
  useEffect(() => {
    if (!showSankeyFlow) return;
    
    // Reset and start animation
    setAnimationProgress(0);
    const duration = 2000; // 2 seconds for smooth animation
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [showSankeyFlow, currentBenefit, currentAge, currentMonths]);

  // Calculate bar heights as percentages (relative to max benefit)
  const maxHeight = 400; // pixels
  const baselineHeight = (baselineBenefit / maxBenefit) * maxHeight;
  const currentHeight = (currentBenefit / maxBenefit) * maxHeight;
  const maxHeight100 = maxHeight; // Green bar is always 100%

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format age display (e.g., "62 years, 3 months")
  const formatAge = (years, months) => {
    if (months === 0) {
      return `${years} years`;
    }
    return `${years} years, ${months} month${months === 1 ? '' : 's'}`;
  };

  // SVG dimensions and positions for Sankey flows
  const svgWidth = 600;
  const svgHeight = maxHeight + 100;
  const barWidth = 120;
  const barSpacing = 180;
  
  // Bar positions (centers)
  const redBarX = 90;
  const blueBarX = redBarX + barSpacing;
  const greenBarX = blueBarX + barSpacing;

  // Calculate flow paths that attach to full bar heights
  const createSankeyFlow = (fromX, fromBottomY, fromTopY, toX, toBottomY, toTopY) => {
    const midX = (fromX + toX) / 2;
    
    // Create Sankey flow that connects full bar heights
    // Bottom edge flows from source bottom to destination bottom
    // Top edge flows from source top to destination top
    const path = `
      M ${fromX} ${fromBottomY}
      C ${midX} ${fromBottomY}, ${midX} ${toBottomY}, ${toX} ${toBottomY}
      L ${toX} ${toTopY}
      C ${midX} ${toTopY}, ${midX} ${fromTopY}, ${fromX} ${fromTopY}
      Z
    `;
    
    return path;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Chart Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Your Social Security Filing Options
        </h2>
        <p className="text-gray-600">
          {showSankeyFlow 
            ? "Watching your guaranteed income grow month by month" 
            : "See how your monthly benefit changes month by month"
          }
        </p>
      </div>

      {/* Three Bar Chart with Sankey Flows */}
      <div className="relative" style={{ height: `${svgHeight}px` }}>
        {/* SVG Layer for Sankey Flows */}
        {showSankeyFlow && (
          <svg 
            className="absolute top-0 left-1/2 transform -translate-x-1/2"
            width={svgWidth} 
            height={svgHeight}
            style={{ zIndex: 0 }}
          >
            <defs>
              {/* Gradient for gain already made (green) */}
              <linearGradient id="gainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
              </linearGradient>
              
              {/* Gradient for potential remaining (blue) */}
              <linearGradient id="potentialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            
            {/* Flow 1: Gain Already Made (Red → Blue) - Green flow */}
            {gainAlreadyMade > 0 && (
              <g>
                <path
                  d={createSankeyFlow(
                    redBarX + barWidth/2,           // From X (right edge of red bar)
                    svgHeight,                       // From Bottom Y (bottom of SVG)
                    svgHeight - baselineHeight,      // From Top Y (top of red bar)
                    blueBarX - barWidth/2,          // To X (left edge of blue bar)
                    svgHeight,                       // To Bottom Y (bottom of SVG)
                    svgHeight - currentHeight        // To Top Y (top of blue bar)
                  )}
                  fill="url(#gainGradient)"
                  opacity={animationProgress}
                  className="transition-opacity duration-1000"
                />
                {/* Animated particles flowing along the path */}
                {animationProgress > 0.3 && (
                  <circle
                    cx={redBarX + barWidth/2 + (blueBarX - redBarX - barWidth) * ((animationProgress - 0.3) / 0.7)}
                    cy={svgHeight - baselineHeight/2 - ((svgHeight - baselineHeight/2) - (svgHeight - currentHeight/2)) * ((animationProgress - 0.3) / 0.7)}
                    r="5"
                    fill="#10b981"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="r"
                      values="5;7;5"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            )}
            
            {/* Flow 2: Potential Remaining (Blue → Green) - Blue flow */}
            {potentialRemaining > 0 && (
              <g>
                <path
                  d={createSankeyFlow(
                    blueBarX + barWidth/2,          // From X (right edge of blue bar)
                    svgHeight,                       // From Bottom Y (bottom of SVG)
                    svgHeight - currentHeight,       // From Top Y (top of blue bar)
                    greenBarX - barWidth/2,         // To X (left edge of green bar)
                    svgHeight,                       // To Bottom Y (bottom of SVG)
                    svgHeight - maxHeight100         // To Top Y (top of green bar)
                  )}
                  fill="url(#potentialGradient)"
                  opacity={animationProgress * 0.8}
                  className="transition-opacity duration-1000"
                />
                {/* Animated particles flowing along the path */}
                {animationProgress > 0.5 && (
                  <circle
                    cx={blueBarX + barWidth/2 + (greenBarX - blueBarX - barWidth) * ((animationProgress - 0.5) / 0.5)}
                    cy={svgHeight - currentHeight/2 - ((svgHeight - currentHeight/2) - (svgHeight - maxHeight100/2)) * ((animationProgress - 0.5) / 0.5)}
                    r="5"
                    fill="#3b82f6"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="r"
                      values="5;7;5"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            )}
          </svg>
        )}

        {/* Bars Container */}
        <div className="flex items-end justify-around gap-8 relative" style={{ zIndex: 1, height: '100%' }}>
          
          {/* Red Bar - Age 62 */}
          <div className="flex flex-col items-center flex-1">
            {/* Benefit Amount Label */}
            <div className="mb-2 text-center">
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(baselineBenefit)}
              </div>
              <div className="text-sm text-gray-500">per month</div>
            </div>
            
            {/* Bar */}
            <div 
              className="w-full bg-red-500 rounded-t-lg relative transition-all duration-300 ease-in-out"
              style={{ height: `${baselineHeight}px`, maxWidth: '120px' }}
            >
              {/* Value indicator inside bar */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-white font-semibold text-sm">
                Age 62
              </div>
            </div>
            
            {/* Age Label */}
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-700">Baseline</div>
              <div className="text-xs text-gray-500">Earliest Preferred Filing Age</div>
            </div>
          </div>

          {/* Blue Bar - Current Selection */}
          <div className="flex flex-col items-center flex-1">
            {/* Benefit Amount Label */}
            <div className="mb-2 text-center">
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(currentBenefit)}
              </div>
              <div className="text-sm text-gray-500">per month</div>
            </div>
            
            {/* Bar */}
            <div 
              className="w-full bg-blue-500 rounded-t-lg relative transition-all duration-300 ease-in-out shadow-lg"
              style={{ height: `${currentHeight}px`, maxWidth: '120px' }}
            >
              {/* Value indicator inside bar */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-white font-semibold text-sm px-1">
                {currentAge !== null && formatAge(currentAge, currentMonths)}
              </div>
            </div>
            
            {/* Age Label */}
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-700">Your Selection</div>
              <div className="text-xs text-gray-500">Current Preferred Filing Age</div>
            </div>
          </div>

          {/* Green Bar - Age 70 */}
          <div className="flex flex-col items-center flex-1">
            {/* Benefit Amount Label */}
            <div className="mb-2 text-center">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(maxBenefit)}
              </div>
              <div className="text-sm text-gray-500">per month</div>
            </div>
            
            {/* Bar */}
            <div 
              className="w-full bg-green-500 rounded-t-lg relative transition-all duration-300 ease-in-out"
              style={{ height: `${maxHeight100}px`, maxWidth: '120px' }}
            >
              {/* Value indicator inside bar */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-white font-semibold text-sm">
                Age 70
              </div>
            </div>
            
            {/* Age Label */}
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-700">Maximum</div>
              <div className="text-xs text-gray-500">Latest Preferred Filing Age</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Progress Indicator with Flow Information */}
      {showSankeyFlow ? (
        <div className="mt-8 space-y-4">
          {/* Gain Already Made */}
          {gainAlreadyMade > 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-800">Gain Already Made</span>
                </div>
                <span className="text-lg font-bold text-green-700">
                  {formatCurrency(gainAlreadyMade)}
                </span>
              </div>
              <div className="text-xs text-green-700">
                Locked in by waiting beyond age 62 • Guaranteed for life
              </div>
            </div>
          )}
          
          {/* Potential Remaining */}
          {potentialRemaining > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-blue-800">Potential Remaining</span>
                </div>
                <span className="text-lg font-bold text-blue-700">
                  {formatCurrency(potentialRemaining)}
                </span>
              </div>
              <div className="text-xs text-blue-700">
                Available by waiting until age 70 • Each month adds value
              </div>
            </div>
          )}

          {/* Total Progress Bar */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress to Maximum Benefit</span>
              <span className="text-sm font-semibold text-gray-800">
                {Math.round((currentBenefit / maxBenefit) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
              <div 
                className="h-3 rounded-full transition-all duration-500 ease-out relative"
                style={{ 
                  width: `${(currentBenefit / maxBenefit) * 100}%`,
                  background: 'linear-gradient(to right, #10b981, #3b82f6)'
                }}
              >
                {/* Animated shimmer effect */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                  style={{
                    animation: 'shimmer 2s infinite',
                    transform: `translateX(${animationProgress * 200 - 100}%)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Original Progress Indicator */
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progress to Maximum Benefit</span>
            <span className="text-sm font-semibold text-gray-800">
              {Math.round((currentBenefit / maxBenefit) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${(currentBenefit / maxBenefit) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Add shimmer animation keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
};

export default ThreeBarChart;
