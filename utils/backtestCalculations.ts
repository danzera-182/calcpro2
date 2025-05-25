
import { BacktestProjectionPoint, BacktestResults } from '../types';
import { HISTORICAL_BENCHMARK_DATA, MAX_HISTORICAL_DATA_YEARS } from './mockBenchmarkData';

interface BacktestParams {
  initialInvestment: number;
  annualizedContribution: number; // Total contributions made per year
  effectiveAnnualRate: number; // User's strategy effective annual rate (as percentage)
  investmentPeriodYears: number;
}

export const calculateBacktestProjections = (
  params: BacktestParams
): BacktestResults | null => {
  const { initialInvestment, annualizedContribution, effectiveAnnualRate, investmentPeriodYears } = params;

  const backtestYears = Math.min(investmentPeriodYears, MAX_HISTORICAL_DATA_YEARS);

  if (backtestYears <= 0) {
    return null;
  }

  const historicalDataToUse = HISTORICAL_BENCHMARK_DATA.slice(0, backtestYears).reverse(); // Oldest first

  let userStrategyValue = initialInvestment;
  let ipcaValue = initialInvestment;
  let ibovespaValue = initialInvestment;
  let cdiValue = initialInvestment;

  const userAnnualRateDecimal = effectiveAnnualRate / 100;

  const projection: BacktestProjectionPoint[] = [];

  // Add year 0 initial state
  projection.push({
    year: 0,
    userStrategyValue: initialInvestment,
    ipcaValue: initialInvestment,
    ibovespaValue: initialInvestment,
    cdiValue: initialInvestment,
  });
  
  for (let i = 0; i < backtestYears; i++) {
    const yearData = historicalDataToUse[i]; 

    // Add contributions at the start of the year
    userStrategyValue += annualizedContribution;
    ipcaValue += annualizedContribution;
    ibovespaValue += annualizedContribution;
    cdiValue += annualizedContribution;

    // Apply rates
    userStrategyValue *= (1 + userAnnualRateDecimal);
    ipcaValue *= (1 + yearData.ipcaRate);
    ibovespaValue *= (1 + yearData.ibovespaRate);
    cdiValue *= (1 + yearData.cdiRate);
    
    projection.push({
      year: i + 1,
      userStrategyValue,
      ipcaValue,
      ibovespaValue,
      cdiValue,
    });
  }

  return { data: projection, period: backtestYears };
};