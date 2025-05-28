
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

const IndicatorDetailsModal: React.FC<IndicatorDetailsModalProps> = ({ isOpen, onClose, indicator, onFetchHistoricalData }) => {
  const [historicalDataMonthly, setHistoricalDataMonthly] = useState<HistoricalDataPoint[] | null>(null);
  const [isLoadingHistoricalMonthly, setIsLoadingHistoricalMonthly] = useState<boolean>(false);
  const [historicalErrorMonthly, setHistoricalErrorMonthly] = useState<string | null>(null);

  const [historicalDataAnnual, setHistoricalDataAnnual] = useState<HistoricalDataPoint[] | null>(null);
  const [isLoadingHistoricalAnnual, setIsLoadingHistoricalAnnual] = useState<boolean>(false);
  const [historicalErrorAnnual, setHistoricalErrorAnnual] = useState<string | null>(null);
  
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('1Y');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

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
  
  const fetchIpcaChartsData = useCallback(async (start: string, end: string) => {
    if (!indicator) return;

    // Fetch Monthly IPCA (SGS 433 from original indicator.sgsCode)
    if (indicator.sgsCode && indicator.sgsCode !== 'PTAX' && typeof indicator.sgsCode === 'number') { // PTAX is not a valid SGS code here
        setIsLoadingHistoricalMonthly(true);
        setHistoricalErrorMonthly(null);
        setHistoricalDataMonthly(null);
        try {
            const data = await onFetchHistoricalData(indicator.sgsCode, start, end);
            setHistoricalDataMonthly(data);
        } catch (e: any) {
            setHistoricalErrorMonthly(e.message || "Erro ao buscar dados mensais do IPCA.");
        } finally {
            setIsLoadingHistoricalMonthly(false);
        }
    } else if (indicator.sgsCode !== 'PTAX'){
         setHistoricalErrorMonthly("Código SGS para IPCA mensal não encontrado.");
    }


    // Fetch Annual (12m Accumulated) IPCA (SGS 13522)
    const annualSgsCode = 13522; 
    setIsLoadingHistoricalAnnual(true);
    setHistoricalErrorAnnual(null);
    setHistoricalDataAnnual(null);
    try {
        const data = await onFetchHistoricalData(annualSgsCode, start, end);
        setHistoricalDataAnnual(data);
    } catch (e: any) {
        setHistoricalErrorAnnual(e.message || "Erro ao buscar dados anuais (12m) do IPCA.");
    } finally {
        setIsLoadingHistoricalAnnual(false);
    }
  }, [indicator, onFetchHistoricalData]);

  const fetchSingleChartData = useCallback(async (start: string, end: string) => {
    if (!indicator || !indicator.sgsCode) {
      setHistoricalErrorMonthly("Código do indicador não definido para buscar dados históricos.");
      return;
    }
    setIsLoadingHistoricalMonthly(true);
    setHistoricalErrorMonthly(null);
    setHistoricalDataMonthly(null);

    try {
      let seriesType: 'PTAX' | undefined = undefined;
      if (indicator.sgsCode === 'PTAX') seriesType = 'PTAX';
      
      const data = await onFetchHistoricalData(indicator.sgsCode, start, end, seriesType);
      setHistoricalDataMonthly(data);
    } catch (e: any) {
      setHistoricalErrorMonthly(e.message || "Erro ao buscar dados históricos.");
    } finally {
      setIsLoadingHistoricalMonthly(false);
    }
  }, [indicator, onFetchHistoricalData]);


  useEffect(() => {
    if (isOpen && indicator) {
      const { start, end } = getDatesFromPreset(selectedPreset);
      setCustomStartDate(start.split('/').reverse().join('-')); 
      setCustomEndDate(end.split('/').reverse().join('-'));   
      
      // Only fetch if sgsCode is present (not undefined, not 'FOCUS_ONLY', etc.)
      if (indicator.sgsCode && typeof indicator.sgsCode === 'number' || indicator.sgsCode === 'PTAX') {
        if (indicator.title === "IPCA (Inflação)") {
          fetchIpcaChartsData(start, end);
        } else {
          fetchSingleChartData(start, end);
        }
      } else {
        setHistoricalDataMonthly(null);
        setHistoricalDataAnnual(null);
        setHistoricalErrorMonthly(null); // Clear any previous error
        setHistoricalErrorAnnual(null);
      }
    } else {
      setHistoricalDataMonthly(null);
      setHistoricalDataAnnual(null);
      setIsLoadingHistoricalMonthly(false);
      setIsLoadingHistoricalAnnual(false);
      setHistoricalErrorMonthly(null);
      setHistoricalErrorAnnual(null);
      setSelectedPreset('1Y');
    }
  }, [isOpen, indicator, selectedPreset, fetchIpcaChartsData, fetchSingleChartData]); 

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
            
            if (indicator?.title === "IPCA (Inflação)" && indicator?.sgsCode) {
                fetchIpcaChartsData(apiStartDate, apiEndDate);
            } else if (indicator?.sgsCode) {
                fetchSingleChartData(apiStartDate, apiEndDate);
            }
            setSelectedPreset('' as DateRangePreset); 
        } else {
            const errorSetter = indicator?.title === "IPCA (Inflação)" ? setHistoricalErrorMonthly : setHistoricalErrorMonthly; // Primary error display
            errorSetter("Formato de data inválido. Use YYYY-MM-DD.");
        }
    } else {
        const errorSetter = indicator?.title === "IPCA (Inflação)" ? setHistoricalErrorMonthly : setHistoricalErrorMonthly;
        errorSetter("Por favor, preencha ambas as datas (início e fim).");
    }
  };

  if (!isOpen || !indicator) {
    return null;
  }

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

  const canDisplayHistorical = indicator.sgsCode || (indicator.title === "IPCA (Inflação)" && typeof indicator.sgsCode === 'number');


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

                {indicator.title === "IPCA (Inflação)" ? (
                  <>
                    <div className="mb-6">
                      <h5 className="text-sm font-semibold text-gray-600 dark:text-blue-300 mb-2">IPCA - Variação Mensal (%)</h5>
                      <HistoricalLineChart 
                        data={historicalDataMonthly || []} 
                        indicatorConfig={indicator} 
                        isLoading={isLoadingHistoricalMonthly} 
                        error={historicalErrorMonthly} 
                      />
                    </div>
                    {annualIpcaChartConfig && (
                      <div>
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
                  <HistoricalLineChart 
                    data={historicalDataMonthly || []} 
                    indicatorConfig={indicator} 
                    isLoading={isLoadingHistoricalMonthly} 
                    error={historicalErrorMonthly} 
                  />
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
