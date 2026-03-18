import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  email?: boolean;
  match?: string; // Value to match against
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string | null;
}

export interface FormTouched {
  [key: string]: boolean;
}

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});

  const validateField = useCallback(
    (name: string, value: string): string | null => {
      const rule = rules[name];
      if (!rule) return null;

      // Required check
      if (rule.required && (!value || value.trim() === '')) {
        return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
      }

      // Skip other validations if field is empty and not required
      if (!value || value.trim() === '') {
        return null;
      }

      // Email validation
      if (rule.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
      }

      // Min length
      if (rule.minLength && value.length < rule.minLength) {
        return `Must be at least ${rule.minLength} characters`;
      }

      // Max length
      if (rule.maxLength && value.length > rule.maxLength) {
        return `Must be no more than ${rule.maxLength} characters`;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return 'Invalid format';
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) return customError;
      }

      // Match validation
      if (rule.match) {
        // This will be handled at form level for password confirmation
      }

      return null;
    },
    [rules]
  );

  const validateForm = useCallback(
    (values: { [key: string]: string }): boolean => {
      const newErrors: FormErrors = {};
      let isValid = true;

      Object.keys(rules).forEach((key) => {
        const error = validateField(key, values[key] || '');
        if (error) {
          newErrors[key] = error;
          isValid = false;
        } else {
          newErrors[key] = null;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [rules, validateField]
  );

  const handleBlur = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
    },
    []
  );

  const handleChange = useCallback(
    (name: string, value: string) => {
      // Only validate if field has been touched
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField]
  );

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = (name: string): string | null => {
    return errors[name] || null;
  };

  const isFieldTouched = (name: string): boolean => {
    return touched[name] || false;
  };

  const hasError = (name: string): boolean => {
    return !!errors[name];
  };

  return {
    errors,
    touched,
    validateField,
    validateForm,
    handleBlur,
    handleChange,
    reset,
    getFieldError,
    isFieldTouched,
    hasError,
  };
};
