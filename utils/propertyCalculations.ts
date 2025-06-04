import { PropertyComparatorInputs, PropertyComparisonResults, PropertyScenarioOutput, PropertyCalculationMonthDetail, PropertyCalculationYearDetail } from '../types';
import { formatCurrency } from '../utils/formatters';

interface SACFinancingDetails {
  monthlyInstallments: number[];
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  firstInstallment: number;
  lastInstallment: number;
  monthlyPrincipalPayments: number[];
  monthlyInterestPayments: number[];
}

// Helper: Calculate SAC Financing Details
const calculateFinancingDetailsSAC = (
  loanPrincipal: number,
  annualInterestRatePercent: number,
  termMonths: number
): SACFinancingDetails => {
  if (loanPrincipal <= 0 || termMonths <= 0) {
    return { 
        monthlyInstallments: Array(termMonths || 0).fill(0), 
        totalInterestPaid: 0, 
        totalPrincipalPaid: 0, 
        firstInstallment: 0, 
        lastInstallment: 0,
        monthlyPrincipalPayments: Array(termMonths || 0).fill(0),
        monthlyInterestPayments: Array(termMonths || 0).fill(0),
    };
  }
  
  if (annualInterestRatePercent < -99.9999) { 
      const errorInstallment = loanPrincipal > 0 ? Infinity : 0;
      return { 
          monthlyInstallments: Array(termMonths).fill(errorInstallment), 
          totalInterestPaid: Infinity, 
          totalPrincipalPaid: loanPrincipal, 
          firstInstallment: errorInstallment, 
          lastInstallment: errorInstallment,
          monthlyPrincipalPayments: Array(termMonths).fill(loanPrincipal / termMonths), // Distributes principal if possible
          monthlyInterestPayments: Array(termMonths).fill(Infinity),
      };
  }

  const monthlyInterestRate = Math.pow(1 + annualInterestRatePercent / 100, 1 / 12) - 1;

  if (monthlyInterestRate <= -1 && loanPrincipal > 0) {
      const errorInstallment = Infinity;
       return { 
          monthlyInstallments: Array(termMonths).fill(errorInstallment), 
          totalInterestPaid: Infinity, 
          totalPrincipalPaid: loanPrincipal, 
          firstInstallment: errorInstallment, 
          lastInstallment: errorInstallment,
          monthlyPrincipalPayments: Array(termMonths).fill(loanPrincipal / termMonths),
          monthlyInterestPayments: Array(termMonths).fill(Infinity),
      };
  }

  const principalAmortizationPerMonth = loanPrincipal / termMonths;
  let outstandingBalance = loanPrincipal;
  let totalInterestPaid = 0;
  const monthlyInstallments: number[] = [];
  const monthlyPrincipalPayments: number[] = [];
  const monthlyInterestPayments: number[] = [];


  for (let i = 0; i < termMonths; i++) {
    const interestForMonth = outstandingBalance * monthlyInterestRate;
    const installment = principalAmortizationPerMonth + interestForMonth;
    
    monthlyInstallments.push(installment);
    monthlyPrincipalPayments.push(principalAmortizationPerMonth);
    monthlyInterestPayments.push(interestForMonth);
    totalInterestPaid += interestForMonth;
    outstandingBalance = Math.max(0, outstandingBalance - principalAmortizationPerMonth);
  }

  return {
    monthlyInstallments,
    totalInterestPaid,
    totalPrincipalPaid: loanPrincipal,
    firstInstallment: monthlyInstallments[0] || 0,
    lastInstallment: monthlyInstallments[monthlyInstallments.length - 1] || 0,
    monthlyPrincipalPayments,
    monthlyInterestPayments,
  };
};


