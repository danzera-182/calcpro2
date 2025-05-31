
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select'; // Using Select for presets
import Input from './ui/Input'; // For custom date inputs
import { IndicatorModalData, HistoricalDataPoint, DateRangePreset } from '../types';
import HistoricalLineChart from './HistoricalLineChart';
import { formatNumberForDisplay } from '../utils/formatters';

interface IndicatorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicator: IndicatorModalData | null;
  onFetchHistoricalData: (sgsCode: string | number, startDate: string, endDate: string, seriesType?: 'PTAX' | 'SGS_CALCULATED_ANNUAL_CDI' | 'SGS_PERCENT_VAR_FROM_INDEX') => Promise<HistoricalDataPoint[] | null>;
}

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type CdiChartType = 'monthly' | 'accumulated12m';

const IndicatorDetailsModal: React.FC<IndicatorDetailsModalProps> = ({ isOpen, onClose, indicator, onFetchHistoricalData }) => {
  const [historicalDataMonthly, setHistoricalDataMonthly] = useState<HistoricalDataPoint[] | null>(null);
  const [isLoadingHistoricalMonthly, setIsLoadingHistoricalMonthly] = useState<boolean>(false);
  const [historicalErrorMonthly, setHistoricalErrorMonthly] = useState<string | null>(null);

  const [historicalDataAnnual, setHistoricalDataAnnual] = useState<HistoricalDataPoint[] | null>(null); // For IPCA 12m
  const [isLoadingHistoricalAnnual, setIsLoadingHistoricalAnnual] = useState<boolean>(false); // For IPCA 12m
  const [historicalErrorAnnual, setHistoricalErrorAnnual] = useState<string | null>(null); // For IPCA 12m
  
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('1Y');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [cdiChartType, setCdiChartType] = useState<CdiChartType>('monthly');
  const [accumulatedPeriodValue, setAccumulatedPeriodValue] = useState<number | null>(null);
  const [currentPeriodForAccumulation, setCurrentPeriodForAccumulation] = useState<string>('');


  const getDatesFromPreset = (preset: DateRangePreset): { start: string, end: string } => {
    const endDate = new Date();
    let startDate = new Date();

    switch (preset) {
      case '1M':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '6M':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1Y':
      default:
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case '5Y':
        startDate.setFullYear(endDate.getFullYear() - 5);
        break;
      case 'MAX': 
        startDate.setFullYear(endDate.getFullYear() - 20); 
        break;
    }
    const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return { start: formatDate(startDate), end: formatDate(endDate) };
  };
  
  const fetchChartDataForIndicator = useCallback(async (start: string, end: string) => {
    if (!indicator) return;

    setIsLoadingHistoricalMonthly(true);
    setHistoricalErrorMonthly(null);
    setHistoricalDataMonthly(null);
    setAccumulatedPeriodValue(null);
    setCurrentPeriodForAccumulation(`de ${start} a ${end}`);


    let sgsCodeToFetch: string | number | undefined = indicator.sgsCode;
    let seriesTypeToFetch = indicator.seriesType;

    if (indicator.title === "Taxa CDI") {
        sgsCodeToFetch = cdiChartType === 'monthly' ? 4391 : 4389;
    } else if (indicator.title === "IPCA (Inflação)") {
        sgsCodeToFetch = 433; // Always fetch monthly IPCA for the primary chart
    }
    
    if (sgsCodeToFetch) {
      try {
        const data = await onFetchHistoricalData(sgsCodeToFetch, start, end, seriesTypeToFetch);
        setHistoricalDataMonthly(data);
      } catch (e: any) {
        setHistoricalErrorMonthly(e.message || "Erro ao buscar dados históricos.");
      }
    } else {
        setHistoricalErrorMonthly("Código SGS não definido para este indicador.");
    }
    setIsLoadingHistoricalMonthly(false);


    // Specific logic for IPCA 12m accumulated chart
    if (indicator.title === "IPCA (Inflação)") {
      const annualSgsCodeIpca = 13522;
      setIsLoadingHistoricalAnnual(true);
      setHistoricalErrorAnnual(null);
      setHistoricalDataAnnual(null);
      try {
        const dataAnnual = await onFetchHistoricalData(annualSgsCodeIpca, start, end);
        setHistoricalDataAnnual(dataAnnual);
      } catch (e: any) {
        setHistoricalErrorAnnual(e.message || "Erro ao buscar dados anuais (12m) do IPCA.");
      } finally {
        setIsLoadingHistoricalAnnual(false);
      }
    }
  }, [indicator, onFetchHistoricalData, cdiChartType]);

  useEffect(() => {
    if (isOpen && indicator) {
      const { start, end } = getDatesFromPreset(selectedPreset || '1Y');
      setCustomStartDate(start.split('/').reverse().join('-')); 
      setCustomEndDate(end.split('/').reverse().join('-'));   
      
      if (indicator.sgsCode && typeof indicator.sgsCode === 'number' || indicator.sgsCode === 'PTAX' || indicator.title === "Taxa CDI") {
         fetchChartDataForIndicator(start, end);
      } else {
        setHistoricalDataMonthly(null);
        setHistoricalDataAnnual(null);
        setAccumulatedPeriodValue(null);
        setHistoricalErrorMonthly(null); 
        setHistoricalErrorAnnual(null);
      }
    } else {
      // Reset states when modal closes or indicator is null
      setHistoricalDataMonthly(null);
      setHistoricalDataAnnual(null);
      setIsLoadingHistoricalMonthly(false);
      setIsLoadingHistoricalAnnual(false);
      setHistoricalErrorMonthly(null);
      setHistoricalErrorAnnual(null);
      setAccumulatedPeriodValue(null);
      setCurrentPeriodForAccumulation('');
      setSelectedPreset('1Y');
      setCdiChartType('monthly');
    }
  }, [isOpen, indicator, selectedPreset, cdiChartType, fetchChartDataForIndicator]); 
  
  
  useEffect(() => {
    if (historicalDataMonthly && historicalDataMonthly.length > 0 && indicator) {
      const relevantIndicatorForAccumulation = 
        (indicator.title === "Taxa CDI" && cdiChartType === 'monthly') ||
        (indicator.title === "IPCA (Inflação)" && indicator.sgsCode === 433) || // Assuming 433 is monthly IPCA
        (indicator.title === "IGP-M (Inflação)" && indicator.sgsCode === 189); // Assuming 189 is monthly IGP-M

      if (relevantIndicatorForAccumulation) {
        let productOfGrowthFactors = 1;
        for (const point of historicalDataMonthly) {
          productOfGrowthFactors *= (1 + point.value / 100);
        }
        const totalAccumulated = (productOfGrowthFactors - 1) * 100;
        setAccumulatedPeriodValue(totalAccumulated);
      } else {
        setAccumulatedPeriodValue(null);
      }
    } else {
      setAccumulatedPeriodValue(null);
    }
  }, [historicalDataMonthly, indicator, cdiChartType]);


  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreset = e.target.value as DateRangePreset;
    setSelectedPreset(newPreset);
    // Dates and fetch will be handled by the useEffect watching selectedPreset
  };
  
  const handleCustomDateFetch = () => {
    if (customStartDate && customEndDate) {
        const startParts = customStartDate.split('-'); 
        const endParts = customEndDate.split('-');   
        if (startParts.length === 3 && endParts.length === 3) {
             const apiStartDate = `${startParts[2]}/${startParts[1]}/${startParts[0]}`; 
             const apiEndDate = `${endParts[2]}/${endParts[1]}/${endParts[0]}`;     
            
            if (indicator?.sgsCode || indicator?.title === "Taxa CDI") {
                 fetchChartDataForIndicator(apiStartDate, apiEndDate);
            }
            setSelectedPreset('' as DateRangePreset); // Clear preset selection
        } else {
            setHistoricalErrorMonthly("Formato de data inválido. Use YYYY-MM-DD.");
        }
    } else {
        setHistoricalErrorMonthly("Por favor, preencha ambas as datas (início e fim).");
    }
  };

  if (!isOpen || !indicator) {
    return null;
  }

  // Determine current value display
  let displayValueContent: string | React.ReactNode = 'N/D';
  let suffixForDisplay = ''; 
  if (indicator.currentValue !== null && indicator.currentValue !== undefined) {
    suffixForDisplay = indicator.valueSuffix || ''; 
    if (typeof indicator.currentValue === 'number') {
      if (indicator.isBillions) {
        displayValueContent = formatNumberForDisplay(indicator.currentValue / 1000, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        suffixForDisplay = indicator.isUSD ? ' bi USD' : ' bi'; 
      } else {
        displayValueContent = formatNumberForDisplay(indicator.currentValue, { minimumFractionDigits: indicator.valuePrecision ?? 2, maximumFractionDigits: indicator.valuePrecision ?? 4 });
      }
    } else { 
      displayValueContent = indicator.currentValue.toString();
    }
  } else {
    suffixForDisplay = '';
  }

  const canDisplayHistorical = indicator.sgsCode || (indicator.title === "IPCA (Inflação)") || (indicator.title === "Taxa CDI");

  // Prepare indicator config for the primary chart (monthly CDI or other indicators)
  let primaryChartConfig = { ...indicator };
  if (indicator.title === "Taxa CDI") {
    if (cdiChartType === 'monthly') {
      primaryChartConfig.sgsCode = 4391;
      primaryChartConfig.title = "CDI Mensal";
      primaryChartConfig.historicalSeriesName = "CDI (Taxa Média Mensal %)";
      primaryChartConfig.historicalYAxisLabel = "% a.m.";
      primaryChartConfig.valueSuffix = "% a.m.";
    } else { // accumulated12m
      primaryChartConfig.sgsCode = 4389;
      primaryChartConfig.title = "CDI Acumulado 12 Meses";
      primaryChartConfig.historicalSeriesName = "CDI (Acumulado 12 Meses %)";
      primaryChartConfig.historicalYAxisLabel = "% a.a.";
      primaryChartConfig.valueSuffix = "% a.a.";
    }
  } else if (indicator.title === "IPCA (Inflação)") {
     primaryChartConfig.sgsCode = 433; // Force monthly for the primary chart
     primaryChartConfig.title = "IPCA (Variação Mensal)";
     primaryChartConfig.historicalSeriesName = "IPCA (Variação Mensal %)";
     primaryChartConfig.historicalYAxisLabel = "Variação %";
     primaryChartConfig.valueSuffix = "%";
  }


  // Prepare indicator config for the secondary chart (IPCA 12m accumulated)
  const annualIpcaChartConfig: IndicatorModalData | undefined = indicator?.title === "IPCA (Inflação)" ? {
      ...indicator, 
      sgsCode: 13522, 
      title: "IPCA (Acumulado 12 Meses)", 
      description: "Variação do IPCA acumulada nos últimos 12 meses.", 
      valueSuffix: "%", 
      isPercentage: true,
      historicalSeriesName: "IPCA (Acum. 12 Meses %)",
      historicalYAxisLabel: "Acum. %",
      valuePrecision: 2, 
  } : undefined;


  return (
    <div 
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="indicator-modal-title"
      onClick={onClose} 
    >
      <Card 
        className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()} 
      >
        <Card.Header className="flex justify-between items-center">
          <Card.Title id="indicator-modal-title" className="text-lg sm:text-xl">{indicator.title}</Card.Title>
          <Button variant="ghost" onClick={onClose} className="p-1" aria-label="Fechar modal">
            <CloseIcon className="w-6 h-6" />
          </Button>
        </Card.Header>
        
        <div className="overflow-y-auto flex-grow p-3 sm:p-5 space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-md shadow-inner">
            <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Valor Atual:</strong> <span className="font-semibold text-blue-600 dark:text-blue-400">{displayValueContent}{suffixForDisplay}</span>
            </p>
            {indicator.referenceText && <p className="text-xs text-gray-500 dark:text-gray-400">{indicator.referenceText}</p>}
            {indicator.sourceText && <p className="text-xs text-gray-500 dark:text-gray-400">Fonte: {indicator.sourceText}</p>}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{indicator.description}</p>
          
          <hr className="border-gray-200 dark:border-slate-700 my-3"/>

          <div>
            <h4 className="text-md font-semibold text-gray-700 dark:text-blue-400 mb-3">
              {canDisplayHistorical ? "Histórico do Indicador" : "Informação Histórica"}
            </h4>
            {canDisplayHistorical ? (
              <>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end mb-3">
                  <Select
                    label="Período Predefinido"
                    options={[
                      { value: '1M', label: 'Último Mês' },
                      { value: '6M', label: 'Últimos 6 Meses' },
                      { value: '1Y', label: 'Último Ano' },
                      { value: '5Y', label: 'Últimos 5 Anos' },
                      { value: 'MAX', label: 'Máximo (até 20 anos)' },
                    ]}
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    className="sm:flex-grow"
                  />
                  <div className="flex gap-2 items-end w-full sm:w-auto">
                     <Input type="date" label="Início" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="flex-grow" />
                     <Input type="date" label="Fim" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="flex-grow" />
                  </div>
                  <Button onClick={handleCustomDateFetch} variant="secondary" size="md" className="mt-2 sm:mt-0 sm:self-end">Buscar Período</Button>
                </div>
                
                {accumulatedPeriodValue !== null && (
                  <div className="my-4 p-3 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-300 dark:border-blue-600 shadow-sm text-center">
                    <span className="block text-xs text-slate-600 dark:text-slate-300">
                      Retorno Acumulado no período ({currentPeriodForAccumulation}):
                    </span>
                    <span className="block text-xl font-bold text-blue-600 dark:text-blue-300">
                      {formatNumberForDisplay(accumulatedPeriodValue, {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                    </span>
                  </div>
                )}


                {indicator.title === "Taxa CDI" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Gráfico CDI:</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="cdiChartType" value="monthly" checked={cdiChartType === 'monthly'} onChange={() => setCdiChartType('monthly')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Mensal (%)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="cdiChartType" value="accumulated12m" checked={cdiChartType === 'accumulated12m'} onChange={() => setCdiChartType('accumulated12m')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Acumulado 12 Meses (%)</span>
                      </label>
                    </div>
                  </div>
                )}

                <HistoricalLineChart 
                  data={historicalDataMonthly || []} 
                  indicatorConfig={primaryChartConfig} 
                  isLoading={isLoadingHistoricalMonthly} 
                  error={historicalErrorMonthly} 
                />
                
                {indicator.title === "IPCA (Inflação)" && annualIpcaChartConfig && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-600 dark:text-blue-300 mb-2">{annualIpcaChartConfig.title}</h5>
                     <HistoricalLineChart 
                       data={historicalDataAnnual || []} 
                       indicatorConfig={annualIpcaChartConfig} 
                       isLoading={isLoadingHistoricalAnnual} 
                       error={historicalErrorAnnual} 
                     />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Não há dados históricos configurados para visualização detalhada deste indicador.</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IndicatorDetailsModal;
