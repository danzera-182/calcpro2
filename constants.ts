import { InputFormData, ComprehensiveInputs, AvailableIndicatorForTerminal } from './types';

export const DEFAULT_INPUT_VALUES: InputFormData = {
  initialInvestment: 1000,
  contributionValue: 100, // This is now always monthly
  rateValue: 8,           // This is now always annual
  investmentPeriodYears: 10,

  // Advanced Simulation Defaults
  enableAdvancedSimulation: false,
  advancedSimModeRetirement: false,
  currentAge: 30,
  targetAge: 60,
  adjustContributionsForInflation: false,
  expectedInflationRate: 3.5,
  desiredMonthlyIncomeToday: 5000,
  advancedSimModeSpecificContributions: false,
  specificContributions: [],
};

// Reverted to a more standard/vibrant color set
export const CHART_COLORS = {
  mainStrategy: '#3B82F6',   // Blue-500
  totalInvested: '#6B7280', // Gray-500
  specificContributionMarker: '#F59E0B', // Amber-500

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

  selicRate: 10.50, 
  cdiRate: 10.40,  
  ipcaRate: 3.75,  
  trRate: 0.05,    

  tesouroPrefixadoNominalRate: 11.00,
  tesouroCustodyFeeB3: 0.20,

  tesouroIpcaRealRate: 5.50,

  cdbRatePercentageOfCdi: 100,
  lciLcaRatePercentageOfCdi: 85,
};

// For Retirement Simulation in ResultsDisplay
export const DEFAULT_SAFE_WITHDRAWAL_RATE = 0.04; // 4% SWR

// SGS Codes for historical averages
export const SGS_CODE_CDI_MONTHLY = '4391'; // Taxa de juros - CDI acumulada no mês em % - média
export const SGS_CODE_IPCA_MONTHLY = '433';  // Índice nacional de preços ao consumidor-amplo (IPCA) - Var. Mensal

// Indicators available for selection in the Macroeconomic Terminal
export const AVAILABLE_TERMINAL_INDICATORS: AvailableIndicatorForTerminal[] = [
  { id: 'SELIC_META', name: 'Selic (Meta)', sgsCode: 432, historicalYAxisLabel: '% a.a.', dataKey: 'selicMetaValue', defaultChartColor: '#E11D48' }, // Rose 600
  { id: 'CDI_MONTHLY', name: 'CDI (Mensal %)', sgsCode: 4391, historicalYAxisLabel: '% a.m.', dataKey: 'cdiMonthlyValue', defaultChartColor: '#DB2777' }, // Pink 600
  { id: 'IPCA_MONTHLY', name: 'IPCA (Mensal %)', sgsCode: 433, historicalYAxisLabel: 'Variação %', dataKey: 'ipcaMonthlyValue', defaultChartColor: '#F59E0B' }, // Amber 500
  { id: 'IGPM_MONTHLY', name: 'IGP-M (Mensal %)', sgsCode: 189, historicalYAxisLabel: 'Variação %', dataKey: 'igpmMonthlyValue', defaultChartColor: '#F97316' }, // Orange 500
  { id: 'PTAX_VENDA', name: 'Dólar PTAX (Venda)', sgsCode: 'PTAX', seriesType: 'PTAX', historicalYAxisLabel: 'R$', isDailyData: true, dataKey: 'ptaxValue', defaultChartColor: '#16A34A' }, // Green 600
  { id: 'TR_MONTHLY', name: 'TR (Mensal %)', sgsCode: 226, historicalYAxisLabel: '% a.m.', dataKey: 'trMonthlyValue', defaultChartColor: '#0891B2' }, // Cyan 600
  { id: 'DLSP_PIB', name: 'Dív. Líquida/PIB (%)', sgsCode: 4513, historicalYAxisLabel: '% PIB', dataKey: 'dlspPibValue', defaultChartColor: '#4F46E5' }, // Indigo 600
  { id: 'DBGG_PIB', name: 'Dív. Bruta Gov./PIB (%)', sgsCode: 13762, historicalYAxisLabel: '% PIB', dataKey: 'dbggPibValue', defaultChartColor: '#7C3AED' }, // Violet 600
  { id: 'IBCBR_INDEX', name: 'IBC-Br (Índice)', sgsCode: 24364, historicalYAxisLabel: 'Índice (Base: 2002=100)', dataKey: 'ibcbrIndexValue', defaultChartColor: '#CA8A04' }, // Yellow 600
  { id: 'RESERVAS_USD', name: 'Reservas (Milhões USD)', sgsCode: 13621, historicalYAxisLabel: 'Milhões USD', isDailyData: true, dataKey: 'reservasUsdValue', defaultChartColor: '#059669' }, // Emerald 600
  { id: 'OURO_RESERVAS_USD', name: 'Ouro Reservas (Milhões USD)', sgsCode: 3552, historicalYAxisLabel: 'Milhões USD', dataKey: 'ouroReservasUsdValue', defaultChartColor: '#D97706' }, // Amber 600
  // Additional indicators:
  { id: 'IPCA_ACCUM12M', name: 'IPCA (Acum. 12M %)', sgsCode: 13522, historicalYAxisLabel: 'Acum. %', dataKey: 'ipcaAccum12mValue', defaultChartColor: '#FACC15' }, // Yellow 400 (brighter)
];

// For Terminal Chart Display
export const TERMINAL_CHART_LINE_COLORS = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F97316', // orange-500
  '#8B5CF6', // violet-500
  '#0EA5E9', // sky-500
  '#D946EF', // fuchsia-500
  '#F59E0B', // amber-500
];
