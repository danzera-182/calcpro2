export interface InputFormData {
  initialInvestment: number;
  contributionValue: number; // Value of the contribution (always monthly)
  rateValue: number; // Value of the rate (always annual percentage)
  investmentPeriodYears: number;

  // Advanced Simulation Fields
  enableAdvancedSimulation?: boolean;

  // Retirement Simulation
  advancedSimModeRetirement?: boolean;
  currentAge?: number;
  targetAge?: number; // Retirement age
  adjustContributionsForInflation?: boolean;
  expectedInflationRate?: number; // Annual inflation rate %
  desiredMonthlyIncomeToday?: number; // Desired monthly income in today's value

  // Specific Contributions
  advancedSimModeSpecificContributions?: boolean;
  specificContributions?: SpecificContribution[];
}

export interface SpecificContribution {
  id: string; // for React key
  year: number; // Simulation year (1, 2, ...)
  month: number; // Simulation month (1-12)
  amount: number;
  description?: string;
}

export interface ProjectionPoint {
  year: number;
  initialBalance: number; // Balance at the start of the year
  totalContributions: number; // Total contributions during the year (excluding initial investment for year 1, includes specific contributions)
  totalInterestEarned: number; // Total interest earned during the year
  finalBalance: number; // Balance at the end of the year
  cumulativeContributions: number; // Cumulative contributions up to this year (including initial investment and specific contributions)
  cumulativeInterest: number; // Cumulative interest up to this year
  // For retirement display
  age?: number;
  inflatedDesiredMonthlyIncome?: number;
  requiredCapitalForDesiredIncome?: number;
}

export interface MonthlyProjectionPoint {
  globalMonth: number;
  year: number;
  monthInYear: number;
  initialBalanceMonthly: number;
  contributionMonthly: number; // Regular monthly contribution for this month (can be inflation adjusted)
  specificContributionThisMonth: number; // Any specific one-off contribution this month
  interestEarnedMonthly: number;
  finalBalanceMonthly: number;
  age?: number; // Investor's age at the end of this month
}

export interface ChartDataPoint {
  year: number;
  value: number; // Final balance for the year
  totalInvested: number; // Initial + cumulative contributions
  age?: number;
  specificContributionAmount?: number; // Added to store specific contribution amounts for chart tooltips
}

export interface ScenarioData {
  label: string;
  data: ProjectionPoint[];
  monthlyData?: MonthlyProjectionPoint[];
  // Retirement specific results
  retirementAnalysis?: RetirementAnalysisResults;
}

export interface RetirementAnalysisResults {
  targetAge: number;
  projectedCapitalAtRetirement: number;
  finalDesiredMonthlyIncome: number; // Inflated desired monthly income at retirement age
  capitalNeededForDesiredIncome: number; // Based on SWR
  canMeetGoal: boolean;
  swrUsed: number; // Safe Withdrawal Rate used for calculation (e.g., 0.04 for 4%)
  achievableMonthlyIncomeWithProjectedCapital?: number; // Max income with projected capital if goal not met
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
export type AppView = 'selector' | 'compoundInterest' | 'fixedIncomeComparator' | 'comprehensiveComparator' | 'macroEconomicPanel' | 'macroEconomicTerminal' | 'bitcoinChartDetail' | 'usdtChartDetail';

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

// Type for Bitcoin Price
export interface BitcoinPriceHistoryPoint {
  timestamp: number; // Unix timestamp (ms)
  price: number;     // Price at the given timestamp
}

export interface BtcPriceInfo {
  brl: number;
  usd: number;
  lastUpdatedAt: number; // Unix timestamp for when the price was last updated
  marketCapUsd?: number;
  marketCapBrl?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  description?: string; // HTML string for description
  usd_24h_change?: number;
  brl_24h_change?: number;
}

// Type for USDT Price
export interface UsdtPriceInfo {
  brl: number;
  usd: number;
  lastUpdatedAt: number; // Unix timestamp
  marketCapUsd?: number;
  marketCapBrl?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  description?: string; // HTML string for description
  usd_24h_change?: number;
  brl_24h_change?: number;
}

// Type for USD/BRL Exchange Rate
export interface UsdBrlRateInfo {
  rate: number; // PTAX Venda rate
  dateTime: string; // ISO 8601 string for the date/time of the rate
}

// Types for Fund Analyzer - Mantida para não quebrar importações, mas não será foco.
export interface FundInfo {
  id: string; // CNPJ can serve as ID
  cnpj: string; // Raw CNPJ: "00111222000133"
  name: string;
  administratorName?: string;
  managerName?: string;
  fundClass?: string; // e.g., "Fundo de Ações", "Fundo de Renda Fixa", "Fundo Multimercado"
  netAssetValue?: number; // VL_PATRIM_LIQ
  quotaValue?: number; // VL_QUOTA
  reportDate?: string; // DT_COMPTC (e.g., "2023-10-20")
  adminFee?: number; // TAXA_ADM (e.g., 2 for 2%)
  performanceFee?: string; // TAXA_PERFM (e.g., "20% sobre o que exceder 100% do CDI")
  numQuotaholders?: number; // NR_COTST
  targetAudience?: string; // PBLICO_ALVO
  initialInvestment?: number; // APLIC_MIN
}

// Types for MacroEconomicPanel Indicator Modal
export interface IndicatorModalData {
  title: string;
  sgsCode?: string | number; // SGS Code or special identifier like 'PTAX', 'FOCUS_ONLY'
  description: string;
  currentValue: string | number | null | undefined;
  valueSuffix?: string; // General suffix like '% a.a.'
  referenceText?: string;
  sourceText?: string;
  isUSD?: boolean; // For chart tooltip currency formatting for USD values
  isPercentage?: boolean; // If the value is a percentage
  isBillions?: boolean; // For chart tooltip formatting of billions
  valuePrecision?: number; // Default precision for display
  historicalSeriesName?: string; // Name for the chart series
  historicalYAxisLabel?: string; // Label for Y-axis in historical chart
  isDailyData?: boolean; // Hint for chart date formatting for daily series like CDI
  seriesType?: 'PTAX' | 'SGS_CALCULATED_ANNUAL_CDI' | 'SGS_PERCENT_VAR_FROM_INDEX'; // For modal fetching logic

