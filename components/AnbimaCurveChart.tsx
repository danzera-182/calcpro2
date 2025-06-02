
import React from 'react';
import { AnbimaCurvePoint } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { useTheme } from '../hooks/useTheme';
import { CHART_COLORS } from '../constants';
import { formatNumberForDisplay } from '../utils/formatters';

interface AnbimaCurveChartProps {
  dataToday: AnbimaCurvePoint[] | null;
  dataWeekAgo: AnbimaCurvePoint[] | null;
  dataMonthAgo: AnbimaCurvePoint[] | null;
}

interface ChartData {
  dias_corridos: number;
  hoje?: number;
  semana_atras?: number;
  mes_atras?: number;
  data_hoje?: string;
  data_semana_atras?: string;
  data_mes_atras?: string;
}

// Explicitly type props for CustomTooltipContent
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number; 
    payload: ChartData; // The full data object for this point from mergedData
    name: string; 
    dataKey: keyof ChartData; 
    stroke: string; 
  }>;
  label?: number; // The X-axis value (dias_corridos)
}

const AnbimaCurveChart: React.FC<AnbimaCurveChartProps> = ({ dataToday, dataWeekAgo, dataMonthAgo }) => {
  const { theme } = useTheme();
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';

  const mergedData: ChartData[] = React.useMemo(() => {
    const allPointsMap = new Map<number, Partial<ChartData>>();

    const processPoints = (points: AnbimaCurvePoint[] | null, key: keyof Omit<ChartData, 'dias_corridos'>, dateKey: keyof Omit<ChartData, 'dias_corridos' | 'hoje' | 'semana_atras' | 'mes_atras'>) => {
      if (points) {
        points.forEach(p => {
          if (!allPointsMap.has(p.dias_corridos)) {
            allPointsMap.set(p.dias_corridos, { dias_corridos: p.dias_corridos });
          }
          const entry = allPointsMap.get(p.dias_corridos)!;
          entry[key] = p.taxa_referencia;
          entry[dateKey] = p.data_curva;
        });
      }
    };

    processPoints(dataToday, 'hoje', 'data_hoje');
    processPoints(dataWeekAgo, 'semana_atras', 'data_semana_atras');
    processPoints(dataMonthAgo, 'mes_atras', 'data_mes_atras');
    
    // Cast to ChartData[] as dias_corridos is guaranteed by processPoints logic
    return Array.from(allPointsMap.values())
      .sort((a, b) => (a.dias_corridos ?? 0) - (b.dias_corridos ?? 0)) as ChartData[];
  }, [dataToday, dataWeekAgo, dataMonthAgo]);

  if (mergedData.length === 0) {
    return <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-5">Nenhum dado disponível para exibir no gráfico.</p>;
  }
  
  const formatDateForDisplay = (dateString?: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  };

  const CustomTooltipContent: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length && label !== undefined) {
      const pointDataFromPayload = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 shadow-lg rounded-md border border-slate-300 dark:border-slate-700 opacity-95">
          <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Prazo: {label} dias</p>
          {payload.map((entry) => (
            <p key={String(entry.dataKey)} style={{ color: entry.stroke }} className="text-sm">
              {entry.name}
              {entry.dataKey === 'hoje' && pointDataFromPayload.data_hoje ? ` (${formatDateForDisplay(pointDataFromPayload.data_hoje)})` : ''}
              {entry.dataKey === 'semana_atras' && pointDataFromPayload.data_semana_atras ? ` (${formatDateForDisplay(pointDataFromPayload.data_semana_atras)})` : ''}
              {entry.dataKey === 'mes_atras' && pointDataFromPayload.data_mes_atras ? ` (${formatDateForDisplay(pointDataFromPayload.data_mes_atras)})` : ''}
              : {formatNumberForDisplay(entry.value, {minimumFractionDigits: 2, maximumFractionDigits: 4})}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const yValues = mergedData.flatMap(d => [d.hoje, d.semana_atras, d.mes_atras]).filter(v => v !== undefined) as number[];
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 0;
  const yDomainPadding = (yMax - yMin) * 0.05;


  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="dias_corridos" 
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: tickColor, fontSize: 10 }}
            label={{ value: "Dias Corridos", position: 'insideBottomRight', offset: -2, fill: axisLabelColor, fontSize: 10 }}
          />
          <YAxis 
            tickFormatter={(value) => `${formatNumberForDisplay(value, {minimumFractionDigits:2, maximumFractionDigits:2})}%`}
            tick={{ fill: tickColor, fontSize: 10 }}
            domain={[yMin - yDomainPadding, yMax + yDomainPadding]}
            label={{ value: "Taxa Ref. (% a.a.)", angle: -90, position: 'insideLeft', offset: -15, fill: axisLabelColor, fontSize: 10 }}
            allowDataOverflow={false}
          />
          <Tooltip content={<CustomTooltipContent />} />
          <Legend verticalAlign="top" height={30} wrapperStyle={{fontSize: "12px", color: tickColor }}/>
          {dataToday && <Line type="monotone" dataKey="hoje" name="Hoje" stroke={CHART_COLORS.mainStrategy || "#3B82F6"} strokeWidth={2} dot={false} activeDot={{ r: 5 }} connectNulls />}
          {dataWeekAgo && <Line type="monotone" dataKey="semana_atras" name="7 Dias Atrás" stroke={CHART_COLORS.ipca || "#F59E0B"} strokeWidth={2} dot={false} activeDot={{ r: 5 }} connectNulls />}
          {dataMonthAgo && <Line type="monotone" dataKey="mes_atras" name="1 Mês Atrás" stroke={CHART_COLORS.ibovespa || "#10B981"} strokeWidth={2} dot={false} activeDot={{ r: 5 }} connectNulls />}
          {yMin < 0 && yMax > 0 && <ReferenceLine y={0} stroke={axisLabelColor} strokeDasharray="2 2" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnbimaCurveChart;
