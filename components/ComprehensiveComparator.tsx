
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ComprehensiveInputs, InvestmentPeriodUnit, InvestmentCalculationResult } from '../types';
import { DEFAULT_COMPREHENSIVE_INPUTS } from '../constants';
import { Card } from './ui/Card';
import Input from './ui/Input'; 
import Select from './ui/Select';
import Button from './ui/Button';
import { getIrRate } from '../utils/fixedIncomeCalculations'; 
import { formatCurrency, formatNumber, formatNumberForDisplay } from '../utils/formatters';
import FormattedNumericInput from './ui/FormattedNumericInput'; 
import { fetchEconomicIndicators, FetchedEconomicIndicators } from '../utils/economicIndicatorsAPI'; 

const InfoIcon: React.FC<{ title?: string }> = ({ title = "Informação" }) => (
  <span className="ml-1 text-xs text-slate-400 dark:text-slate-500 cursor-default" title={title}>
    (i)
  </span>
);

interface AutoFetchedMarkerProps {
  isFetched?: boolean;
}
const AutoFetchedMarker: React.FC<AutoFetchedMarkerProps> = ({ isFetched }) => {
  if (!isFetched) return null;
  return <span title="Valor preenchido automaticamente" className="text-blue-500 dark:text-blue-400 ml-1">*</span>;
};


interface DirectFVFormulaParams {
  pv: number; 
  pmt: number; 
  i: number; 
  n: number; 
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

