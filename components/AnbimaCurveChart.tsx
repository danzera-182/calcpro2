
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

const CustomTooltipContent: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const pointData = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 shadow-lg rounded-md border border-slate-300 dark:border-slate-700 opacity-95">
        <p className="label font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Dias Corridos: {label}
        </p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="text-sm" style={{ color: entry.stroke }}>
            {`${entry.name} (${entry.dataKey === 'hoje' ? pointData.data_hoje?.split('-').reverse().join('/') : entry.dataKey === 'semana_atras' ? pointData.data_semana_atras?.split('-').reverse().join('/') : pointData.data_mes_atras?.split('-').reverse().join('/')}): ${formatNumberForDisplay(entry.value, {minimumFractionDigits: 2, maximumFractionDigits: 4})}%`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


const AnbimaCurveChart: React.FC<AnbimaCurveChartProps> = ({ dataToday, dataWeekAgo, dataMonthAgo }) => {
  const { theme } = useTheme();
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';

  const mergedData: ChartData[] = React.useMemo(() => {
    const allPointsMap = new Map<number, Partial<ChartData>>();

    const processPoints = (
      points: AnbimaCurvePoint[] | null, 
      valueKey: 'hoje' | 'semana_atras' | 'mes_atras', 
      dateRefKey: 'data_hoje' | 'data_semana_atras' | 'data_mes_atras'
    ) => {
      if (points) {
        points.forEach(p => {
          if (!allPointsMap.has(p.dias_corridos)) {
            allPointsMap.set(p.dias_corridos, { dias_corridos: p.dias_corridos });
          }
          const existing = allPointsMap.get(p.dias_corridos)!;
          existing[valueKey] = p.taxa_referencia;
          existing[dateRefKey] = p.data_curva; // Store the curve date for tooltip
        });
      }
    };

    processPoints(dataToday, 'hoje', 'data_hoje');
    processPoints(dataWeekAgo, 'semana_atras', 'data_semana_atras');
    processPoints(dataMonthAgo, 'mes_atras', 'data_mes_atras');
    
    const allPointsArray = Array.from(allPointsMap.values()) as ChartData[];
    return allPointsArray.sort((a, b) => a.dias_corridos - b.dias_corridos);
  }, [dataToday, dataWeekAgo, dataMonthAgo]);

  if (mergedData.length === 0) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-10">Sem dados para exibir no gráfico comparativo.</p>;
  }

  const yAxisTickFormatter = (value: number) => `${value.toFixed(2)}%`;

  const series = [];
  if (dataToday && dataToday.length > 0) {
    series.push({ name: `Hoje (${dataToday[0].data_curva.split('-').reverse().join('/')})`, dataKey: 'hoje', stroke: CHART_COLORS.mainStrategy });
  }
  if (dataWeekAgo && dataWeekAgo.length > 0) {
    series.push({ name: `7d Atrás (${dataWeekAgo[0].data_curva.split('-').reverse().join('/')})`, dataKey: 'semana_atras', stroke: CHART_COLORS.ipca });
  }
  if (dataMonthAgo && dataMonthAgo.length > 0) {
    series.push({ name: `1 Mês Atrás (${dataMonthAgo[0].data_curva.split('-').reverse().join('/')})`, dataKey: 'mes_atras', stroke: CHART_COLORS.totalInvested });
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 25, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="dias_corridos" 
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: tickColor, fontSize: 10 }}
            label={{ value: "Dias Corridos do Vértice", position: 'insideBottom', offset: -10, fill: axisLabelColor, fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={yAxisTickFormatter}
            tick={{ fill: tickColor, fontSize: 10 }}
            label={{ value: "Taxa (% a.a.)", angle: -90, position: 'insideLeft', offset: -15, fill: axisLabelColor, fontSize: 12 }}
            domain={['auto', 'auto']}
            allowDataOverflow={false}
          />
          <Tooltip content={<CustomTooltipContent />} />
          <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: "10px", color: tickColor, overflow: "auto", maxHeight:"50px"}}/>
          {series.map(s => (
            <Line 
              key={s.dataKey}
              type="monotone" 
              dataKey={s.dataKey as keyof ChartData} // Cast to keyof ChartData
              name={s.name} 
              stroke={s.stroke}
              strokeWidth={2} 
              dot={mergedData.length < 50 ? { r: 2, fill:s.stroke } : false}
              activeDot={{ r: 5 }} 
              connectNulls={false} 
            />
          ))}
          <ReferenceLine y={0} stroke={axisLabelColor} strokeDasharray="2 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnbimaCurveChart;
