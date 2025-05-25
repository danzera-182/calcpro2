
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BacktestProjectionPoint } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useTheme } from '../hooks/useTheme';
import { CHART_COLORS } from '../constants';

interface BacktestChartComponentProps {
  data: BacktestProjectionPoint[];
  period: number;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-md border border-gray-300 dark:border-gray-600">
        <p className="label font-semibold text-gray-900 dark:text-white">{`Ano ${label}`}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const BacktestChartComponent: React.FC<BacktestChartComponentProps> = ({ data, period }) => {
  const { theme } = useTheme();
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280'; // gray-400 / gray-500
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';    // gray-300 / gray-700
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';    // gray-600 / gray-300

  const YAxisTickFormatter = (value: number) => formatCurrency(value).replace('R$', '').trim();

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="year" 
            tick={{ fill: tickColor, fontSize: 12 }}
            label={{ value: `Anos (Backtest de ${period} anos)`, position: "insideBottom", offset: -15, fill: axisLabelColor, fontSize: 12 }}
            padding={{ left: 10, right: 10 }}
            domain={[0, period]}
            type="number"
            allowDecimals={false}
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
              paddingBottom: '10px' // Ensure legend doesn't touch bottom edge
            }}
          />
          <Line 
            type="monotone" 
            dataKey="userStrategyValue" 
            name="Sua Estratégia (Taxa Fixa)" 
            stroke={CHART_COLORS.mainStrategy} 
            strokeWidth={2.5} 
            dot={false}
            activeDot={{ r: 6 }} 
          />
          <Line 
            type="monotone" 
            dataKey="ipcaValue" 
            name="Estratégia @ IPCA" 
            stroke={CHART_COLORS.ipca}
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 6 }} 
          />
           <Line 
            type="monotone" 
            dataKey="ibovespaValue" 
            name="Estratégia @ Ibovespa" 
            stroke={CHART_COLORS.ibovespa}
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 6 }} 
          />
           <Line 
            type="monotone" 
            dataKey="cdiValue" 
            name="Estratégia @ CDI" 
            stroke={CHART_COLORS.cdi}
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BacktestChartComponent;
