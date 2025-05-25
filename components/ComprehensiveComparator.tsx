
import React, { useState, useCallback } from 'react';
import { ComprehensiveInputs, InvestmentPeriodUnit, InvestmentCalculationResult } from '../types';
import { DEFAULT_COMPREHENSIVE_INPUTS } from '../constants';
import { Card } from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { getIrRate } from '../utils/fixedIncomeCalculations'; // Re-use IR calculation
import { formatCurrency, formatNumber } from '../utils/formatters';

const InfoIcon: React.FC<{ title?: string }> = ({ title = "Informação" }) => (
  <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 cursor-default" title={title}>
    (i)
  </span>
);

interface DirectFVFormulaParams {
  pv: number; // Present Value (initial investment)
  pmt: number; // Periodic Payment (monthly contribution)
  i: number; // Periodic interest rate (monthly, as decimal)
  n: number; // Number of periods (total months)
}

interface DirectFVFormulaResult {
  finalBalance: number;
  totalInvested: number;
  totalInterestEarned: number;
}

function calculateFVDirectFormula(params: DirectFVFormulaParams): DirectFVFormulaResult {
  const { pv, pmt, i, n } = params;

  let fv_pv: number;
  let fv_pmt: number;

  if (i === 0) { // Handle zero interest rate case
    fv_pv = pv;
    fv_pmt = pmt * n;
  } else {
    const factor = Math.pow(1 + i, n);
    fv_pv = pv * factor;
    fv_pmt = pmt * ((factor - 1) / i);
  }
  
  const finalBalance = fv_pv + fv_pmt;
  const totalInvested = pv + (pmt * n);
  const totalInterestEarned = finalBalance - totalInvested;

  return {
    finalBalance,
    totalInvested,
    totalInterestEarned,
  };
}


