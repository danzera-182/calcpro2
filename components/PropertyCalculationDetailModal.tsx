import React, { useState } from 'react';
import { PropertyComparisonResults, PropertyCalculationYearDetail } from '../types';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { formatCurrency, formatNumberForDisplay } from '../utils/formatters';

interface PropertyCalculationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: PropertyComparisonResults;
}

type ActiveTab = 'buyOnly' | 'buyAndInvest' | 'rentAndInvest';

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);


const PropertyCalculationDetailModal: React.FC<PropertyCalculationDetailModalProps> = ({
  isOpen,
  onClose,
  results,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('buyOnly');

  if (!isOpen) return null;

  const renderYearlyTable = (yearlyData: PropertyCalculationYearDetail[] | undefined, scenario: ActiveTab) => {
    if (!yearlyData || yearlyData.length === 0) {
      return <p className="text-slate-500 dark:text-slate-400 text-center py-4">Nenhum dado detalhado disponível para este cenário.</p>;
    }

    const headers: { key: keyof PropertyCalculationYearDetail; label: string; isCurrency?: boolean, precision?: number }[] = [
      { key: 'year', label: 'Ano' },
    ];

    if (scenario === 'buyOnly') {
      headers.push(
        { key: 'buyOnly_propertyValue_eoy', label: 'Valor Imóvel (Fim Ano)', isCurrency: true },
        { key: 'buyOnly_totalMortgagePaid_year', label: 'Financ. Pago (Ano)', isCurrency: true },
        { key: 'buyOnly_loanBalance_eoy', label: 'Saldo Devedor (Fim Ano)', isCurrency: true },
        { key: 'buyOnly_netWorth_eoy', label: 'Patrimônio Líq. (Fim Ano)', isCurrency: true }
      );
    } else if (scenario === 'buyAndInvest') {
      headers.push(
        { key: 'buyAndInvest_propertyValue_eoy', label: 'Valor Imóvel (Fim Ano)', isCurrency: true },
        { key: 'buyAndInvest_totalMortgagePaid_year', label: 'Financ. Pago (Ano)', isCurrency: true },
        { key: 'buyAndInvest_loanBalance_eoy', label: 'Saldo Devedor (Fim Ano)', isCurrency: true },
        { key: 'buyAndInvest_parallelInvestmentContribution_year', label: 'Aporte Invest. (Ano)', isCurrency: true },
        { key: 'buyAndInvest_parallelInvestmentBalance_eoy', label: 'Saldo Invest. (Fim Ano)', isCurrency: true },
        { key: 'buyAndInvest_netWorth_eoy', label: 'Patrimônio Líq. (Fim Ano)', isCurrency: true }
      );
    } else if (scenario === 'rentAndInvest') {
      headers.push(
        { key: 'rentAndInvest_totalRentPaid_year', label: 'Aluguel Pago (Ano)', isCurrency: true },
        { key: 'rentAndInvest_totalInvestmentContribution_year', label: 'Aporte Líq. Invest. (Ano)', isCurrency: true },
        { key: 'rentAndInvest_investmentBalance_eoy', label: 'Saldo Invest. (Fim Ano)', isCurrency: true },
        { key: 'rentAndInvest_netWorth_eoy', label: 'Patrimônio Líq. (Fim Ano)', isCurrency: true }
      );
    }
    
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-[400px]">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10">
            <tr>
              {headers.map(header => (
                <th key={String(header.key)} scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800/75 divide-y divide-slate-200 dark:divide-slate-700">
            {yearlyData.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/80 transition-colors">
                {headers.map(header => {
                  const value = row[header.key];
                  let displayValue: string | number = '-';
                  if (value !== undefined && value !== null) {
                    if (header.isCurrency) {
                      displayValue = formatCurrency(value as number);
                    } else if (typeof value === 'number') {
                      displayValue = formatNumberForDisplay(value, {minimumFractionDigits: header.precision ?? 0, maximumFractionDigits: header.precision ?? 0});
                    } else {
                       displayValue = String(value);
                    }
                  }
                  return (
                    <td key={String(header.key)} className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleExportCSV = () => {
    const scenarios = [
        { name: "Comprar Imovel (Apenas)", data: results.buyOnly.monthlyBreakdown, fields: [
            'monthGlobal', 'year', 'monthInYear', 
            'currentPropertyValue_eom', 'mortgagePayment_month', 'principalPaid_month', 'interestPaid_month', 'loanBalance_eom', 
            'netWorth_eom'
        ]},
        { name: "Comprar e Investir em Paralelo", data: results.buyAndInvest.monthlyBreakdown, fields: [
            'monthGlobal', 'year', 'monthInYear', 
            'currentPropertyValue_eom', 'mortgagePayment_month', 'principalPaid_month', 'interestPaid_month', 'loanBalance_eom', 
            'parallelInvestmentContribution_month', 'parallelInvestmentBalance_eom', 'netWorth_eom'
        ]},
        { name: "Alugar e Investir a Diferenca", data: results.rentAndInvest.monthlyBreakdown, fields: [
            'monthGlobal', 'year', 'monthInYear',
            'rentPaid_month', 'investmentContribution_month', 'investmentBalance_eom', 'netWorth_eom'
        ]}
    ];

    let csvContent = "";

    scenarios.forEach(scenario => {
        if (scenario.data && scenario.data.length > 0) {
            csvContent += `Cenario: ${scenario.name}\n`;
            csvContent += scenario.fields.join(',') + '\n'; // Header row
            scenario.data.forEach(row => {
                const rowValues = scenario.fields.map(field => {
                    const value = (row as any)[field];
                    return (value === undefined || value === null) ? '' : String(value).replace('.',','); // Use comma for decimal for Excel pt-BR
                });
                csvContent += rowValues.join(',') + '\n';
            });
            csvContent += '\n\n'; // Add some space between scenarios
        }
    });
    
    if (!csvContent.trim()) {
        alert("Nenhum dado detalhado para exportar.");
        return;
    }

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "detalhes_alugar_vs_comprar.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  let currentDataForTab;
  switch(activeTab) {
    case 'buyOnly': currentDataForTab = results.buyOnly.yearlyBreakdownForUI; break;
    case 'buyAndInvest': currentDataForTab = results.buyAndInvest.yearlyBreakdownForUI; break;
    case 'rentAndInvest': currentDataForTab = results.rentAndInvest.yearlyBreakdownForUI; break;
    default: currentDataForTab = [];
  }
  
  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <Card.Header className="flex justify-between items-center">
          <Card.Title id="detail-modal-title" className="text-lg sm:text-xl">
            Detalhamento dos Cálculos ({results.analysisPeriodYears} anos)
          </Card.Title>
          <div className="flex items-center space-x-2">
            <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleExportCSV}
                leftIcon={<DownloadIcon className="w-4 h-4" />}
             >
                Exportar CSV (Mensal)
            </Button>
            <Button variant="ghost" onClick={onClose} className="p-1" aria-label="Fechar modal">
              <CloseIcon className="w-6 h-6" />
            </Button>
          </div>
        </Card.Header>

        <div className="border-b border-slate-200 dark:border-slate-700 px-4 pt-3">
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Abas de cenários">
            {(['buyOnly', 'buyAndInvest', 'rentAndInvest'] as ActiveTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-t-md focus:outline-none whitespace-nowrap
                  ${activeTab === tab 
                    ? 'bg-blue-600 text-white dark:bg-blue-500' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
                aria-current={activeTab === tab ? 'page' : undefined}
              >
                {tab === 'buyOnly' && 'Comprar Imóvel'}
                {tab === 'buyAndInvest' && 'Comprar e Investir'}
                {tab === 'rentAndInvest' && 'Alugar e Investir'}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="overflow-y-auto flex-grow p-3 sm:p-5 space-y-4">
            {renderYearlyTable(currentDataForTab, activeTab)}
        </div>
        <Card.Content className="border-t border-slate-200 dark:border-slate-700 py-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Dados anuais resumidos para visualização. A exportação CSV contém o detalhamento mensal completo.
            </p>
        </Card.Content>
      </Card>
    </div>
  );
};

export default PropertyCalculationDetailModal;