// Helper: Calculate Future Value of a series of payments and/or present value
const calculateFutureValue = (
  presentValue: number,
  monthlyPayment: number,
  monthlyRate: number,
  numMonths: number
): number => {
  if (numMonths <= 0) return presentValue + (monthlyPayment * numMonths); 

  if (monthlyRate === 0) {
    return presentValue + monthlyPayment * numMonths;
  }
  
  if (monthlyRate <= -1) { 
      return presentValue * Math.pow(1 + monthlyRate, numMonths) + monthlyPayment * numMonths;
  }

  const fvFromPv = presentValue * Math.pow(1 + monthlyRate, numMonths);
  const fvFromPmt = monthlyPayment * ( (Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate );
  
  return fvFromPv + fvFromPmt;
};


const deriveYearlyBreakdownFromMonthly = (
    monthlyBreakdown: PropertyCalculationMonthDetail[],
    scenarioType: 'buyOnly' | 'buyAndInvest' | 'rentAndInvest'
): PropertyCalculationYearDetail[] => {
    if (!monthlyBreakdown || monthlyBreakdown.length === 0) return [];

    const yearlyMap = new Map<number, Partial<PropertyCalculationYearDetail>>();

    monthlyBreakdown.forEach(monthDetail => {
        if (!yearlyMap.has(monthDetail.year)) {
            yearlyMap.set(monthDetail.year, { year: monthDetail.year });
        }
        const yearEntry = yearlyMap.get(monthDetail.year)!;

        if (scenarioType === 'buyOnly' || scenarioType === 'buyAndInvest') {
            yearEntry.buyOnly_totalMortgagePaid_year = (yearEntry.buyOnly_totalMortgagePaid_year || 0) + (monthDetail.mortgagePayment_month || 0);
             if (scenarioType === 'buyAndInvest') {
                yearEntry.buyAndInvest_totalMortgagePaid_year = yearEntry.buyOnly_totalMortgagePaid_year; // same mortgage
                yearEntry.buyAndInvest_parallelInvestmentContribution_year = (yearEntry.buyAndInvest_parallelInvestmentContribution_year || 0) + (monthDetail.parallelInvestmentContribution_month || 0);
            }
        } else if (scenarioType === 'rentAndInvest') {
            yearEntry.rentAndInvest_totalRentPaid_year = (yearEntry.rentAndInvest_totalRentPaid_year || 0) + (monthDetail.rentPaid_month || 0);
            yearEntry.rentAndInvest_totalInvestmentContribution_year = (yearEntry.rentAndInvest_totalInvestmentContribution_year || 0) + (monthDetail.investmentContribution_month || 0);
        }

        if (monthDetail.monthInYear === 12 || monthDetail.monthGlobal === monthlyBreakdown[monthlyBreakdown.length - 1].monthGlobal) {
            if (scenarioType === 'buyOnly') {
                yearEntry.buyOnly_propertyValue_eoy = monthDetail.currentPropertyValue_eom;
                yearEntry.buyOnly_loanBalance_eoy = monthDetail.loanBalance_eom;
                yearEntry.buyOnly_netWorth_eoy = monthDetail.netWorth_eom;
            } else if (scenarioType === 'buyAndInvest') {
                yearEntry.buyAndInvest_propertyValue_eoy = monthDetail.currentPropertyValue_eom;
                yearEntry.buyAndInvest_loanBalance_eoy = monthDetail.loanBalance_eom;
                yearEntry.buyAndInvest_parallelInvestmentBalance_eoy = monthDetail.parallelInvestmentBalance_eom;
                yearEntry.buyAndInvest_netWorth_eoy = monthDetail.netWorth_eom;
            } else if (scenarioType === 'rentAndInvest') {
                yearEntry.rentAndInvest_investmentBalance_eoy = monthDetail.investmentBalance_eom;
                yearEntry.rentAndInvest_netWorth_eoy = monthDetail.netWorth_eom;
            }
        }
    });
    return Array.from(yearlyMap.values()) as PropertyCalculationYearDetail[];
};


export const calculatePropertyComparison = (inputs: PropertyComparatorInputs): PropertyComparisonResults => {
  const {
    propertyValue = 0,
    downPayment = 0,
    financingCosts = 0,
    financingTermMonths = 1, 
    annualInterestRatePercent = 0,
    monthlyRent = 0,
    annualRentIncreasePercent = 0,
    annualPropertyAppreciationPercent = 0,
    annualInvestmentReturnPercent = 0,
    additionalMonthlyInvestmentIfBuying = 0,
  } = inputs;

  const analysisPeriodMonths = financingTermMonths || 1;
  const analysisPeriodYears = analysisPeriodMonths / 12;

  const loanAmount = Math.max(0, propertyValue - downPayment);
  const financingDetailsSAC = calculateFinancingDetailsSAC(loanAmount, annualInterestRatePercent, analysisPeriodMonths);
  
  const totalInitialCashOutlay_BuyScenarios = downPayment + financingCosts;
  const monthlyInvestmentRate = Math.pow(1 + annualInvestmentReturnPercent / 100, 1/12) -1;
  const monthlyPropertyAppreciationRate = Math.pow(1 + annualPropertyAppreciationPercent / 100, 1/12) - 1;
  const monthlyRentIncreaseRate = Math.pow(1 + annualRentIncreasePercent / 100, 1/12) - 1;

  // --- Detailed Monthly Breakdowns ---
  const buyOnlyBreakdown: PropertyCalculationMonthDetail[] = [];
  const buyAndInvestBreakdown: PropertyCalculationMonthDetail[] = [];
  const rentAndInvestBreakdown: PropertyCalculationMonthDetail[] = [];

  let currentPropertyValue = propertyValue;
  let currentLoanBalance = loanAmount;
  let currentParallelInvestmentBalance = 0; // For Buy & Invest
  let currentRentInvestmentBalance = totalInitialCashOutlay_BuyScenarios; // For Rent & Invest, starts with saved downpayment/costs
  let currentMonthlyRent = monthlyRent;
  
  for (let m = 0; m < analysisPeriodMonths; m++) {
    const monthGlobal = m + 1;
    const year = Math.floor(m / 12) + 1;
    const monthInYear = (m % 12) + 1;

    // Update property value and rent (annually, applied monthly for smoother curve if needed, or just EOY)
    // For simplicity in monthly breakdown, let's apply appreciation at month end for property value
    // and rent increase check at start of month if monthInYear is 1 and year > 1
    if (monthInYear === 1 && year > 1) {
        currentMonthlyRent *= (1 + annualRentIncreasePercent / 100); // Rent increases annually
    }
    let nextPropertyValue = currentPropertyValue * (1 + monthlyPropertyAppreciationRate);


    // --- Buy Only Scenario ---
    const principalPaid_m = financingDetailsSAC.monthlyPrincipalPayments[m] || 0;
    const interestPaid_m = financingDetailsSAC.monthlyInterestPayments[m] || 0;
    const mortgagePayment_m = financingDetailsSAC.monthlyInstallments[m] || 0;
    currentLoanBalance = Math.max(0, currentLoanBalance - principalPaid_m);
    const buyOnlyNetWorth_eom = nextPropertyValue - currentLoanBalance;
    buyOnlyBreakdown.push({
      monthGlobal, year, monthInYear,
      currentPropertyValue_eom: nextPropertyValue,
      mortgagePayment_month: mortgagePayment_m,
      principalPaid_month: principalPaid_m,
      interestPaid_month: interestPaid_m,
      loanBalance_eom: currentLoanBalance,
      netWorth_eom: buyOnlyNetWorth_eom,
    });

    // --- Buy and Invest Scenario ---
    let nextParallelInvestmentBalance = currentParallelInvestmentBalance * (1 + monthlyInvestmentRate);
    if (additionalMonthlyInvestmentIfBuying > 0) {
      nextParallelInvestmentBalance += additionalMonthlyInvestmentIfBuying;
    }
    const buyAndInvestNetWorth_eom = nextPropertyValue - currentLoanBalance + nextParallelInvestmentBalance;
    buyAndInvestBreakdown.push({
      monthGlobal, year, monthInYear,
      currentPropertyValue_eom: nextPropertyValue,
      mortgagePayment_month: mortgagePayment_m,
      principalPaid_month: principalPaid_m,
      interestPaid_month: interestPaid_m,
      loanBalance_eom: currentLoanBalance,
      parallelInvestmentContribution_month: additionalMonthlyInvestmentIfBuying,
      parallelInvestmentBalance_eom: nextParallelInvestmentBalance,
      netWorth_eom: buyAndInvestNetWorth_eom,
    });

    // --- Rent and Invest Scenario ---
    let nextRentInvestmentBalance = currentRentInvestmentBalance * (1 + monthlyInvestmentRate);
    const avoidedMortgagePayment = mortgagePayment_m; // SAC payment for this month
    const investmentDiff = avoidedMortgagePayment - currentMonthlyRent;
    nextRentInvestmentBalance += investmentDiff;
    rentAndInvestBreakdown.push({
      monthGlobal, year, monthInYear,
      rentPaid_month: currentMonthlyRent,
      investmentContribution_month: investmentDiff,
      investmentBalance_eom: nextRentInvestmentBalance,
      netWorth_eom: nextRentInvestmentBalance, // Net worth is just the investment balance
    });
    
    // Update EOM values for next iteration
    currentPropertyValue = nextPropertyValue; // Property value updates monthly for smoother tracking
    currentParallelInvestmentBalance = nextParallelInvestmentBalance;
    currentRentInvestmentBalance = nextRentInvestmentBalance;
  }

  const finalPropertyValue_eop = buyOnlyBreakdown[analysisPeriodMonths-1]?.currentPropertyValue_eom || 0;
  const totalFinancingPaid_eop = loanAmount + financingDetailsSAC.totalInterestPaid;
  const buyOnly_eop_NetWorth = buyOnlyBreakdown[analysisPeriodMonths-1]?.netWorth_eom || 0;
  
  const buyOnlyDetails: string[] = [
    `Financiamento pelo Sistema SAC.`,
    `Primeira parcela: ${formatCurrency(financingDetailsSAC.firstInstallment)}.`,
    `Última parcela: ${formatCurrency(financingDetailsSAC.lastInstallment)}.`,
    `Valor do imóvel após ${analysisPeriodYears} anos.`,
    `Custo total (financiamento + custos iniciais): ${formatCurrency(totalFinancingPaid_eop + totalInitialCashOutlay_BuyScenarios)}.`,
  ];
  const buyOnly: PropertyScenarioOutput = {
    scenarioName: "Apenas Comprando o Imóvel",
    totalPatrimony: buyOnly_eop_NetWorth,
    propertyValueEndOfPeriod: finalPropertyValue_eop,
    totalFinancingPaid: totalFinancingPaid_eop,
    totalInitialCashOutlay: totalInitialCashOutlay_BuyScenarios,
    details: buyOnlyDetails,
    monthlyBreakdown: buyOnlyBreakdown,
    yearlyBreakdownForUI: deriveYearlyBreakdownFromMonthly(buyOnlyBreakdown, 'buyOnly'),
  };
  
  const finalParallelInvestment_eop = buyAndInvestBreakdown[analysisPeriodMonths-1]?.parallelInvestmentBalance_eom || 0;
  const totalAdditionalInvestedPrincipal = (additionalMonthlyInvestmentIfBuying || 0) * analysisPeriodMonths;
  const buyAndInvest_eop_NetWorth = buyAndInvestBreakdown[analysisPeriodMonths-1]?.netWorth_eom || 0;

  const buyAndInvestDetails: string[] = [
    ...buyOnlyDetails.slice(0,3),
    `Valor do imóvel (${formatCurrency(finalPropertyValue_eop)}) + Saldo Investimentos (${formatCurrency(finalParallelInvestment_eop)}).`,
    `Aportes de ${formatCurrency(additionalMonthlyInvestmentIfBuying || 0)}/mês em investimentos.`
  ];
  const buyAndInvest: PropertyScenarioOutput = {
    scenarioName: "Comprando e Investindo em Paralelo",
    totalPatrimony: buyAndInvest_eop_NetWorth,
    propertyValueEndOfPeriod: finalPropertyValue_eop,
    investmentsValueEndOfPeriod: finalParallelInvestment_eop,
    totalFinancingPaid: totalFinancingPaid_eop,
    totalInitialCashOutlay: totalInitialCashOutlay_BuyScenarios,
    totalAdditionalInvestedPrincipal: totalAdditionalInvestedPrincipal,
    details: buyAndInvestDetails,
    monthlyBreakdown: buyAndInvestBreakdown,
    yearlyBreakdownForUI: deriveYearlyBreakdownFromMonthly(buyAndInvestBreakdown, 'buyAndInvest'),
  };

  const finalRentInvestment_eop = rentAndInvestBreakdown[analysisPeriodMonths-1]?.investmentBalance_eom || 0;
  const rentAndInvest_eop_NetWorth = rentAndInvestBreakdown[analysisPeriodMonths-1]?.netWorth_eom || 0;
  const totalRentPaid_eop = rentAndInvestBreakdown.reduce((sum, m) => sum + (m.rentPaid_month || 0), 0);
  // Calculate total principal invested in Rent & Invest scenario
  const totalPrincipalInvested_Rent = totalInitialCashOutlay_BuyScenarios + rentAndInvestBreakdown.reduce((sum, m) => sum + (m.investmentContribution_month || 0), 0);


  const rentAndInvest: PropertyScenarioOutput = {
    scenarioName: "Alugando e Investindo a Diferença",
    totalPatrimony: rentAndInvest_eop_NetWorth,
    investmentsValueEndOfPeriod: finalRentInvestment_eop,
    totalRentPaid: totalRentPaid_eop,
    totalInitialCashOutlay: 0, 
    totalAdditionalInvestedPrincipal: totalPrincipalInvested_Rent,
    details: [
        `Investimento inicial (entrada + custos evitados): ${formatCurrency(totalInitialCashOutlay_BuyScenarios)}.`,
        `Investiu/desinvestiu mensalmente a diferença entre parcela SAC e aluguel.`,
        `Financiamento simulado para comparação usaria Sistema SAC.`
    ],
    monthlyBreakdown: rentAndInvestBreakdown,
    yearlyBreakdownForUI: deriveYearlyBreakdownFromMonthly(rentAndInvestBreakdown, 'rentAndInvest'),
  };

  let bestOption: PropertyComparisonResults['bestOption'] = 'insufficientData';
  let recommendationText = "Preencha todos os campos para uma recomendação.";

  const allInputsValid = [
    propertyValue, downPayment, financingTermMonths,
    annualInterestRatePercent, monthlyRent, annualRentIncreasePercent,
    annualPropertyAppreciationPercent, annualInvestmentReturnPercent,
  ].every(val => val !== null && val !== undefined && !isNaN(val as number));


  if (allInputsValid && propertyValue > 0 && financingTermMonths > 0) {
    const patrimonies = [
      { name: 'buyOnly' as const, value: buyOnly.totalPatrimony },
      { name: 'buyAndInvest' as const, value: buyAndInvest.totalPatrimony },
      { name: 'rentAndInvest' as const, value: rentAndInvest.totalPatrimony },
    ].filter(p => !isNaN(p.value) && isFinite(p.value)); 

    if (patrimonies.length === 3) {
        patrimonies.sort((a, b) => b.value - a.value);
        bestOption = patrimonies[0].name;
        
        switch(bestOption) {
            case 'buyOnly': recommendationText = "Considerando o patrimônio final, apenas comprar o imóvel parece ser a melhor opção."; break;
            case 'buyAndInvest': recommendationText = "Considerando o patrimônio final, comprar o imóvel e investir em paralelo parece ser a melhor opção."; break;
            case 'rentAndInvest': recommendationText = "Considerando o patrimônio final, alugar e investir a diferença parece ser a melhor opção."; break;
        }
        if (patrimonies.length > 1 && Math.abs(patrimonies[0].value - patrimonies[1].value) < (Math.abs(patrimonies[0].value) * 0.05)) {
          recommendationText += " Os resultados são próximos, considere fatores não financeiros.";
          bestOption = 'comparable';
        }
    } else {
        recommendationText = "Não foi possível determinar a melhor opção devido a valores inválidos em um ou mais cenários (possivelmente devido a taxas de juros extremas). Verifique os parâmetros de entrada.";
        bestOption = 'insufficientData';
    }
  } else {
     recommendationText = "Preencha todos os campos com valores válidos para uma recomendação.";
     bestOption = 'insufficientData';
  }


  return {
    buyOnly,
    buyAndInvest,
    rentAndInvest,
    bestOption,
    analysisPeriodYears,
    recommendationText,
  };
};