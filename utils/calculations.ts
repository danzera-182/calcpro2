
import { ProjectionPoint, MonthlyProjectionPoint } from '../types';

interface CalculationParams {
  initialInvestment: number;
  contributionAmount: number;
  isContributionAnnual: boolean;
  interestRateValue: number; // The rate value itself (e.g., 6 for 6%)
  isInterestRateAnnual: boolean; // True if interestRateValue is annual, false if monthly
  investmentPeriodYears: number;
}

interface CalculationResult {
  yearly: ProjectionPoint[];
  monthly: MonthlyProjectionPoint[];
}

export const calculateProjection = (params: CalculationParams): CalculationResult => {
  const {
    initialInvestment,
    contributionAmount,
    isContributionAnnual,
    interestRateValue,
    isInterestRateAnnual,
    investmentPeriodYears,
  } = params;

  const yearlyProjection: ProjectionPoint[] = [];
  const monthlyProjection: MonthlyProjectionPoint[] = [];

  if (investmentPeriodYears <= 0) {
    return { yearly: [], monthly: [] };
  }

  let monthlyEffectiveRate: number;
  if (isInterestRateAnnual) {
    if (interestRateValue === -100) { // Avoid issues with (1 - 1)^(1/12) resulting in NaN for -100%
      monthlyEffectiveRate = -1; // Represents -100% monthly, total loss
    } else {
      monthlyEffectiveRate = Math.pow(1 + interestRateValue / 100, 1 / 12) - 1;
    }
  } else {
    monthlyEffectiveRate = interestRateValue / 100;
  }
  
  if (isNaN(monthlyEffectiveRate) || !isFinite(monthlyEffectiveRate)) {
    console.error("Invalid monthly effective rate calculated:", monthlyEffectiveRate, "from rateValue:", interestRateValue, "isAnnual:", isInterestRateAnnual);
    return { yearly: [], monthly: [] }; // Prevent further calculation with NaN
  }


  const totalMonths = investmentPeriodYears * 12;

  let currentBalance = initialInvestment;
  let cumulativeContributionsOnly = 0; // Tracks only periodic contributions
  let cumulativeInterest = 0;
  
  let yearStartBalance = initialInvestment;
  let yearContributions = 0;
  let yearInterest = 0;

  for (let month = 1; month <= totalMonths; month++) {
    const currentGlobalMonth = month;
    const currentYearForMonth = Math.ceil(month / 12);
    const currentMonthInYear = month - (currentYearForMonth - 1) * 12;
    const initialBalanceForThisMonth = currentBalance;

    const interestForMonth = currentBalance * monthlyEffectiveRate;
    currentBalance += interestForMonth;
    cumulativeInterest += interestForMonth;
    yearInterest += interestForMonth;

    let contributionThisMonth = 0;
    if (isContributionAnnual) {
      if (currentMonthInYear === 12) { // Apply annual contribution at the end of the 12th month of the cycle
        contributionThisMonth = contributionAmount;
      }
    } else { // Monthly contribution
      contributionThisMonth = contributionAmount;
    }
    
    currentBalance += contributionThisMonth;
    cumulativeContributionsOnly += contributionThisMonth;
    yearContributions += contributionThisMonth;

    monthlyProjection.push({
      globalMonth: currentGlobalMonth,
      year: currentYearForMonth,
      monthInYear: currentMonthInYear,
      initialBalanceMonthly: initialBalanceForThisMonth,
      contributionMonthly: contributionThisMonth,
      interestEarnedMonthly: interestForMonth,
      finalBalanceMonthly: currentBalance,
    });
    
    if (month % 12 === 0 || month === totalMonths) {
      const currentYear = Math.ceil(month / 12);
      yearlyProjection.push({
        year: currentYear,
        initialBalance: yearStartBalance,
        totalContributions: yearContributions, // Contributions made *during* this year
        totalInterestEarned: yearInterest,
        finalBalance: currentBalance,
        cumulativeContributions: initialInvestment + cumulativeContributionsOnly, // Initial + all periodic contributions
        cumulativeInterest: cumulativeInterest,
      });
      yearStartBalance = currentBalance;
      yearContributions = 0;
      yearInterest = 0;
    }
  }

  return { yearly: yearlyProjection, monthly: monthlyProjection };
};