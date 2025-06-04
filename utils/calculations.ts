
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
    contributionValue: initialMonthlyContribution, 
    rateValue, 
    investmentPeriodYears: originalInvestmentPeriodYears, 
    
    enableAdvancedSimulation,
    advancedSimModeRetirement,
    currentAge,
    targetAge,
    adjustContributionsForInflation,
    expectedInflationRate, 
    desiredMonthlyIncomeToday,

    advancedSimModeSpecificContributions,
    specificContributions,
  } = params;

  const yearlyProjection: ProjectionPoint[] = [];
  const monthlyProjection: MonthlyProjectionPoint[] = [];

  let actualInvestmentPeriodYears = originalInvestmentPeriodYears;
  let simulationEndAge = (currentAge || 0) + originalInvestmentPeriodYears;
  const retirementTargetAge = targetAge || ((currentAge || 0) + originalInvestmentPeriodYears); 

  if (enableAdvancedSimulation && advancedSimModeRetirement && currentAge) {
    simulationEndAge = Math.max(retirementTargetAge, 72); 
    actualInvestmentPeriodYears = simulationEndAge - currentAge;
  }


  if (actualInvestmentPeriodYears <= 0 && !(enableAdvancedSimulation && advancedSimModeRetirement && currentAge && simulationEndAge > currentAge)) {
     if (!(enableAdvancedSimulation && advancedSimModeRetirement && currentAge && simulationEndAge > currentAge && currentAge < simulationEndAge)) {
      return { yearly: [], monthly: [] };
    }
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
  let cumulativeWithdrawals = 0;
  
  let yearStartBalance = initialInvestment;
  let yearContributions = 0; 
  let yearInterest = 0;
  let yearWithdrawals = 0;

  const sortedSpecificContributions = advancedSimModeSpecificContributions && specificContributions
    ? [...specificContributions].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month))
    : [];
  
  let specificContributionIndex = 0;

  for (let month = 1; month <= totalMonths; month++) {
    const currentGlobalMonth = month;
    const currentYearForMonth = Math.ceil(month / 12);
    const currentMonthInYear = month - (currentYearForMonth - 1) * 12;
    
    const investorAgeAtStartOfYear = (enableAdvancedSimulation && advancedSimModeRetirement && currentAge) 
                               ? currentAge + currentYearForMonth -1 
                               : undefined; 
    const investorAgeAtMonthEnd = (enableAdvancedSimulation && advancedSimModeRetirement && currentAge)
                               ? currentAge + Math.floor((currentGlobalMonth -1) / 12) // This is age at end of previous month, effectively start of current month for age check
                               : undefined;


    const initialBalanceForThisMonth = currentBalance;

    // Apply interest
    const interestForMonth = currentBalance * monthlyEffectiveRate;
    currentBalance += interestForMonth;
    cumulativeInterest += interestForMonth;
    yearInterest += interestForMonth;
    
    let actualMonthlyContribution = 0;
    let specificContributionThisMonthAmount = 0;
    let monthlyWithdrawalAmount = 0;

    const isPreRetirementPhase = !(enableAdvancedSimulation && advancedSimModeRetirement && currentAge && investorAgeAtStartOfYear !== undefined && investorAgeAtStartOfYear >= retirementTargetAge);

    if (isPreRetirementPhase) {
        // Regular monthly contribution
        actualMonthlyContribution = initialMonthlyContribution;
        if (enableAdvancedSimulation && adjustContributionsForInflation && annualInflationRateDecimal > 0 && currentYearForMonth > 1) {
            actualMonthlyContribution = initialMonthlyContribution * Math.pow(1 + annualInflationRateDecimal, currentYearForMonth - 1);
        }
        currentBalance += actualMonthlyContribution;
        cumulativeContributionsOnly += actualMonthlyContribution;
        yearContributions += actualMonthlyContribution;
        
        // Specific contributions for this month
        if (advancedSimModeSpecificContributions && sortedSpecificContributions) {
            while (specificContributionIndex < sortedSpecificContributions.length &&
                   sortedSpecificContributions[specificContributionIndex].year === currentYearForMonth &&
                   sortedSpecificContributions[specificContributionIndex].month === currentMonthInYear) {
                const specContrib = sortedSpecificContributions[specificContributionIndex];
                currentBalance += specContrib.amount;
                cumulativeContributionsOnly += specContrib.amount; 
                yearContributions += specContrib.amount;
                specificContributionThisMonthAmount += specContrib.amount;
                specificContributionIndex++;
            }
        }
    } else { // Post-Retirement Phase
        const isBeforeAge72ForInheritanceWithdrawal = enableAdvancedSimulation && advancedSimModeRetirement && currentAge && investorAgeAtStartOfYear !== undefined && investorAgeAtStartOfYear < 72;
        
        if (isBeforeAge72ForInheritanceWithdrawal && desiredMonthlyIncomeToday && desiredMonthlyIncomeToday > 0) {
            let currentDesiredMonthlyIncome = desiredMonthlyIncomeToday;
            if (adjustContributionsForInflation && annualInflationRateDecimal > 0 && currentAge && investorAgeAtStartOfYear !== undefined) { // Check investorAgeAtStartOfYear for safety
                const yearsSinceBase = investorAgeAtStartOfYear - currentAge;
                currentDesiredMonthlyIncome = desiredMonthlyIncomeToday * Math.pow(1 + annualInflationRateDecimal, yearsSinceBase);
            }
            monthlyWithdrawalAmount = currentDesiredMonthlyIncome;

            // It's possible that balance becomes negative if withdrawals exceed it. This is allowed.
            currentBalance -= monthlyWithdrawalAmount;
            yearWithdrawals += monthlyWithdrawalAmount;
            cumulativeWithdrawals += monthlyWithdrawalAmount;
        }
        // If no withdrawal condition met (e.g., income is 0, or age >= 72), balance just accrues interest from above.
    }
    
    monthlyProjection.push({
        globalMonth: currentGlobalMonth,
        year: currentYearForMonth,
        monthInYear: currentMonthInYear,
        initialBalanceMonthly: initialBalanceForThisMonth,
        contributionMonthly: actualMonthlyContribution,
        specificContributionThisMonth: specificContributionThisMonthAmount,
        interestEarnedMonthly: interestForMonth,
        withdrawalMonthly: monthlyWithdrawalAmount,
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
        age: investorAgeAtStartOfYear,
        totalWithdrawalsYearly: yearWithdrawals,
        cumulativeWithdrawals: cumulativeWithdrawals,
      });
      yearStartBalance = currentBalance;
      yearContributions = 0;
      yearInterest = 0;
      yearWithdrawals = 0;
    }
  }

  return { yearly: yearlyProjection, monthly: monthlyProjection };
};
