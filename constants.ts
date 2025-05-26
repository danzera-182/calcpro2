
import { InputFormData, ComprehensiveInputs } from './types';

export const DEFAULT_INPUT_VALUES: InputFormData = {
  initialInvestment: 1000,
  contributionValue: 100, // This is now always monthly
  rateValue: 8,           // This is now always annual
  investmentPeriodYears: 10,
  // effectiveAnnualRate: 8, // REMOVED
};

// Reverted to a more standard/vibrant color set
export const CHART_COLORS = {
  mainStrategy: '#3B82F6',   // Blue-500
  totalInvested: '#6B7280', // Gray-500

  ipca: '#F59E0B',           // Amber-500
  ibovespa: '#10B981',       // Emerald-500
  cdi: '#8B5CF6',            // Violet-500
};

// For Fixed Income Comparator
export const DEFAULT_CDI_RATE = 10.65; // Default CDI rate in percentage (e.g., 10.65% a.a.)

// For Comprehensive Comparator
export const DEFAULT_COMPREHENSIVE_INPUTS: ComprehensiveInputs = {
  initialInvestment: 0,
  monthlyContributions: 0,
  applicationPeriodValue: 1,
  applicationPeriodUnit: 'years',

  selicRate: 10.50, // Updated to a more current typical value
  cdiRate: 10.40,  // Updated to a more current typical value (slightly below Selic)
  ipcaRate: 3.75,  // Updated to a more current typical value
  trRate: 0.05,    // Fallback TR value, as it will now be auto-fetched from SGS 226.

  tesouroPrefixadoNominalRate: 11.00,
  tesouroCustodyFeeB3: 0.20,

  tesouroIpcaRealRate: 5.50,

  cdbRatePercentageOfCdi: 100,
  lciLcaRatePercentageOfCdi: 85,
  // poupancaRateMonthly: 0.6726, // REMOVED - Será calculado
};