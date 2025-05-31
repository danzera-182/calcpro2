
import { ProjectionPoint, MonthlyProjectionPoint, InputFormData, SpecificContribution } from '../types';

interface CalculationParams extends InputFormData {
  // isContributionAnnual and isInterestRateAnnual are fixed for this calculator's context
  // isContributionAnnual: boolean; // always false
  // isInterestRateAnnual: boolean; // always true
}

interface CalculationResult {
  yearly: ProjectionPoint[];
  monthly: MonthlyProjectionPoint[];
}

export const calculateProjection = (params: CalculationParams): CalculationResult => {
  const {
    initialInvestment,
    contributionValue: initialMonthlyContribution, // Renamed for clarity
    rateValue, // Annual rate
    investmentPeriodYears: originalInvestmentPeriodYears, // Original input by user
    
    // Advanced Simulation
    enableAdvancedSimulation,
    advancedSimModeRetirement,
    currentAge,
    targetAge,
    adjustContributionsForInflation,
    expectedInflationRate, // Annual %
    // desiredMonthlyIncomeToday, // This is handled in ResultsDisplay

    advancedSimModeSpecificContributions,
    specificContributions,
  } = params;

  const yearlyProjection: ProjectionPoint[] = [];
  const monthlyProjection: MonthlyProjectionPoint[] = [];

  let actualInvestmentPeriodYears = originalInvestmentPeriodYears;
  if (enableAdvancedSimulation && advancedSimModeRetirement && currentAge && targetAge && targetAge > currentAge) {
    actualInvestmentPeriodYears = targetAge - currentAge;
  }

  if (actualInvestmentPeriodYears <= 0) {
    return { yearly: [], monthly: [] };
  }

  let monthlyEffectiveRate: number;
  if (rateValue === -100) { 
    monthlyEffectiveRate = -1; 
  } else {
    monthlyEffectiveRate = Math.pow(1 + rateValue / 100, 1 / 12) - 1;
  }
  
  if (isNaN(monthlyEffectiveRate) || !isFinite(monthlyEffectiveRate)) {
    console.error("Invalid monthly effective rate calculated:", monthlyEffectiveRate, "from rateValue:", rateValue);
    return { yearly: [], monthly: [] }; 
  }

  const annualInflationRateDecimal = (adjustContributionsForInflation && expectedInflationRate) ? (expectedInflationRate / 100) : 0;

  const totalMonths = actualInvestmentPeriodYears * 12;

  let currentBalance = initialInvestment;
  let cumulativeContributionsOnly = 0; 
  let cumulativeInterest = 0;
  
  let yearStartBalance = initialInvestment;
  let yearContributions = 0; // Tracks all contributions within a year (regular + specific)
  let yearInterest = 0;

  const sortedSpecificContributions = advancedSimModeSpecificContributions && specificContributions
    ? [...specificContributions].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month))
    : [];
  
  let specificContributionIndex = 0;

  for (let month = 1; month <= totalMonths; month++) {
    const currentGlobalMonth = month;
    const currentYearForMonth = Math.ceil(month / 12);
    const currentMonthInYear = month - (currentYearForMonth - 1) * 12;
    
    const investorAgeCurrent = (enableAdvancedSimulation && advancedSimModeRetirement && currentAge) 
                               ? currentAge + currentYearForMonth -1 // Age at start of year
                               : undefined; 
    // More precise age tracking (at end of month):
    let investorAgeAtMonthEnd: number | undefined = undefined;
    if (enableAdvancedSimulation && advancedSimModeRetirement && currentAge) {
        const elapsedYears = (month -1) / 12;
        investorAgeAtMonthEnd = currentAge + Math.floor(elapsedYears);
        // If current month is the birth month, increment age. Assuming birth month is not relevant here, age increments at year change.
        // Or, more simply:
        investorAgeAtMonthEnd = currentAge + Math.floor((currentGlobalMonth -1) / 12);
    }


    const initialBalanceForThisMonth = currentBalance;

    // Apply interest
    const interestForMonth = currentBalance * monthlyEffectiveRate;
    currentBalance += interestForMonth;
    cumulativeInterest += interestForMonth;
    yearInterest += interestForMonth;

    // Regular monthly contribution
    let actualMonthlyContribution = initialMonthlyContribution;
    if (enableAdvancedSimulation && adjustContributionsForInflation && annualInflationRateDecimal > 0 && currentYearForMonth > 1) {
      actualMonthlyContribution = initialMonthlyContribution * Math.pow(1 + annualInflationRateDecimal, currentYearForMonth - 1);
    }
    
    currentBalance += actualMonthlyContribution;
    cumulativeContributionsOnly += actualMonthlyContribution;
    yearContributions += actualMonthlyContribution;
    
    // Specific contributions for this month
    let specificContributionThisMonthAmount = 0;
    if (advancedSimModeSpecificContributions && sortedSpecificContributions) {
      while (specificContributionIndex < sortedSpecificContributions.length &&
             sortedSpecificContributions[specificContributionIndex].year === currentYearForMonth &&
             sortedSpecificContributions[specificContributionIndex].month === currentMonthInYear) {
        const specContrib = sortedSpecificContributions[specificContributionIndex];
        currentBalance += specContrib.amount;
        cumulativeContributionsOnly += specContrib.amount; // Specific contributions also add to total invested
        yearContributions += specContrib.amount;
        specificContributionThisMonthAmount += specContrib.amount;
        specificContributionIndex++;
      }
    }

    monthlyProjection.push({
      globalMonth: currentGlobalMonth,
      year: currentYearForMonth,
      monthInYear: currentMonthInYear,
      initialBalanceMonthly: initialBalanceForThisMonth,
      contributionMonthly: actualMonthlyContribution,
      specificContributionThisMonth: specificContributionThisMonthAmount,
      interestEarnedMonthly: interestForMonth,
      finalBalanceMonthly: currentBalance,
      age: investorAgeAtMonthEnd,
    });
    
    if (month % 12 === 0 || month === totalMonths) {
      const currentYear = Math.ceil(month / 12);
      yearlyProjection.push({
        year: currentYear,
        initialBalance: yearStartBalance,
        totalContributions: yearContributions, 
        totalInterestEarned: yearInterest,
        finalBalance: currentBalance,
        cumulativeContributions: initialInvestment + cumulativeContributionsOnly,
        cumulativeInterest: cumulativeInterest,
        age: (enableAdvancedSimulation && advancedSimModeRetirement && currentAge) ? currentAge + currentYear -1 : undefined,
      });
      yearStartBalance = currentBalance;
      yearContributions = 0;
      yearInterest = 0;
    }
  }

  return { yearly: yearlyProjection, monthly: monthlyProjection };
};
