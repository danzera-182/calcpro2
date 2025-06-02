
export interface InputFormData {
  initialInvestment: number;
  contributionValue: number; 
  rateValue: number; 
  investmentPeriodYears: number;

  enableAdvancedSimulation?: boolean;
  advancedSimModeRetirement?: boolean;
  currentAge?: number;
  targetAge?: number; 
  adjustContributionsForInflation?: boolean;
  expectedInflationRate?: number; 
  desiredMonthlyIncomeToday?: number; 

  advancedSimModeSpecificContributions?: boolean;
  specificContributions?: SpecificContribution[];
}

export interface SpecificContribution {
  id: string; 
  year: number; 
  month: number; 
  amount: number;
  description?: string;
}

export interface ProjectionPoint {
  year: number;
  initialBalance: number; 
  totalContributions: number; 
  totalInterestEarned: number; 
  finalBalance: number; 
  cumulativeContributions: number; 
  cumulativeInterest: number; 
  age?: number;
  inflatedDesiredMonthlyIncome?: number;
  requiredCapitalForDesiredIncome?: number;
}

export interface MonthlyProjectionPoint {
  globalMonth: number;
  year: number;
  monthInYear: number;
  initialBalanceMonthly: number;
  contributionMonthly: number; 
  specificContributionThisMonth: number; 
  interestEarnedMonthly: number;
  finalBalanceMonthly: number;
  age?: number; 
}

export interface ChartDataPoint {
  year: number;
  value: number; 
  totalInvested: number; 
  age?: number;
  specificContributionAmount?: number; 
}

export interface ScenarioData {
  label: string;
  data: ProjectionPoint[];
  monthlyData?: MonthlyProjectionPoint[];
  retirementAnalysis?: RetirementAnalysisResults;
}

export interface RetirementAnalysisResults {
  targetAge: number;
  projectedCapitalAtRetirement: number;
  finalDesiredMonthlyIncome: number; 
  capitalNeededForDesiredIncome: number; 
  canMeetGoal: boolean;
  swrUsed: number; 
  achievableMonthlyIncomeWithProjectedCapital?: number; 
}


export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export type FixedIncomeInvestmentType = 'pre' | 'post';
export type TermUnit = 'days' | 'years';
export type ConversionDirection = 'grossToNet' | 'netToGross';

export interface FixedIncomeResult {
  conversionDirection: ConversionDirection;
  investmentType: FixedIncomeInvestmentType;
  termDays: number;
  inputRateDirect: number; 
  currentCdiRateForPost?: number; 
  irRateAppliedPercent: number; 
  finalGrossAnnualRate: number; 
  finalNetAnnualRate: number;
  equivalentGrossCdiPercentage?: number;
  equivalentNetCdiPercentage?: number;
}

export type AppView = 
  'selector' | 
  'compoundInterest' | 
  'fixedIncomeComparator' | 
  'comprehensiveComparator' | 
  'macroEconomicPanel' | 
  'macroEconomicTerminal' | 
  'bitcoinChartDetail' | 
  'usdtChartDetail' |
  'rssStoriesFeed' |
  'newsSummaryDetail' |
  'economicCalendarWidget' |
  'anbimaDataViewer' |
  'experimentalFeatures'; // Added experimentalFeatures view

export interface ArticleForSummary { 
  id: string;
  title: string;
  link: string;
  sourceName: string;
  imageUrl?: string;
  pubDate?: string;
}

export type InvestmentPeriodUnit = 'months' | 'years';

export interface ComprehensiveInputs {
  initialInvestment: number | null;
  monthlyContributions: number | null;
  applicationPeriodValue: number | null; 
  applicationPeriodUnit: InvestmentPeriodUnit;
  selicRate: number | null;          
  cdiRate: number | null;            
  ipcaRate: number | null;           
  trRate: number | null;             
  tesouroPrefixadoNominalRate: number | null; 
  tesouroCustodyFeeB3: number | null;        
  tesouroIpcaRealRate: number | null;        
  cdbRatePercentageOfCdi: number | null;      
  lciLcaRatePercentageOfCdi: number | null;   
}

