
import React, { useState, useEffect, useCallback } from 'react';
import { formatNumberForDisplay, parseInputToNumber } from '../../utils/formatters';
import Input from './Input'; // Assuming Input.tsx is in the same ui folder

interface FormattedNumericInputProps {
  id: string;
  name: string;
  label: React.ReactNode;
  value: number | null | undefined;
  onChange: (name: string, value: number | null) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  // Controls formatting for display, especially for onBlur
  displayOptions?: Intl.NumberFormatOptions; 
}

const FormattedNumericInput: React.FC<FormattedNumericInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
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
    formatNumberForDisplay(value, displayOptions, '') // Format initial value or show empty
  );

  useEffect(() => {
    // Update displayValue if props.value changes from outside,
    // but only if the input is not currently focused to avoid disrupting typing.
    // A more robust check might involve comparing parsed displayValue with props.value.
    if (document.activeElement !== document.getElementById(id)) {
        setDisplayValue(formatNumberForDisplay(value, displayOptions, ''));
    }
  }, [value, id, displayOptions]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    setDisplayValue(rawValue); // Show exactly what user types

    const numericValue = parseInputToNumber(rawValue);
    
    // Basic validation against min/max if they are provided
    // More complex validation can be added
    if (numericValue !== null) {
        if (min !== undefined && numericValue < min) {
            // onChange(name, min); // Or handle as an error, or clamp
            // For now, let it be, will be clamped/formatted on blur or by parent
        } else if (max !== undefined && numericValue > max) {
            // onChange(name, max);
        }
    }
    onChange(name, numericValue);

  }, [name, onChange, min, max]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    let numericValue = parseInputToNumber(event.target.value);

    // Clamp to min/max on blur if defined
    if (numericValue !== null) {
      if (min !== undefined && numericValue < min) {
        numericValue = min;
      }
      if (max !== undefined && numericValue > max) {
        numericValue = max;
      }
    }
    
    // Update parent state with potentially clamped value
    // (Only if it changed due to clamping or if it was null and became a valid number like 0)
    if (numericValue !== value) { // also handles if numericValue is null and value was a number or vice versa
        onChange(name, numericValue);
    }

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
        type="text" // Use text to control display formatting
        inputMode="decimal" // Hint for mobile keyboards
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        icon={icon}
        disabled={disabled}
        className={inputClassName}
      />
    </div>
  );
};

export default FormattedNumericInput;
