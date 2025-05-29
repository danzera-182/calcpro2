
import React, { useState } from 'react';
import { ScenarioData, InputFormData, ProjectionPoint, RetirementAnalysisResults } from '../types';
import LineChartComponent from './LineChartComponent';
import DataTable from './DataTable';
import MonthlyDataTable from './MonthlyDataTable';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { DEFAULT_SAFE_WITHDRAWAL_RATE } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface ResultsDisplayProps {
  scenarioData: ScenarioData;
  inputValues: InputFormData;
}

type ProjectionView = 'yearly' | 'monthly';

const calculateRetirementAnalysis = (
  yearlyProjection: ProjectionPoint[], 
  inputValues: InputFormData
): RetirementAnalysisResults | null => {
  if (!inputValues.enableAdvancedSimulation || !inputValues.advancedSimModeRetirement || 
      !inputValues.targetAge || !inputValues.currentAge || !inputValues.desiredMonthlyIncomeToday) {
    return null;
  }

  const retirementYearData = yearlyProjection.find(p => p.age === inputValues.targetAge! -1 ); // Data at start of targetAge, or end of (targetAge-1)
  
  if (!retirementYearData) {
     const lastPoint = yearlyProjection[yearlyProjection.length -1];
     if(lastPoint && lastPoint.age === inputValues.targetAge! -1){
        // continue with lastPoint as retirementYearData
     } else {
        console.warn("Retirement target age data point not found in projection.");
        return null;
     }
  }
  const projectedCapitalAtRetirement = retirementYearData ? retirementYearData.finalBalance : yearlyProjection[yearlyProjection.length-1].finalBalance;


  let finalDesiredMonthlyIncome = inputValues.desiredMonthlyIncomeToday;
  if (inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate) {
    const inflationAdjustmentYears = inputValues.targetAge - inputValues.currentAge;
    finalDesiredMonthlyIncome = inputValues.desiredMonthlyIncomeToday * Math.pow(1 + (inputValues.expectedInflationRate / 100), inflationAdjustmentYears);
  }

  const annualDesiredIncome = finalDesiredMonthlyIncome * 12;
  const capitalNeededForDesiredIncome = annualDesiredIncome / DEFAULT_SAFE_WITHDRAWAL_RATE;
  const canMeetGoal = projectedCapitalAtRetirement >= capitalNeededForDesiredIncome;

  let achievableMonthlyIncomeWithProjectedCapital: number | undefined = undefined;
  if (!canMeetGoal) {
    const achievableAnnualIncome = projectedCapitalAtRetirement * DEFAULT_SAFE_WITHDRAWAL_RATE;
    achievableMonthlyIncomeWithProjectedCapital = achievableAnnualIncome / 12;
  }

  return {
    targetAge: inputValues.targetAge,
    projectedCapitalAtRetirement,
    finalDesiredMonthlyIncome,
    capitalNeededForDesiredIncome,
    canMeetGoal,
    swrUsed: DEFAULT_SAFE_WITHDRAWAL_RATE,
    achievableMonthlyIncomeWithProjectedCapital,
  };
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ scenarioData, inputValues }) => {
  const [projectionView, setProjectionView] = useState<ProjectionView>('yearly');

  const retirementAnalysisResults = scenarioData.data ? calculateRetirementAnalysis(scenarioData.data, inputValues) : null;


  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let finalY = 20; 

    doc.setFontSize(18);
    doc.text("Relatório de Projeção de Investimentos", doc.internal.pageSize.width / 2, finalY, { align: 'center' });
    finalY += 10;

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, doc.internal.pageSize.width / 2, finalY, { align: 'center' });
    finalY += 10;

    doc.setFontSize(12);
    doc.text("Parâmetros da Simulação:", 14, finalY);
    finalY += 7;
    doc.setFontSize(10);

    const annualRateDecimal = inputValues.rateValue / 100;
    let monthlyEquivalentRatePercent = (Math.pow(1 + annualRateDecimal, 1 / 12) - 1) * 100;
    if (annualRateDecimal <= -1) monthlyEquivalentRatePercent = -100;


    const params = [
      `Descrição da Projeção: ${scenarioData.label}`,
      `Valor Inicial: ${formatCurrency(inputValues.initialInvestment)}`,
      `Aporte Mensal Base: ${formatCurrency(inputValues.contributionValue)}` + 
        (inputValues.enableAdvancedSimulation && inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate ? ` (corrigido por inflação de ${inputValues.expectedInflationRate}% a.a.)` : ''),
      `Taxa Anual Informada: ${formatNumber(inputValues.rateValue)}% a.a. (Equivalente: ~${formatNumber(monthlyEquivalentRatePercent, 4)}% a.m.)`,
      `Período do Investimento: ${inputValues.investmentPeriodYears} ano(s)`,
    ];

    if (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.currentAge && inputValues.targetAge) {
      params.push(`Idade Atual: ${inputValues.currentAge}, Idade Alvo Aposentadoria: ${inputValues.targetAge}`);
      params.push(`Renda Mensal Desejada (hoje): ${formatCurrency(inputValues.desiredMonthlyIncomeToday || 0)}`);
      if (inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate) {
        params.push(`Taxa de Inflação Esperada: ${formatNumber(inputValues.expectedInflationRate, 2)}% a.a.`);
      }
    }
    
    params.forEach(param => {
      doc.text(param, 14, finalY);
      finalY += 6;
    });
    finalY += 4; 

    const lastProjectionPointPdf = scenarioData.data[scenarioData.data.length - 1];
    if (lastProjectionPointPdf) {
        doc.setFontSize(12);
        doc.text("Resumo da Projeção Final:", 14, finalY);
        finalY += 7;
        doc.setFontSize(10);
        const summary = [
            `Valor Total Final Investido: ${formatCurrency(lastProjectionPointPdf.cumulativeContributions)}`, 
            `Total de Juros Ganhos: ${formatCurrency(lastProjectionPointPdf.cumulativeInterest)}`,
            `Valor Final Acumulado: ${formatCurrency(lastProjectionPointPdf.finalBalance)}`,
        ];
        summary.forEach(item => {
            doc.text(item, 14, finalY);
            finalY += 6;
        });
    }
    finalY += 4; 
    
    if (retirementAnalysisResults) {
        doc.setFontSize(12);
        doc.text("Análise de Aposentadoria:", 14, finalY);
        finalY += 7;
        doc.setFontSize(10);
        const retirementSummary = [
            `Idade Alvo: ${retirementAnalysisResults.targetAge} anos`,
            `Patrimônio Projetado: ${formatCurrency(retirementAnalysisResults.projectedCapitalAtRetirement)}`,
            `Renda Mensal Desejada (na aposentadoria): ${formatCurrency(retirementAnalysisResults.finalDesiredMonthlyIncome)}`,
            `Capital Necessário (SWR ${retirementAnalysisResults.swrUsed*100}%): ${formatCurrency(retirementAnalysisResults.capitalNeededForDesiredIncome)}`,
            `Meta Atingida: ${retirementAnalysisResults.canMeetGoal ? 'Sim' : 'Não'}`,
        ];
        if (!retirementAnalysisResults.canMeetGoal && retirementAnalysisResults.achievableMonthlyIncomeWithProjectedCapital !== undefined) {
            retirementSummary.push(`Renda Máxima Atingível com Patrimônio Projetado: ${formatCurrency(retirementAnalysisResults.achievableMonthlyIncomeWithProjectedCapital)}`);
        }
        retirementSummary.forEach(item => {
            doc.text(item, 14, finalY);
            finalY += 6;
        });
        finalY += 4;
    }


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
            row.year + (row.age ? ` (Idade ${row.age})` : ''),
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
         inputValues.enableAdvancedSimulation && inputValues.advancedSimModeSpecificContributions && inputValues.specificContributions && inputValues.specificContributions.length > 0 
            ? "Aportes específicos foram incluídos na simulação." : "",
        "Consulte um profissional financeiro para decisões de investimento."
    ].filter(d => d);
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
  
  const totalPeriodicContributions = lastProjectionPoint ? lastProjectionPoint.cumulativeContributions - inputValues.initialInvestment - (inputValues.specificContributions?.reduce((sum, sc) => sum + sc.amount, 0) || 0) : 0;
  const totalSpecificContributionsAmount = inputValues.specificContributions?.reduce((sum, sc) => sum + sc.amount, 0) || 0;


  return (
    <>
      {/* Summary Card */}
      {lastProjectionPoint && (
        <Card className="mb-6 sm:mb-8">
          <Card.Header>
            <Card.Title className="text-center">
              Resumo da Projeção em {inputValues.investmentPeriodYears} Ano(s) 
              {retirementAnalysisResults ? ` (até Idade ${retirementAnalysisResults.targetAge})`: ''}
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
                  <span className="text-gray-500 dark:text-gray-500">&bull; Total Aportes Mensais Regulares:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">
                    {formatCurrency(totalPeriodicContributions)}
                  </span>
                </div>
                 {totalSpecificContributionsAmount > 0 && (
                    <div className="flex justify-between pl-4 text-xs">
                        <span className="text-gray-500 dark:text-gray-500">&bull; Total Aportes Específicos:</span>
                        <span className="font-normal text-gray-700 dark:text-gray-300">
                        {formatCurrency(totalSpecificContributionsAmount)}
                        </span>
                    </div>
                 )}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Retirement Analysis Card */}
      {retirementAnalysisResults && (
        <Card className="mb-6 sm:mb-8">
          <Card.Header>
            <Card.Title className="text-center">Análise de Aposentadoria (Idade Alvo: {retirementAnalysisResults.targetAge})</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3 text-sm">
            <div className={`p-3 rounded-md text-center ${retirementAnalysisResults.canMeetGoal ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <p className={`font-semibold ${retirementAnalysisResults.canMeetGoal ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {retirementAnalysisResults.canMeetGoal 
                  ? `🎉 Parabéns! Sua projeção atinge o capital necessário para a renda desejada.`
                  : `⚠️ Atenção! Sua projeção atual não atinge o capital necessário para a renda desejada.`
                }
              </p>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Patrimônio Projetado aos {retirementAnalysisResults.targetAge} anos:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(retirementAnalysisResults.projectedCapitalAtRetirement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Renda Mensal Desejada (corrigida):</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(retirementAnalysisResults.finalDesiredMonthlyIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Patrimônio Necessário para Renda Desejada (SWR {formatNumber(retirementAnalysisResults.swrUsed * 100,0)}%):</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(retirementAnalysisResults.capitalNeededForDesiredIncome)}</span>
            </div>
            {!retirementAnalysisResults.canMeetGoal && retirementAnalysisResults.achievableMonthlyIncomeWithProjectedCapital !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Renda Máxima Atingível com Patrimônio Projetado:</span>
                <span className="font-medium text-orange-600 dark:text-orange-500">{formatCurrency(retirementAnalysisResults.achievableMonthlyIncomeWithProjectedCapital)}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-slate-700/60">
              {inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate && 
                `Renda mensal desejada e aportes foram corrigidos pela inflação de ${formatNumber(inputValues.expectedInflationRate,2)}% a.a. `
              }
              A Taxa de Saque Segura (SWR) de {formatNumber(retirementAnalysisResults.swrUsed * 100,0)}% a.a. é utilizada para estimar o capital necessário.
              Historicamente, essa abordagem visa permitir que o patrimônio sustente retiradas anuais (corrigidas pela inflação) por um longo período (ex: 30+ anos),
              sendo por isso associada a uma renda "vitalícia" no planejamento de aposentadoria.
            </p>
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
               <LineChartComponent 
                    data={scenarioData.data} 
                    specificContributions={inputValues.enableAdvancedSimulation && inputValues.advancedSimModeSpecificContributions ? inputValues.specificContributions : undefined}
                    currentAge={inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement ? inputValues.currentAge : undefined}
                />
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
              <DataTable data={scenarioData.data} inputValues={inputValues} />
            )}
            {projectionView === 'monthly' && scenarioData.monthlyData && scenarioData.monthlyData.length > 0 && (
              <MonthlyDataTable data={scenarioData.monthlyData} inputValues={inputValues} />
            )}
             {((projectionView === 'yearly' && scenarioData.data.length === 0) ||
               (projectionView === 'monthly' && (!scenarioData.monthlyData || scenarioData.monthlyData.length === 0))) && (
               <p className="text-center text-gray-500 dark:text-gray-400 py-5">Nenhum dado para exibir na tabela de projeção {projectionView === 'monthly' ? 'mensal' : 'anual'}.</p>
            )}
          </div>
        </Card.Content>
      </Card>
    </>
  );
};

export default ResultsDisplay;