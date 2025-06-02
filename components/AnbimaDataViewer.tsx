
import React, { useState, useCallback } from 'react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { AnbimaCurvePoint } from '../types';
import { formatNumberForDisplay } from '../utils/formatters';
import AnbimaCurveChart from './AnbimaCurveChart'; // New import

const AnbimaDataViewer: React.FC = () => {
  const [curveDataToday, setCurveDataToday] = useState<AnbimaCurvePoint[] | null>(null);
  const [curveDataWeekAgo, setCurveDataWeekAgo] = useState<AnbimaCurvePoint[] | null>(null);
  const [curveDataMonthAgo, setCurveDataMonthAgo] = useState<AnbimaCurvePoint[] | null>(null);

  const [isLoadingToday, setIsLoadingToday] = useState<boolean>(false);
  const [isLoadingWeekAgo, setIsLoadingWeekAgo] = useState<boolean>(false);
  const [isLoadingMonthAgo, setIsLoadingMonthAgo] = useState<boolean>(false);

  const [errorToday, setErrorToday] = useState<string | null>(null);
  const [errorWeekAgo, setErrorWeekAgo] = useState<string | null>(null);
  const [errorMonthAgo, setErrorMonthAgo] = useState<string | null>(null);
  
  const formatDateForApi = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchAnbimaCurveInternal = useCallback(async (
    curveType: string, 
    date: Date,
    dataSetter: React.Dispatch<React.SetStateAction<AnbimaCurvePoint[] | null>>,
    loadingSetter: React.Dispatch<React.SetStateAction<boolean>>,
    errorSetter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    loadingSetter(true);
    errorSetter(null);
    dataSetter(null); // Clear previous data for this curve

    const dateString = formatDateForApi(date);

    try {
      const response = await fetch(`/api/anbima-proxy?curveType=${curveType}&date=${dateString}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `Falha ao buscar dados da Anbima para ${dateString}: ${response.statusText}`);
      }
      const apiData: AnbimaCurvePoint[] | { message?: string; erros?: { campo: string, mensagem: string }[] } = await response.json();
      
      if (Array.isArray(apiData) && apiData.length > 0) {
        apiData.sort((a, b) => a.dias_corridos - b.dias_corridos);
        dataSetter(apiData);
      } else if (Array.isArray(apiData) && apiData.length === 0) {
        errorSetter(`Nenhum dado encontrado para a curva ${curveType} em ${dateString}. (Pode ser um dia não útil).`);
      } else if (typeof apiData === 'object' && apiData !== null && 'erros' in apiData && Array.isArray(apiData.erros) && apiData.erros.length > 0) {
        const anbimaErrorMsg = apiData.erros.map(e => e.mensagem).join('; ');
        errorSetter(`Erro da API Anbima para ${dateString}: ${anbimaErrorMsg}`);
      } else if (typeof apiData === 'object' && apiData !== null && 'message' in apiData) {
         errorSetter(`Erro da API Anbima para ${dateString}: ${apiData.message}`);
      }
      else {
        errorSetter(`Resposta inesperada da API Anbima para ${dateString}.`);
        console.warn("Unexpected Anbima API response structure:", apiData);
      }
    } catch (e: any) {
      console.error(`Error fetching Anbima curve data for ${dateString}:`, e);
      errorSetter(e.message || 'Ocorreu um erro desconhecido.');
    } finally {
      loadingSetter(false);
    }
  }, []);
  
  const handleFetchToday = () => fetchAnbimaCurveInternal('PRE', new Date(), setCurveDataToday, setIsLoadingToday, setErrorToday);
  
  const handleFetchWeekAgo = () => {
    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    fetchAnbimaCurveInternal('PRE', weekAgoDate, setCurveDataWeekAgo, setIsLoadingWeekAgo, setErrorWeekAgo);
  };

  const handleFetchMonthAgo = () => {
    const monthAgoDate = new Date();
    monthAgoDate.setMonth(monthAgoDate.getMonth() - 1);
    fetchAnbimaCurveInternal('PRE', monthAgoDate, setCurveDataMonthAgo, setIsLoadingMonthAgo, setErrorMonthAgo);
  };

  const formatDateForDisplay = (dateString: string): string => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const anyDataAvailableForChart = curveDataToday || curveDataWeekAgo || curveDataMonthAgo;
  const anyLoading = isLoadingToday || isLoadingWeekAgo || isLoadingMonthAgo;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Visualizador de Curva de Juros Anbima (ETTJ - Pré-Fixada)</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleFetchToday} disabled={isLoadingToday} variant="primary">
            {isLoadingToday ? 'Buscando Hoje...' : 'Buscar Curva de Hoje'}
          </Button>
          <Button onClick={handleFetchWeekAgo} disabled={isLoadingWeekAgo} variant="secondary">
            {isLoadingWeekAgo ? 'Buscando 7d atrás...' : 'Curva (7 dias atrás)'}
          </Button>
          <Button onClick={handleFetchMonthAgo} disabled={isLoadingMonthAgo} variant="secondary">
            {isLoadingMonthAgo ? 'Buscando 1mês atrás...' : 'Curva (1 mês atrás)'}
          </Button>
        </div>

        {anyLoading && !anyDataAvailableForChart && (
          <div className="flex justify-center items-center py-10">
            <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="ml-3 text-slate-500 dark:text-slate-400">Carregando dados da Anbima...</p>
          </div>
        )}
        
        <div className="space-y-2">
            {errorToday && <p className="text-sm text-red-500 dark:text-red-400">Erro (Hoje): {errorToday}</p>}
            {errorWeekAgo && <p className="text-sm text-red-500 dark:text-red-400">Erro (7d atrás): {errorWeekAgo}</p>}
            {errorMonthAgo && <p className="text-sm text-red-500 dark:text-red-400">Erro (1 mês atrás): {errorMonthAgo}</p>}
        </div>

        {anyDataAvailableForChart && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">Comparativo de Curvas de Juros Pré-Fixadas (ETTJ)</h3>
            <AnbimaCurveChart
              dataToday={curveDataToday}
              dataWeekAgo={curveDataWeekAgo}
              dataMonthAgo={curveDataMonthAgo}
            />
          </div>
        )}

        {curveDataToday && !isLoadingToday && !errorToday && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Detalhes da Curva "{curveDataToday[0]?.curva}" - Data: {formatDateForDisplay(curveDataToday[0]?.data_curva)}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Vencimento</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Dias Corridos</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Taxa Ref. (% a.a.)</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800/75 divide-y divide-slate-200 dark:divide-slate-700">
                  {curveDataToday.map((point, index) => (
                    <tr key={`today-${index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/80 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{formatDateForDisplay(point.vencimento)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 text-center">{point.dias_corridos}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 text-center">
                        {formatNumberForDisplay(point.taxa_referencia, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
         {!anyLoading && !anyDataAvailableForChart && !errorToday && !errorWeekAgo && !errorMonthAgo &&(
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-8">
              Clique nos botões acima para buscar e exibir os dados da curva de juros da Anbima.
            </p>
        )}
      </Card.Content>
    </Card>
  );
};

export default AnbimaDataViewer;
