
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { ProjectionPoint, ChartDataPoint, SpecificContribution } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { useTheme } from '../hooks/useTheme';
import { CHART_COLORS } from '../constants';

interface LineChartComponentProps {
  data: ProjectionPoint[];
  specificContributions?: SpecificContribution[];
  currentAge?: number; // If provided, X-axis can show age
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, currentAge }) => {
  if (active && payload && payload.length) {
    const yearLabel = currentAge ? `Idade ${label}` : `Ano ${label}`;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-md border border-gray-300 dark:border-gray-600">
        <p className="label font-semibold text-gray-900 dark:text-white">{yearLabel}</p>
        <p className="text-sm" style={{ color: CHART_COLORS.mainStrategy }}>{`Valor Acumulado: ${formatCurrency(payload[0].value)}`}</p>
        <p className="text-sm" style={{ color: CHART_COLORS.totalInvested }}>{`Total Investido: ${formatCurrency(payload[1].value)}`}</p>
        {payload[0].payload.specificContributionAmount > 0 && (
             <p className="text-sm" style={{ color: CHART_COLORS.specificContributionMarker }}>{`Aporte Específico: ${formatCurrency(payload[0].payload.specificContributionAmount)}`}</p>
        )}
      </div>
    );
  }
  return null;
};

const LineChartComponent: React.FC<LineChartComponentProps> = ({ data, specificContributions, currentAge }) => {
  const { theme } = useTheme();
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280'; 
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';    
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';    

  const chartData: ChartDataPoint[] = data.map(p => ({
    year: currentAge ? (p.age !== undefined ? p.age : p.year + (currentAge -1)) : p.year, // Use age if available, else year
    value: p.finalBalance,
    totalInvested: p.cumulativeContributions,
    // Store specific contribution amount for this year to potentially show in tooltip or marker logic
    specificContributionAmount: p.totalContributions - (data.find(prev_p => prev_p.year === p.year-1)?.totalContributions || (p.year===1 ? p.initialBalance : 0)) // Approximation
  }));
  
  const initialPointYear = currentAge ? currentAge -1 : 0;
  const initialPoint: ChartDataPoint = {
    year: initialPointYear, // Year 0 or Age before start
    value: data.length > 0 ? data[0].initialBalance : 0,
    totalInvested: data.length > 0 ? data[0].initialBalance : 0,
    specificContributionAmount: 0
  };

  const finalChartData = [initialPoint, ...chartData];

  const YAxisTickFormatter = (value: number) => formatCurrency(value).replace('R$', '').trim();
  const XAxisTickFormatter = (tickValue: number) => {
    // If currentAge is provided, tickValue is age. Otherwise, it's year.
    return tickValue.toString();
  };
  const xAxisLabel = currentAge ? "Idade" : "Anos";


  // Prepare specific contribution markers
  // This needs to map specific contributions to the chart's data points (year/age and value)
  // This is a simplified approach; a more robust one would involve finding the exact data point.
  const contributionReferenceDots = specificContributions?.map((sc, index) => {
    const targetYearOrAge = currentAge ? (currentAge + sc.year -1) : sc.year;
    // Find the data point for the year/age of contribution to get y-coordinate (balance)
    // This might be tricky if specific contribution is mid-year from monthly data.
    // For yearly chart, we'll mark the end-of-year balance for the year of contribution.
    const dataPoint = finalChartData.find(dp => dp.year === targetYearOrAge);
    if (!dataPoint) return null;

    return (
      <ReferenceDot
        key={`sc-dot-${index}`}
        x={targetYearOrAge}
        y={dataPoint.value} // Value at the end of the year of contribution
        r={5}
        fill={CHART_COLORS.specificContributionMarker}
        stroke="white"
        isFront={true}
      />
    );
  }).filter(Boolean);


  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <LineChart data={finalChartData} margin={{ top: 5, right: 20, left: 30, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="year" 
            tickFormatter={XAxisTickFormatter}
            tick={{ fill: tickColor, fontSize: 12 }}
            label={{ value: xAxisLabel, position: "insideBottom", offset: -15, fill: axisLabelColor, fontSize: 12 }}
            padding={{ left: 10, right: 10 }}
            domain={['dataMin', 'dataMax']}
            type="number" // Important for ReferenceDot
          />
          <YAxis 
            tickFormatter={YAxisTickFormatter}
            tick={{ fill: tickColor, fontSize: 12 }}
            label={{ value: "Valor (R$)", angle: -90, position: "insideLeft", offset: -20, fill: axisLabelColor, fontSize: 12 }}
            domain={['auto', 'auto']}
            allowDataOverflow={true}
          />
          <Tooltip content={<CustomTooltip currentAge={currentAge} />} />
          <Legend 
            wrapperStyle={{ 
              fontSize: "12px", 
              color: tickColor,
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              paddingTop: '15px', 
              lineHeight: '1.5',    
              paddingBottom: '5px' 
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
          {contributionReferenceDots}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
