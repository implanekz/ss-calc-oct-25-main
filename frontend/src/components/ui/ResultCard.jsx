import React from 'react';
import PropTypes from 'prop-types';

/**
 * ResultCard component - For displaying calculation results with labels and values
 * Based on design patterns from WidowCalculator.jsx
 */
const ResultCard = ({ 
    label, 
    value, 
    sublabel, 
    variant = 'default',
    icon,
    className = ''
}) => {
    // Text color based on variant
    const valueColors = {
        default: 'text-gray-900',
        success: 'text-emerald-900',
        emerald: 'text-emerald-700',
        warning: 'text-yellow-900',
        error: 'text-red-900',
        info: 'text-blue-900',
        purple: 'text-purple-900'
    };
    
    // Background based on variant
    const bgColors = {
        default: 'bg-white bg-opacity-60',
        success: 'bg-white bg-opacity-60',
        emerald: 'bg-white bg-opacity-60',
        warning: 'bg-white bg-opacity-60',
        error: 'bg-white bg-opacity-60',
        info: 'bg-white bg-opacity-60',
        purple: 'bg-white bg-opacity-60'
    };
    
    const cardClasses = `${bgColors[variant]} rounded-lg p-4 ${className}`;
    const valueClass = `text-2xl font-bold ${valueColors[variant]}`;
    
    return (
        <div className={cardClasses}>
            <p className="text-sm text-gray-600 mb-1">
                {icon && <span className="mr-1">{icon}</span>}
                {label}
            </p>
            <p className={valueClass}>
                {value}
            </p>
            {sublabel && (
                <p className="text-xs text-gray-500 mt-1">
                    {sublabel}
                </p>
            )}
        </div>
    );
};

ResultCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sublabel: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'success', 'emerald', 'warning', 'error', 'info', 'purple']),
    icon: PropTypes.string,
    className: PropTypes.string
};

export default ResultCard;
