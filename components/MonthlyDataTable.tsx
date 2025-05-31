
import React from 'react';
import { MonthlyProjectionPoint, InputFormData } from '../types'; // Added InputFormData
import { formatCurrency } from '../utils/formatters';

interface MonthlyDataTableProps {
  data: MonthlyProjectionPoint[];
  inputValues: InputFormData; // Added to check for advanced sim options
}

const MonthlyDataTable: React.FC<MonthlyDataTableProps> = ({ data, inputValues }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400">Não há dados mensais para exibir.</p>;
  }

  const showAgeColumn = inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.currentAge;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-[600px]">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mês (Global)</th>
            {showAgeColumn && <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Idade</th>}
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ano</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mês no Ano</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo Inicial</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aporte Regular</th>
            {inputValues.enableAdvancedSimulation && inputValues.advancedSimModeSpecificContributions && 
             <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aporte Específico</th>}
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Juros</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo Final</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800/75 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row) => (
            <tr key={row.globalMonth} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/80 transition-colors">
              <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.globalMonth}</td>
              {showAgeColumn && <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.age}</td>}
              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.year}</td>
              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.monthInYear}</td>
              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(row.initialBalanceMonthly)}</td>
              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(row.contributionMonthly)}</td>
              {inputValues.enableAdvancedSimulation && inputValues.advancedSimModeSpecificContributions &&
                <td className={`px-3 py-3 whitespace-nowrap text-sm ${row.specificContributionThisMonth > 0 ? 'text-amber-600 dark:text-amber-500 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                  {row.specificContributionThisMonth > 0 ? formatCurrency(row.specificContributionThisMonth) : '-'}
                </td>
              }
              <td className="px-3 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-500">{formatCurrency(row.interestEarnedMonthly)}</td>
              <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(row.finalBalanceMonthly)}</td>
            </tr>
          ))}
        </tbody>
      </table>
       {inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.adjustContributionsForInflation && (
        <p className="p-2 text-xs text-gray-500 dark:text-gray-400">
          Nota: Aportes Regulares são corrigidos anualmente pela inflação esperada.
        </p>
      )}
    </div>
  );
};

export default MonthlyDataTable;
