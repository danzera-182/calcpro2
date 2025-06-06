
import { UpfrontVsInstallmentsInputs, UpfrontVsInstallmentsResults } from '../types';
import { formatCurrency } from './formatters';

/**
 * Calculates the Payment (PMT) for a loan.
 * @param principal The loan amount.
 * @param monthlyInterestRate The monthly interest rate (as a decimal, e.g., 0.01 for 1%).
 * @param numberOfPayments The total number of payments.
 * @returns The monthly payment amount.
 */
function calculatePMT(principal: number, monthlyInterestRate: number, numberOfPayments: number): number {
  if (principal <= 0 || numberOfPayments <= 0) return 0;
  if (monthlyInterestRate === 0) {
    return principal / numberOfPayments;
  }
  // Check for extremely negative rates that make denominator zero or formula unstable
  if (monthlyInterestRate <= -1) {
    // This case implies an infinite payment or is ill-defined.
    // For practical purposes, if the rate is -100% or less, it often means the loan is free or pays you,
    // but standard PMT formula breaks. Here, we might return based on a specific business rule.
    // For simplicity, if it's exactly -100%, let's assume installments are 0 if principal is positive.
    // This is a simplification; real-world handling might differ.
    return 0; 
  }

  const factor = Math.pow(1 + monthlyInterestRate, numberOfPayments);
  if (factor === 1 && monthlyInterestRate !== 0) { // Avoid division by zero if factor is 1 due to precision with very small rates
      return principal / numberOfPayments; // Effectively 0 interest
  }
  if (factor - 1 === 0) { // Should be caught by monthlyInterestRate === 0, but as a safeguard
      return principal / numberOfPayments;
  }
  
  return principal * (monthlyInterestRate * factor) / (factor - 1);
}

/**
 * Calculates the Net Present Value (NPV) of a series of equal payments.
 * @param pmt The amount of each payment.
 * @param monthlyDiscountRate The monthly discount rate (as a decimal).
 * @param numberOfPayments The total number of payments.
 * @returns The NPV of the payment series.
 */
function calculateNPV(pmt: number, monthlyDiscountRate: number, numberOfPayments: number): number {
  if (pmt === 0 || numberOfPayments === 0) return 0;
  if (monthlyDiscountRate === 0) {
    return pmt * numberOfPayments;
  }
  // Check for discount rates that make the formula problematic
  if (monthlyDiscountRate <= -1) {
    // If discount rate is -100% or less, NPV can be infinite or ill-defined.
    // For practical financial sense, such rates usually mean the comparison isn't standard.
    // Returning sum of PMTs might be one approach, or an error/special value.
    // If rate is -100%, (1+rate) is 0, leading to division by zero.
    // For simplicity, if rate implies future values are infinitely large or zeroed out:
    return pmt * numberOfPayments; // Simplification, as "discounting" at -100% is complex
  }
  return pmt * (1 - Math.pow(1 + monthlyDiscountRate, -numberOfPayments)) / monthlyDiscountRate;
}


export const calculateUpfrontVsInstallments = (inputs: UpfrontVsInstallmentsInputs): UpfrontVsInstallmentsResults => {
  const {
    productPrice = 0,
    upfrontDiscountPercent = 0,
    numberOfInstallments = 1,
    installmentInterestRatePercentMonthly = 0,
    alternativeInvestmentRatePercentMonthly = 0,
  } = inputs;

  let recommendationText = "Preencha os campos para ver a análise.";
  let bestOption: UpfrontVsInstallmentsResults['bestOption'] = 'insufficientData';
  let savingsOrGain = 0;

  if (productPrice <= 0 || numberOfInstallments <= 0) {
    return {
      amountToPayUpfront: 0,
      installmentValue: 0,
      totalPaidInInstallments: 0,
      npvOfInstallments: 0,
      bestOption: 'insufficientData',
      savingsOrGain: 0,
      recommendationText: "O valor do produto e o número de parcelas devem ser positivos.",
      inputsUsed: inputs,
    };
  }

  const amountToPayUpfront = productPrice * (1 - (upfrontDiscountPercent || 0) / 100);
  
  const financedAmount = productPrice; // Assuming installments are over the full price
  const i_inst_monthly = (installmentInterestRatePercentMonthly || 0) / 100;
  
  const installmentValue = calculatePMT(financedAmount, i_inst_monthly, numberOfInstallments);
  const totalPaidInInstallments = installmentValue * numberOfInstallments;

  const r_alt_monthly = (alternativeInvestmentRatePercentMonthly || 0) / 100;
  const npvOfInstallments = calculateNPV(installmentValue, r_alt_monthly, numberOfInstallments);

  // Comparison
  const thresholdFactor = 0.001; // 0.1% of product price for "equivalent"
  const equivalenceThreshold = productPrice * thresholdFactor;

  if (Math.abs(amountToPayUpfront - npvOfInstallments) <= equivalenceThreshold) {
    bestOption = 'equivalent';
    recommendationText = `Financeiramente, as opções são equivalentes (diferença de ${formatCurrency(Math.abs(amountToPayUpfront - npvOfInstallments))}). Considere outros fatores como fluxo de caixa.`;
    savingsOrGain = amountToPayUpfront - npvOfInstallments;
  } else if (amountToPayUpfront < npvOfInstallments) {
    bestOption = 'upfront';
    savingsOrGain = npvOfInstallments - amountToPayUpfront;
    recommendationText = `Pagar à vista é ${formatCurrency(savingsOrGain)} mais vantajoso do que o valor presente das parcelas.`;
  } else { // npvOfInstallments < amountToPayUpfront
    bestOption = 'installments';
    savingsOrGain = amountToPayUpfront - npvOfInstallments;
    recommendationText = `Parcelar e investir o valor que seria pago à vista pode gerar um ganho (em valor presente) de ${formatCurrency(savingsOrGain)}.`;
  }

  return {
    amountToPayUpfront,
    installmentValue,
    totalPaidInInstallments,
    npvOfInstallments,
    bestOption,
    savingsOrGain,
    recommendationText,
    inputsUsed: inputs,
  };
};
