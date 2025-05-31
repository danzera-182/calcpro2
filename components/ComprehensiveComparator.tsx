
import React, { useState, useCallback, useMemo, useEffect, FC } from 'react';
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
import InfoTooltip from './ui/InfoTooltip';


const InfoIcon: React.FC<{ title?: string }> = ({ title = "Informação" }) => (
  <span className="ml-1 text-xs text-slate-400 dark:text-slate-500 cursor-default" title={title}>
    (i)
  </span>
);

interface AutoFetchedMarkerProps {
  isFetched?: boolean;
  tooltipText?: string;
}
const AutoFetchedMarker: React.FC<AutoFetchedMarkerProps> = ({ isFetched, tooltipText }) => {
  if (!isFetched) return null;
  return <InfoTooltip text={tooltipText || "Valor preenchido automaticamente com dados recentes."}><span className="text-blue-500 dark:text-blue-400 ml-1">*</span></InfoTooltip>;
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
  
  const [isFetchingEconomicData, setIsFetchingEconomicData] = useState<boolean>(true);
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
        let selicTooltip = "Taxa Selic (a.a.)";
        let cdiTooltip = "Taxa CDI (a.a.)";
        let trTooltip = "Taxa TR (a.m.)";

        if (fetchedData.selicRate !== undefined) {
          newFetchedMarkers.selicRate = true;
          selicTooltip = `Taxa Selic (Meta): ${formatNumberForDisplay(fetchedData.selicRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a. (Ref: ${fetchedData.selicReferenceDate || 'N/D'})`;
        }
        if (fetchedData.cdiRate !== undefined) {
          newFetchedMarkers.cdiRate = true;
          cdiTooltip = `Taxa CDI: ${formatNumberForDisplay(fetchedData.cdiRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a. (Anualizada, Ref: ${fetchedData.cdiReferenceDate || 'N/D'})`;
        }
        if (fetchedData.trRate !== undefined) {
          newFetchedMarkers.trRate = true;
          trTooltip = `Taxa TR: ${formatNumberForDisplay(fetchedData.trRate, {minimumFractionDigits: 4, maximumFractionDigits: 4})}% a.m. (Ref: ${fetchedData.trReferenceDate || 'N/D'})`;
        }
        
        setInitialFetchedDataMarkers(newFetchedMarkers);
        // Store tooltips in state or pass directly to AutoFetchedMarker
        // For simplicity, I'll update state for inputs.selicRateTooltip etc. if needed,
        // or construct them on the fly when rendering AutoFetchedMarker. Let's try on the fly.

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
          const ipcaRateFormatted = formatNumberForDisplay(fetchedData.ipcaRate, {minimumFractionDigits: 2, maximumFractionDigits: 2});
          if (fetchedData.ipcaSourceType === 'accumulated12m') {
            if (fetchedData.ipcaReferenceDate) { 
              newIpcaTooltipText = `IPCA real acumulado: ${ipcaRateFormatted}% (12m até ${fetchedData.ipcaReferenceDate}).`;
            } else {
              newIpcaTooltipText = `IPCA real acumulado: ${ipcaRateFormatted}% (últimos 12 meses).`;
            }
          } else { 
            if (fetchedData.ipcaReferenceDate) { 
               newIpcaTooltipText = `IPCA projetado: ${ipcaRateFormatted}% (Focus para ${fetchedData.ipcaReferenceDate}).`;
            } else {
               newIpcaTooltipText = `IPCA projetado: ${ipcaRateFormatted}% (Focus).`;
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
      setIpcaDisplayConfig(prev => ({...prev, isFetched: false}));
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
      const tipcaIrRateDecimal = tipcaProfit_AfterCustody_BeforeIR > 0 ? getIrRate(termDaysForIr) : 0; // Corrected variable name
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

      const cdbGrossAnnualRateDecimal = (cdbRatePercentageOfCdi / 100) * (validatedInputs.cdiRate / 100);
      const cdbMonthlyGrossRate = annualToMonthlyRate(cdbGrossAnnualRateDecimal);
      const cdbSimGross = calculateFVDirectFormula({ pv: initialInvestment, pmt: monthlyContributions, i: cdbMonthlyGrossRate, n: totalMonths });
      const cdbProfitGross = cdbSimGross.totalInterestEarned;
      const cdbIrRateDecimal = cdbProfitGross > 0 ? getIrRate(termDaysForIr) : 0;
      const cdbIrAmount = cdbProfitGross > 0 ? cdbProfitGross * cdbIrRateDecimal : 0;
      const cdbNetBalance = cdbSimGross.finalBalance - cdbIrAmount;
      
      calculatedResults.push({
        name: `CDB (${formatNumber(cdbRatePercentageOfCdi,0)}% CDI)`,
        finalGrossBalance: cdbSimGross.finalBalance,
        netBalance: cdbNetBalance,
        totalInvested: cdbSimGross.totalInvested,
        totalInterestEarned: cdbProfitGross,
        irRateAppliedPercent: cdbIrRateDecimal * 100,
        irAmount: cdbIrAmount,
        effectiveMonthlyRateUsedPercent: cdbMonthlyGrossRate * 100,
        effectiveAnnualRateUsedPercent: cdbGrossAnnualRateDecimal * 100,
        operationalFeesPaid: 0,
      });
      
      const lciLcaGrossAnnualRateDecimal = (lciLcaRatePercentageOfCdi / 100) * (validatedInputs.cdiRate / 100);
      const lciLcaMonthlyGrossRate = annualToMonthlyRate(lciLcaGrossAnnualRateDecimal);
      const lciLcaSim = calculateFVDirectFormula({ pv: initialInvestment, pmt: monthlyContributions, i: lciLcaMonthlyGrossRate, n: totalMonths });
      
      calculatedResults.push({
        name: `LCI/LCA (${formatNumber(lciLcaRatePercentageOfCdi,0)}% CDI)`,
        finalGrossBalance: lciLcaSim.finalBalance,
        netBalance: lciLcaSim.finalBalance, 
        totalInvested: lciLcaSim.totalInvested,
        totalInterestEarned: lciLcaSim.totalInterestEarned,
        irRateAppliedPercent: 0, 
        irAmount: 0,
        effectiveMonthlyRateUsedPercent: lciLcaMonthlyGrossRate * 100,
        effectiveAnnualRateUsedPercent: lciLcaGrossAnnualRateDecimal * 100,
        operationalFeesPaid: 0,
      });

      setResults(calculatedResults.sort((a, b) => b.netBalance - a.netBalance));
      setIsLoading(false);
    }, 1000);
  }, [inputs, poupancaCalculatedRates.monthly]);

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Comparador Abrangente de Investimentos de Renda Fixa</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna 1: Parâmetros Gerais e Econômicos */}
            <div className="space-y-6">
              <Card className="bg-slate-50 dark:bg-slate-800/50 p-4 shadow-inner">
                <Card.Title className="text-md mb-3 text-blue-600 dark:text-blue-400">Parâmetros da Simulação</Card.Title>
                <FormattedNumericInput id="initialInvestment" name="initialInvestment" label="Investimento Inicial (R$)" value={inputs.initialInvestment} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">R$</span>} disabled={isLoading} />
                <FormattedNumericInput id="monthlyContributions" name="monthlyContributions" label="Aportes Mensais (R$)" value={inputs.monthlyContributions} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">R$</span>} className="mt-4" disabled={isLoading}/>
                <div className="grid grid-cols-2 gap-4 mt-4 items-end">
                  <Input id="applicationPeriodValue" name="applicationPeriodValue" label="Período" type="number" min="1" value={inputs.applicationPeriodValue?.toString() ?? ''} onChange={handlePeriodValueChange} disabled={isLoading}/>
                  <Select id="applicationPeriodUnit" name="applicationPeriodUnit" label="Unidade" options={[{value: 'months', label: 'Meses'}, {value: 'years', label: 'Anos'}]} value={inputs.applicationPeriodUnit} onChange={handleSelectChange} disabled={isLoading}/>
                </div>
              </Card>
              
              <Card className="bg-slate-50 dark:bg-slate-800/50 p-4 shadow-inner">
                <Card.Title className="text-md mb-3 text-blue-600 dark:text-blue-400">Indicadores Econômicos Base</Card.Title>
                 {isFetchingEconomicData && <p className="text-xs text-slate-500 dark:text-slate-400">Buscando indicadores mais recentes...</p>}
                 {economicDataFetchError && !isFetchingEconomicData && <p className="text-xs text-red-500 dark:text-red-400">{economicDataFetchError}</p>}

                <FormattedNumericInput id="selicRate" name="selicRate" label={<>Taxa Selic (% a.a.) <AutoFetchedMarker isFetched={initialFetchedDataMarkers.selicRate} tooltipText={`Selic Meta: ${formatNumberForDisplay(fetchedEcoData?.selicRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% (Ref: ${fetchedEcoData?.selicReferenceDate || 'N/D'})`} /></>} value={inputs.selicRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} disabled={isLoading || isFetchingEconomicData}/>
                <FormattedNumericInput id="cdiRate" name="cdiRate" label={<>Taxa CDI (% a.a.) <AutoFetchedMarker isFetched={initialFetchedDataMarkers.cdiRate} tooltipText={`CDI: ${formatNumberForDisplay(fetchedEcoData?.cdiRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% (Anualizada, Ref: ${fetchedEcoData?.cdiReferenceDate || 'N/D'})`} /></>} value={inputs.cdiRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} className="mt-4" disabled={isLoading || isFetchingEconomicData}/>
                <FormattedNumericInput id="ipcaRate" name="ipcaRate" label={<>Inflação IPCA (% a.a.) <AutoFetchedMarker isFetched={ipcaDisplayConfig.isFetched} tooltipText={ipcaDisplayConfig.tooltipText} /></>} value={inputs.ipcaRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} className="mt-4" disabled={isLoading || isFetchingEconomicData}/>
                <FormattedNumericInput id="trRate" name="trRate" label={<>Taxa TR (% a.m.) <AutoFetchedMarker isFetched={initialFetchedDataMarkers.trRate} tooltipText={`TR: ${formatNumberForDisplay(fetchedEcoData?.trRate, {minimumFractionDigits:4, maximumFractionDigits:4})}% (Ref: ${fetchedEcoData?.trReferenceDate || 'N/D'})`} /></>} value={inputs.trRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} className="mt-4" disabled={isLoading || isFetchingEconomicData}/>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Poupança (regra {poupancaCalculatedRates.ruleApplied}): {formatNumberForDisplay(poupancaCalculatedRates.annual, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a.</p>
              </Card>
            </div>

            {/* Coluna 2: Tipos de Investimento */}
            <div className="space-y-6">
              <Card className="bg-slate-50 dark:bg-slate-800/50 p-4 shadow-inner">
                <Card.Title className="text-md mb-3 text-blue-600 dark:text-blue-400">Tesouro Direto</Card.Title>
                <FormattedNumericInput id="tesouroPrefixadoNominalRate" name="tesouroPrefixadoNominalRate" label="Tesouro Prefixado - Juro Nominal (% a.a.)" value={inputs.tesouroPrefixadoNominalRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} disabled={isLoading}/>
                <FormattedNumericInput id="tesouroIpcaRealRate" name="tesouroIpcaRealRate" label="Tesouro IPCA+ - Juro Real (% a.a.)" value={inputs.tesouroIpcaRealRate} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} className="mt-4" disabled={isLoading}/>
                <FormattedNumericInput id="tesouroCustodyFeeB3" name="tesouroCustodyFeeB3" label="Taxa de Custódia B3 Tesouro (% a.a.)" value={inputs.tesouroCustodyFeeB3} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} className="mt-4" disabled={isLoading}/>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-800/50 p-4 shadow-inner">
                <Card.Title className="text-md mb-3 text-blue-600 dark:text-blue-400">Outros Investimentos</Card.Title>
                <FormattedNumericInput id="cdbRatePercentageOfCdi" name="cdbRatePercentageOfCdi" label="CDB - Rentabilidade (% do CDI)" value={inputs.cdbRatePercentageOfCdi} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} disabled={isLoading}/>
                <FormattedNumericInput id="lciLcaRatePercentageOfCdi" name="lciLcaRatePercentageOfCdi" label="LCI/LCA - Rentabilidade (% do CDI)" value={inputs.lciLcaRatePercentageOfCdi} onChange={handleFormattedInputChange} icon={<span className="text-slate-400 dark:text-slate-500">%</span>} className="mt-4" disabled={isLoading}/>
              </Card>
            </div>
          </div>
          <Button onClick={handleCompare} variant="primary" size="lg" className="w-full mt-6" disabled={isLoading || isFetchingEconomicData}>
            {isLoading || isFetchingEconomicData ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isFetchingEconomicData ? 'Buscando dados...' : 'Comparando...'}
              </>
            ) : 'Comparar Investimentos'}
          </Button>
        </Card.Content>
      </Card>

      {isLoading && (
        <Card>
          <Card.Content className="py-10 flex justify-center items-center">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-center text-slate-500 dark:text-slate-400 mt-4">Calculando e comparando...</p>
            </div>
          </Card.Content>
        </Card>
      )}

      {!isLoading && results && results.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Resultados da Comparação</Card.Title>
          </Card.Header>
          <Card.Content className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Investimento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo Líquido Final</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Juros Totais (Líq.)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Investido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IR Pago</th>
                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Taxa de IR</th>
                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Taxas Oper.</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800/75 divide-y divide-gray-200 dark:divide-slate-700">
                {results.map((res, index) => (
                  <tr key={res.name} className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/80 transition-colors ${index === 0 ? 'bg-green-50 dark:bg-green-800/30' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{res.name}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${index === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(res.netBalance)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(res.netBalance - res.totalInvested)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(res.totalInvested)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(res.irAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{formatNumberForDisplay(res.irRateAppliedPercent, {minimumFractionDigits:1, maximumFractionDigits:1})}%</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{formatCurrency(res.operationalFeesPaid || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              Observações: "Juros Totais (Líq.)" = Saldo Líquido Final - Total Investido. Taxas de custódia e outras taxas operacionais foram deduzidas antes do IR, quando aplicável. Os resultados estão ordenados pelo maior Saldo Líquido Final.
            </p>
          </Card.Content>
        </Card>
      )}

      {!isLoading && (!results || results.length === 0) && (
        <Card>
          <Card.Content>
            <p className="text-center text-slate-500 dark:text-slate-400 py-10">
              Preencha os campos e clique em "Comparar Investimentos" para ver os resultados.
            </p>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};
export default ComprehensiveComparator;