  // Card-specific display properties
  displayDivisor?: number; // Value to divide currentValue by for card display
  displayPrefix?: string; // Prefix for card display, e.g. "R$ "
  displaySuffixOverride?: string; // Suffix for card display, e.g. " tri R$", overrides valueSuffix
}

export interface HistoricalDataPoint {
  date: string; // Store as YYYY-MM-DD for easier sorting and parsing (or timestamp for Recharts)
  value: number;
}

// utils/economicIndicatorsAPI.ts related types
export interface FetchedEconomicIndicators {
  selicRate?: number;
  selicReferenceDate?: string; 
  cdiRate?: number;
  cdiReferenceDate?: string; 
  ipcaRate?: number;
  ipcaSourceType?: 'projection' | 'accumulated12m';
  ipcaReferenceDate?: string;
  trRate?: number;
  trReferenceDate?: string; 
  igpmRate?: number; 
  igpmReferenceDate?: string; 
  
  netPublicDebtToGdpSGS4513?: number; 
  netPublicDebtToGdpSGS4513ReferenceDate?: string; 
  
  ibcBrRate?: number; 
  ibcBrReferenceDate?: string; 
  internationalReserves?: number; 
  internationalReservesReferenceDate?: string; 
  
  goldReservesSGS3552MillionsUSD?: number; 
  goldReservesSGS3552MillionsUSDReferenceDate?: string; 
  
  gdpProjection?: number;
  gdpProjectionSourceType?: 'projection_focus';
  gdpProjectionReferenceDate?: string;
  
  grossGeneralGovernmentDebtToGdp?: number; 
  grossGeneralGovernmentDebtToGdpReferenceDate?: string; 

  m2BalanceSGS27842?: number; // M2 Balance (Milhares de R$) - SGS 27842
  m2BalanceSGS27842ReferenceDate?: string; // MM/YYYY

  lastUpdated?: string;
  errors?: string[];
}


export type DateRangePreset = '1M' | '6M' | '1Y' | '5Y' | 'MAX' | ''; // Added empty string for custom range

// For Dynamic Historical Averages in InputForm
export interface DynamicHistoricalAverage {
  value: number | null;
  isLoading: boolean;
  error: string | null;
  sourceDateRange?: string; // e.g., "Jan/2004 - Dez/2023"
  sourceSgsCode?: string | number;
}

// For Macro Economic Terminal
export interface AvailableIndicatorForTerminal {
  id: string; // Unique ID for the indicator, e.g., 'SELIC_META', 'PTAX_VENDA'
  name: string; // User-friendly name, e.g., "Selic (Meta)"
  sgsCode: string | number; // Actual SGS code or special identifier like 'PTAX'
  seriesType?: IndicatorModalData['seriesType']; 
  historicalYAxisLabel?: string;
  isDailyData?: boolean;
  defaultChartColor?: string; // Optional: a default color for this indicator line
  dataKey: string; // Unique key for Recharts data, e.g., 'selicValue', 'ptaxValue'
}

// This will be the structure for the Recharts data prop after merging
export interface MergedTerminalChartDataPoint {
  timestamp: number; // X-axis (date as timestamp)
  // Dynamically add keys based on selected indicators
  [dataKey: string]: number | null | undefined; 
}