  if (i === 0) { 
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

const calculatePoupancaEffectiveRates = (selicRateAnnualPercent: number | null, trRateMonthlyPercent: number | null): { monthly: number, annual: number, ruleApplied: string } => {
    const selicAnnualDecimal = (selicRateAnnualPercent ?? 0) / 100;
    const trMonthlyDecimal = (trRateMonthlyPercent ?? 0) / 100;

    let poupancaMonthlyRateBeforeTRDecimal: number;
    let ruleApplied: string;

    if (selicAnnualDecimal <= 0.085) { 
        const selicMonthlyDecimalEquivalent = Math.pow(1 + selicAnnualDecimal, 1/12) - 1;
        poupancaMonthlyRateBeforeTRDecimal = 0.70 * selicMonthlyDecimalEquivalent;
        ruleApplied = "70% Selic + TR"; 
    } else { 
        poupancaMonthlyRateBeforeTRDecimal = 0.005; 
        ruleApplied = "0,5% a.m. + TR";
    }

    const effectiveMonthlyRate = poupancaMonthlyRateBeforeTRDecimal + trMonthlyDecimal;
    const effectiveAnnualRate = Math.pow(1 + effectiveMonthlyRate, 12) - 1;
    
    return {
        monthly: effectiveMonthlyRate * 100, 
        annual: effectiveAnnualRate * 100,   
        ruleApplied
    };
};

interface IpcaDisplayConfig {
  tooltipText: string;
  isFetched: boolean;
}


type AutoFetchTrackedKeys = 'selicRate' | 'cdiRate' | 'ipcaRate' | 'trRate'; 


const ComprehensiveComparator: React.FC = () => {
  const [inputs, setInputs] = useState<ComprehensiveInputs>(DEFAULT_COMPREHENSIVE_INPUTS);
  const [results, setResults] = useState<InvestmentCalculationResult[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  
  const [isFetchingEconomicData, setIsFetchingEconomicData] = useState<boolean>(false);
  const [fetchedEcoData, setFetchedEcoData] = useState<FetchedEconomicIndicators | null>(null); 
  const [economicDataFetchError, setEconomicDataFetchError] = useState<string | null>(null);
  const [initialFetchedDataMarkers, setInitialFetchedDataMarkers] = useState<Partial<Record<AutoFetchTrackedKeys, boolean>>>({});
  
  const [ipcaDisplayConfig, setIpcaDisplayConfig] = useState<IpcaDisplayConfig>({
    tooltipText: "Inflação (IPCA) anual projetada.",
    isFetched: false,
  });


  useEffect(() => {
    const loadEconomicData = async () => {
      setIsFetchingEconomicData(true);
      setEconomicDataFetchError(null);
      setFetchedEcoData(null); 
      try {
        const fetchedData = await fetchEconomicIndicators();
        setFetchedEcoData(fetchedData);
        
        const newFetchedMarkers: Partial<Record<AutoFetchTrackedKeys, boolean>> = {};
        if (fetchedData.selicRate !== undefined) newFetchedMarkers.selicRate = true;
        if (fetchedData.cdiRate !== undefined) newFetchedMarkers.cdiRate = true;
        if (fetchedData.trRate !== undefined) newFetchedMarkers.trRate = true; 
        
        setInitialFetchedDataMarkers(newFetchedMarkers);

        setInputs(prev => ({
          ...prev,
          ...(fetchedData.selicRate !== undefined && { selicRate: fetchedData.selicRate }),
          ...(fetchedData.cdiRate !== undefined && { cdiRate: fetchedData.cdiRate }),
          ...(fetchedData.ipcaRate !== undefined && { ipcaRate: fetchedData.ipcaRate }),
          ...(fetchedData.trRate !== undefined && { trRate: fetchedData.trRate }), 
        }));
        
        let newIpcaTooltipText = "Inflação (IPCA) anual projetada (valor padrão).";
        let newIpcaIsFetched = false;

        if (fetchedData.ipcaRate !== undefined) {
          newIpcaIsFetched = true;
          if (fetchedData.ipcaSourceType === 'accumulated12m') {
            if (fetchedData.ipcaReferenceDate) { 
              newIpcaTooltipText = `IPCA real acumulado nos 12 meses encerrados em ${fetchedData.ipcaReferenceDate} (dado mais recente disponível).`;
            } else {
              newIpcaTooltipText = "IPCA real acumulado nos últimos 12 meses (dado mais recente disponível).";
            }
          } else { 
            if (fetchedData.ipcaReferenceDate) { 
               newIpcaTooltipText = `Inflação (IPCA) anual projetada para ${fetchedData.ipcaReferenceDate}.`;
            } else {
               newIpcaTooltipText = "Inflação (IPCA) anual projetada.";
            }
          }
        }
        setIpcaDisplayConfig({
            tooltipText: newIpcaTooltipText,
            isFetched: newIpcaIsFetched,
        });


        if (fetchedData.errors && fetchedData.errors.length > 0) {
          const totalPossibleIndicatorsAutoFetched = 4; 
          if (fetchedData.errors.length === totalPossibleIndicatorsAutoFetched) { 
             setEconomicDataFetchError(`Falha ao buscar todos os indicadores automáticos. Usando valores padrão.`);
          } else {
             setEconomicDataFetchError(`Falha ao buscar: ${fetchedData.errors.join(', ')}. Usando valores padrão para estes.`);
          }
        }
      } catch (error) {
        console.error("Error fetching economic indicators:", error);
        setEconomicDataFetchError("Erro ao carregar indicadores econômicos. Usando valores padrão.");
        setInitialFetchedDataMarkers({}); 
        setIpcaDisplayConfig({ tooltipText: "Inflação (IPCA) anual projetada (valor padrão).", isFetched: false });
      } finally {
        setIsFetchingEconomicData(false);
      }
    };
    loadEconomicData();
  }, []);


  const handleFormattedInputChange = useCallback((name: string, value: number | null) => {
    setInputs(prev => ({ ...prev, [name]: value })); 
    setResults(null);
    
    const keyName = name as AutoFetchTrackedKeys;
    if (initialFetchedDataMarkers[keyName]) {
      setInitialFetchedDataMarkers(prev => ({ ...prev, [keyName]: false }));
    }
    if (name === 'ipcaRate' && ipcaDisplayConfig.isFetched) {
      setIpcaDisplayConfig({tooltipText: "Inflação (IPCA) anual.", isFetched: false});
    }
  }, [initialFetchedDataMarkers, ipcaDisplayConfig.isFetched]);

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value as InvestmentPeriodUnit }));
    setResults(null);
  }, []);
  
  const handlePeriodValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue: number | null;
      if (value.trim() === '') {
        processedValue = null; 
      } else {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          processedValue = null; 
        } else {
          processedValue = Math.max(1, parsed); 
        }
      }
    setInputs(prev => ({ ...prev, [name]: processedValue }));
    setResults(null);
  }, []);

  const poupancaCalculatedRates = useMemo(() => {
    return calculatePoupancaEffectiveRates(inputs.selicRate, inputs.trRate);
  }, [inputs.selicRate, inputs.trRate]);


  const handleCompare = useCallback(() => {
    setIsLoading(true); 
    setResults(null);

    setTimeout(() => {
      const validatedInputs = {
        initialInvestment: inputs.initialInvestment ?? 0,
        monthlyContributions: inputs.monthlyContributions ?? 0,
        applicationPeriodValue: inputs.applicationPeriodValue === null ? 1 : Math.max(1, inputs.applicationPeriodValue),
        applicationPeriodUnit: inputs.applicationPeriodUnit,
        selicRate: inputs.selicRate ?? DEFAULT_COMPREHENSIVE_INPUTS.selicRate ?? 0, 
        cdiRate: inputs.cdiRate ?? DEFAULT_COMPREHENSIVE_INPUTS.cdiRate ?? 0,
        ipcaRate: inputs.ipcaRate ?? DEFAULT_COMPREHENSIVE_INPUTS.ipcaRate ?? 0,
        trRate: inputs.trRate ?? DEFAULT_COMPREHENSIVE_INPUTS.trRate ?? 0,
        tesouroPrefixadoNominalRate: inputs.tesouroPrefixadoNominalRate ?? 0,
        tesouroCustodyFeeB3: inputs.tesouroCustodyFeeB3 ?? 0,
        tesouroIpcaRealRate: inputs.tesouroIpcaRealRate ?? 0,
        cdbRatePercentageOfCdi: inputs.cdbRatePercentageOfCdi ?? 0,
        lciLcaRatePercentageOfCdi: inputs.lciLcaRatePercentageOfCdi ?? 0,
      };


      const { 
        initialInvestment, monthlyContributions, applicationPeriodValue, applicationPeriodUnit,
        selicRate, cdiRate, ipcaRate, 
        tesouroPrefixadoNominalRate, tesouroCustodyFeeB3,
        tesouroIpcaRealRate,
        cdbRatePercentageOfCdi,
        lciLcaRatePercentageOfCdi
      } = validatedInputs;

      const totalMonths = applicationPeriodUnit === 'years' ? applicationPeriodValue * 12 : applicationPeriodValue;
      const totalYears = totalMonths / 12;
      
      const termDaysForIr = totalMonths * (365.25 / 12); 
      
      const calculatedResults: InvestmentCalculationResult[] = [];

      const annualToMonthlyRate = (annualRateDecimal: number): number => {
          if (annualRateDecimal <= -1) {
              return -1; 
          }
          return Math.pow(1 + annualRateDecimal, 1/12) - 1;
      };

      const poupancaMonthlyDecimal = poupancaCalculatedRates.monthly / 100;
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

      const tpCustodyAmountTotal = Math.max(0, tpFVGrossPreFee) * custodyFeeB3AnnualRateDecimal * totalYears;
      const tpBalanceAfterCustody_BeforeIR = tpFVGrossPreFee - tpCustodyAmountTotal;
      const tpProfit_AfterCustody_BeforeIR = tpBalanceAfterCustody_BeforeIR - tpTotalInvested;
      const tpIrRateDecimal = tpProfit_AfterCustody_BeforeIR > 0 ? getIrRate(termDaysForIr) : 0;
      const tpIrAmount = tpProfit_AfterCustody_BeforeIR > 0 ? tpProfit_AfterCustody_BeforeIR * tpIrRateDecimal : 0;
      const tpNetBalance = tpBalanceAfterCustody_BeforeIR - tpIrAmount;
      
      calculatedResults.push({
        name: "Tesouro Prefixado",
        finalGrossBalance: tpBalanceAfterCustody_BeforeIR, 
        netBalance: tpNetBalance,                                
        totalInvested: tpTotalInvested,
        totalInterestEarned: tpProfit_AfterCustody_BeforeIR, 
        irRateAppliedPercent: tpIrRateDecimal * 100,
        irAmount: tpIrAmount,
        effectiveMonthlyRateUsedPercent: tpMonthlyGrossRate_BeforeFee * 100, 
        effectiveAnnualRateUsedPercent: tpGrossAnnualRateDecimal_BeforeFee * 100, 
        operationalFeesPaid: tpCustodyAmountTotal,
      });

      const tipcaRealAnnualDecimal = tesouroIpcaRealRate / 100;
      const ipcaAnnualDecimalUsed = validatedInputs.ipcaRate / 100; 
      const tipcaGrossNominalAnnual_BeforeFee = (1 + tipcaRealAnnualDecimal) * (1 + ipcaAnnualDecimalUsed) - 1;
      const tipcaMonthlyGross_BeforeFee = annualToMonthlyRate(tipcaGrossNominalAnnual_BeforeFee);

      const tipcaSimGrossPreFeeResults = calculateFVDirectFormula({
          pv: initialInvestment, 
          pmt: monthlyContributions, 
          i: tipcaMonthlyGross_BeforeFee, 
          n: totalMonths
      });

      const tipcaFVGrossPreFee = tipcaSimGrossPreFeeResults.finalBalance;
      const tipcaTotalInvested = tipcaSimGrossPreFeeResults.totalInvested;
      const tipcaCustodyAmountTotal = Math.max(0, tipcaFVGrossPreFee) * custodyFeeB3AnnualRateDecimal * totalYears;
      const tipcaBalanceAfterCustody_BeforeIR = tipcaFVGrossPreFee - tipcaCustodyAmountTotal;
      const tipcaProfit_AfterCustody_BeforeIR = tipcaBalanceAfterCustody_BeforeIR - tipcaTotalInvested;
      const tipcaIrRateDecimal = tipcaProfit_AfterCustody_BeforeIR > 0 ? getIrRate(termDaysForIr) : 0;
      const tipcaIrAmount = tipcaProfit_AfterCustody_BeforeIR > 0 ? tipcaProfit_AfterCustody_BeforeIR * tipcaIrRateDecimal : 0;
      const tipcaNetBalance = tipcaBalanceAfterCustody_BeforeIR - tipcaIrAmount;
          
      calculatedResults.push({
        name: "Tesouro IPCA+",
        finalGrossBalance: tipcaBalanceAfterCustody_BeforeIR, 
        netBalance: tipcaNetBalance,                                 
        totalInvested: tipcaTotalInvested,
        totalInterestEarned: tipcaProfit_AfterCustody_BeforeIR, 
        irRateAppliedPercent: tipcaIrRateDecimal * 100,
        irAmount: tipcaIrAmount,
        effectiveMonthlyRateUsedPercent: tipcaMonthlyGross_BeforeFee * 100, 
        effectiveAnnualRateUsedPercent: tipcaGrossNominalAnnual_BeforeFee * 100, 
        operationalFeesPaid: tipcaCustodyAmountTotal,
      });

      const cdiAnnualDecimal = validatedInputs.cdiRate / 100; 

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
        name: `CDB ${formatNumberForDisplay(cdbRatePercentageOfCdi, { minimumFractionDigits: 0, maximumFractionDigits: 2})}% CDI`,
        finalGrossBalance: cdbFinalGrossBalance_PreIR, 
        netBalance: cdbNetBalance,
        totalInvested: cdbTotalInvested,
        totalInterestEarned: cdbTotalInterestEarned_PreIR, 
        irRateAppliedPercent: cdbIrRateDecimal * 100,
        irAmount: cdbIrAmount,
        effectiveMonthlyRateUsedPercent: cdbMonthlyGrossRate * 100, 
        effectiveAnnualRateUsedPercent: cdbAnnualGrossRate * 100,
        operationalFeesPaid: 0,   
      });
      
      const lciLcaGrossAnnual = cdiAnnualDecimal * (lciLcaRatePercentageOfCdi / 100);
      const lciLcaMonthly = annualToMonthlyRate(lciLcaGrossAnnual);
      const lciLcaSim = calculateFVDirectFormula({ pv: initialInvestment, pmt: monthlyContributions, i: lciLcaMonthly, n: totalMonths });
      calculatedResults.push({
        name: `LCI/LCA ${formatNumberForDisplay(lciLcaRatePercentageOfCdi, { minimumFractionDigits: 0, maximumFractionDigits: 2})}% CDI`,
        finalGrossBalance: lciLcaSim.finalBalance, 
        netBalance: lciLcaSim.finalBalance, 
        totalInvested: lciLcaSim.totalInvested,
        totalInterestEarned: lciLcaSim.totalInterestEarned, 
        irRateAppliedPercent: 0,
        irAmount: 0,
        effectiveMonthlyRateUsedPercent: lciLcaMonthly * 100,
        effectiveAnnualRateUsedPercent: lciLcaGrossAnnual * 100,
        operationalFeesPaid: 0,
      });

      calculatedResults.sort((a, b) => b.netBalance - a.netBalance);
      
      setResults(calculatedResults);
      setIsLoading(false); 
    }, 1500); 
  }, [inputs, poupancaCalculatedRates]); 

  const moneyDisplayOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const percentDisplayOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const highPrecisionPercentDisplayOptions = { minimumFractionDigits: 2, maximumFractionDigits: 4 }; 
  const integerPercentDisplayOptions = { minimumFractionDigits: 0, maximumFractionDigits: 2 }; 
  
  const commonInputProps = {
    disabled: isLoading || isFetchingEconomicData, 
  };
  
  const getSelicTooltip = () => {
    let base = "Taxa Selic Meta anual (SGS 432). Usada para calcular a rentabilidade da Poupança.";
    if (initialFetchedDataMarkers.selicRate && fetchedEcoData?.selicReferenceDate) {
      base += ` Data de referência (SGS 432): ${fetchedEcoData.selicReferenceDate}.`;
    }
    return base;
  };

  const getCdiTooltip = () => {
    let base = "Taxa CDI anualizada (com base no último valor diário da SGS 12).";
    if (initialFetchedDataMarkers.cdiRate && fetchedEcoData?.cdiReferenceDate) {
      base += ` Data de referência (SGS 12): ${fetchedEcoData.cdiReferenceDate}.`;
    }
    return base;
  };
  
  const getTrTooltip = () => {
    let base = "Taxa Referencial (TR) mensal (SGS 226). Usada na Poupança.";
    if (initialFetchedDataMarkers.trRate && fetchedEcoData?.trReferenceDate) {
      base += ` Data de referência (SGS 226): ${fetchedEcoData.trReferenceDate}.`;
    } else if (!initialFetchedDataMarkers.trRate && !isFetchingEconomicData && !economicDataFetchError?.includes('TR')) { 
      base = "Taxa Referencial (TR) mensal. Valor manual.";
    }
    return base;
  };
  
  const getPoupancaTooltip = () => {
    const selicStatus = initialFetchedDataMarkers.selicRate ? '*' : '';
    const trStatus = initialFetchedDataMarkers.trRate ? '*' : '';
    return `Calculada com Selic${selicStatus} e TR${trStatus}. Regra: ${poupancaCalculatedRates.ruleApplied}. (*: auto-preenchido)`;
  };


  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-center">Que aplicação rende mais?</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
          <FormattedNumericInput
            label="Investimento inicial"
            id="initialInvestment"
            name="initialInvestment"
            value={inputs.initialInvestment}
            onChange={handleFormattedInputChange}
            min={0}
            icon={<span className="text-slate-400 dark:text-slate-500">R$</span>}
            displayOptions={moneyDisplayOptions}
            {...commonInputProps}
          />
          <FormattedNumericInput
            label="Aportes mensais"
            id="monthlyContributions"
            name="monthlyContributions"
            value={inputs.monthlyContributions}
            onChange={handleFormattedInputChange}
            min={0}
            icon={<span className="text-slate-400 dark:text-slate-500">R$</span>}
            displayOptions={moneyDisplayOptions}
            {...commonInputProps}
          />
          <div className="grid grid-cols-2 gap-2 items-end">
            <Input 
              label="Período da aplicação"
              type="number" 
              id="applicationPeriodValue"
              name="applicationPeriodValue"
              value={inputs.applicationPeriodValue === null ? '' : inputs.applicationPeriodValue.toString()}
              onChange={handlePeriodValueChange}
              min="1"
              disabled={isLoading || isFetchingEconomicData} 
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
              onChange={handleSelectChange}
              className="mt-1" 
              disabled={isLoading || isFetchingEconomicData} 
            />
          </div>
        </div>

        <hr className="my-6 border-t border-slate-200 dark:border-slate-700/60" />

        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-blue-400">Indicadores Econômicos (Projeção Anual)</h3>
            {isFetchingEconomicData && <p className="text-xs text-blue-500 dark:text-blue-400 animate-pulse">Buscando dados atualizados...</p>}
            {fetchedEcoData?.lastUpdated && !isFetchingEconomicData && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dados com (*) preenchidos automaticamente em: {fetchedEcoData.lastUpdated}
              </p>
            )}
          </div>
           {economicDataFetchError && !isFetchingEconomicData && (
              <p className="text-xs text-red-500 dark:text-red-400 mb-3">{economicDataFetchError}</p>
           )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
            <FormattedNumericInput 
                label={<>Selic Efetiva <AutoFetchedMarker isFetched={initialFetchedDataMarkers.selicRate} /> <InfoIcon title={getSelicTooltip()} /></>} 
                id="selicRate" name="selicRate" value={inputs.selicRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} displayOptions={percentDisplayOptions} {...commonInputProps} />
            <FormattedNumericInput 
                label={<>CDI <AutoFetchedMarker isFetched={initialFetchedDataMarkers.cdiRate} /> <InfoIcon title={getCdiTooltip()} /></>} 
                id="cdiRate" name="cdiRate" value={inputs.cdiRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} displayOptions={percentDisplayOptions} {...commonInputProps} />
            <FormattedNumericInput 
                label={<>IPCA <AutoFetchedMarker isFetched={ipcaDisplayConfig.isFetched} /> <InfoIcon title={ipcaDisplayConfig.tooltipText} /></>} 
                id="ipcaRate" name="ipcaRate" value={inputs.ipcaRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} displayOptions={percentDisplayOptions} {...commonInputProps} />
            <FormattedNumericInput 
                label={<>TR (Mensal) <AutoFetchedMarker isFetched={initialFetchedDataMarkers.trRate} /> <InfoIcon title={getTrTooltip()} /></>} 
                id="trRate" name="trRate" value={inputs.trRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} displayOptions={highPrecisionPercentDisplayOptions} min={0} {...commonInputProps}/>
          </div>
          <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-inner">
            <h4 className="text-sm font-medium text-slate-700 dark:text-blue-300 mb-2">
                Rentabilidade Estimada da Poupança
                <InfoIcon title={getPoupancaTooltip()} />
            </h4>
            <div className="flex flex-col sm:flex-row justify-around text-xs text-slate-700 dark:text-slate-200">
                <span className="mb-1 sm:mb-0">
                    Mensal Efetiva: <strong className="text-blue-600 dark:text-blue-400">{formatNumberForDisplay(poupancaCalculatedRates.monthly, {minimumFractionDigits: 4, maximumFractionDigits: 4})}%</strong>
                </span>
                <span>
                    Anual Efetiva: <strong className="text-blue-600 dark:text-blue-400">{formatNumberForDisplay(poupancaCalculatedRates.annual, {minimumFractionDigits: 4, maximumFractionDigits: 4})}%</strong>
                </span>
            </div>
          </div>
        </div>
        
        <hr className="my-6 border-t border-slate-200 dark:border-slate-700/60" />

        <div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-blue-400 mb-4">Parâmetros das Aplicações (Taxas Anuais Brutas, salvo indicação)</h3>
          <div className="space-y-6">
            <div className="p-4 rounded-md border border-slate-200 dark:border-slate-700/50 bg-white/60 dark:bg-slate-700/40">
              <h4 className="text-md font-medium text-slate-700 dark:text-blue-300 mb-3">Tesouro Direto</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
                <FormattedNumericInput 
                  label="Tesouro Prefixado (Juro Nominal)" 
                  id="tesouroPrefixadoNominalRate" 
                  name="tesouroPrefixadoNominalRate" 
                  value={inputs.tesouroPrefixadoNominalRate} 
                  onChange={handleFormattedInputChange} 
                  icon={<span className="text-slate-400 dark:text-slate-500">%</span>} 
                  displayOptions={percentDisplayOptions} 
                  {...commonInputProps} 
                />
                <FormattedNumericInput 
                  label={<>Tesouro IPCA+ (Juro Real) <InfoIcon title="Taxa real anual, acima da inflação (IPCA)." /></>} 
                  id="tesouroIpcaRealRate" 
                  name="tesouroIpcaRealRate" 
                  value={inputs.tesouroIpcaRealRate} 
                  onChange={handleFormattedInputChange} 
                  icon={<span className="text-slate-400 dark:text-slate-500">%</span>} 
                  displayOptions={percentDisplayOptions} 
                  {...commonInputProps} 
                />
                <FormattedNumericInput 
                  label={<>Taxa Custódia B3 (Tesouro Direto) <InfoIcon title="Taxa anual cobrada pela B3 sobre o valor dos títulos. Estimada aqui como um percentual sobre o valor bruto final acumulado, proporcional ao prazo." /></>} 
                  id="tesouroCustodyFeeB3" 
                  name="tesouroCustodyFeeB3" 
                  value={inputs.tesouroCustodyFeeB3} 
                  onChange={handleFormattedInputChange} 
                  icon={<span className="text-slate-400 dark:text-slate-500">%</span>} 
                  displayOptions={percentDisplayOptions} 
                  min={0} max={10} 
                  {...commonInputProps}
                />
              </div>
            </div>

            <div className="p-4 rounded-md border border-slate-200 dark:border-slate-700/50 bg-white/60 dark:bg-slate-700/40">
              <h4 className="text-md font-medium text-slate-700 dark:text-blue-300 mb-3">Outras Aplicações Bancárias</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <FormattedNumericInput 
                  label={<>Rent. CDB (% do CDI) <InfoIcon title="Percentual da taxa CDI que o CDB renderá anualmente (bruto)."/></>} 
                  id="cdbRatePercentageOfCdi" 
                  name="cdbRatePercentageOfCdi" 
                  value={inputs.cdbRatePercentageOfCdi} 
                  onChange={handleFormattedInputChange} 
                  icon={<span className="text-slate-400 dark:text-slate-500">%</span>} 
                  displayOptions={integerPercentDisplayOptions} 
                  {...commonInputProps} 
                />
                <FormattedNumericInput 
                  label={<>Rent. LCI/LCA (% do CDI) <InfoIcon title="Percentual da taxa CDI que a LCI/LCA renderá anualmente (isento de IR)."/></>} 
                  id="lciLcaRatePercentageOfCdi" 
                  name="lciLcaRatePercentageOfCdi" 
                  value={inputs.lciLcaRatePercentageOfCdi} 
                  onChange={handleFormattedInputChange} 
                  icon={<span className="text-slate-400 dark:text-slate-500">%</span>} 
                  displayOptions={integerPercentDisplayOptions} 
                  {...commonInputProps} 
                />
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Esses são os parâmetros padrões utilizados na sua simulação. Você pode alterá-los e refazer os cálculos para uma simulação avançada. As taxas anuais são convertidas para mensais para o cálculo com aportes. O prazo para IR é calculado com base em dias corridos (365,25 dias/ano).
        </p>

        <Button
          type="button"
          onClick={handleCompare}
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isLoading || isFetchingEconomicData}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculando Comparativo...
            </>
          ) : isFetchingEconomicData ? (
             <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Aguardando dados...
            </>
          ) : (
            'Comparar Aplicações'
          )}
        </Button>

        {isLoading && ( 
            <div className="mt-6 flex justify-center items-center">
                 <div className="flex flex-col items-center">
                    <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-500 dark:text-slate-400 mt-4">Analisando todas as aplicações...</p>
                </div>
            </div>
        )}

        {!isLoading && results && results.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-center text-slate-700 dark:text-blue-300 mb-6">Resultados do Comparativo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((res, index) => (
                <Card key={res.name} className={`shadow-premium ${index === 0 ? 'border-2 border-green-500 dark:border-green-400' : ''}`}>
                  <Card.Header className={index === 0 ? 'bg-green-50 dark:bg-green-900/30' : ''}>
                    <Card.Title className="flex justify-between items-center">
                      <span>{index + 1}. {res.name}</span>
                      {index === 0 && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">MELHOR</span>}
                    </Card.Title>
                  </Card.Header>
                  <Card.Content className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Valor Líquido Final:</span>
                      <span className="font-bold text-lg text-primary dark:text-primary-light">{formatCurrency(res.netBalance)}</span>
                    </div>
                     <hr className="my-1 border-slate-200 dark:border-slate-700/50"/>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Total Investido:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(res.totalInvested)}</span>
                    </div>
                     <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400" title="Juros totais após taxas operacionais (como custódia B3), antes do Imposto de Renda.">Juros Pós-Taxas Op. (pré-IR):</span>
                      <span className="font-medium text-green-600 dark:text-green-500">{formatCurrency(res.totalInterestEarned)}</span>
                    </div>
                    {res.operationalFeesPaid !== undefined && res.operationalFeesPaid > 0 && ( 
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Taxas Operacionais Pagas:</span>
                          <span className="font-medium text-orange-600 dark:text-orange-500">(-) {formatCurrency(res.operationalFeesPaid)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400" title="Saldo após juros e taxas operacionais (como custódia B3), antes do Imposto de Renda.">Valor Bruto (Pós-Taxas Op., pré-IR):</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(res.finalGrossBalance)}</span>
                    </div>
                    {res.irAmount > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Alíquota IR Aplicada:</span>
                          <span className="font-medium text-red-600 dark:text-red-500">{res.irRateAppliedPercent.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">IR Pago (Estimado):</span>
                          <span className="font-medium text-red-600 dark:text-red-500">(-) {formatCurrency(res.irAmount)}</span>
                        </div>
                      </>
                    )}
                     <div className="pt-2 space-y-0.5">
                        {res.effectiveAnnualRateUsedPercent !== undefined && (
                            <p className="text-xs text-slate-500 dark:text-slate-400" 
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
                            <p className="text-xs text-slate-500 dark:text-slate-400"
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
             <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/60">
              <strong>Atenção:</strong> Os cálculos são simulações e podem não refletir a rentabilidade exata devido a arredondamentos, simplificações e volatilidade do mercado. Para Tesouro IPCA+, a inflação (IPCA) utilizada é a projetada. Para Tesouro Direto, a taxa de custódia da B3 é estimada como um percentual sobre o valor bruto final acumulado, proporcional ao prazo da aplicação. Consulte um profissional financeiro.
            </p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default ComprehensiveComparator;
