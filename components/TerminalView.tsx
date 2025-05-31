
import React, { useState, useCallback, useEffect } from 'react';
import { Card } from './ui/Card';
import TerminalChartControls from './TerminalChartControls';
import TerminalChartDisplay from './TerminalChartDisplay';
import { 
  HistoricalDataPoint, 
  DateRangePreset, 
  AvailableIndicatorForTerminal, 
  MergedTerminalChartDataPoint,
} from '../types';
import { AVAILABLE_TERMINAL_INDICATORS } from '../constants'; 
import { fetchHistoricalSgsData, fetchHistoricalPtAXData } from '../utils/economicIndicatorsAPI';

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);


const TerminalView: React.FC = () => {
  const [selectedIndicators, setSelectedIndicators] = useState<AvailableIndicatorForTerminal[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('1Y');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [normalizeData, setNormalizeData] = useState<boolean>(false);
  
  const [chartData, setChartData] = useState<MergedTerminalChartDataPoint[]>([]);
  const [activeFetchedIndicators, setActiveFetchedIndicators] = useState<AvailableIndicatorForTerminal[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);


  const getDatesFromPreset = useCallback((preset: DateRangePreset): { start: string, end: string } => {
    const endDate = new Date();
    let startDate = new Date();
    switch (preset) {
      case '1M': startDate.setMonth(endDate.getMonth() - 1); break;
      case '6M': startDate.setMonth(endDate.getMonth() - 6); break;
      case '1Y': default: startDate.setFullYear(endDate.getFullYear() - 1); break;
      case '5Y': startDate.setFullYear(endDate.getFullYear() - 5); break;
      case 'MAX': startDate.setFullYear(endDate.getFullYear() - 20); break;
    }
    const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return { start: formatDate(startDate), end: formatDate(endDate) };
  }, []);


  const processAndMergeData = useCallback((
    fetchedSeriesData: Map<string, HistoricalDataPoint[]>,
    indicatorsToProcess: AvailableIndicatorForTerminal[],
    shouldNormalize: boolean
  ): MergedTerminalChartDataPoint[] => {
    if (fetchedSeriesData.size === 0 || indicatorsToProcess.length === 0) return [];
    const allDates = new Set<number>();
    indicatorsToProcess.forEach(indicator => {
      const series = fetchedSeriesData.get(indicator.id);
      series?.forEach(dp => {
        const dateObj = new Date(dp.date + 'T00:00:00Z');
        if (!isNaN(dateObj.getTime())) allDates.add(dateObj.getTime());
      });
    });

    if (allDates.size === 0) return [];
    const sortedTimestamps = Array.from(allDates).sort((a, b) => a - b);
    const mergedData: MergedTerminalChartDataPoint[] = sortedTimestamps.map(timestamp => {
      const dataPoint: MergedTerminalChartDataPoint = { timestamp };
      indicatorsToProcess.forEach(indicator => {
        const series = fetchedSeriesData.get(indicator.id);
        const point = series?.find(dp => new Date(dp.date + 'T00:00:00Z').getTime() === timestamp);
        dataPoint[indicator.dataKey] = point ? point.value : null;
      });
      return dataPoint;
    });

    if (shouldNormalize) {
      indicatorsToProcess.forEach(indicator => {
        const firstValidValueEntry = mergedData.find(dp => dp[indicator.dataKey] !== null && dp[indicator.dataKey] !== undefined && isFinite(dp[indicator.dataKey] as number));
        if (firstValidValueEntry) {
          const firstValue = firstValidValueEntry[indicator.dataKey] as number;
          if (firstValue !== 0) {
            mergedData.forEach(dp => {
              if (dp[indicator.dataKey] !== null && dp[indicator.dataKey] !== undefined && isFinite(dp[indicator.dataKey] as number)) {
                dp[indicator.dataKey] = ((dp[indicator.dataKey] as number) / firstValue) * 100;
              }
            });
          } else {
            mergedData.forEach(dp => {
              if (dp[indicator.dataKey] !== null && dp[indicator.dataKey] !== undefined && isFinite(dp[indicator.dataKey] as number)) {
                dp[indicator.dataKey] = dp[indicator.dataKey] === 0 ? 0 : null;
              }
            });
          }
        }
      });
    }
    return mergedData;
  }, []);

  const handleGenerateChart = useCallback(async () => { 
    if (selectedIndicators.length === 0) {
      setChartError("Selecione pelo menos um indicador.");
      setChartData([]);
      setActiveFetchedIndicators([]);
      return;
    }
    setIsLoadingChart(true);
    setChartError(null);

    let startDateStr: string, endDateStr: string;
    if (dateRangePreset) {
      const dates = getDatesFromPreset(dateRangePreset);
      startDateStr = dates.start;
      endDateStr = dates.end;
    } else if (customStartDate && customEndDate) {
      const startParts = customStartDate.split('-');
      const endParts = customEndDate.split('-');
      if (startParts.length === 3 && endParts.length === 3) {
        startDateStr = `${startParts[2]}/${startParts[1]}/${startParts[0]}`;
        endDateStr = `${endParts[2]}/${endParts[1]}/${endParts[0]}`;
      } else {
         setChartError("Formato de data customizada inválido. Use YYYY-MM-DD.");
         setIsLoadingChart(false);
         return;
      }
    } else {
      setChartError("Selecione um período ou defina datas customizadas.");
      setIsLoadingChart(false);
      return;
    }

    try {
      const promises = selectedIndicators.map(indicator => {
        if (indicator.seriesType === 'PTAX') {
          return fetchHistoricalPtAXData(startDateStr, endDateStr)
            .then(data => ({ 
              id: indicator.id, 
              data: data.map(item => ({ date: new Date(item.dataHoraCotacao).toISOString().split('T')[0], value: item.cotacaoVenda })) 
            }));
        }
        return fetchHistoricalSgsData(indicator.sgsCode, startDateStr, endDateStr)
          .then(data => ({ 
            id: indicator.id, 
            data: data.map(item => ({ date: item.data.split('/').reverse().join('-'), value: parseFloat(item.valor.replace(',', '.')) })) 
          }));
      });

      const results = await Promise.allSettled(promises);
      const fetchedSeriesData = new Map<string, HistoricalDataPoint[]>();
      const currentActiveIndicators: AvailableIndicatorForTerminal[] = [];
      let fetchErrorOccurred = false;

      results.forEach((result, index) => {
        const indicator = selectedIndicators[index];
        if (result.status === 'fulfilled' && result.value.data) {
          const validDataPoints = result.value.data.filter(dp => !isNaN(dp.value) && dp.date);
          if (validDataPoints.length > 0) {
            fetchedSeriesData.set(indicator.id, validDataPoints);
            currentActiveIndicators.push(indicator);
          }
        } else {
          console.error(`Failed to fetch data for ${indicator.name}:`, result.status === 'rejected' ? result.reason : 'No data or invalid format');
          fetchErrorOccurred = true;
        }
      });
      
      if (fetchErrorOccurred && currentActiveIndicators.length === 0) {
        setChartError("Falha ao buscar dados para todos os indicadores selecionados.");
        setChartData([]);
      } else if (fetchErrorOccurred) {
         setChartError("Falha ao buscar dados para um ou mais indicadores. Exibindo dados disponíveis.");
      }

      if (currentActiveIndicators.length > 0) {
        const processed = processAndMergeData(fetchedSeriesData, currentActiveIndicators, normalizeData);
        setChartData(processed);
        setActiveFetchedIndicators(currentActiveIndicators);
        if (processed.length === 0 && !chartError) { 
            setChartError("Nenhum dado encontrado para os indicadores e período selecionados após processamento.");
        }
      } else if (!fetchErrorOccurred) { 
        setChartData([]);
        setActiveFetchedIndicators([]);
        setChartError("Nenhum dado encontrado para os indicadores e período selecionados.");
      }

    } catch (e: any) {
      console.error("Error generating chart:", e);
      setChartError(e.message || "Erro ao gerar gráfico.");
      setChartData([]);
      setActiveFetchedIndicators([]);
    } finally {
      setIsLoadingChart(false);
    }
  }, [selectedIndicators, dateRangePreset, customStartDate, customEndDate, normalizeData, getDatesFromPreset, processAndMergeData]);


  useEffect(() => {
    if (dateRangePreset) {
      const { start, end } = getDatesFromPreset(dateRangePreset);
      setCustomStartDate(start.split('/').reverse().join('-'));
      setCustomEndDate(end.split('/').reverse().join('-'));
    }
  }, [dateRangePreset, getDatesFromPreset]);

  useEffect(() => {
    if (!isLoadingChart && selectedIndicators.length > 0) {
        let datesAreValid = false;
        if (dateRangePreset) {
            datesAreValid = true;
        } else if (customStartDate && customEndDate) {
            const startParts = customStartDate.split('-');
            const endParts = customEndDate.split('-');
            if (startParts.length === 3 && endParts.length === 3) {
                 datesAreValid = true;
            }
        }
        if (datesAreValid) {
            handleGenerateChart();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndicators, dateRangePreset, customStartDate, customEndDate, normalizeData]); 

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Configurações do Gráfico Comparativo</Card.Title>
        </Card.Header>
        <Card.Content>
          <TerminalChartControls
            availableIndicators={AVAILABLE_TERMINAL_INDICATORS}
            selectedIndicators={selectedIndicators}
            onSelectedIndicatorsChange={setSelectedIndicators}
            dateRangePreset={dateRangePreset}
            onDateRangePresetChange={setDateRangePreset}
            customStartDate={customStartDate}
            onCustomStartDateChange={setCustomStartDate}
            customEndDate={customEndDate}
            onCustomEndDateChange={setCustomEndDate}
            normalizeData={normalizeData}
            onNormalizeDataChange={setNormalizeData}
            onGenerateChart={handleGenerateChart} 
            isLoading={isLoadingChart}
          />
        </Card.Content>
      </Card>

      {chartError && (
        <Card className="border-l-4 border-red-500 dark:border-red-400">
          <Card.Content>
            <p className="text-sm text-red-700 dark:text-red-300">{chartError}</p>
          </Card.Content>
        </Card>
      )}

      <Card>
        <Card.Header className="flex justify-between items-center">
          <Card.Title>Visualização do Gráfico</Card.Title>
          <span 
            className="inline-flex items-center bg-slate-400 dark:bg-slate-600 text-white dark:text-slate-200 text-xs font-medium px-2.5 py-1 rounded-full"
            aria-label="Ferramenta em fase de testes"
            title="Esta ferramenta está em fase de testes. Alguns recursos podem não funcionar como esperado."
          >
            <WarningIcon className="w-3 h-3 mr-1.5 text-yellow-300 dark:text-yellow-200" />
            EM TESTES
          </span>
        </Card.Header>
        <Card.Content>
          {isLoadingChart && ( 
            <div className="flex justify-center items-center h-72">
              <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-3 text-slate-500 dark:text-slate-400">Gerando gráfico...</p>
            </div>
          )}
          {!isLoadingChart && chartData.length > 0 && activeFetchedIndicators.length > 0 ? (
            <TerminalChartDisplay
              data={chartData}
              activeIndicators={activeFetchedIndicators}
              yAxisLabel={normalizeData ? "Valor Normalizado (Início = 100)" : "Valor"}
            />
          ) : !isLoadingChart && !chartError && selectedIndicators.length > 0 && (
             <p className="text-center text-slate-500 dark:text-slate-400 py-10">
              Nenhum dado encontrado para os indicadores e período selecionados, ou clique em "Gerar Gráfico".
             </p>
          )}
          {!isLoadingChart && !chartError && selectedIndicators.length === 0 && (
             <p className="text-center text-slate-500 dark:text-slate-400 py-10">
              Selecione indicadores e um período, depois clique em "Gerar Gráfico".
            </p>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default TerminalView;
