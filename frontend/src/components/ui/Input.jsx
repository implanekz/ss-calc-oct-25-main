import React from 'react';

export const Input = React.forwardRef(({
  className = '',
  type = 'text',
  error = false,
  label,
  helperText,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
        </label>
      )}
      <input
        type={type}
        ref={ref}
        className={`
          input-field
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = React.forwardRef(({
  className = '',
  error = false,
  label,
  helperText,
  children,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          input-field
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export const Checkbox = React.forwardRef(({
  className = '',
  label,
  ...props
}, ref) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        ref={ref}
        className={`
          w-4 h-4 text-primary-600 bg-white border-gray-300 rounded
          focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          transition-all
          ${className}
        `}
        {...props}
      />
      {label && (
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
          {label}
        </span>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

export const Slider = React.forwardRef(({
  className = '',
  label,
  value,
  displayValue,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
          {displayValue !== undefined && (
            <span className="text-sm font-semibold text-primary-600">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        ref={ref}
        value={value}
        className={`
          w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
          accent-primary-600
          ${className}
        `}
        {...props}
      />
    </div>
  );
});

Slider.displayName = 'Slider';
