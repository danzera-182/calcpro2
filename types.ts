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
  totalWithdrawalsYearly?: number; // Added for yearly withdrawals
  cumulativeWithdrawals?: number;  // Added for cumulative withdrawals
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
  withdrawalMonthly?: number; // Added for monthly withdrawals
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
  projectedCapitalAt72?: number; // For inheritance
  perpetualMonthlyWithdrawalFutureValue?: number; // At retirement age (SWR based)
  perpetualMonthlyWithdrawalTodayValue?: number; // PV of the SWR based if inflation-adjusted
  interestOnlyMonthlyWithdrawalFutureValue?: number; // At retirement age (Interest-only based)
  interestOnlyMonthlyWithdrawalTodayValue?: number; // PV of the Interest-only if inflation-adjusted
}


export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export type FixedIncomeInvestmentType = 'pre' | 'post' | 'ipca';
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
  // Fields for IPCA+
  inputIpcaRate?: number;      // The IPCA rate used in calculation
  inputRealRate?: number;      // The real rate input by user (for GrossToNet)
  calculatedRealRate?: number; // The real rate calculated (for NetToGross)
  equivalentExemptRealRate_Ipca?: number; // The equivalent real rate if the investment were IPCA+ exempt
}

export type AppView = 
  'selector' | 
  'compoundInterest' | 
  'fixedIncomeComparator' | 
  'comprehensiveComparator' | 
  'rentVsBuyCalculator' | // New View
  'macroEconomicPanel' | 
  'macroEconomicTerminal' | 
  'bitcoinChartDetail' | 
  'usdtChartDetail' |
  'rssStoriesFeed' |
  'newsSummaryDetail' |
  'economicCalendarWidget' |
  'anbimaDataViewer' |
  'experimentalFeatures';

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
  codigo_curva: string; // Alterado de 'curva'
  data_curva: string;    // YYYY-MM-DD
  data_referencia: string; // YYYY-MM-DD
  data_vencimento: string; // Alterado de 'vencimento', YYYY-MM-DD
  dias_corridos: number;
  taxa_referencia: number; // % a.a.
  pu_referencia?: number; // Mantido como opcional, pois o novo endpoint básico tem.
}

// Types for Rent vs. Buy Calculator
export interface PropertyComparatorInputs {
  propertyValue: number | null;
  downPayment: number | null;
  financingCosts: number | null; // Initial costs like ITBI, registration
  financingTermMonths: number | null;
  annualInterestRatePercent: number | null; // For property financing

  monthlyRent: number | null;
  annualRentIncreasePercent: number | null; // e.g., IGPM
  annualPropertyAppreciationPercent: number | null; // Property valuation increase

  annualInvestmentReturnPercent: number | null; // For investing the difference or parallel investments
  additionalMonthlyInvestmentIfBuying: number | null; // For the "Buy and Invest" scenario
}

export interface PropertyCalculationMonthDetail {
  monthGlobal: number;
  year: number;
  monthInYear: number;

  // Common
  currentPropertyValue_eom?: number; // Property value at end of month

  // For "Buy" Scenarios
  mortgagePayment_month?: number;
  principalPaid_month?: number;
  interestPaid_month?: number;
  loanBalance_eom?: number;
  
  // For "Buy and Invest" specific
  parallelInvestmentContribution_month?: number;
  parallelInvestmentBalance_eom?: number;

  // For "Rent and Invest" Scenario
  rentPaid_month?: number;
  // This "investment_contribution_month" is specific to Rent&Invest: (Mortgage_Avoided_month - Rent_Paid_month)
  investmentContribution_month?: number; 
  investmentBalance_eom?: number; // This is the main balance for Rent&Invest
  
  // End of Month Net Worth for the specific scenario this detail belongs to
  netWorth_eom: number; 
}

export interface PropertyCalculationYearDetail { // For UI table display
  year: number;
  // Buy Only Scenario
  buyOnly_propertyValue_eoy?: number;
  buyOnly_loanBalance_eoy?: number;
  buyOnly_totalMortgagePaid_year?: number;
  buyOnly_netWorth_eoy?: number;

  // Buy and Invest Scenario
  buyAndInvest_propertyValue_eoy?: number;
  buyAndInvest_loanBalance_eoy?: number;
  buyAndInvest_totalMortgagePaid_year?: number;
  buyAndInvest_parallelInvestmentContribution_year?: number;
  buyAndInvest_parallelInvestmentBalance_eoy?: number;
  buyAndInvest_netWorth_eoy?: number;
  
  // Rent and Invest Scenario
  rentAndInvest_totalRentPaid_year?: number;
  rentAndInvest_totalInvestmentContribution_year?: number;
  rentAndInvest_investmentBalance_eoy?: number;
  rentAndInvest_netWorth_eoy?: number; // same as investmentBalance_eoy
}


export interface PropertyScenarioOutput {
  scenarioName: string;
  totalPatrimony: number;
  propertyValueEndOfPeriod?: number;
  investmentsValueEndOfPeriod?: number;
  totalFinancingPaid?: number; // Principal + Interest for financing
  totalRentPaid?: number;
  totalInitialCashOutlay: number; // Down payment + financing costs
  totalAdditionalInvestedPrincipal?: number; // Sum of additional monthly investments principal
  remainingLoanBalance?: number; // For patrimony calculation if loan not fully paid
  details?: string[]; // For brief explanatory notes under each scenario card
  monthlyBreakdown?: PropertyCalculationMonthDetail[]; 
  yearlyBreakdownForUI?: PropertyCalculationYearDetail[];
}

export interface PropertyComparisonResults {
  buyOnly: PropertyScenarioOutput;
  buyAndInvest: PropertyScenarioOutput;
  rentAndInvest: PropertyScenarioOutput;
  bestOption: 'buyOnly' | 'buyAndInvest' | 'rentAndInvest' | 'comparable' | 'insufficientData';
  analysisPeriodYears: number;
  recommendationText: string;
}