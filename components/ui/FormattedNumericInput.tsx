
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
    if (value === 0) {
      setDisplayValue(''); // Clear display if underlying value is 0
    }
    if (onFocus) { // Call parent's onFocus if provided
      onFocus(event);
    }
  }, [value, onFocus]);

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
    }
    
    // Update parent state with potentially clamped/finalized value
    // Only call onChange if the value actually changed after parsing and clamping,
    // or if it was null and became 0 (or vice-versa due to clamping/parsing rules).
    if (numericValue !== value) { 
        onChange(name, numericValue);
    }

    // Always re-format the display based on the (potentially adjusted) numericValue
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
        onFocus={handleFocusInternal} // Use internal handler
        onBlur={handleBlurInternal}   // Use internal handler
        placeholder={placeholder}
        icon={icon}
        disabled={disabled}
        className={inputClassName}
      />
    </div>
  );
};

export default FormattedNumericInput;