export interface InvestmentCalculationResult {
  name: string;
  finalGrossBalance: number; 
  netBalance: number;        
  totalInvested: number;
  totalInterestEarned: number; 
  irRateAppliedPercent: number; 
  irAmount: number;
  effectiveAnnualRateUsedPercent?: number; 
  effectiveMonthlyRateUsedPercent?: number; 
  operationalFeesPaid?: number; 
}

export interface BitcoinPriceHistoryPoint {
  timestamp: number; 
  price: number;     
}

export interface BtcPriceInfo {
  brl: number;
  usd: number;
  lastUpdatedAt: number; 
  marketCapUsd?: number;
  marketCapBrl?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  description?: string; 
  usd_24h_change?: number;
  brl_24h_change?: number;
}

export interface UsdtPriceInfo {
  brl: number;
  usd: number;
  lastUpdatedAt: number; 
  marketCapUsd?: number;
  marketCapBrl?: number;
  totalSupply?: number;
  circulatingSupply?: number;
  description?: string; 
  usd_24h_change?: number;
  brl_24h_change?: number;
}

export interface UsdBrlRateInfo {
  rate: number; 
  dateTime: string; 
}

export interface FundInfo {
  id: string; 
  cnpj: string; 
  name: string;
  administratorName?: string;
  managerName?: string;
  fundClass?: string; 
  netAssetValue?: number; 
  quotaValue?: number; 
  reportDate?: string; 
  adminFee?: number; 
  performanceFee?: string; 
  numQuotaholders?: number; 
  targetAudience?: string; 
  initialInvestment?: number; 
}

export interface IndicatorModalData {
  title: string;
  sgsCode?: string | number; 
  description: string;
  currentValue: string | number | null | undefined;
  valueSuffix?: string; 
  referenceText?: string;
  sourceText?: string;
  isUSD?: boolean; 
  isPercentage?: boolean; 
  isBillions?: boolean; 
  valuePrecision?: number; 
  historicalSeriesName?: string; 
  historicalYAxisLabel?: string; 
  isDailyData?: boolean; 
  seriesType?: 'PTAX' | 'SGS_CALCULATED_ANNUAL_CDI' | 'SGS_PERCENT_VAR_FROM_INDEX'; 
  displayDivisor?: number; 
  displayPrefix?: string; 
  displaySuffixOverride?: string; 
}

export interface HistoricalDataPoint {
  date: string; 
  value: number;
}

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
  m2BalanceSGS27842?: number; 
  m2BalanceSGS27842ReferenceDate?: string; 
  lastUpdated?: string;
  errors?: string[];
}

export type DateRangePreset = '1M' | '6M' | '1Y' | '5Y' | 'MAX' | ''; 

export interface DynamicHistoricalAverage {
  value: number | null;
  isLoading: boolean;
  error: string | null;
  sourceDateRange?: string; 
  sourceSgsCode?: string | number;
}

export interface AvailableIndicatorForTerminal {
  id: string; 
  name: string; 
  sgsCode: string | number; 
  seriesType?: IndicatorModalData['seriesType']; 
  historicalYAxisLabel?: string;
  isDailyData?: boolean;
  defaultChartColor?: string; 
  dataKey: string; 
}

export interface MergedTerminalChartDataPoint {
  timestamp: number; 
  [dataKey: string]: number | null | undefined; 
}

export interface NewsItem {
  id: string; 
  title: string;
  link: string;
  pubDate?: string; 
  description?: string; 
  imageUrl?: string;
  sourceName: string; 
}

export interface StorySource {
  id: string; 
  name: string; 
  rssUrl: string;
  iconUrl?: string; 
  items: NewsItem[];
  lastFetched?: Date;
  color?: string; 
}

export interface AnbimaCurvePoint {
  curva: string;
  data_curva: string; // YYYY-MM-DD
  data_referencia: string; // YYYY-MM-DD
  vencimento: string; // YYYY-MM-DD
  dias_corridos: number;
  dias_uteis?: number;
  taxa_compra_indicativa?: number;
  taxa_venda_indicativa?: number;
  taxa_referencia: number; // % a.a.
  pu_compra_indicativo?: number;
  pu_venda_indicativo?: number;
  pu_referencia?: number;
  desvio_padrao?: number;
}
