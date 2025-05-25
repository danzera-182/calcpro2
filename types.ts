export interface InputFormData {
  initialInvestment: number;
  contributionValue: number; // Value of the contribution (always monthly)
  rateValue: number; // Value of the rate (always annual percentage)
  // frequencyType: 'monthly' | 'yearly'; // REMOVED: Dictates if rateValue & contributionValue are monthly or annual
  investmentPeriodYears: number;
  effectiveAnnualRate: number; // Annual rate, will be same as rateValue as input is always annual
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

// Types for Backtesting
export interface BenchmarkDataPoint {
  year: number; // Represents the Nth year in the past, e.g., 1 for "1 year ago" - 2023
  ipcaRate: number; // Annual rate, e.g., 0.05 for 5%
  ibovespaRate: number;
  cdiRate: number;
}

export interface BacktestProjectionPoint {
  year: number; // Nth year of investment
  userStrategyValue: number;
  ipcaValue: number;
  ibovespaValue: number;
  cdiValue: number;
}

export type BacktestDataType = 'user' | 'ipca' | 'ibovespa' | 'cdi';

export interface BacktestResults {
  data: BacktestProjectionPoint[];
  period: number; // Actual number of years used in backtest
}

// Types for Fixed Income Comparator
export type FixedIncomeInvestmentType = 'pre' | 'post';
export type TermUnit = 'days' | 'years';

export interface FixedIncomeResult {
  netYield: number; // as percentage, e.g. 8.5 for 8.5%
  irRateApplied: number; // as percentage, e.g. 15 for 15%
  grossRateUsed: number; // as percentage, e.g. 10 for 10%
  termDays: number;
  investmentType: FixedIncomeInvestmentType;
  originalInputs: {
    grossAnnualRatePre?: number;
    cdiPercentagePost?: number;
    currentCdiRatePost?: number;
  };
  equivalentCdiPercentageNet?: number; // as percentage, e.g. 85 for 85% of CDI
}

// Type for App View
export type AppView = 'selector' | 'compoundInterest' | 'fixedIncomeComparator' | 'comprehensiveComparator';

// Types for Comprehensive Comparator
export type InvestmentPeriodUnit = 'months' | 'years';

export interface ComprehensiveInputs {
  // Main Simulation Parameters
  initialInvestment: number;
  monthlyContributions: number;
  applicationPeriodValue: number;
  applicationPeriodUnit: InvestmentPeriodUnit;

  // Economic Indicators
  selicRate: number;          // Selic efetiva (a.a.) %
  cdiRate: number;            // CDI (a.a.) %
  ipcaRate: number;           // IPCA (a.a.) %
  trRate: number;             // TR (a.m.) %

  // Tesouro Prefixado
  tesouroPrefixadoNominalRate: number; // Juro nominal do Tesouro Prefixado (a.a.) %
  tesouroCustodyFeeB3: number;        // Taxa de custódia da B3 no Tesouro Direto (a.a.) %

  // Tesouro IPCA+
  tesouroIpcaRealRate: number;        // Juro real do Tesouro IPCA+ (a.a.) %
  
  // Other Investment Types
  cdbRatePercentageOfCdi: number;      // Rentabilidade do CDB (% do CDI) - Input is the percentage value
  lciLcaRatePercentageOfCdi: number;   // Rentabilidade da LCI/LCA (% do CDI) - Input is the percentage value
  poupancaRateMonthly: number;         // Rentabilidade da Poupança (a.m.) %
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