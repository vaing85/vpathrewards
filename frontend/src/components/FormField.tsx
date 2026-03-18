import React from 'react';

interface FormFieldProps {
  label?: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  rows?: number;
  as?: 'input' | 'textarea';
  showSuccess?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched = false,
  required = false,
  disabled = false,
  className = '',
  autoComplete,
  min,
  max,
  rows = 4,
  as = 'input',
  showSuccess = false,
}) => {
  const hasError = touched && error;
  const hasSuccess = touched && !error && value && showSuccess;

  const baseInputClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm
    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
    sm:text-sm transition-colors
    ${hasError 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
      : hasSuccess
      ? 'border-green-300 text-green-900 focus:ring-green-500 focus:border-green-500'
      : 'border-gray-300 text-gray-900 focus:ring-primary-500 focus:border-primary-500'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${className}
  `;

  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {as === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? `${name}-error` : undefined}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            min={min}
            max={max}
            className={baseInputClasses}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? `${name}-error` : undefined}
          />
        )}
        
        {/* Success Icon */}
        {hasSuccess && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}

        {/* Error Icon */}
        {hasError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Helper Text (for password strength, etc.) */}
      {!hasError && type === 'password' && value && (
        <div className="mt-1">
          <div className="text-xs text-gray-500">
            {value.length < 6 && 'Password should be at least 6 characters'}
            {value.length >= 6 && value.length < 8 && 'Password strength: Weak'}
            {value.length >= 8 && value.length < 12 && 'Password strength: Medium'}
            {value.length >= 12 && 'Password strength: Strong'}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormField;