const ComprehensiveComparator: React.FC = () => {
  const [inputs, setInputs] = useState<ComprehensiveInputs>(DEFAULT_COMPREHENSIVE_INPUTS);
  const [results, setResults] = useState<InvestmentCalculationResult[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: string | number = value;

    if (type === 'number') {
      parsedValue = value === '' ? 0 : parseFloat(value);
      if (name === 'trRate' && parsedValue < 0) parsedValue = 0; 
      if ((name === 'initialInvestment' || name === 'monthlyContributions') && parsedValue < 0) parsedValue = 0;
    }
    
    setInputs(prev => ({ ...prev, [name]: parsedValue as number }));
    setResults(null); // Clear previous results on input change
  }, []);

  const handleCompare = useCallback(() => {
    setIsLoading(true);
    setResults(null);

    const { 
      initialInvestment, monthlyContributions, applicationPeriodValue, applicationPeriodUnit,
      selicRate, cdiRate, ipcaRate, trRate,
      tesouroPrefixadoNominalRate, tesouroCustodyFeeB3,
      tesouroIpcaRealRate,
      cdbRatePercentageOfCdi,
      lciLcaRatePercentageOfCdi,
      poupancaRateMonthly
    } = inputs;

    const totalMonths = applicationPeriodUnit === 'years' ? applicationPeriodValue * 12 : applicationPeriodValue;
    const totalYears = totalMonths / 12;
    
    const termDaysForIr = applicationPeriodUnit === 'years' 
        ? applicationPeriodValue * 365.25 
        : totalMonths * (365.25 / 12);
    
    const calculatedResults: InvestmentCalculationResult[] = [];

    const annualToMonthlyRate = (annualRateDecimal: number): number => {
        if (annualRateDecimal <= -1) {
            return -1; 
        }
        return Math.pow(1 + annualRateDecimal, 1/12) - 1;
    };

    // 1. Poupança
    const poupancaMonthlyDecimal = poupancaRateMonthly / 100;
    const poupancaSim = calculateFVDirectFormula({ pv: initialInvestment, pmt: monthlyContributions, i: poupancaMonthlyDecimal, n: totalMonths });
    calculatedResults.push({
      name: "Poupança",
      finalGrossBalance: poupancaSim.finalBalance,
      netBalance: poupancaSim.finalBalance,
      totalInvested: poupancaSim.totalInvested,
      totalInterestEarned: poupancaSim.totalInterestEarned,
      irRateAppliedPercent: 0,
      irAmount: 0,
      effectiveMonthlyRateUsedPercent: poupancaMonthlyDecimal * 100,
      effectiveAnnualRateUsedPercent: (Math.pow(1 + poupancaMonthlyDecimal, 12) - 1) * 100,
      operationalFeesPaid: 0,
    });

    const custodyFeeB3AnnualRateDecimal = tesouroCustodyFeeB3 / 100;

    // 2. Tesouro Prefixado
    const tpGrossAnnualRateDecimal_BeforeFee = tesouroPrefixadoNominalRate / 100;
    const tpMonthlyGrossRate_BeforeFee = annualToMonthlyRate(tpGrossAnnualRateDecimal_BeforeFee);
    
    const tpSimGrossPreFeeResults = calculateFVDirectFormula({ 
        pv: initialInvestment, 
        pmt: monthlyContributions, 
        i: tpMonthlyGrossRate_BeforeFee, 
        n: totalMonths 
    });
    
    const tpFVGrossPreFee = tpSimGrossPreFeeResults.finalBalance;
    const tpTotalInvested = tpSimGrossPreFeeResults.totalInvested;

    // Calculate Custody Fee (simplified: applied on final gross balance proportionally to years)
    const tpCustodyAmountTotal = Math.max(0, tpFVGrossPreFee) * custodyFeeB3AnnualRateDecimal * totalYears;
    
    // Balance after custody fee, before IR
    const tpBalanceAfterCustody_BeforeIR = tpFVGrossPreFee - tpCustodyAmountTotal;
    
    // Profit after custody fee, before IR (this is the base for IR calculation)
    const tpProfit_AfterCustody_BeforeIR = tpBalanceAfterCustody_BeforeIR - tpTotalInvested;

    // Calculate IR based on profit AFTER custody fee
    const tpIrRateDecimal = tpProfit_AfterCustody_BeforeIR > 0 ? getIrRate(termDaysForIr) : 0;
    const tpIrAmount = tpProfit_AfterCustody_BeforeIR > 0 ? tpProfit_AfterCustody_BeforeIR * tpIrRateDecimal : 0;
    
    // Calculate Net Balance
    const tpNetBalance = tpBalanceAfterCustody_BeforeIR - tpIrAmount;
    
    calculatedResults.push({
      name: "Tesouro Prefixado",
      finalGrossBalance: tpBalanceAfterCustody_BeforeIR, 
      netBalance: tpNetBalance,                                
      totalInvested: tpTotalInvested,
      totalInterestEarned: tpProfit_AfterCustody_BeforeIR, // Interest after custody, before IR
      irRateAppliedPercent: tpIrRateDecimal * 100,
      irAmount: tpIrAmount,
      effectiveMonthlyRateUsedPercent: tpMonthlyGrossRate_BeforeFee * 100, // Base rate before any fees/taxes
      effectiveAnnualRateUsedPercent: tpGrossAnnualRateDecimal_BeforeFee * 100, // Base rate before any fees/taxes
      operationalFeesPaid: tpCustodyAmountTotal,
    });

    // 3. Tesouro IPCA+
    const tipcaRealAnnualDecimal = tesouroIpcaRealRate / 100;
    const ipcaAnnualDecimal = ipcaRate / 100;
    const tipcaGrossNominalAnnual_BeforeFee = (1 + tipcaRealAnnualDecimal) * (1 + ipcaAnnualDecimal) - 1;
    const tipcaMonthlyGross_BeforeFee = annualToMonthlyRate(tipcaGrossNominalAnnual_BeforeFee);

    const tipcaSimGrossPreFeeResults = calculateFVDirectFormula({
        pv: initialInvestment, 
        pmt: monthlyContributions, 
        i: tipcaMonthlyGross_BeforeFee, 
        n: totalMonths
    });

    const tipcaFVGrossPreFee = tipcaSimGrossPreFeeResults.finalBalance;
    const tipcaTotalInvested = tipcaSimGrossPreFeeResults.totalInvested;

    // Calculate Custody Fee
    const tipcaCustodyAmountTotal = Math.max(0, tipcaFVGrossPreFee) * custodyFeeB3AnnualRateDecimal * totalYears;

    // Balance after custody fee, before IR
    const tipcaBalanceAfterCustody_BeforeIR = tipcaFVGrossPreFee - tipcaCustodyAmountTotal;

    // Profit after custody fee, before IR (base for IR)
    const tipcaProfit_AfterCustody_BeforeIR = tipcaBalanceAfterCustody_BeforeIR - tipcaTotalInvested;
    
    // Calculate IR based on profit AFTER custody fee
    const tipcaIrRateDecimal = tipcaProfit_AfterCustody_BeforeIR > 0 ? getIrRate(termDaysForIr) : 0;
    const tipcaIrAmount = tipcaProfit_AfterCustody_BeforeIR > 0 ? tipcaProfit_AfterCustody_BeforeIR * tipcaIrRateDecimal : 0;
    
    // Calculate Net Balance
    const tipcaNetBalance = tipcaBalanceAfterCustody_BeforeIR - tipcaIrAmount;
        
    calculatedResults.push({
      name: "Tesouro IPCA+",
      finalGrossBalance: tipcaBalanceAfterCustody_BeforeIR, 
      netBalance: tipcaNetBalance,                                 
      totalInvested: tipcaTotalInvested,
      totalInterestEarned: tipcaProfit_AfterCustody_BeforeIR, 
      irRateAppliedPercent: tipcaIrRateDecimal * 100,
      irAmount: tipcaIrAmount,
      effectiveMonthlyRateUsedPercent: tipcaMonthlyGross_BeforeFee * 100, // Base rate
      effectiveAnnualRateUsedPercent: tipcaGrossNominalAnnual_BeforeFee * 100, // Base rate
      operationalFeesPaid: tipcaCustodyAmountTotal,
    });

    const cdiAnnualDecimal = cdiRate / 100;

    // 4. CDB (% CDI)
    const cdbAnnualGrossRate = cdiAnnualDecimal * (cdbRatePercentageOfCdi / 100);
    const cdbMonthlyGrossRate = annualToMonthlyRate(cdbAnnualGrossRate);
    
    const cdbSimGross = calculateFVDirectFormula({ 
        pv: initialInvestment, 
        pmt: monthlyContributions, 
        i: cdbMonthlyGrossRate, 
        n: totalMonths 
    });

    const cdbFinalGrossBalance_PreIR = cdbSimGross.finalBalance;
    const cdbTotalInterestEarned_PreIR = cdbSimGross.totalInterestEarned;
    const cdbTotalInvested = cdbSimGross.totalInvested;

    const cdbIrRateDecimal = cdbTotalInterestEarned_PreIR > 0 ? getIrRate(termDaysForIr) : 0;
    const cdbIrAmount = cdbTotalInterestEarned_PreIR > 0 ? cdbTotalInterestEarned_PreIR * cdbIrRateDecimal : 0;
    const cdbNetBalance = cdbFinalGrossBalance_PreIR - cdbIrAmount;

    calculatedResults.push({
      name: `CDB ${cdbRatePercentageOfCdi}% CDI`,
      finalGrossBalance: cdbFinalGrossBalance_PreIR, // No operational fees in this model for CDB
      netBalance: cdbNetBalance,
      totalInvested: cdbTotalInvested,
      totalInterestEarned: cdbTotalInterestEarned_PreIR, // Interest before IR
      irRateAppliedPercent: cdbIrRateDecimal * 100,
      irAmount: cdbIrAmount,
      effectiveMonthlyRateUsedPercent: cdbMonthlyGrossRate * 100, 
      effectiveAnnualRateUsedPercent: cdbAnnualGrossRate * 100,
      operationalFeesPaid: 0,   
    });
    
    // 5. LCI/LCA (% CDI)
    const lciLcaGrossAnnual = cdiAnnualDecimal * (lciLcaRatePercentageOfCdi / 100);
    const lciLcaMonthly = annualToMonthlyRate(lciLcaGrossAnnual);
    const lciLcaSim = calculateFVDirectFormula({ pv: initialInvestment, pmt: monthlyContributions, i: lciLcaMonthly, n: totalMonths });
    calculatedResults.push({
      name: `LCI/LCA ${lciLcaRatePercentageOfCdi}% CDI`,
      finalGrossBalance: lciLcaSim.finalBalance, // No operational fees, no IR
      netBalance: lciLcaSim.finalBalance, // Isenta de IR
      totalInvested: lciLcaSim.totalInvested,
      totalInterestEarned: lciLcaSim.totalInterestEarned, // Interest is already net
      irRateAppliedPercent: 0,
      irAmount: 0,
      effectiveMonthlyRateUsedPercent: lciLcaMonthly * 100,
      effectiveAnnualRateUsedPercent: lciLcaGrossAnnual * 100,
      operationalFeesPaid: 0,
    });

    calculatedResults.sort((a, b) => b.netBalance - a.netBalance);
    
    setResults(calculatedResults);
    setIsLoading(false);
  }, [inputs]);
  
  const renderInputWithInfo = (
    id: keyof ComprehensiveInputs, 
    label: string, 
    unitSuffix: string = "%", 
    step: string = "0.01", 
    hasInfoIcon: boolean = true,
    min?: number,
    max?: number,
    infoTitle?: string
  ) => (
    <Input
      label={<>{label} {hasInfoIcon && <InfoIcon title={infoTitle} />}</>}
      type="number"
      id={id}
      name={id}
      value={inputs[id].toString()}
      onChange={handleChange}
      step={step}
      min={min !== undefined ? min.toString() : undefined}
      max={max !== undefined ? max.toString() : undefined}
      icon={<span className="text-gray-400 dark:text-gray-500">{unitSuffix}</span>}
    />
  );


  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-center">Que aplicação rende mais?</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-8">
        {/* Seção de Inputs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
          <Input
            label="Investimento inicial"
            type="number"
            id="initialInvestment"
            name="initialInvestment"
            value={inputs.initialInvestment.toString()}
            onChange={handleChange}
            min="0"
            step="100"
            icon={<span className="text-gray-400 dark:text-gray-500">R$</span>}
          />
          <Input
            label="Aportes mensais"
            type="number"
            id="monthlyContributions"
            name="monthlyContributions"
            value={inputs.monthlyContributions.toString()}
            onChange={handleChange}
            min="0"
            step="50"
            icon={<span className="text-gray-400 dark:text-gray-500">R$</span>}
          />
          <div className="grid grid-cols-2 gap-2 items-end">
            <Input
              label="Período da aplicação"
              type="number"
              id="applicationPeriodValue"
              name="applicationPeriodValue"
              value={inputs.applicationPeriodValue.toString()}
              onChange={handleChange}
              min="1"
            />
            <Select
              label=" " 
              id="applicationPeriodUnit"
              name="applicationPeriodUnit"
              options={[
                { value: 'months', label: 'meses' },
                { value: 'years', label: 'anos' },
              ]}
              value={inputs.applicationPeriodUnit}
              onChange={handleChange}
              className="mt-1" 
            />
          </div>
        </div>

        {/* Seção de Indicadores Econômicos */}
        <div className="pt-6 border-t border-gray-200 dark:border-slate-700/60">
          <h3 className="text-md font-semibold text-gray-700 dark:text-blue-400 mb-4">Indicadores Econômicos (Projeção Anual)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
            {renderInputWithInfo("selicRate", "Selic Efetiva", "%", "0.01", true, undefined, undefined, "Taxa Selic anual projetada.")}
            {renderInputWithInfo("cdiRate", "CDI", "%", "0.01", true, undefined, undefined, "Taxa CDI anual projetada.")}
            {renderInputWithInfo("ipcaRate", "IPCA", "%", "0.01", true, undefined, undefined, "Inflação (IPCA) anual projetada.")}
            {renderInputWithInfo("trRate", "TR (Mensal)", "%", "0.0001", true, undefined, undefined, "Taxa Referencial mensal projetada.")}
          </div>
        </div>

        {/* Seção de Parâmetros de Investimentos Específicos */}
        <div className="pt-6 border-t border-gray-200 dark:border-slate-700/60">
          <h3 className="text-md font-semibold text-gray-700 dark:text-blue-400 mb-4">Parâmetros das Aplicações (Taxas Anuais Brutas, salvo indicação)</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 p-4 rounded-md border border-gray-200 dark:border-slate-700/40 bg-white/30 dark:bg-slate-800/30">
              {renderInputWithInfo("tesouroPrefixadoNominalRate", "Tesouro Prefixado (Juro Nominal)", "%", "0.01", false)}
              {renderInputWithInfo("tesouroCustodyFeeB3", "Taxa Custódia B3 (Tesouro Direto)", "%", "0.01", true, 0, 1, "Taxa anual cobrada pela B3 sobre o valor dos títulos. Estimada aqui como um percentual sobre o valor bruto final acumulado, proporcional ao prazo.")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 p-4 rounded-md border border-gray-200 dark:border-slate-700/40 bg-white/30 dark:bg-slate-800/30">
              {renderInputWithInfo("tesouroIpcaRealRate", "Tesouro IPCA+ (Juro Real)", "%", "0.01", false, undefined, undefined, "Taxa real anual, acima da inflação (IPCA).")}
               <Input
                label={<>Rent. CDB (% do CDI) <InfoIcon title="Percentual da taxa CDI que o CDB renderá anualmente (bruto)."/></>}
                type="number"
                id="cdbRatePercentageOfCdi"
                name="cdbRatePercentageOfCdi"
                value={inputs.cdbRatePercentageOfCdi.toString()}
                onChange={handleChange}
                step="0.1"
                icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 p-4 rounded-md border border-gray-200 dark:border-slate-700/40 bg-white/30 dark:bg-slate-800/30">
              <Input
                label={<>Rent. LCI/LCA (% do CDI) <InfoIcon title="Percentual da taxa CDI que a LCI/LCA renderá anualmente (isento de IR)."/></>}
                type="number"
                id="lciLcaRatePercentageOfCdi"
                name="lciLcaRatePercentageOfCdi"
                value={inputs.lciLcaRatePercentageOfCdi.toString()}
                onChange={handleChange}
                step="1"
                icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
              />
              {renderInputWithInfo("poupancaRateMonthly", "Poupança (Rent. Mensal Efetiva)", "%", "0.0001", true, undefined, undefined, "Rentabilidade mensal já líquida e efetiva da poupança, considerando regras de Selic/TR.")}
            </div>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          Esses são os parâmetros padrões utilizados na sua simulação. Você pode alterá-los e refazer os cálculos para uma simulação avançada. As taxas anuais são convertidas para mensais para o cálculo com aportes. O prazo para IR é calculado com base em dias corridos (365,25 dias/ano).
        </p>

        <Button
          type="button"
          onClick={handleCompare}
          variant="primary"
          size="lg"
          className="w-full mt-8"
          disabled={isLoading}
        >
          {isLoading ? 'Calculando...' : 'Comparar Aplicações'}
        </Button>

        {results && results.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700/60">
            <h3 className="text-xl font-semibold text-center text-gray-800 dark:text-blue-300 mb-6">Resultados do Comparativo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((res, index) => (
                <Card key={res.name} className={`shadow-lg ${index === 0 ? 'border-2 border-green-500 dark:border-green-400' : ''}`}>
                  <Card.Header className={index === 0 ? 'bg-green-50 dark:bg-green-900/30' : ''}>
                    <Card.Title className="flex justify-between items-center">
                      <span>{index + 1}. {res.name}</span>
                      {index === 0 && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">MELHOR</span>}
                    </Card.Title>
                  </Card.Header>
                  <Card.Content className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Valor Líquido Final:</span>
                      <span className="font-bold text-lg text-primary dark:text-primary-light">{formatCurrency(res.netBalance)}</span>
                    </div>
                     <hr className="my-1 border-gray-200 dark:border-slate-700/50"/>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Investido:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(res.totalInvested)}</span>
                    </div>
                     <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400" title="Juros totais após taxas operacionais (como custódia B3), antes do Imposto de Renda.">Juros Pós-Taxas Op. (pré-IR):</span>
                      <span className="font-medium text-green-600 dark:text-green-500">{formatCurrency(res.totalInterestEarned)}</span>
                    </div>
                    {res.operationalFeesPaid !== undefined && res.operationalFeesPaid !== 0 && ( 
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Taxas Operacionais Pagas:</span>
                          <span className="font-medium text-orange-600 dark:text-orange-500">(-) {formatCurrency(res.operationalFeesPaid)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400" title="Saldo após juros e taxas operacionais (como custódia B3), antes do Imposto de Renda.">Valor Bruto (Pós-Taxas Op., pré-IR):</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(res.finalGrossBalance)}</span>
                    </div>
                    {res.irAmount > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Alíquota IR Aplicada:</span>
                          <span className="font-medium text-red-600 dark:text-red-500">{res.irRateAppliedPercent.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">IR Pago (Estimado):</span>
                          <span className="font-medium text-red-600 dark:text-red-500">(-) {formatCurrency(res.irAmount)}</span>
                        </div>
                      </>
                    )}
                     <div className="pt-2 space-y-0.5">
                        {res.effectiveAnnualRateUsedPercent !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-gray-400" 
                               title={
                                 (res.name.startsWith("LCI/LCA") || res.name.startsWith("Poupança")) ? "Taxa Anual Efetiva (isenta/líquida) usada na simulação." :
                                 (res.name.startsWith("Tesouro")) ? "Taxa Anual Bruta base (pré-taxa B3 e pré-IR) usada para cálculo." :
                                 "Taxa Anual Bruta base (pré-IR) usada para simulação."
                                }>
                                {
                                 (res.name.startsWith("LCI/LCA") || res.name.startsWith("Poupança")) ? "TAE (efetiva):" :
                                 (res.name.startsWith("Tesouro")) ? "TAE Bruta (base):" :
                                 "TAE Bruta (base):"
                                } {formatNumber(res.effectiveAnnualRateUsedPercent, 2)}%
                            </p>
                        )}
                        {res.effectiveMonthlyRateUsedPercent !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-gray-400"
                                title={
                                  (res.name.startsWith("LCI/LCA") || res.name.startsWith("Poupança")) ? "Taxa Mensal Efetiva (isenta/líquida) usada na simulação." :
                                  (res.name.startsWith("Tesouro")) ? "Taxa Mensal Bruta base (precisão total, pré-taxa B3 e pré-IR) usada para cálculo." :
                                  "Taxa Mensal Bruta base (precisão total, pré-IR) usada para simulação."
                                }>
                                {
                                 (res.name.startsWith("LCI/LCA") || res.name.startsWith("Poupança")) ? "TME (efetiva):" :
                                 (res.name.startsWith("Tesouro")) ? "TME Bruta (base):" :
                                 "TME Bruta (base):"
                                } {formatNumber(res.effectiveMonthlyRateUsedPercent, 6)}%
                            </p>
                        )}
                     </div>
                  </Card.Content>
                </Card>
              ))}
            </div>
             <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6 pt-4 border-t border-gray-200 dark:border-slate-700/60">
              <strong>Atenção:</strong> Os cálculos são simulações e podem não refletir a rentabilidade exata devido a arredondamentos, simplificações e volatilidade do mercado. Para Tesouro IPCA+, a inflação (IPCA) utilizada é a projetada. Para Tesouro Direto, a taxa de custódia da B3 é estimada como um percentual sobre o valor bruto final acumulado, proporcional ao prazo da aplicação. Consulte um profissional financeiro.
            </p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default ComprehensiveComparator;
