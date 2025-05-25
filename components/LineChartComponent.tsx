
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProjectionPoint, ChartDataPoint } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useTheme } from '../hooks/useTheme';
import { CHART_COLORS } from '../constants';

interface LineChartComponentProps {
  data: ProjectionPoint[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-md border border-gray-300 dark:border-gray-600">
        <p className="label font-semibold text-gray-900 dark:text-white">{`Ano ${label}`}</p>
        <p className="text-sm" style={{ color: CHART_COLORS.mainStrategy }}>{`Valor Acumulado: ${formatCurrency(payload[0].value)}`}</p>
        <p className="text-sm" style={{ color: CHART_COLORS.totalInvested }}>{`Total Investido: ${formatCurrency(payload[1].value)}`}</p>
      </div>
    );
  }
  return null;
};

const LineChartComponent: React.FC<LineChartComponentProps> = ({ data }) => {
  const { theme } = useTheme();
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280'; // gray-400 / gray-500
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';    // gray-300 / gray-700
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';    // gray-600 / gray-300

  const chartData: ChartDataPoint[] = data.map(p => ({
    year: p.year,
    value: p.finalBalance,
    totalInvested: p.cumulativeContributions,
  }));
  
  const initialPoint: ChartDataPoint = {
    year: 0,
    value: data.length > 0 ? data[0].initialBalance : 0,
    totalInvested: data.length > 0 ? data[0].initialBalance : 0,
  };

  const finalChartData = [initialPoint, ...chartData];

  const YAxisTickFormatter = (value: number) => formatCurrency(value).replace('R$', '').trim();

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <LineChart data={finalChartData} margin={{ top: 5, right: 20, left: 30, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="year" 
            tick={{ fill: tickColor, fontSize: 12 }}
            label={{ value: "Anos", position: "insideBottom", offset: -5, fill: axisLabelColor, fontSize: 12 }}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis 
            tickFormatter={YAxisTickFormatter}
            tick={{ fill: tickColor, fontSize: 12 }}
            label={{ value: "Valor (R$)", angle: -90, position: "insideLeft", offset: -20, fill: axisLabelColor, fontSize: 12 }}
            domain={['auto', 'auto']}
            allowDataOverflow={true}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ 
              fontSize: "12px", 
              color: tickColor,
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              paddingTop: '15px', // Space between chart and legend
              lineHeight: '1.5',    // Vertical space if legend wraps
              paddingBottom: '5px' // Ensure legend doesn't touch bottom edge if chart container is tight
            }} 
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            name="Valor Acumulado" 
            stroke={CHART_COLORS.mainStrategy} 
            strokeWidth={2.5} 
            dot={{ r: 3, fill: CHART_COLORS.mainStrategy }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            type="monotone" 
            dataKey="totalInvested" 
            name="Total Investido" 
            stroke={CHART_COLORS.totalInvested}
            strokeWidth={2} 
            strokeDasharray="5 5"
            dot={{ r: 3, fill: CHART_COLORS.totalInvested }}
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
