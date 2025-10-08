import React from 'react';

export const Tabs = ({ children, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
};

export const TabList = ({ children, className = '' }) => {
  return (
    <div className={`flex gap-2 border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hide ${className}`}>
      {children}
    </div>
  );
};

export const Tab = ({ active = false, children, className = '', ...props }) => {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`
        px-4 py-2 font-semibold text-sm whitespace-nowrap
        border-b-2 transition-all duration-200
        ${active
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabPanel = ({ active = false, children, className = '' }) => {
  if (!active) return null;

  return (
    <div role="tabpanel" className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
};

export const PillTabs = ({ children, className = '' }) => {
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {children}
    </div>
  );
};

export const PillTab = ({ active = false, children, className = '', ...props }) => {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`
        px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap
        transition-all duration-200
        ${active
          ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
