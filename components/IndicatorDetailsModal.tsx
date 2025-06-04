
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select'; 
import Input from './ui/Input'; 
import { IndicatorModalData, HistoricalDataPoint, DateRangePreset } from '../types';
import HistoricalLineChart from './HistoricalLineChart';
import { formatNumberForDisplay } from '../utils/formatters';

interface IndicatorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicator: IndicatorModalData | null;
  onFetchHistoricalData: (sgsCode: string | number, startDate: string, endDate: string, seriesType?: IndicatorModalData['seriesType']) => Promise<HistoricalDataPoint[] | null>;
}

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type CdiChartType = 'monthly' | 'accumulated12m';
type IpcaChartType = 'monthly' | 'accumulated12m';
type IgpmChartType = 'monthly' | 'accumulated12m';


const IndicatorDetailsModal: React.FC<IndicatorDetailsModalProps> = ({ isOpen, onClose, indicator, onFetchHistoricalData }) => {
  const [historicalDataPrimary, setHistoricalDataPrimary] = useState<HistoricalDataPoint[] | null>(null);
  const [isLoadingHistoricalPrimary, setIsLoadingHistoricalPrimary] = useState<boolean>(false);
  const [historicalErrorPrimary, setHistoricalErrorPrimary] = useState<string | null>(null);

  const [historicalDataSecondary, setHistoricalDataSecondary] = useState<HistoricalDataPoint[] | null>(null);
  const [isLoadingHistoricalSecondary, setIsLoadingHistoricalSecondary] = useState<boolean>(false);
  const [historicalErrorSecondary, setHistoricalErrorSecondary] = useState<string | null>(null);
  
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('1Y');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [cdiChartType, setCdiChartType] = useState<CdiChartType>('monthly');
  const [ipcaChartType, setIpcaChartType] = useState<IpcaChartType>('monthly');
  const [igpmChartType, setIgpmChartType] = useState<IgpmChartType>('monthly');
  
  const [accumulatedPeriodValue, setAccumulatedPeriodValue] = useState<number | null>(null);
  const [averagePeriodValue, setAveragePeriodValue] = useState<number | null>(null);
  const [currentPeriodForSummary, setCurrentPeriodForSummary] = useState<string>('');

  const calculateRolling12MonthAccumulation = (monthlyData: HistoricalDataPoint[]): HistoricalDataPoint[] => {
    if (monthlyData.length < 12) return [];
    const sortedMonthlyData = [...monthlyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const accumulatedResultData: HistoricalDataPoint[] = [];
    for (let i = 11; i < sortedMonthlyData.length; i++) {
      let productOfGrowthFactors = 1;
      for (let j = 0; j < 12; j++) {
        productOfGrowthFactors *= (1 + sortedMonthlyData[i - 11 + j].value / 100);
      }
      const accumulatedValue = (productOfGrowthFactors - 1) * 100;
      accumulatedResultData.push({
        date: sortedMonthlyData[i].date,
        value: accumulatedValue,
      });
    }
    return accumulatedResultData;
  };


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

    setIsLoadingHistoricalPrimary(true);
    setHistoricalErrorPrimary(null);
    setHistoricalDataPrimary(null);
    setIsLoadingHistoricalSecondary(true);
    setHistoricalErrorSecondary(null);
    setHistoricalDataSecondary(null);
    setAccumulatedPeriodValue(null);
    setAveragePeriodValue(null);
    setCurrentPeriodForSummary(`de ${start} a ${end}`);

    let primarySgsCodeToFetch: string | number | undefined = indicator.sgsCode;
    let primarySeriesTypeToFetch = indicator.seriesType;
    let secondarySgsCodeToFetch: string | number | undefined;
    
    if (indicator.title === "Taxa CDI") {
        primarySgsCodeToFetch = cdiChartType === 'monthly' ? 4391 : 4389; 
        secondarySgsCodeToFetch = cdiChartType === 'monthly' ? 4389 : 4391;
    } else if (indicator.title === "IPCA (Inflação)") {
        primarySgsCodeToFetch = ipcaChartType === 'monthly' ? 433 : 13522;
        secondarySgsCodeToFetch = ipcaChartType === 'monthly' ? 13522 : 433;
    } else if (indicator.title === "IGP-M (Inflação)") {
        primarySgsCodeToFetch = 189; 
        secondarySgsCodeToFetch = 189; 
    }
    
    if (primarySgsCodeToFetch && primarySgsCodeToFetch !== 'FOCUS_ONLY') {
      try {
        const data = await onFetchHistoricalData(primarySgsCodeToFetch, start, end, primarySeriesTypeToFetch);
        if (indicator.title === "IGP-M (Inflação)" && igpmChartType === 'accumulated12m' && data) {
            setHistoricalDataPrimary(calculateRolling12MonthAccumulation(data));
        } else {
            setHistoricalDataPrimary(data);
        }
      } catch (e: any) {
        setHistoricalErrorPrimary(e.message || "Erro ao buscar dados históricos primários.");
      }
    } else if (primarySgsCodeToFetch === 'FOCUS_ONLY') {
         setHistoricalErrorPrimary("Não há série histórica para este indicador (apenas valor atual/projeção).");
    } else {
        setHistoricalErrorPrimary("Código SGS primário não definido para este indicador.");
    }
    setIsLoadingHistoricalPrimary(false);

    if (secondarySgsCodeToFetch && secondarySgsCodeToFetch !== 'FOCUS_ONLY' && 
        (indicator.title === "Taxa CDI" || indicator.title === "IPCA (Inflação)" || indicator.title === "IGP-M (Inflação)")) {
      try {
        const dataSec = await onFetchHistoricalData(secondarySgsCodeToFetch, start, end, indicator.seriesType);
        setHistoricalDataSecondary(dataSec);
      } catch (e: any) {
        setHistoricalErrorSecondary(e.message || "Erro ao buscar dados históricos secundários.");
      }
    }
    setIsLoadingHistoricalSecondary(false);

  }, [indicator, onFetchHistoricalData, cdiChartType, ipcaChartType, igpmChartType]);

  useEffect(() => {
    if (isOpen && indicator) {
      const { start, end } = getDatesFromPreset(selectedPreset || '1Y');
      setCustomStartDate(start.split('/').reverse().join('-')); 
      setCustomEndDate(end.split('/').reverse().join('-'));   
      
      if (indicator.sgsCode || indicator.title === "Taxa CDI" || indicator.title === "IPCA (Inflação)" || indicator.title === "IGP-M (Inflação)") {
         fetchChartDataForIndicator(start, end);
      } else {
        setHistoricalDataPrimary(null);
        setHistoricalDataSecondary(null);
        setAccumulatedPeriodValue(null);
        setAveragePeriodValue(null);
        setHistoricalErrorPrimary(null); 
        setHistoricalErrorSecondary(null);
      }
    } else {
      setHistoricalDataPrimary(null);
      setHistoricalDataSecondary(null);
      setIsLoadingHistoricalPrimary(false);
      setIsLoadingHistoricalSecondary(false);
      setHistoricalErrorPrimary(null);
      setHistoricalErrorSecondary(null);
      setAccumulatedPeriodValue(null);
      setAveragePeriodValue(null);
      setCurrentPeriodForSummary('');
      setSelectedPreset('1Y');
      setCdiChartType('monthly');
      setIpcaChartType('monthly');
      setIgpmChartType('monthly');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, indicator, selectedPreset]); 
  
  useEffect(() => {
     if (isOpen && indicator && (indicator.sgsCode || indicator.title === "Taxa CDI" || indicator.title === "IPCA (Inflação)" || indicator.title === "IGP-M (Inflação)") ) {
        const { start, end } = customStartDate && customEndDate 
            ? { 
                start: customStartDate.split('-').reverse().join('/'), 
                end: customEndDate.split('-').reverse().join('/') 
              }
            : getDatesFromPreset(selectedPreset || '1Y');
        fetchChartDataForIndicator(start,end);
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdiChartType, ipcaChartType, igpmChartType]); 
  
  
  useEffect(() => {
    if (indicator) {
      let dataForAccumulation: HistoricalDataPoint[] | null = null;
      
      if (indicator.title === "Taxa CDI") {
        // Accumulation needs SGS 4391 (monthly CDI).
        // If primary chart is monthly, historicalDataPrimary has SGS 4391.
        // If primary chart is 12m_accum, historicalDataSecondary has SGS 4391.
        dataForAccumulation = cdiChartType === 'monthly' ? historicalDataPrimary : historicalDataSecondary;
      } else if (indicator.title === "IPCA (Inflação)") {
        // Accumulation needs SGS 433 (monthly IPCA).
        dataForAccumulation = ipcaChartType === 'monthly' ? historicalDataPrimary : historicalDataSecondary;
      } else if (indicator.title === "IGP-M (Inflação)") {
        // Accumulation needs SGS 189 (monthly IGP-M).
        // If primary chart is monthly (SGS 189), use that.
        // If primary chart is 12m_accum (calculated from SGS 189), then historicalDataSecondary has SGS 189.
        dataForAccumulation = igpmChartType === 'monthly' ? historicalDataPrimary : historicalDataSecondary;
      } else if (historicalDataPrimary && historicalDataPrimary.length > 0 && indicator.sgsCode && indicator.sgsCode !== 'PTAX' && indicator.sgsCode !== 'FOCUS_ONLY') {
          // Default for other SGS series that are percentage based.
          if (indicator.isPercentage || indicator.valueSuffix?.includes('%')) {
            dataForAccumulation = historicalDataPrimary;
          }
      }

      if (dataForAccumulation && dataForAccumulation.length > 0) {
        let productOfGrowthFactors = 1;
        for (const point of dataForAccumulation) {
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
  }, [historicalDataPrimary, historicalDataSecondary, indicator, cdiChartType, ipcaChartType, igpmChartType]);


  useEffect(() => {
    if (historicalDataPrimary && historicalDataPrimary.length > 0 && indicator) {
      const sumOfValues = historicalDataPrimary.reduce((sum, point) => sum + point.value, 0);
      const avgValue = sumOfValues / historicalDataPrimary.length;
      setAveragePeriodValue(avgValue);
    } else {
      setAveragePeriodValue(null);
    }
  }, [historicalDataPrimary, indicator]);


  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreset = e.target.value as DateRangePreset;
    setSelectedPreset(newPreset);
  };
  
  const handleCustomDateFetch = () => {
    if (customStartDate && customEndDate) {
        const startParts = customStartDate.split('-'); 
        const endParts = customEndDate.split('-');   
        if (startParts.length === 3 && endParts.length === 3) {
             const apiStartDate = `${startParts[2]}/${startParts[1]}/${startParts[0]}`; 
             const apiEndDate = `${endParts[2]}/${endParts[1]}/${endParts[0]}`;     
            
            if (indicator?.sgsCode || indicator?.title === "Taxa CDI" || indicator?.title === "IPCA (Inflação)" || indicator?.title === "IGP-M (Inflação)") {
                 fetchChartDataForIndicator(apiStartDate, apiEndDate);
            }
            setSelectedPreset('' as DateRangePreset); 
        } else {
            setHistoricalErrorPrimary("Formato de data inválido. Use YYYY-MM-DD.");
        }
    } else {
        setHistoricalErrorPrimary("Por favor, preencha ambas as datas (início e fim).");
    }
  };

  if (!isOpen || !indicator) {
    return null;
  }

  let displayValueContent: string | React.ReactNode = 'N/D';
  let suffixForDisplay = indicator.valueSuffix || ''; 
  if (indicator.currentValue !== null && indicator.currentValue !== undefined) {
    if (typeof indicator.currentValue === 'number') {
      const valueToFormat = indicator.displayDivisor ? indicator.currentValue / indicator.displayDivisor : indicator.currentValue;
      displayValueContent = formatNumberForDisplay(valueToFormat, { minimumFractionDigits: indicator.valuePrecision ?? 2, maximumFractionDigits: indicator.valuePrecision ?? 4 });
      suffixForDisplay = indicator.displaySuffixOverride !== undefined ? indicator.displaySuffixOverride : suffixForDisplay;
    } else { 
      displayValueContent = indicator.currentValue.toString();
    }
    displayValueContent = `${indicator.displayPrefix || ''}${displayValueContent}${suffixForDisplay}`;
  } else {
    suffixForDisplay = ''; 
    displayValueContent = `${indicator.displayPrefix || ''}${displayValueContent}${suffixForDisplay}`;
  }

  const canDisplayHistorical = indicator.sgsCode || (indicator.title === "IPCA (Inflação)") || (indicator.title === "Taxa CDI") || (indicator.title === "IGP-M (Inflação)");

  let primaryChartConfigToUse: IndicatorModalData = { ...indicator };

  if (indicator.title === "Taxa CDI") {
    if (cdiChartType === 'monthly') {
      primaryChartConfigToUse = {...indicator, sgsCode: 4391, title: "CDI Mensal", historicalSeriesName: "CDI (Taxa Média Mensal %)", historicalYAxisLabel: "% a.m.", valueSuffix: "% a.m." };
    } else { 
      primaryChartConfigToUse = {...indicator, sgsCode: 4389, title: "CDI Acumulado 12 Meses", historicalSeriesName: "CDI (Acum. 12 Meses %)", historicalYAxisLabel: "% a.a.", valueSuffix: "% a.a." };
    }
  } else if (indicator.title === "IPCA (Inflação)") {
     if (ipcaChartType === 'monthly') {
      primaryChartConfigToUse = {...indicator, sgsCode: 433, title: "IPCA (Variação Mensal)", historicalSeriesName: "IPCA (Variação Mensal %)", historicalYAxisLabel: "Variação %", valueSuffix: "%" };
    } else { 
      primaryChartConfigToUse = {...indicator, sgsCode: 13522, title: "IPCA (Acumulado 12 Meses)", historicalSeriesName: "IPCA (Acum. 12 Meses %)", historicalYAxisLabel: "Acum. %", valueSuffix: "%" };
    }
  } else if (indicator.title === "IGP-M (Inflação)") {
    if (igpmChartType === 'monthly') {
      primaryChartConfigToUse = {...indicator, sgsCode: 189, title: "IGP-M (Variação Mensal)", historicalSeriesName: "IGP-M (Variação Mensal %)", historicalYAxisLabel: "Variação %", valueSuffix: "%" };
    } else { 
      primaryChartConfigToUse = {...indicator, sgsCode: "CALCULATED_IGPM_12M", title: "IGP-M (Acumulado 12 Meses)", historicalSeriesName: "IGP-M (Acum. 12 Meses %)", historicalYAxisLabel: "Acum. %", valueSuffix: "%" };
    }
  }


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
                <strong>Valor Atual:</strong> <span className="font-semibold text-blue-600 dark:text-blue-400">{displayValueContent}</span>
            </p>
            {indicator.referenceText && <p className="text-xs text-gray-500 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: indicator.referenceText.replace("⚠️", "<span class='text-orange-500 dark:text-orange-400'>⚠️</span>") }}></p>}
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
                  <div className="my-2 p-3 bg-blue-50 dark:bg-slate-800/60 rounded-lg border border-blue-300 dark:border-blue-600/80 shadow-sm text-center">
                    <span className="block text-xs text-slate-600 dark:text-slate-300">
                      Retorno Acumulado ({indicator.title === "Taxa CDI" || indicator.title === "IPCA (Inflação)" || indicator.title === "IGP-M (Inflação)" ? "da variação mensal" : "no período"}) {currentPeriodForSummary ? `(${currentPeriodForSummary})` : ''}:
                    </span>
                    <span className="block text-xl font-bold text-blue-600 dark:text-blue-300">
                      {formatNumberForDisplay(accumulatedPeriodValue, {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                    </span>
                  </div>
                )}

                {averagePeriodValue !== null && (
                  <div className="my-2 p-3 bg-teal-50 dark:bg-slate-700/60 rounded-lg border border-teal-300 dark:border-teal-600/80 shadow-sm text-center">
                    <span className="block text-xs text-slate-600 dark:text-slate-300">
                      Média Simples no período {currentPeriodForSummary ? `(${currentPeriodForSummary})` : ''}:
                    </span>
                    <span className="block text-xl font-bold text-teal-600 dark:text-teal-300">
                      {formatNumberForDisplay(averagePeriodValue, {
                        minimumFractionDigits: primaryChartConfigToUse.valuePrecision ?? 2,
                        maximumFractionDigits: primaryChartConfigToUse.valuePrecision ?? 4,
                      })}
                      {primaryChartConfigToUse.historicalYAxisLabel ? ` ${primaryChartConfigToUse.historicalYAxisLabel.split('(')[0].trim()}` : (primaryChartConfigToUse.valueSuffix || '')}
                    </span>
                  </div>
                )}


                {indicator.title === "Taxa CDI" && (
                  <div className="mb-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Gráfico Principal:</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="cdiChartType" value="monthly" checked={cdiChartType === 'monthly'} onChange={() => setCdiChartType('monthly')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Taxa Mensal (%)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="cdiChartType" value="accumulated12m" checked={cdiChartType === 'accumulated12m'} onChange={() => setCdiChartType('accumulated12m')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Acumulado 12 Meses (%)</span>
                      </label>
                    </div>
                  </div>
                )}
                 {indicator.title === "IPCA (Inflação)" && (
                  <div className="mb-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Gráfico Principal:</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="ipcaChartType" value="monthly" checked={ipcaChartType === 'monthly'} onChange={() => setIpcaChartType('monthly')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Variação Mensal (%)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="ipcaChartType" value="accumulated12m" checked={ipcaChartType === 'accumulated12m'} onChange={() => setIpcaChartType('accumulated12m')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Acumulado 12 Meses (%)</span>
                      </label>
                    </div>
                  </div>
                )}
                 {indicator.title === "IGP-M (Inflação)" && (
                  <div className="mb-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Gráfico Principal:</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="igpmChartType" value="monthly" checked={igpmChartType === 'monthly'} onChange={() => setIgpmChartType('monthly')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Variação Mensal (%)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input type="radio" name="igpmChartType" value="accumulated12m" checked={igpmChartType === 'accumulated12m'} onChange={() => setIgpmChartType('accumulated12m')} className="form-radio text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"/>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Acumulado 12 Meses (%)</span>
                      </label>
                    </div>
                  </div>
                )}

                <HistoricalLineChart 
                  data={historicalDataPrimary || []} 
                  indicatorConfig={primaryChartConfigToUse} 
                  isLoading={isLoadingHistoricalPrimary} 
                  error={historicalErrorPrimary} 
                />
                
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
