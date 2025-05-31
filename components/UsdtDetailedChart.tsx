import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BitcoinPriceHistoryPoint } from '../types'; // Reusing BitcoinPriceHistoryPoint for simplicity
import { fetchUsdtHistoricalChartData } from '../utils/economicIndicatorsAPI';
import Button from './ui/Button';
import { formatCurrency } from '../utils/formatters';
import { useTheme } from '../hooks/useTheme';

interface UsdtDetailedChartProps {
  coinId?: string;
  vsCurrency?: string;
}

type ChartPeriod = '1D' | '7D' | '30D' | '90D' | '1Y' | 'MAX';

const UsdtDetailedChart: React.FC<UsdtDetailedChartProps> = ({
  coinId = 'tether',
  vsCurrency = 'usd',
}) => {
  const [chartData, setChartData] = useState<BitcoinPriceHistoryPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('30D');
  const { theme } = useTheme();

  const periodToDaysMapping: Record<ChartPeriod, string> = {
    '1D': '1',
    '7D': '7',
    '30D': '30',
    '90D': '90',
    '1Y': '365',
    'MAX': 'max',
  };

  const loadChartData = useCallback(async (period: ChartPeriod) => {
    setIsLoading(true);
    setError(null);
    setChartData(null);
    try {
      const days = periodToDaysMapping[period];
      const data = await fetchUsdtHistoricalChartData(coinId, vsCurrency, days);
      if (data && data.length > 0) {
        setChartData(data);
      } else {
        setError('Nenhum dado encontrado para este período.');
      }
    } catch (e: any) {
      console.error('Error fetching USDT historical data:', e);
      setError(e.message || 'Falha ao carregar dados do gráfico.');
    } finally {
      setIsLoading(false);
    }
  }, [coinId, vsCurrency]);

  useEffect(() => {
    loadChartData(selectedPeriod);
  }, [selectedPeriod, loadChartData]);

  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';
  const lineStrokeColor = theme === 'dark' ? '#50AF95' : '#26A17B'; // USDT Green

  const formatDateForAxis = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (selectedPeriod === '1D') {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      let formattedDate = '';
      if (selectedPeriod === '1D') {
        formattedDate = date.toLocaleTimeString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } else {
        formattedDate = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
      }

      return (
        <div className="bg-white dark:bg-slate-800 p-3 shadow-lg rounded-md border border-slate-300 dark:border-slate-700">
          <p className="label font-semibold text-slate-700 dark:text-slate-200">{formattedDate}</p>
          <p className="intro text-sm" style={{ color: lineStrokeColor }}>
            {`Preço: ${formatCurrency(payload[0].value, vsCurrency.toUpperCase())}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-72">
          <svg className="animate-spin h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="ml-3 text-slate-500 dark:text-slate-400">Carregando gráfico...</p>
        </div>
      );
    }
    if (error) {
      return <p className="text-center text-red-500 dark:text-red-400 py-10">{error}</p>;
    }
    if (!chartData || chartData.length === 0) {
      return <p className="text-center text-slate-500 dark:text-slate-400 py-10">Sem dados para exibir.</p>;
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatDateForAxis}
            tick={{ fill: tickColor, fontSize: 10 }}
            minTickGap={selectedPeriod === '1D' ? 15 : 30}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, vsCurrency.toUpperCase()).replace(`${vsCurrency.toUpperCase()}`, '').trim()}
            tick={{ fill: tickColor, fontSize: 10 }}
            label={{ value: `Preço (${vsCurrency.toUpperCase()})`, angle: -90, position: 'insideLeft', offset: -15, fill: axisLabelColor, fontSize: 12 }}
            domain={['auto', 'auto']}
            allowDataOverflow={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={30} wrapperStyle={{fontSize: "12px", color: tickColor }}/>
          <Line
            type="monotone"
            dataKey="price"
            name={`USDT (${vsCurrency.toUpperCase()})`}
            stroke={lineStrokeColor}
            strokeWidth={2}
            dot={chartData.length < 100 ? { r: 2, fill: lineStrokeColor } : false}
            activeDot={{ r: 5 }}
            isAnimationActive={!isLoading}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };
  
  const periods: ChartPeriod[] = ['1D', '7D', '30D', '90D', '1Y', 'MAX'];

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {periods.map(period => (
          <Button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            variant={selectedPeriod === period ? 'primary' : 'secondary'}
            size="sm"
            disabled={isLoading}
          >
            {period}
          </Button>
        ))}
      </div>
      {renderChart()}
    </div>
  );
};

export default UsdtDetailedChart;