
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
    const rawValue = payload[0].value; // Raw value from data
    let formattedValue: string;

    const displayPrecision = indicatorConfig.valuePrecision ?? 2;
    const maxPrecision = Math.max(displayPrecision, 4); // Ensure at least 2, but up to 4 if specified for some types

    // 1. Handle displayDivisor first if present
    if (indicatorConfig.displayDivisor && indicatorConfig.displayDivisor !== 0 && typeof rawValue === 'number') {
        const dividedValue = rawValue / indicatorConfig.displayDivisor;
        const prefix = indicatorConfig.displayPrefix || '';
        // Suffix from config, could be "bi", "tri", "%", or empty
        const suffix = indicatorConfig.displaySuffixOverride !== undefined 
                       ? indicatorConfig.displaySuffixOverride 
                       : (indicatorConfig.valueSuffix || ''); 
        
        formattedValue = `${prefix}${formatNumberForDisplay(dividedValue, { minimumFractionDigits: displayPrecision, maximumFractionDigits: displayPrecision })}${suffix}`;
    } 
    // 2. Handle PTAX (isUSD flag means value is BRL from PTAX) when not using displayDivisor logic
    else if (indicatorConfig.isUSD && typeof rawValue === 'number') { 
      formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: displayPrecision, maximumFractionDigits: 4 }).format(rawValue);
    } 
    // 3. Handle percentages
    else if ((indicatorConfig.isPercentage || indicatorConfig.valueSuffix?.includes('%')) && typeof rawValue === 'number' && !indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice")) {
      formattedValue = `${formatNumberForDisplay(rawValue, { minimumFractionDigits: displayPrecision, maximumFractionDigits: maxPrecision })}${indicatorConfig.valueSuffix || '%'}`;
    } 
    // 4. Handle "Índice" type labels
    else if (indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice") && typeof rawValue === 'number') {
      formattedValue = formatNumberForDisplay(rawValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Indices often have 2 decimal places
      if(indicatorConfig.valueSuffix && !indicatorConfig.valueSuffix.includes('%')) {
        formattedValue += indicatorConfig.valueSuffix;
      }
    } 
    // 5. Handle general numbers
    else if (typeof rawValue === 'number') { 
      const prefix = indicatorConfig.displayPrefix || '';
      const suffix = indicatorConfig.displaySuffixOverride !== undefined 
                     ? indicatorConfig.displaySuffixOverride 
                     : (indicatorConfig.valueSuffix || '');
      formattedValue = `${prefix}${formatNumberForDisplay(rawValue, { minimumFractionDigits: displayPrecision, maximumFractionDigits: maxPrecision })}${suffix}`;
    } 
    // 6. Fallback
    else {
      formattedValue = String(rawValue);
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
        // Check if the touch is primarily horizontal to allow chart interaction,
        // otherwise allow page scroll. This is a common pattern but might need refinement.
        // For simplicity, we're keeping the preventDefault as is for now.
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
    const displayPrecision = indicatorConfig.valuePrecision ?? 2;
    const maxPrecision = Math.max(displayPrecision, 4);

    if (indicatorConfig.displayDivisor && indicatorConfig.displayDivisor !== 0) {
        const dividedValue = value / indicatorConfig.displayDivisor;
        // Suffix for axis should be compact, prefer displaySuffixOverride or a simple unit if relevant
        const suffix = indicatorConfig.displaySuffixOverride || (indicatorConfig.historicalYAxisLabel?.includes('%') || indicatorConfig.valueSuffix?.includes('%') ? '%' : '');
        return `${formatNumberForDisplay(dividedValue, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`;
    }
    if (indicatorConfig.isUSD) { // Handles PTAX (value is BRL from PTAX)
      return formatNumberForDisplay(value, { minimumFractionDigits: displayPrecision, maximumFractionDigits: 4 });
    }
    if (indicatorConfig.historicalYAxisLabel?.toLowerCase().includes("índice")) {
      return formatNumberForDisplay(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // For percentages, the Y-axis label often already contains "%", so just the number.
    if (indicatorConfig.isPercentage || indicatorConfig.valueSuffix?.includes('%')) {
      return formatNumberForDisplay(value, { minimumFractionDigits: displayPrecision, maximumFractionDigits: displayPrecision });
    }
    // Default for general numbers
    const numberMagnitude = Math.abs(value);
    let fractionDigitsToShow = 0;
    if (numberMagnitude > 0 && numberMagnitude < 1) fractionDigitsToShow = displayPrecision; // Show decimals for small numbers
    else if (numberMagnitude < 100) fractionDigitsToShow = 1; // Show one decimal for mid-range numbers
    
    return formatNumberForDisplay(value, { minimumFractionDigits: fractionDigitsToShow, maximumFractionDigits: fractionDigitsToShow });
  };
  
  let yDomain: [number | 'auto', number | 'auto'] = ['auto', 'auto'];
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Optional: adjust domain to include 0 if data is close to zero, but be careful not to clip actual data.
  // if (minValue > 0 && minValue < maxValue * 0.1) yDomain = [0, 'auto']; 
  // else if (maxValue < 0 && maxValue > minValue * 0.1) yDomain = ['auto', 0];

  return (
    <div ref={chartContainerRef} style={{ width: '100%', height: 300, touchAction: 'manipulation', overflowX: 'auto' }}>
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
