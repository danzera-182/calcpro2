
export interface InputFormData {
  initialInvestment: number;
  contributionValue: number; // Value of the contribution (always monthly)
  rateValue: number; // Value of the rate (always annual percentage)
  investmentPeriodYears: number;
  // effectiveAnnualRate: number; // REMOVED: Was primarily for backtesting
}

export interface ProjectionPoint {
  year: number;
  initialBalance: number; // Balance at the start of the year
  totalContributions: number; // Total contributions during the year (excluding initial investment for year 1)
  totalInterestEarned: number; // Total interest earned during the year
  finalBalance: number; // Balance at the end of the year
  cumulativeContributions: number; // Cumulative contributions up to this year (including initial investment)
  cumulativeInterest: number; // Cumulative interest up to this year
}

export interface MonthlyProjectionPoint {
  globalMonth: number;
  year: number;
  monthInYear: number;
  initialBalanceMonthly: number;
  contributionMonthly: number;
  interestEarnedMonthly: number;
  finalBalanceMonthly: number;
}

export interface ChartDataPoint {
  year: number;
  value: number; // Final balance for the year
  totalInvested: number; // Initial + cumulative contributions
}

export interface ScenarioData {
  label: string;
  data: ProjectionPoint[];
  monthlyData?: MonthlyProjectionPoint[];
}

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Types for Fixed Income Comparator
export type FixedIncomeInvestmentType = 'pre' | 'post';
export type TermUnit = 'days' | 'years';
export type ConversionDirection = 'grossToNet' | 'netToGross';

export interface FixedIncomeResult {
  // Inputs from user at time of calculation
  conversionDirection: ConversionDirection;
  investmentType: FixedIncomeInvestmentType;
  termDays: number;
  inputRateDirect: number; // The rate value user typed directly (e.g., 10 for 10% or 100 for 100% CDI)
  currentCdiRateForPost?: number; // Only if investmentType is 'post'

  // Core calculated values
  irRateAppliedPercent: number; // e.g. 15 for 15%
  
  // The actual gross and net annual rates (%) after all considerations
  finalGrossAnnualRate: number; 
  finalNetAnnualRate: number;

  // For post-fixed, the equivalent %CDI for gross and net
  // These are derived from finalGrossAnnualRate and finalNetAnnualRate
  equivalentGrossCdiPercentage?: number;
  equivalentNetCdiPercentage?: number;
}


// Type for App View
export type AppView = 'selector' | 'compoundInterest' | 'fixedIncomeComparator' | 'comprehensiveComparator';

// Types for Comprehensive Comparator
export type InvestmentPeriodUnit = 'months' | 'years';

export interface ComprehensiveInputs {
  // Main Simulation Parameters
  initialInvestment: number | null;
  monthlyContributions: number | null;
  applicationPeriodValue: number | null; // Changed from number to allow null
  applicationPeriodUnit: InvestmentPeriodUnit;

  // Economic Indicators
  selicRate: number | null;          // Selic efetiva (a.a.) %
  cdiRate: number | null;            // CDI (a.a.) %
  ipcaRate: number | null;           // IPCA (a.a.) %
  trRate: number | null;             // TR (a.m.) %

  // Tesouro Prefixado
  tesouroPrefixadoNominalRate: number | null; // Juro nominal do Tesouro Prefixado (a.a.) %
  tesouroCustodyFeeB3: number | null;        // Taxa de custódia da B3 no Tesouro Direto (a.a.) %

  // Tesouro IPCA+
  tesouroIpcaRealRate: number | null;        // Juro real do Tesouro IPCA+ (a.a.) %
  
  // Other Investment Types
  cdbRatePercentageOfCdi: number | null;      // Rentabilidade do CDB (% do CDI) - Input is the percentage value
  lciLcaRatePercentageOfCdi: number | null;   // Rentabilidade da LCI/LCA (% do CDI) - Input is the percentage value
  // poupancaRateMonthly: number | null;      // REMOVED: Rentabilidade da Poupança (a.m.) % - Será calculada
}

export interface InvestmentCalculationResult {
  name: string;
  finalGrossBalance: number; // Balance after all contributions and interest, before IR (and after operational fees)
  netBalance: number;        // Final balance after IR
  totalInvested: number;
  totalInterestEarned: number; // Gross interest earned over the period (after operational fees, before IR)
  irRateAppliedPercent: number; // IR rate applied, e.g., 15 for 15%
  irAmount: number;
  effectiveAnnualRateUsedPercent?: number; // Informational: effective annual rate used in calculation (after op. fees, before IR)
  effectiveMonthlyRateUsedPercent?: number; // Informational: effective monthly rate used in calculation (after op. fees, before IR)
  operationalFeesPaid?: number; // Total operational fees (custody, admin) estimated over the period
}

// Type for USD/BRL Exchange Rate
export interface UsdBrlRateInfo {
  rate: number;      // Exchange rate (e.g., PTAX Venda)
  dateTime: string;  // ISO string or formatted string of the quotation date/time
}