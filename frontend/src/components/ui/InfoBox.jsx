import React from 'react';
import PropTypes from 'prop-types';

/**
 * InfoBox component - For warnings, tips, and informational messages
 * Based on design patterns from WidowCalculator.jsx
 */
const InfoBox = ({ 
    type = 'info', 
    title, 
    children, 
    icon,
    className = '' 
}) => {
    // Type-specific styles
    const typeStyles = {
        warning: {
            container: 'bg-yellow-50 border border-yellow-200',
            title: 'text-yellow-900',
            text: 'text-yellow-800',
            defaultIcon: '⚠️'
        },
        amber: {
            container: 'bg-amber-50 border border-amber-200',
            title: 'text-amber-900',
            text: 'text-amber-800',
            defaultIcon: '⚠️'
        },
        info: {
            container: 'bg-blue-50 border border-blue-200',
            title: 'text-blue-900',
            text: 'text-blue-800',
            defaultIcon: '🔍'
        },
        success: {
            container: 'bg-green-50 border border-green-200',
            title: 'text-green-900',
            text: 'text-green-800',
            defaultIcon: '✅'
        },
        error: {
            container: 'bg-red-50 border border-red-200',
            title: 'text-red-900',
            text: 'text-red-800',
            defaultIcon: '❌'
        },
        purple: {
            container: 'bg-purple-50 border border-purple-200',
            title: 'text-purple-900',
            text: 'text-purple-800',
            defaultIcon: '💡'
        }
    };
    
    const styles = typeStyles[type];
    const displayIcon = icon || styles.defaultIcon;
    
    const containerClasses = `${styles.container} rounded-lg p-4 ${className}`;
    
    return (
        <div className={containerClasses}>
            {title && (
                <h2 className={`text-lg font-semibold ${styles.title} mb-2`}>
                    {displayIcon && <span className="mr-2">{displayIcon}</span>}
                    {title}
                </h2>
            )}
            <div className={`text-sm ${styles.text}`}>
                {children}
            </div>
        </div>
    );
};

InfoBox.propTypes = {
    type: PropTypes.oneOf(['warning', 'amber', 'info', 'success', 'error', 'purple']),
    title: PropTypes.string,
    children: PropTypes.node.isRequired,
    icon: PropTypes.string,
    className: PropTypes.string
};

export default InfoBox;
