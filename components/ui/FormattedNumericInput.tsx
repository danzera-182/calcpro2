
import React, { useState, useEffect, useCallback } from 'react';
import { formatNumberForDisplay, parseInputToNumber } from '../../utils/formatters';
import Input from './Input'; // Assuming Input.tsx is in the same ui folder

interface FormattedNumericInputProps {
  id: string;
  name: string;
  label: React.ReactNode;
  value: number | null | undefined;
  onChange: (name: string, value: number | null) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void; // Added to allow parent to pass onFocus
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  displayOptions?: Intl.NumberFormatOptions; 
}

const FormattedNumericInput: React.FC<FormattedNumericInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  onFocus, // Destructure onFocus from props
  onBlur,
  placeholder = "0,00",
  icon,
  min,
  max,
  disabled,
  className,
  inputClassName,
  displayOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 },
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    formatNumberForDisplay(value, displayOptions, '') 
  );
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    // Update displayValue if props.value changes from outside,
    // but only if the input is not currently focused to avoid disrupting typing.
    if (!isFocused) {
        // Ensure even if value becomes 0 or null from outside, it's formatted correctly
        // ('' if null/undefined and placeholder is not desired for empty state, or formatted '0,00')
        setDisplayValue(formatNumberForDisplay(value, displayOptions, ''));
    }
  }, [value, displayOptions, isFocused]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    setDisplayValue(rawValue); 

    const numericValue = parseInputToNumber(rawValue);
    // onChange is called with the intermediate parsed value.
    // Clamping and final validation might happen on blur or by parent.
    onChange(name, numericValue);

  }, [name, onChange]);

  const handleFocusInternal = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // When focusing, if the underlying numeric value is 0, show an empty string to allow easy typing.
    // Otherwise, show the raw numeric value for direct editing if preferred, or keep formatted.
    // For simplicity and consistency with how it was, let's show the parsed number as string, or empty if 0.
    const numericValue = parseInputToNumber(displayValue); // Parse current display
    if (numericValue === 0) {
      setDisplayValue('');
    } else if (numericValue !== null) {
      // This might be controversial. Some prefer editing raw numbers, others prefer keeping format.
      // Sticking to a more raw representation for editing or simply keeping displayValue.
      // Let's keep displayValue as is, user types over it.
      // Or, if it's 0, clear.
    }
    if (onFocus) { 
      onFocus(event);
    }
  }, [displayValue, onFocus]);


  const handleBlurInternal = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    let numericValue = parseInputToNumber(event.target.value);

    if (numericValue !== null) {
      if (min !== undefined && numericValue < min) {
        numericValue = min;
      }
      if (max !== undefined && numericValue > max) {
        numericValue = max;
      }
    } else if (event.target.value.trim() === '' && (min === undefined || (min !== undefined && 0 >= min))) {
      // If input is cleared and 0 is a valid value (or no min specified), treat as 0.
      // This ensures clearing the field and blurring results in 0 if appropriate,
      // rather than potentially reverting to a previous non-null value if `value` prop hasn't updated yet.
      // However, if `value` prop is the source of truth, this might be overridden.
      // The parent's onChange should handle setting the actual `value` prop to null or 0.
      // For now, let's assume `onChange(name, null)` was called if cleared.
      // If `value` prop is still old, `useEffect` might revert.
      // The key is that `onChange(name, numericValue)` correctly reflects the parsed state.
    }
    
    // Update parent state with potentially clamped/finalized value
    // Only call onChange if the value actually changed after parsing and clamping,
    // or if it was null and became 0 (or vice-versa due to clamping/parsing rules).
    // This condition might be too strict if parent expects null for empty.
    // Let's ensure onChange is called if parsed value differs from prop `value`.
    if (numericValue !== value) { 
        onChange(name, numericValue);
    }

    // Always re-format the display based on the (potentially adjusted) numericValue from parsing,
    // or from the original `value` prop if parsing resulted in null and `value` isn't null.
    // This ensures that if `onChange` updated `value` prop, `useEffect` will catch it if not focused.
    // If focused, this blur is the point to format based on the final numeric value.
    setDisplayValue(formatNumberForDisplay(numericValue, displayOptions, ''));
    
    if (onBlur) {
      onBlur(event);
    }
  }, [name, value, onChange, onBlur, min, max, displayOptions]);

  return (
    <div className={className}>
      <Input
        id={id}
        name={name}
        label={label}
        type="text" 
        inputMode="decimal" 
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocusInternal} 
        onBlur={handleBlurInternal}   
        placeholder={placeholder}
        icon={icon}
        disabled={disabled}
        className={inputClassName}
      />
    </div>
  );
};

export default FormattedNumericInput;
