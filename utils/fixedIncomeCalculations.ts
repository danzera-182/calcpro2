
/**
 * Calculates the Income Tax (IR) rate based on the investment term in days.
 * @param termDays - The investment term in days.
 * @returns The IR rate as a decimal (e.g., 0.225 for 22.5%).
 */
export const getIrRate = (termDays: number): number => {
  if (termDays <= 0) return 0.225; // Default for invalid or very short terms
  if (termDays <= 180) return 0.225;
  if (termDays <= 360) return 0.20;
  if (termDays <= 720) return 0.175;
  return 0.15; // For terms above 720 days
};

/**
 * Converts a percentage of CDI to a gross annual rate.
 * @param cdiPercentage - The percentage of CDI (e.g., 90 for 90%).
 * @param currentCdiRate - The current annual CDI rate (e.g., 10.65 for 10.65%).
 * @returns The gross annual rate as a percentage (e.g., 9.585 for 9.585%).
 */
export const convertCdiPercentageToGrossRate = (cdiPercentage: number, currentCdiRate: number): number => {
  return (cdiPercentage / 100) * currentCdiRate;
};

/**
 * Calculates the net annual yield after applying income tax using a simplified formula.
 * Taxa Líquida = Taxa Bruta Anual * (1 - Alíquota IR)
 * @param grossAnnualRatePercent - The gross annual interest rate (e.g., 10 for 10%).
 * @param termDays - The investment term in days, used to determine the IR rate.
 * @returns The net annual yield as a percentage (e.g., 8.5 for 8.5%).
 */
export const calculateNetAnnualYield = (grossAnnualRatePercent: number, termDays: number): number => {
  if (grossAnnualRatePercent < -100) { 
    grossAnnualRatePercent = -100;
  }

  const grossAnnualRateDecimal = grossAnnualRatePercent / 100;
  const irRateDecimal = getIrRate(termDays);

  const netAnnualRateDecimal = grossAnnualRateDecimal * (1 - irRateDecimal);

  return netAnnualRateDecimal * 100; 
};

/**
 * Calculates the gross annual rate required to achieve a specific net annual yield after income tax.
 * Taxa Bruta Anual = Taxa Líquida Anual / (1 - Alíquota IR)
 * @param netAnnualRatePercent - The desired net annual interest rate (e.g., 8.5 for 8.5%).
 * @param termDays - The investment term in days, used to determine the IR rate.
 * @returns The required gross annual rate as a percentage (e.g., 10 for 10%). Returns 0 if irRate makes denominator 0.
 */
export const calculateGrossAnnualYieldFromNet = (netAnnualRatePercent: number, termDays: number): number => {
  if (netAnnualRatePercent < -100) {
    netAnnualRatePercent = -100; // Cap sensible net rate for calculation
  }
  
  const netAnnualRateDecimal = netAnnualRatePercent / 100;
  const irRateDecimal = getIrRate(termDays);

  const factor = 1 - irRateDecimal;

  if (factor === 0) { 
    // This case (IR = 100%) shouldn't happen with current IR rules.
    // If net rate is non-zero, it implies infinite gross rate. If net rate is zero, gross rate is also zero.
    return netAnnualRateDecimal === 0 ? 0 : Infinity; // Or handle as an error/specific value
  }
  if (factor < 0) {
    // This case (IR > 100%) also shouldn't happen.
    // The sign of gross rate would flip compared to net rate.
  }
  
  const grossAnnualRateDecimal = netAnnualRateDecimal / factor;
  
  return grossAnnualRateDecimal * 100; // Convert back to percentage
};


/**
 * Helper to convert years to days.
 * @param years - Number of years.
 * @returns Number of days.
 */
export const yearsToDays = (years: number): number => {
  return Math.round(years * 365);
};

/**
 * Helper to convert days to years.
 * @param days - Number of days.
 * @returns Number of years (as a string, formatted to 2 decimal places).
 */
export const daysToYears = (days: number): string => {
    return (days / 365).toFixed(2);
};
