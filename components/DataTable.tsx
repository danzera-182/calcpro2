import React from 'react';
import { ProjectionPoint, InputFormData } from '../types'; // Added InputFormData
import { formatCurrency } from '../utils/formatters';

interface DataTableProps {
  data: ProjectionPoint[];
  inputValues: InputFormData; // Added to check for advanced sim options
}

const DataTable: React.FC<DataTableProps> = ({ data, inputValues }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400">Não há dados para exibir na tabela.</p>;
  }
  
  const showAgeColumn = inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.currentAge;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ano</th>
            {showAgeColumn && <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Idade</th>}
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo Inicial</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aportes Anuais</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Juros Anuais</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo Final</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Aportado</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Juros</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800/75 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row) => (
            <tr key={row.year} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/80 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.year}</td>
              {showAgeColumn && <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.age}</td>}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(row.initialBalance)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(row.totalContributions)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-500">{formatCurrency(row.totalInterestEarned)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(row.finalBalance)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatCurrency(row.cumulativeContributions)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 dark:text-green-500">{formatCurrency(row.cumulativeInterest)}</td>
            </tr>
          ))}
        </tbody>
      </table>
       {inputValues.enableAdvancedSimulation && inputValues.advancedSimModeSpecificContributions && inputValues.specificContributions && inputValues.specificContributions.length > 0 && (
        <p className="p-2 text-xs text-gray-500 dark:text-gray-400">
          Nota: A coluna "Aportes Anuais" inclui tanto os aportes regulares mensais (potencialmente corrigidos pela inflação, se aplicável) quanto os aportes específicos definidos.
        </p>
      )}
    </div>
  );
};

export default DataTable;
