
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MergedTerminalChartDataPoint, AvailableIndicatorForTerminal } from '../types'; 
import { useTheme } from '../hooks/useTheme';
import { formatNumberForDisplay } from '../utils/formatters';
import { TERMINAL_CHART_LINE_COLORS } from '../constants';


interface TerminalChartDisplayProps {
  data: MergedTerminalChartDataPoint[]; 
  activeIndicators: AvailableIndicatorForTerminal[]; // Indicators that were successfully fetched and have data
  yAxisLabel?: string;
}

const CustomTooltipContent: React.FC<any> = ({ active, payload, label, seriesConfigsForTooltip }: { active?: boolean, payload?: any[], label?: number, seriesConfigsForTooltip: any[] }) => {
  if (active && payload && payload.length && seriesConfigsForTooltip) {
    let formattedDate = String(label);
    try {
        const dateObj = new Date(label); 
        if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch(e) {/* use label as is */}

    return (
      <div className="bg-white dark:bg-slate-800 p-3 shadow-lg rounded-md border border-gray-300 dark:border-gray-700 opacity-95">
        <p className="label font-semibold text-gray-700 dark:text-gray-200 mb-2">{formattedDate}</p>
        {payload.map((entry: any, index: number) => {
          const config = seriesConfigsForTooltip.find((sc: any) => sc.dataKey === entry.dataKey);
          if (!config) return null;

          let valueSuffix = '';
          let precision = 2;
          if (config.name.toLowerCase().includes('%') || config.name.toLowerCase().includes('selic') || config.name.toLowerCase().includes('cdi') || config.name.toLowerCase().includes('ipca') || config.name.toLowerCase().includes('igp-m') || config.name.toLowerCase().includes('tr')) {
            valueSuffix = '%';
          } else if (config.name.toLowerCase().includes('dólar') || config.name.toLowerCase().includes('ptax')) {
            valueSuffix = ''; 
            precision = config.name.toLowerCase().includes('ptax') ? 4 : 2; // PTAX needs 4 decimals
          } else if (config.name.toLowerCase().includes('milhões usd') || config.name.toLowerCase().includes('reservas')) {
             valueSuffix = ' Mi USD'; 
             precision = 2;
          }


          let formattedValue = formatNumberForDisplay(entry.value, {minimumFractionDigits: precision, maximumFractionDigits: precision});
          if (config.name.toLowerCase().includes('dólar')) { // For PTAX or USD display
            const currencyCode = config.name.toLowerCase().includes('ptax') ? 'BRL' : 'USD'; // Assume BRL for PTAX
            formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode, minimumFractionDigits: precision, maximumFractionDigits: precision }).format(entry.value);
          }

          return (
            <p key={`tooltip-${entry.dataKey}-${index}`} className="text-sm" style={{ color: entry.stroke }}>
              {entry.name}: {formattedValue}{!config.name.toLowerCase().includes('dólar') ? valueSuffix : ''}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};


const TerminalChartDisplay: React.FC<TerminalChartDisplayProps> = ({ data, activeIndicators, yAxisLabel = "Valor" }) => {
  const { theme } = useTheme();
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';

  if (!data || data.length === 0 || !activeIndicators || activeIndicators.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-10">Dados insuficientes para exibir o gráfico.</p>;
  }
  
  const seriesConfigsForChart = activeIndicators.map((indicator, index) => ({
    name: indicator.name,
    dataKey: indicator.dataKey,
    stroke: indicator.defaultChartColor || TERMINAL_CHART_LINE_COLORS[index % TERMINAL_CHART_LINE_COLORS.length],
    yAxisId: "left" // Standardize to a single Y-axis named "left"
  }));


  const xAxisTickFormatter = (timestamp: number): string => {
    try {
      const date = new Date(timestamp);
       if (isNaN(date.getTime())) return String(timestamp); 
      
      if (data.length > 1) {
        const firstDateTs = data[0].timestamp;
        const lastDateTs = data[data.length-1].timestamp;
        const diffDays = (lastDateTs - firstDateTs) / (1000 * 3600 * 24);

        if (diffDays <= 35) { 
           return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } else if (diffDays <= 366 * 2) { 
           return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        } else { 
           return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        }
      }
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (e) {
      return String(timestamp);
    }
  };
  
  const yAxisValues = data.flatMap(point => 
    seriesConfigsForChart.map(sc => point[sc.dataKey] as number).filter(v => v !== null && v !== undefined && isFinite(v))
  );

  let yDomain: [number | 'auto', number | 'auto'] = ['auto', 'auto'];
  let showZeroReferenceLine = false;

  if (yAxisValues.length > 0) {
    let minVal = Math.min(...yAxisValues);
    let maxVal = Math.max(...yAxisValues);

    if (minVal === maxVal) {
        const absVal = Math.abs(minVal);
        if (minVal === 0) {
            minVal = -1;
            maxVal = 1;
        } else {
            const padding = absVal * 0.1 || 1; // 10% or at least 1 unit
            minVal = minVal - padding;
            maxVal = maxVal + padding;
        }
    }
    yDomain = [minVal, maxVal];

    if (minVal < 0 && maxVal >= 0) {
      showZeroReferenceLine = true;
    }
  } else {
    yDomain = [-1, 1]; // Default if no valid data points at all, to prevent crash
    showZeroReferenceLine = true;
  }

  return (
    <div style={{ width: '100%', height: 400 }} role="figure" aria-label="Gráfico comparativo de indicadores macroeconômicos">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 25, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="timestamp" 
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={xAxisTickFormatter}
            tick={{ fill: tickColor, fontSize: 10 }}
            minTickGap={30}
          />
          <YAxis
            yAxisId="left" // Assign ID to the Y-axis
            tickFormatter={(value) => formatNumberForDisplay(value, {minimumFractionDigits:1, maximumFractionDigits:1})}
            tick={{ fill: tickColor, fontSize: 10 }}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -15, fill: axisLabelColor, fontSize: 12 }}
            domain={yDomain}
            allowDataOverflow={false}
          />
          <Tooltip content={<CustomTooltipContent seriesConfigsForTooltip={seriesConfigsForChart} />} />
          <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: "10px", color: tickColor, overflow: "auto", maxHeight: "60px"}}/>
          {seriesConfigsForChart.map((series) => (
            <Line 
              key={series.dataKey}
              type="monotone" 
              dataKey={series.dataKey} 
              name={series.name} 
              stroke={series.stroke}
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls={true} 
              yAxisId={series.yAxisId} 
            />
          ))}
           {showZeroReferenceLine && <ReferenceLine y={0} stroke={axisLabelColor} strokeDasharray="2 2" yAxisId="left"/>}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TerminalChartDisplay;
