
import { PropertyComparatorInputs, PropertyComparisonResults, PropertyScenarioOutput } from '../types';
import { formatCurrency } from '../utils/formatters';

interface SACFinancingDetails {
  monthlyInstallments: number[];
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  firstInstallment: number;
  lastInstallment: number;
}

// Helper: Calculate SAC Financing Details
const calculateFinancingDetailsSAC = (
  loanPrincipal: number,
  annualInterestRatePercent: number,
  termMonths: number
): SACFinancingDetails => {
  if (loanPrincipal <= 0 || termMonths <= 0) {
    return { monthlyInstallments: Array(termMonths || 0).fill(0), totalInterestPaid: 0, totalPrincipalPaid: 0, firstInstallment: 0, lastInstallment: 0 };
  }
  
  // Handle extremely low or effectively -100% annual rates that make monthly rate problematic
  if (annualInterestRatePercent < -99.9999) { // Using a threshold to avoid precision issues leading to monthlyRate = -1
      // If rate is essentially -100% or less, implies loan might be 'paid back' by lender or complex.
      // For simplicity, assume zero payment or handle as error case. Here, returning large values to signify issue.
      const errorInstallment = loanPrincipal > 0 ? Infinity : 0;
      return { 
          monthlyInstallments: Array(termMonths).fill(errorInstallment), 
          totalInterestPaid: Infinity, 
          totalPrincipalPaid: loanPrincipal, 
          firstInstallment: errorInstallment, 
          lastInstallment: errorInstallment 
      };
  }

  const monthlyInterestRate = Math.pow(1 + annualInterestRatePercent / 100, 1 / 12) - 1;

  // If monthly rate makes payments undefined or infinite (e.g. rate = -100% monthly)
  if (monthlyInterestRate <= -1 && loanPrincipal > 0) {
      const errorInstallment = Infinity;
       return { 
          monthlyInstallments: Array(termMonths).fill(errorInstallment), 
          totalInterestPaid: Infinity, 
          totalPrincipalPaid: loanPrincipal, 
          firstInstallment: errorInstallment, 
          lastInstallment: errorInstallment 
      };
  }


  const principalAmortizationPerMonth = loanPrincipal / termMonths;
  let outstandingBalance = loanPrincipal;
  let totalInterestPaid = 0;
  const monthlyInstallments: number[] = [];

  for (let i = 0; i < termMonths; i++) {
    const interestForMonth = outstandingBalance * monthlyInterestRate;
    const installment = principalAmortizationPerMonth + interestForMonth;
    
    monthlyInstallments.push(installment);
    totalInterestPaid += interestForMonth;
    // Ensure balance doesn't go below zero due to floating point arithmetic, especially with negative rates.
    outstandingBalance = Math.max(0, outstandingBalance - principalAmortizationPerMonth);
  }

  return {
    monthlyInstallments,
    totalInterestPaid,
    totalPrincipalPaid: loanPrincipal,
    firstInstallment: monthlyInstallments[0] || 0,
    lastInstallment: monthlyInstallments[monthlyInstallments.length - 1] || 0,
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
      return presentValue * Math.pow(1 + monthlyRate, numMonths) + monthlyPayment * numMonths; // Simplified: PMTs not compounded if rate is -100%
  }

  const fvFromPv = presentValue * Math.pow(1 + monthlyRate, numMonths);
  const fvFromPmt = monthlyPayment * ( (Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate );
  
  return fvFromPv + fvFromPmt;
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

  const analysisPeriodYears = (financingTermMonths || 1) / 12;
  const analysisPeriodMonths = financingTermMonths || 1;

  const loanAmount = Math.max(0, propertyValue - downPayment);
  const financingDetailsSAC = calculateFinancingDetailsSAC(loanAmount, annualInterestRatePercent, analysisPeriodMonths);
  
  let finalPropertyValue_BuyOnly = propertyValue;
  for (let year = 0; year < analysisPeriodYears; year++) {
    finalPropertyValue_BuyOnly *= (1 + (annualPropertyAppreciationPercent / 100));
  }

  const totalFinancingCost_BuyOnly = loanAmount + financingDetailsSAC.totalInterestPaid;
  const totalInitialCashOutlay_BuyOnly = downPayment + financingCosts;
  
  const buyOnlyDetails: string[] = [
    `Financiamento pelo Sistema SAC.`,
    `Primeira parcela: ${formatCurrency(financingDetailsSAC.firstInstallment)}.`,
    `Última parcela: ${formatCurrency(financingDetailsSAC.lastInstallment)}.`,
    `Valor do imóvel após ${analysisPeriodYears} anos.`,
    `Custo total (financiamento + custos iniciais): ${formatCurrency(totalFinancingCost_BuyOnly + totalInitialCashOutlay_BuyOnly)}.`,
  ];

  const buyOnly: PropertyScenarioOutput = {
    scenarioName: "Apenas Comprando o Imóvel",
    totalPatrimony: finalPropertyValue_BuyOnly,
    propertyValueEndOfPeriod: finalPropertyValue_BuyOnly,
    totalFinancingPaid: totalFinancingCost_BuyOnly, // Total interest + principal
    totalInitialCashOutlay: totalInitialCashOutlay_BuyOnly,
    details: buyOnlyDetails,
  };

  // --- SCENARIO 2: BUY AND INVEST (Parallel) ---
  let finalInvestments_BuyAndInvest = 0;
  if (additionalMonthlyInvestmentIfBuying > 0) {
      const monthlyInvestmentRate_Buy = Math.pow(1 + annualInvestmentReturnPercent / 100, 1/12) -1;
      finalInvestments_BuyAndInvest = calculateFutureValue(0, additionalMonthlyInvestmentIfBuying, monthlyInvestmentRate_Buy, analysisPeriodMonths);
  }
  const totalAdditionalInvestedPrincipal = (additionalMonthlyInvestmentIfBuying || 0) * analysisPeriodMonths;
  
  const buyAndInvestDetails: string[] = [
    ...buyOnlyDetails.slice(0,3), // SAC info
    `Valor do imóvel (${formatCurrency(finalPropertyValue_BuyOnly)}) + Saldo Investimentos (${formatCurrency(finalInvestments_BuyAndInvest)}).`,
    `Aportes de ${formatCurrency(additionalMonthlyInvestmentIfBuying || 0)}/mês em investimentos.`
  ];

  const buyAndInvest: PropertyScenarioOutput = {
    ...buyOnly, 
    scenarioName: "Comprando e Investindo em Paralelo",
    totalPatrimony: finalPropertyValue_BuyOnly + finalInvestments_BuyAndInvest,
    investmentsValueEndOfPeriod: finalInvestments_BuyAndInvest,
    totalAdditionalInvestedPrincipal: totalAdditionalInvestedPrincipal,
    details: buyAndInvestDetails,
  };

  // --- SCENARIO 3: RENT AND INVEST ---
  const initialInvestment_Rent = downPayment + financingCosts;
  let currentRent = monthlyRent;
  let totalRentPaid = 0;
  let cumulativeInvestments_Rent = initialInvestment_Rent;
  const monthlyInvestmentRate_Rent = Math.pow(1 + annualInvestmentReturnPercent / 100, 1/12) -1;
  let totalPrincipalInvested_Rent = initialInvestment_Rent; // Starts with the initial saved amount

  for (let month = 1; month <= analysisPeriodMonths; month++) {
    cumulativeInvestments_Rent *= (1 + monthlyInvestmentRate_Rent);

    const costOfOwningThisMonth = financingDetailsSAC.monthlyInstallments[month - 1] !== undefined 
                                   ? financingDetailsSAC.monthlyInstallments[month - 1] 
                                   : (loanAmount / analysisPeriodMonths); // Fallback if something is wrong with installments array

    const netMonthlyFlowForInvestment = costOfOwningThisMonth - currentRent;
    
    cumulativeInvestments_Rent += netMonthlyFlowForInvestment;
    // Only add to principal invested if it's a positive contribution
    // This means if rent > mortgage payment, we are effectively "withdrawing" from opportunity cost savings for rent.
    // The principal calculation tracks the "actual money put into investments".
    if (netMonthlyFlowForInvestment > 0) {
        totalPrincipalInvested_Rent += netMonthlyFlowForInvestment;
    }
    // If netMonthlyFlowForInvestment is negative, it means rent is higher than owning cost.
    // This implies the initial sum (downpayment + costs) is being "consumed" faster to cover rent.
    // The cumulativeInvestments_Rent handles this naturally.
    // totalPrincipalInvested_Rent should reflect cash actually added to investments.

    totalRentPaid += currentRent;

    if (month % 12 === 0 && month < analysisPeriodMonths) {
      currentRent *= (1 + annualRentIncreasePercent / 100);
    }
  }

  const rentAndInvest: PropertyScenarioOutput = {
    scenarioName: "Alugando e Investindo a Diferença",
    totalPatrimony: cumulativeInvestments_Rent,
    investmentsValueEndOfPeriod: cumulativeInvestments_Rent,
    totalRentPaid: totalRentPaid,
    totalInitialCashOutlay: 0, 
    totalAdditionalInvestedPrincipal: totalPrincipalInvested_Rent,
    details: [
        `Investimento inicial (entrada + custos evitados): ${formatCurrency(initialInvestment_Rent)}.`,
        `Investiu/desinvestiu mensalmente a diferença entre parcela SAC e aluguel.`,
        `Financiamento simulado para comparação usaria Sistema SAC.`
    ]
  };

  let bestOption: PropertyComparisonResults['bestOption'] = 'insufficientData';
  let recommendationText = "Preencha todos os campos para uma recomendação.";

  const allInputsValid = [
    propertyValue, downPayment, financingTermMonths,
    annualInterestRatePercent, monthlyRent, annualRentIncreasePercent,
    annualPropertyAppreciationPercent, annualInvestmentReturnPercent,
    additionalMonthlyInvestmentIfBuying
  ].every(val => val !== null && val !== undefined && !isNaN(val));


  if (allInputsValid && propertyValue > 0 && financingTermMonths > 0) {
    const patrimonies = [
      { name: 'buyOnly' as const, value: buyOnly.totalPatrimony },
      { name: 'buyAndInvest' as const, value: buyAndInvest.totalPatrimony },
      { name: 'rentAndInvest' as const, value: rentAndInvest.totalPatrimony },
    ].filter(p => !isNaN(p.value) && isFinite(p.value)); // Filter out NaN/Infinity results before sorting

    if (patrimonies.length === 3) { // Ensure all scenarios yielded valid numbers
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
