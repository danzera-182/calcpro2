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
export type AppView = 'selector' | 'compoundInterest' | 'fixedIncomeComparator' | 'comprehensiveComparator' | 'macroEconomicPanel';

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
  sgsCode?: string | number; // SGS Code or special identifier like 'PTAX'
  description: string;
  currentValue: string | number | null | undefined;
  valueSuffix?: string;
  referenceText?: string;
  sourceText?: string;
  isUSD?: boolean; // For PTAX or USD denominated values
  isPercentage?: boolean; // If the value is a percentage
  isBillions?: boolean; // If value is in billions (e.g., Reserves)
  valuePrecision?: number; // Default precision for display
  historicalSeriesName?: string; // Name for the chart series
  historicalYAxisLabel?: string; // Label for Y-axis in historical chart
  isDailyData?: boolean; // Hint for chart date formatting for daily series like CDI
}

export interface HistoricalDataPoint {
  date: string; // Store as YYYY-MM-DD for easier sorting and parsing
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
  
  netPublicDebtToGdpSGS4513?: number; // SGS 4513 (Dívida Líquida do Setor Público - % PIB)
  netPublicDebtToGdpSGS4513ReferenceDate?: string; // MM/YYYY
  
  ibcBrRate?: number; 
  ibcBrReferenceDate?: string; 
  internationalReserves?: number; 
  internationalReservesReferenceDate?: string; 
  
  goldReservesSGS3552MillionsUSD?: number; // SGS 3552 (Reservas internacionais - Ouro - US$ milhões)
  goldReservesSGS3552MillionsUSDReferenceDate?: string; // MM/YYYY
  
  gdpProjection?: number;
  gdpProjectionSourceType?: 'projection_focus' | 'accumulated12m_sgs4380';
  gdpProjectionReferenceDate?: string;
  
  grossGeneralGovernmentDebtToGdp?: number; // SGS 13762
  grossGeneralGovernmentDebtToGdpReferenceDate?: string; // MM/YYYY

  lastUpdated?: string;
  errors?: string[];
}


export type DateRangePreset = '1M' | '6M' | '1Y' | '5Y' | 'MAX';