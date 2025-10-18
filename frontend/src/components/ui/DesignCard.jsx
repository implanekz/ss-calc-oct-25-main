import React from 'react';
import PropTypes from 'prop-types';

/**
 * Card component - Reusable container with multiple style variants
 * Based on design patterns from WidowCalculator.jsx
 */
const Card = ({ 
    title, 
    icon, 
    variant = 'default', 
    children, 
    className = '',
    onClick,
    onMouseEnter,
    onFocus,
    tabIndex,
    role
}) => {
    // Base styles that apply to all variants
    const baseStyles = 'rounded-lg p-6';
    
    // Variant-specific styles
    const variantStyles = {
        default: 'bg-white border border-gray-200 shadow-sm',
        success: 'bg-green-50 border-2 border-green-500',
        warning: 'bg-yellow-50 border border-yellow-200',
        amber: 'bg-amber-50 border-2 border-amber-500',
        info: 'bg-blue-50 border border-blue-200',
        purple: 'bg-purple-50 border border-purple-200',
        error: 'bg-red-50 border border-red-200',
        gradient_emerald: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-600 shadow-sm',
        gradient_purple: 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-500 shadow-sm',
        optimal: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-600 shadow-sm cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2'
    };
    
    // Title text color based on variant
    const titleColors = {
        default: 'text-gray-900',
        success: 'text-green-900',
        warning: 'text-yellow-900',
        amber: 'text-amber-900',
        info: 'text-blue-900',
        purple: 'text-purple-900',
        error: 'text-red-900',
        gradient_emerald: 'text-emerald-900',
        gradient_purple: 'text-purple-900',
        optimal: 'text-emerald-900'
    };
    
    // Combine all styles
    const cardClasses = `${baseStyles} ${variantStyles[variant]} ${className}`;
    
    // Interactive props
    const interactiveProps = onClick || onMouseEnter || onFocus ? {
        onClick,
        onMouseEnter,
        onFocus,
        tabIndex: tabIndex ?? 0,
        role: role ?? 'button'
    } : {};
    
    return (
        <div className={cardClasses} {...interactiveProps}>
            {(title || icon) && (
                <h2 className={`text-xl font-semibold ${titleColors[variant]} mb-4`}>
                    {icon && <span className="mr-2">{icon}</span>}
                    {title}
                </h2>
            )}
            {children}
        </div>
    );
};

Card.propTypes = {
    title: PropTypes.string,
    icon: PropTypes.string,
    variant: PropTypes.oneOf([
        'default',
        'success',
        'warning',
        'amber',
        'info',
        'purple',
        'error',
        'gradient_emerald',
        'gradient_purple',
        'optimal'
    ]),
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    onClick: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onFocus: PropTypes.func,
    tabIndex: PropTypes.number,
    role: PropTypes.string
};

export default Card;
