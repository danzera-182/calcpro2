
export const formatCurrency = (value: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number, decimalPlaces: number = 2): string => {
  return value.toFixed(decimalPlaces);
};

/**
 * Formats a number for display in pt-BR locale.
 * @param value The number to format.
 * @param options Intl.NumberFormatOptions, defaults to 2 min/max fraction digits.
 * @param placeholder String to return if value is null, undefined, or NaN.
 * @returns Formatted string or placeholder.
 */
export const formatNumberForDisplay = (
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  placeholder: string = ''
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return placeholder;
  }
  // Ensure default minimumFractionDigits is applied if not overridden
  const actualOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2, // Default, can be overridden by options
    ...options,
  };
  return new Intl.NumberFormat('pt-BR', actualOptions).format(value);
};

/**
 * Parses a string input (potentially formatted in pt-BR) into a number.
 * @param inputString The string to parse.
 * @returns A number, or null if parsing fails or input is empty.
 */
export const parseInputToNumber = (inputString: string | null | undefined): number | null => {
  if (inputString === null || inputString === undefined || inputString.trim() === '') {
    return null;
  }

  // Remove common currency symbols or non-numeric characters except comma and period
  let cleanedString = inputString.replace(/[R$\s]/g, ''); 

  // Normalize pt-BR format (1.000,50) to standard format (1000.50)
  // Count occurrences of '.' and ','
  const dotCount = (cleanedString.match(/\./g) || []).length;
  const commaCount = (cleanedString.match(/,/g) || []).length;

  if (dotCount > 0 && commaCount > 0) { // e.g., "1.234,56"
    cleanedString = cleanedString.replace(/\./g, '').replace(',', '.');
  } else if (commaCount > 0 && dotCount === 0) { // e.g., "1234,56"
    cleanedString = cleanedString.replace(',', '.');
  } else if (dotCount > 0 && commaCount === 0) { // e.g., "1.234" or "1234.56" (could be US or integer with thousands)
    // If it's like "1.234" and it's likely an integer, remove dots.
    // If it's "1234.56", it's fine. This is trickier without more context.
    // For now, assume dots are thousands if a comma isn't present for decimal.
    // This logic might need adjustment if US-style "1,234.56" is also possible.
    // Given pt-BR focus, this should be safe: if only dots, they are thousands.
     if (cleanedString.lastIndexOf('.') < cleanedString.length - 3) { // Heuristic: dot is likely a thousands separator
        cleanedString = cleanedString.replace(/\./g, '');
     }
  }
  // At this point, cleanedString should be like "1234.56" or "1234"

  const num = parseFloat(cleanedString);

  if (isNaN(num)) {
    return null;
  }
  return num;
};
