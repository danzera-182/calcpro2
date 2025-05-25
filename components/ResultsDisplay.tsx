
import React, { useState } from 'react';
import { ScenarioData, BacktestResults, InputFormData, ProjectionPoint } from '../types';
import LineChartComponent from './LineChartComponent';
import DataTable from './DataTable';
import MonthlyDataTable from './MonthlyDataTable';
import BacktestChartComponent from './BacktestChartComponent';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { MAX_HISTORICAL_DATA_YEARS } from '../utils/mockBenchmarkData'; 
import { formatCurrency, formatNumber } from '../utils/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface ResultsDisplayProps {
  scenarioData: ScenarioData;
  backtestResults: BacktestResults | null;
  inputValues: InputFormData;
}

type ProjectionView = 'yearly' | 'monthly';

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ scenarioData, backtestResults, inputValues }) => {
  const [projectionView, setProjectionView] = useState<ProjectionView>('yearly');

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let finalY = 20; // Initial Y position

    // Title
    doc.setFontSize(18);
    doc.text("Relatório de Projeção de Investimentos", doc.internal.pageSize.width / 2, finalY, { align: 'center' });
    finalY += 10;

    // Date
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, doc.internal.pageSize.width / 2, finalY, { align: 'center' });
    finalY += 10;

    // Input Parameters
    doc.setFontSize(12);
    doc.text("Parâmetros da Simulação:", 14, finalY);
    finalY += 7;
    doc.setFontSize(10);

    // Calculate equivalent monthly rate for display in PDF
    const annualRateDecimal = inputValues.rateValue / 100;
    let monthlyEquivalentRatePercent = 0;
    if (annualRateDecimal > -1) {
        monthlyEquivalentRatePercent = (Math.pow(1 + annualRateDecimal, 1 / 12) - 1) * 100;
    } else {
        monthlyEquivalentRatePercent = -100;
    }

    const rateDescription = `Taxa Anual Informada: ${formatNumber(inputValues.rateValue)}% a.a. (Equivalente: ~${formatNumber(monthlyEquivalentRatePercent, 4)}% a.m.)`;
    const contributionDescription = `Aporte: ${formatCurrency(inputValues.contributionValue)} (Mensal)`;

    const params = [
      `Descrição da Projeção: ${scenarioData.label}`,
      `Valor Inicial: ${formatCurrency(inputValues.initialInvestment)}`,
      contributionDescription,
      rateDescription,
      `Período do Investimento: ${inputValues.investmentPeriodYears} ano(s)`,
    ];
    params.forEach(param => {
      doc.text(param, 14, finalY);
      finalY += 6;
    });
    finalY += 4; // Extra space before summary

    // Summary of Results
    const lastProjectionPoint = scenarioData.data[scenarioData.data.length - 1];
    if (lastProjectionPoint) {
        doc.setFontSize(12);
        doc.text("Resumo da Projeção Final:", 14, finalY);
        finalY += 7;
        doc.setFontSize(10);
        const summary = [
            `Valor Total Final Investido: ${formatCurrency(lastProjectionPoint.cumulativeContributions)}`, // Includes initial
            `Total de Juros Ganhos: ${formatCurrency(lastProjectionPoint.cumulativeInterest)}`,
            `Valor Final Acumulado: ${formatCurrency(lastProjectionPoint.finalBalance)}`,
        ];
        summary.forEach(item => {
            doc.text(item, 14, finalY);
            finalY += 6;
        });
    }
    finalY += 4; // Extra space before table

    // Yearly Projection Table
    doc.setFontSize(12);
    doc.text("Detalhes da Projeção Anual:", 14, finalY);
    finalY += 7;

    const tableColumnStyles = {
        0: { cellWidth: 15 }, 
        1: { cellWidth: 30 }, 
        2: { cellWidth: 30 }, 
        3: { cellWidth: 30 }, 
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 30 },
    };
    
    autoTable(doc, {
        startY: finalY,
        head: [['Ano', 'Saldo Inicial', 'Aportes Anuais', 'Juros Anuais', 'Saldo Final', 'Total Aportado', 'Total Juros']],
        body: scenarioData.data.map(row => [
            row.year,
            formatCurrency(row.initialBalance),
            formatCurrency(row.totalContributions),
            formatCurrency(row.totalInterestEarned),
            formatCurrency(row.finalBalance),
            formatCurrency(row.cumulativeContributions),
            formatCurrency(row.cumulativeInterest),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: tableColumnStyles,
        didDrawPage: (data) => {
            finalY = data.cursor?.y || finalY;
        }
    });
    
    if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
      finalY = (doc as any).lastAutoTable.finalY;
    }


    if (finalY > pageHeight - 30) { 
        doc.addPage();
        finalY = 20; 
    } else {
        finalY += 10; 
    }

    doc.setFontSize(8);
    doc.text("Observações:", 14, finalY);
    finalY += 5;
    const disclaimers = [
        "Este é um relatório de simulação e não garante rentabilidade futura.",
        "Os valores apresentados são projeções baseadas nos parâmetros informados.",
        "Aportes são considerados mensais e a taxa de juros informada é anual (convertida para mensal nos cálculos).",
        "Consulte um profissional financeiro para decisões de investimento."
    ];
    disclaimers.forEach(disc => {
        const splitText = doc.splitTextToSize(disc, doc.internal.pageSize.width - 28); 
        doc.text(splitText, 14, finalY);
        finalY += (splitText.length * 4); 
    });

    doc.save('projecao_investimento.pdf');
  };

  const lastProjectionPoint = scenarioData && scenarioData.data && scenarioData.data.length > 0 
    ? scenarioData.data[scenarioData.data.length - 1] 
    : null;

  let totalProfitability = 0;
  if (lastProjectionPoint && lastProjectionPoint.cumulativeContributions > 0) {
    totalProfitability = ((lastProjectionPoint.finalBalance / lastProjectionPoint.cumulativeContributions) - 1) * 100;
  }
  
  const totalPeriodicContributions = lastProjectionPoint ? lastProjectionPoint.cumulativeContributions - inputValues.initialInvestment : 0;


  return (
    <>
      {/* Summary Card - NEW */}
      {lastProjectionPoint && (
        <Card className="mb-6 sm:mb-8">
          <Card.Header>
            <Card.Title className="text-center">
              Resumo da Projeção em {inputValues.investmentPeriodYears} Ano(s)
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="text-center">
              <span className="block text-sm text-gray-600 dark:text-gray-400">Valor Final Acumulado</span>
              <span className="block text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(lastProjectionPoint.finalBalance)}
              </span>
            </div>

            <hr className="my-3 border-gray-200 dark:border-slate-700/60" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total de Juros Ganhos:</span>
                  <span className="font-medium text-green-600 dark:text-green-500">
                    {formatCurrency(lastProjectionPoint.cumulativeInterest)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Rentabilidade Total:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formatNumber(totalProfitability, 2)}%
                  </span>
                </div>
              </div>
              <div>
                 <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Investido (Geral):</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formatCurrency(lastProjectionPoint.cumulativeContributions)}
                  </span>
                </div>
                 <div className="flex justify-between pl-4 text-xs">
                  <span className="text-gray-500 dark:text-gray-500">&bull; Valor Inicial:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">
                    {formatCurrency(inputValues.initialInvestment)}
                  </span>
                </div>
                <div className="flex justify-between pl-4 text-xs">
                  <span className="text-gray-500 dark:text-gray-500">&bull; Total Aportes Mensais:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">
                    {formatCurrency(totalPeriodicContributions)}
                  </span>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Existing Results Card (Chart and Tables) */}
      <Card>
        <Card.Header>
          <Card.Title>Resultados da Projeção Futura: {scenarioData.label}</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-blue-400">Evolução Patrimonial Projetada</h3>
            {scenarioData.data.length > 1 ? (
               <LineChartComponent data={scenarioData.data} />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-5">Dados insuficientes para gerar o gráfico da projeção (mínimo 2 anos).</p>
            )}
          </div>
          <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-blue-400">Detalhes da Projeção</h3>
                <div className="flex space-x-2">
                    <Button 
                        variant={projectionView === 'yearly' ? 'primary' : 'secondary'} 
                        size="sm" 
                        onClick={() => setProjectionView('yearly')}
                    >
                        Visão Anual
                    </Button>
                    <Button 
                        variant={projectionView === 'monthly' ? 'primary' : 'secondary'} 
                        size="sm" 
                        onClick={() => setProjectionView('monthly')}
                        disabled={!scenarioData.monthlyData || scenarioData.monthlyData.length === 0}
                    >
                        Visão Mensal
                    </Button>
                     <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleExportPDF}
                        leftIcon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>}
                    >
                        Exportar PDF
                    </Button>
                </div>
            </div>
            {projectionView === 'yearly' && scenarioData.data.length > 0 && (
              <DataTable data={scenarioData.data} />
            )}
            {projectionView === 'monthly' && scenarioData.monthlyData && scenarioData.monthlyData.length > 0 && (
              <MonthlyDataTable data={scenarioData.monthlyData} />
            )}
             {((projectionView === 'yearly' && scenarioData.data.length === 0) ||
               (projectionView === 'monthly' && (!scenarioData.monthlyData || scenarioData.monthlyData.length === 0))) && (
               <p className="text-center text-gray-500 dark:text-gray-400 py-5">Nenhum dado para exibir na tabela de projeção {projectionView === 'monthly' ? 'mensal' : 'anual'}.</p>
            )}
          </div>
        </Card.Content>
      </Card>

      {backtestResults && backtestResults.data.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Comparativo Histórico (Backtest - Últimos {backtestResults.period} Anos)</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Este gráfico compara o desempenho histórico simulado da sua estratégia (valor inicial + aportes) contra os benchmarks IPCA, Ibovespa e CDI, utilizando dados <strong>históricos reais (estáticos)</strong> dos últimos {backtestResults.period} anos (limitado a {MAX_HISTORICAL_DATA_YEARS} anos de dados disponíveis).
              A linha "Sua Estratégia (Taxa Fixa)" aplica a taxa de juros anual efetiva ({inputValues.effectiveAnnualRate.toFixed(2)}% a.a.) que você definiu para a projeção futura, de forma retroativa.
            </p>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-blue-400">Desempenho Histórico Simulado vs. Benchmarks</h3>
              <BacktestChartComponent data={backtestResults.data} period={backtestResults.period} />
            </div>
             <p className="text-xs text-center font-semibold text-red-600 dark:text-red-400 pt-2">
              Atenção: Rentabilidade passada não é garantia de rentabilidade futura. Dados históricos são para fins ilustrativos e não se atualizam automaticamente. Consulte um profissional financeiro.
            </p>
          </Card.Content>
        </Card>
      )}
    </>
  );
};

export default ResultsDisplay;
