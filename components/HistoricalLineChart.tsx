import React, { useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HistoricalDataPoint, IndicatorModalData } from '../types';
import { useTheme } from '../hooks/useTheme';
import { formatNumberForDisplay } from '../utils/formatters';

interface HistoricalLineChartProps {
  data: HistoricalDataPoint[];
  indicatorConfig: IndicatorModalData;
  isLoading?: boolean;
  error?: string | null;
}

const CustomTooltipContent: React.FC<any> = ({ active, payload, label, indicatorConfig }) => {
  if (active && payload && payload.length && indicatorConfig) {
    const dataPoint = payload[0].payload; 
    let formattedValue: string | number = payload[0].value; // Raw value from data

    if (indicatorConfig.isBillions && typeof payload[0].value === 'number') {
        formattedValue = `${formatNumberForDisplay(payload[0].value / 1000, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (indicatorConfig.isUSD) {
            formattedValue += ` bi USD`;
        } else {
            formattedValue += ` bi`;
        }
    } else if (indicatorConfig.isUSD && typeof payload[0].value === 'number') { 
      formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: indicatorConfig.valuePrecision ?? 2, maximumFractionDigits: indicatorConfig.valuePrecision ?? 4 }).format(payload[0].value);
    } else if ((indicatorConfig.isPercentage || indicatorConfig.valueSuffix?.includes('%')) && typeof payload[0].value === 'number' && !indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice")) {
      // Condition added: !indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice")
      // This prevents adding "%" to index numbers like IBC-Br in the tooltip.
      formattedValue = `${formatNumberForDisplay(payload[0].value, { minimumFractionDigits: indicatorConfig.valuePrecision ?? 2, maximumFractionDigits: indicatorConfig.valuePrecision ?? 4 })}${indicatorConfig.valueSuffix || '%'}`;
    } else if (indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice") && typeof payload[0].value === 'number') {
      // Specific formatting for index numbers (like IBC-Br)
      formattedValue = formatNumberForDisplay(payload[0].value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      // Suffix for index can be added here if desired, e.g., " pts"
    } else if (typeof payload[0].value === 'number') { 
      formattedValue = formatNumberForDisplay(payload[0].value, { minimumFractionDigits: indicatorConfig.valuePrecision ?? 2, maximumFractionDigits: indicatorConfig.valuePrecision ?? 4 });
      if(indicatorConfig.valueSuffix && !indicatorConfig.valueSuffix.includes('%') && !indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice")) {
        formattedValue += indicatorConfig.valueSuffix;
      }
    }
    
    let formattedDate = label;
    try {
        const dateObj = new Date(label + 'T00:00:00'); 
        if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch(e) {/* use label as is */}


    return (
      <div className="bg-white dark:bg-slate-800 p-3 shadow-lg rounded-md border border-gray-300 dark:border-gray-700">
        <p className="label font-semibold text-gray-700 dark:text-gray-200">{formattedDate}</p>
        <p className="intro text-sm text-blue-600 dark:text-blue-400">
          {indicatorConfig.historicalSeriesName || indicatorConfig.title}: {formattedValue}
        </p>
      </div>
    );
  }
  return null;
};

const HistoricalLineChart: React.FC<HistoricalLineChartProps> = ({ data, indicatorConfig, isLoading, error }) => {
  const { theme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';
  const lineStrokeColor = theme === 'dark' ? '#60A5FA' : '#2563EB'; 

  useEffect(() => {
    const chartNode = chartContainerRef.current;
    if (chartNode) {
      const handleTouchMove = (event: TouchEvent) => {
        event.preventDefault();
      };
      chartNode.addEventListener('touchmove', handleTouchMove, { passive: false });
      return () => {
        chartNode.removeEventListener('touchmove', handleTouchMove, { passive: false } as any);
      };
    }
  }, []);

  const formatDateForAxis = (dateString: string, isDailyData?: boolean): string => {
    try {
      const date = new Date(dateString + 'T00:00:00'); 
      if (isNaN(date.getTime())) return dateString;
      
      if (isDailyData && data && data.length > 1) { 
        const firstDate = new Date(data[0].date + 'T00:00:00');
        const lastDate = new Date(data[data.length-1].date + 'T00:00:00');
        if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
            const diffDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 180) { // For longer daily series, show MM/YY
               return date.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' });
            }
        }
      }
      // Default: DD/MM/YY or for shorter daily series
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="ml-3 text-gray-500 dark:text-gray-400">Carregando dados históricos...</p>
      </div>
    );
  }
  
  if (error) {
    return <p className="text-center text-red-500 dark:text-red-400 py-10">{error}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-10">Nenhum dado histórico para exibir para o período selecionado.</p>;
  }

  const yAxisTickFormatter = (value: number): string => {
    if (indicatorConfig.isBillions) { // If the raw data is in millions, this will format to billions
        return `${(value / 1000).toFixed(1)} bi`; 
    }
    if (indicatorConfig.isUSD && !indicatorConfig.isBillions) { // For PTAX like values (not billions)
      return value.toLocaleString('pt-BR', { minimumFractionDigits: indicatorConfig.valuePrecision ?? 2, maximumFractionDigits: indicatorConfig.valuePrecision ?? 2});
    }
    if (indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice") || (indicatorConfig.valueSuffix && !indicatorConfig.valueSuffix.includes('%'))) {
      // For index numbers (like IBC-Br) or other non-percentage, non-currency numbers
       return value.toLocaleString('pt-BR', { minimumFractionDigits: indicatorConfig.valuePrecision ?? 2, maximumFractionDigits: indicatorConfig.valuePrecision ?? 2 });
    }
    if (indicatorConfig.isPercentage || indicatorConfig.valueSuffix?.includes('%')) {
      return `${value.toFixed(indicatorConfig.valuePrecision ?? 2)}`;
    }
    // Default for general numbers
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: indicatorConfig.valuePrecision ?? 0 });
  };
  
  let yDomain: [number | 'auto', number | 'auto'] = ['auto', 'auto'];
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Optional: adjust domain to include 0 if data is close to zero, but be careful not to clip actual data.
  // if (minValue > 0 && minValue < maxValue * 0.1) yDomain = [0, 'auto']; 
  // else if (maxValue < 0 && maxValue > minValue * 0.1) yDomain = ['auto', 0];

  return (
    <div ref={chartContainerRef} style={{ width: '100%', height: 300, touchAction: 'manipulation' }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(dateStr) => formatDateForAxis(dateStr, indicatorConfig.isDailyData)}
            tick={{ fill: tickColor, fontSize: 10 }} 
            interval="preserveStartEnd"
            minTickGap={30} 
          />
          <YAxis 
            tickFormatter={yAxisTickFormatter}
            tick={{ fill: tickColor, fontSize: 10 }}
            label={{ value: indicatorConfig.historicalYAxisLabel || indicatorConfig.valueSuffix, angle: -90, position: 'insideLeft', offset: -10, fill: axisLabelColor, fontSize: 10 }}
            domain={yDomain}
            allowDataOverflow={false}
          />
          <Tooltip content={<CustomTooltipContent indicatorConfig={indicatorConfig} />} />
          <Legend verticalAlign="top" height={30} wrapperStyle={{fontSize: "12px", color: tickColor }}/>
          <Line 
            type="monotone" 
            dataKey="value" 
            name={indicatorConfig.historicalSeriesName || indicatorConfig.title} 
            stroke={lineStrokeColor}
            strokeWidth={2} 
            dot={data.length < 50 ? { r: 2, fill:lineStrokeColor } : false} 
            activeDot={{ r: 5 }} 
          />
          {minValue < 0 && maxValue >= 0 && <ReferenceLine y={0} stroke={axisLabelColor} strokeDasharray="2 2" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoricalLineChart;