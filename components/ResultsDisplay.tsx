
import React, { useState, useMemo } from 'react';
import { ScenarioData, InputFormData, ProjectionPoint, RetirementAnalysisResults } from '../types';
import LineChartComponent from './LineChartComponent';
import DataTable from './DataTable';
import MonthlyDataTable from './MonthlyDataTable';
import { Card } from './ui/Card';
import Button from './ui/Button';
import { formatCurrency, formatNumber, formatNumberForDisplay } from '../utils/formatters';
import { DEFAULT_SAFE_WITHDRAWAL_RATE } from '../constants';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Import for its side-effect of patching jsPDF


interface ResultsDisplayProps {
  scenarioData: ScenarioData;
  inputValues: InputFormData;
}

type ProjectionView = 'yearly' | 'monthly';

const calculateRetirementAnalysisAndInheritance = (
  yearlyProjection: ProjectionPoint[], 
  inputValues: InputFormData
): RetirementAnalysisResults | null => {
  if (!inputValues.enableAdvancedSimulation || !inputValues.advancedSimModeRetirement || 
      !inputValues.targetAge || !inputValues.currentAge || !inputValues.desiredMonthlyIncomeToday) {
    return null;
  }

  const retirementYearData = yearlyProjection.find(p => p.age === inputValues.targetAge! -1 ); 
  
  if (!retirementYearData && yearlyProjection.length === 0) {
    console.warn("Retirement analysis: No projection data available.");
    return null;
  }
  
  let projectedCapitalAtRetirement: number;
  if (retirementYearData) {
      projectedCapitalAtRetirement = retirementYearData.finalBalance;
  } else {
      if (inputValues.targetAge === inputValues.currentAge) {
          projectedCapitalAtRetirement = inputValues.initialInvestment; 
      } else if (yearlyProjection.length > 0 && (inputValues.targetAge < (inputValues.currentAge + yearlyProjection[0].year -1) ) ) {
          projectedCapitalAtRetirement = inputValues.initialInvestment;
      }
      else if (yearlyProjection.length > 0) { 
        const lastPoint = yearlyProjection[yearlyProjection.length - 1];
        if (lastPoint.age && lastPoint.age < inputValues.targetAge! -1 ) {
            console.warn("Retirement target age is beyond the projected years that had data. Using last available point.");
            projectedCapitalAtRetirement = lastPoint.finalBalance; 
        } else {
            console.warn("Retirement target age data point not found despite projection. Fallback needed or check logic.");
            projectedCapitalAtRetirement = inputValues.initialInvestment; 
        }
      } else { 
          projectedCapitalAtRetirement = inputValues.initialInvestment; 
      }
  }


  let finalDesiredMonthlyIncome = inputValues.desiredMonthlyIncomeToday;
  if (inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate && inputValues.currentAge && inputValues.targetAge) {
    const inflationAdjustmentYears = inputValues.targetAge - inputValues.currentAge;
    if (inflationAdjustmentYears > 0) {
      finalDesiredMonthlyIncome = inputValues.desiredMonthlyIncomeToday * Math.pow(1 + (inputValues.expectedInflationRate / 100), inflationAdjustmentYears);
    }
  }

  const annualDesiredIncome = finalDesiredMonthlyIncome * 12;
  const capitalNeededForDesiredIncome = annualDesiredIncome / DEFAULT_SAFE_WITHDRAWAL_RATE;
  const canMeetGoal = projectedCapitalAtRetirement >= capitalNeededForDesiredIncome;

  let achievableMonthlyIncomeWithProjectedCapital: number | undefined = undefined;
  if (!canMeetGoal || projectedCapitalAtRetirement > 0) { 
    const achievableAnnualIncome = projectedCapitalAtRetirement * DEFAULT_SAFE_WITHDRAWAL_RATE;
    achievableMonthlyIncomeWithProjectedCapital = achievableAnnualIncome / 12;
  }
  
  // SWR-based perpetual withdrawal
  const annualPerpetualWithdrawalSWR = projectedCapitalAtRetirement * DEFAULT_SAFE_WITHDRAWAL_RATE;
  const perpetualMonthlyWithdrawalFutureValueSWR = annualPerpetualWithdrawalSWR / 12;
  let perpetualMonthlyWithdrawalTodayValueSWR: number | undefined = undefined;

  // Interest-only perpetual withdrawal
  const annualInterestBasedOnSimulationRate = projectedCapitalAtRetirement * (inputValues.rateValue / 100);
  const interestOnlyMonthlyWithdrawalFutureValue = annualInterestBasedOnSimulationRate / 12;
  let interestOnlyMonthlyWithdrawalTodayValue: number | undefined = undefined;


  if (inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate && inputValues.targetAge && inputValues.currentAge) {
    const inflationAdjustmentYears = inputValues.targetAge - inputValues.currentAge;
    if (inflationAdjustmentYears > 0) {
      const inflationDivisor = Math.pow(1 + (inputValues.expectedInflationRate / 100), inflationAdjustmentYears);
      perpetualMonthlyWithdrawalTodayValueSWR = perpetualMonthlyWithdrawalFutureValueSWR / inflationDivisor;
      interestOnlyMonthlyWithdrawalTodayValue = interestOnlyMonthlyWithdrawalFutureValue / inflationDivisor;
    } else {
      perpetualMonthlyWithdrawalTodayValueSWR = perpetualMonthlyWithdrawalFutureValueSWR; 
      interestOnlyMonthlyWithdrawalTodayValue = interestOnlyMonthlyWithdrawalFutureValue;
    }
  }


  let projectedCapitalAt72: number | undefined = undefined;
  const age72DataPoint = yearlyProjection.find(p => p.age === 71); 
  if (age72DataPoint) {
    projectedCapitalAt72 = age72DataPoint.finalBalance;
  } else if (inputValues.currentAge === 72 && yearlyProjection.length === 0) {
    let initialWithdrawal = 0;
    if(inputValues.desiredMonthlyIncomeToday && inputValues.desiredMonthlyIncomeToday > 0){
        initialWithdrawal = inputValues.desiredMonthlyIncomeToday; 
    }
    projectedCapitalAt72 = inputValues.initialInvestment - initialWithdrawal;

  } else if (yearlyProjection.length > 0) {
    const lastProjectedPoint = yearlyProjection[yearlyProjection.length - 1];
    if(lastProjectedPoint.age === undefined || (lastProjectedPoint.age && lastProjectedPoint.age < 71)){
        projectedCapitalAt72 = undefined; 
    }
  }


  return {
    targetAge: inputValues.targetAge,
    projectedCapitalAtRetirement,
    finalDesiredMonthlyIncome,
    capitalNeededForDesiredIncome,
    canMeetGoal,
    swrUsed: DEFAULT_SAFE_WITHDRAWAL_RATE,
    achievableMonthlyIncomeWithProjectedCapital,
    projectedCapitalAt72,
    perpetualMonthlyWithdrawalFutureValue: perpetualMonthlyWithdrawalFutureValueSWR,
    perpetualMonthlyWithdrawalTodayValue: perpetualMonthlyWithdrawalTodayValueSWR,
    interestOnlyMonthlyWithdrawalFutureValue: interestOnlyMonthlyWithdrawalFutureValue,
    interestOnlyMonthlyWithdrawalTodayValue: interestOnlyMonthlyWithdrawalTodayValue,
  };
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ scenarioData, inputValues }) => {
  const [projectionView, setProjectionView] = useState<ProjectionView>('yearly');

  const retirementAnalysisFullResults = scenarioData.data ? calculateRetirementAnalysisAndInheritance(scenarioData.data, inputValues) : null;

  const retirementAgeMarkerValue = useMemo(() => {
    if (inputValues.enableAdvancedSimulation && 
        inputValues.advancedSimModeRetirement && 
        inputValues.currentAge && 
        inputValues.targetAge &&
        inputValues.targetAge > inputValues.currentAge) {
      return inputValues.targetAge;
    }
    return undefined;
  }, [inputValues]);


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
      `Período do Investimento (base): ${inputValues.investmentPeriodYears} ano(s)`,
    ];
     if (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.currentAge && inputValues.targetAge) {
        params.push(`Simulação de Aposentadoria Ativa:`);
        params.push(`  Idade Atual: ${inputValues.currentAge}, Idade Alvo Aposentadoria: ${inputValues.targetAge}`);
        params.push(`  Renda Mensal Desejada (hoje): ${formatCurrency(inputValues.desiredMonthlyIncomeToday || 0)}`);
        if (inputValues.adjustContributionsForInflation) {
            params.push(`  Ajuste pela Inflação: Sim (Taxa: ${formatNumber(inputValues.expectedInflationRate || 0, 2)}% a.a.)`);
        } else {
            params.push(`  Ajuste pela Inflação: Não`);
        }
        params.push(`  Simulação estendida até 72 anos para cálculo de herança.`);
    }
    
    params.forEach(param => {
      doc.text(param, 14, finalY);
      finalY += 6;
    });
    finalY += 4; 

    const lastProjectionPointPdf = scenarioData.data[scenarioData.data.length - 1];
    if (lastProjectionPointPdf) {
        doc.setFontSize(12);
        doc.text("Resumo da Projeção Final (Considerando simulação estendida, se aplicável):", 14, finalY);
        finalY += 7;
        doc.setFontSize(10);
        const summary = [
            `Valor Total Final Investido (aportes): ${formatCurrency(lastProjectionPointPdf.cumulativeContributions)}`, 
            `Total de Juros Ganhos: ${formatCurrency(lastProjectionPointPdf.cumulativeInterest)}`,
            `Total de Retiradas (até 72 anos): ${formatCurrency(lastProjectionPointPdf.cumulativeWithdrawals || 0)}`,
            `Valor Final Acumulado (aos ${lastProjectionPointPdf.age !== undefined ? lastProjectionPointPdf.age + 1 : inputValues.investmentPeriodYears + (inputValues.currentAge||0)} anos): ${formatCurrency(lastProjectionPointPdf.finalBalance)}`,
        ];
        summary.forEach(item => {
            doc.text(item, 14, finalY);
            finalY += 6;
        });
    }
    finalY += 4; 
    
    if (retirementAnalysisFullResults) {
        doc.setFontSize(12);
        doc.text("Análise de Renda de Aposentadoria:", 14, finalY);
        finalY += 7;
        doc.setFontSize(10);
        const retirementSummary = [
            `Idade Alvo para Aposentadoria: ${retirementAnalysisFullResults.targetAge} anos`,
            `Patrimônio Projetado na Aposentadoria: ${formatCurrency(retirementAnalysisFullResults.projectedCapitalAtRetirement)}`,
            `Renda Mensal Desejada (corrigida para aposentadoria): ${formatCurrency(retirementAnalysisFullResults.finalDesiredMonthlyIncome)}`,
            `  (Equivalente a ${formatCurrency(inputValues.desiredMonthlyIncomeToday || 0)} em valores de hoje)`,
            `Capital Necessário para Renda Desejada (SWR ${retirementAnalysisFullResults.swrUsed*100}%): ${formatCurrency(retirementAnalysisFullResults.capitalNeededForDesiredIncome)}`,
            `Meta Atingida: ${retirementAnalysisFullResults.canMeetGoal ? 'Sim' : 'Não'}`,
        ];
        if (!retirementAnalysisFullResults.canMeetGoal && retirementAnalysisFullResults.achievableMonthlyIncomeWithProjectedCapital !== undefined) {
            retirementSummary.push(`Renda Máxima Atingível com Patrimônio Projetado (SWR): ${formatCurrency(retirementAnalysisFullResults.achievableMonthlyIncomeWithProjectedCapital)}`);
        }
         if (retirementAnalysisFullResults.perpetualMonthlyWithdrawalFutureValue !== undefined) {
           let perpetualTextSWR = `Retirada Mensal Vitalícia (SWR ${retirementAnalysisFullResults.swrUsed*100}%): ${formatCurrency(retirementAnalysisFullResults.perpetualMonthlyWithdrawalFutureValue)}`;
           if (retirementAnalysisFullResults.perpetualMonthlyWithdrawalTodayValue !== undefined) {
             perpetualTextSWR += ` (Equivalente a ${formatCurrency(retirementAnalysisFullResults.perpetualMonthlyWithdrawalTodayValue)} hoje)`;
           }
           retirementSummary.push(perpetualTextSWR);
        }
        if (retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalFutureValue !== undefined) {
           let perpetualTextInterest = `Retirada Mensal Vitalícia (Só Juros ${formatNumber(inputValues.rateValue, 2)}% a.a.): ${formatCurrency(retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalFutureValue)}`;
           if (retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalTodayValue !== undefined) {
             perpetualTextInterest += ` (Equivalente a ${formatCurrency(retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalTodayValue)} hoje)`;
           }
           retirementSummary.push(perpetualTextInterest);
        }
        
        retirementSummary.forEach(item => {
            doc.text(item, 14, finalY);
            finalY += 6;
        });
        finalY += 4;

        doc.setFontSize(12);
        doc.text("Herança Estimada:", 14, finalY);
        finalY += 7;
        doc.setFontSize(10);
        const inheritanceSummary = [
            `Idade Considerada para Herança: 72 anos`,
        ];
        if (retirementAnalysisFullResults.projectedCapitalAt72 !== undefined) {
           inheritanceSummary.push(`Herança Estimada aos 72 anos (após retiradas): ${formatCurrency(retirementAnalysisFullResults.projectedCapitalAt72)}`);
        } else {
           inheritanceSummary.push(`Herança Estimada aos 72 anos: Não aplicável ou simulação não atinge 72 anos.`);
        }
        inheritanceSummary.forEach(item => {
            doc.text(item, 14, finalY);
            finalY += 6;
        });
        finalY += 4;
    }

    doc.setFontSize(12);
    doc.text("Detalhes da Projeção Anual:", 14, finalY);
    finalY += 7;
    
    (doc as any).autoTable({ 
        startY: finalY,
        head: [['Ano', 'Idade', 'Saldo Inicial', 'Aportes Anuais', 'Retiradas Anuais', 'Juros Anuais', 'Saldo Final', 'Total Aportado', 'Total Retirado', 'Total Juros']],
        body: scenarioData.data.map(row => [
            row.year,
            row.age !== undefined ? row.age : '-',
            formatCurrency(row.initialBalance),
            formatCurrency(row.totalContributions),
            formatCurrency(row.totalWithdrawalsYearly || 0),
            formatCurrency(row.totalInterestEarned),
            formatCurrency(row.finalBalance),
            formatCurrency(row.cumulativeContributions),
            formatCurrency(row.cumulativeWithdrawals || 0),
            formatCurrency(row.cumulativeInterest),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133], fontSize: 8 }, 
        bodyStyles: { fontSize: 7 },
        columnStyles: { 
            0: { cellWidth: 10 }, 1: { cellWidth: 10 }, 
            2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 
            4: { cellWidth: 25 }, 5: { cellWidth: 25 }, 
            6: { cellWidth: 25 }, 7: { cellWidth: 25 }, 
            8: { cellWidth: 25 }, 9: { cellWidth: 25 }, 
        },
        didDrawPage: (data: any) => { 
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
        "Retiradas (se em modo aposentadoria) são mensais, baseadas na renda desejada e corrigidas pela inflação (se aplicável), até os 72 anos para cálculo de herança.",
        "Consulte um profissional financeiro para decisões de investimento."
    ].filter(d => d);
    disclaimers.forEach(disc => {
        const splitText = doc.splitTextToSize(disc, doc.internal.pageSize.width - 28); 
        doc.text(splitText, 14, finalY);
        finalY += (splitText.length * 4); 
    });

    doc.save('projecao_investimento.pdf');
  };
  
  const mainSummaryPoint = useMemo(() => {
    if (!scenarioData?.data || scenarioData.data.length === 0) return null;
    if (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.targetAge) {
      return scenarioData.data.find(p => p.age === (inputValues.targetAge! -1)) || scenarioData.data[scenarioData.data.length - 1];
    }
    return scenarioData.data[scenarioData.data.length - 1];
  }, [scenarioData, inputValues]);


  let totalProfitability = 0;
  if (mainSummaryPoint && mainSummaryPoint.cumulativeContributions > 0 && mainSummaryPoint.cumulativeContributions - inputValues.initialInvestment !== 0) { 
    totalProfitability = ((mainSummaryPoint.finalBalance / mainSummaryPoint.cumulativeContributions) - 1) * 100;
  } else if (mainSummaryPoint && inputValues.initialInvestment > 0 && mainSummaryPoint.cumulativeContributions === inputValues.initialInvestment) { 
     totalProfitability = ((mainSummaryPoint.finalBalance / inputValues.initialInvestment) - 1) * 100;
  }

  const totalPeriodicContributions = mainSummaryPoint ? mainSummaryPoint.cumulativeContributions - inputValues.initialInvestment - (inputValues.specificContributions?.reduce((sum, sc) => sum + sc.amount, 0) || 0) : 0;
  const totalSpecificContributionsAmount = inputValues.specificContributions?.reduce((sum, sc) => sum + sc.amount, 0) || 0;

  return (
    <>
      {mainSummaryPoint && (
        <Card className="mb-6 sm:mb-8 shadow-xl border-2 border-green-500 dark:border-green-400">
          <Card.Header className="bg-green-50 dark:bg-green-900/30">
            <Card.Title className="text-center text-green-700 dark:text-green-300">
              Resumo da Projeção
              {inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.targetAge 
                ? ` (até Idade ${inputValues.targetAge})`
                : ` em ${inputValues.investmentPeriodYears} Ano(s)`
              }
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4 pt-5">
            <div className="text-center">
              <span className="block text-sm text-slate-600 dark:text-slate-400">
                Patrimônio Acumulado
                {inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.targetAge ? ` (aos ${inputValues.targetAge} anos)`: ''}
              </span>
              <span className="block text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(mainSummaryPoint.finalBalance)}
              </span>
            </div>

            <hr className="my-3 border-slate-200 dark:border-slate-700/60" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total de Juros Ganhos:</span>
                  <span className="font-medium text-green-600 dark:text-green-500">
                    {formatCurrency(mainSummaryPoint.cumulativeInterest)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Rentabilidade Total sobre Aportes:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {totalProfitability.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div>
                 <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total Investido (Geral):</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(mainSummaryPoint.cumulativeContributions)}
                  </span>
                </div>
                 <div className="flex justify-between pl-4 text-xs">
                  <span className="text-slate-500 dark:text-slate-500">&bull; Valor Inicial:</span>
                  <span className="font-normal text-slate-700 dark:text-slate-300">
                    {formatCurrency(inputValues.initialInvestment)}
                  </span>
                </div>
                <div className="flex justify-between pl-4 text-xs">
                  <span className="text-slate-500 dark:text-slate-500">&bull; Total Aportes Mensais Regulares:</span>
                  <span className="font-normal text-slate-700 dark:text-slate-300">
                    {formatCurrency(totalPeriodicContributions < 0 ? 0 : totalPeriodicContributions)}
                  </span>
                </div>
                 {totalSpecificContributionsAmount > 0 && (
                    <div className="flex justify-between pl-4 text-xs">
                        <span className="text-slate-500 dark:text-slate-500">&bull; Total Aportes Específicos:</span>
                        <span className="font-normal text-slate-700 dark:text-slate-300">
                        {formatCurrency(totalSpecificContributionsAmount)}
                        </span>
                    </div>
                 )}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {retirementAnalysisFullResults && (
        <>
        <Card className="mb-6 sm:mb-8 shadow-xl border-2 border-blue-500 dark:border-blue-400">
          <Card.Header className="bg-blue-50 dark:bg-blue-900/30">
            <Card.Title className="text-center text-blue-700 dark:text-blue-300">
              Análise da Renda de Aposentadoria (Idade Alvo: {retirementAnalysisFullResults.targetAge})
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-3 text-sm pt-5">
            <div className={`p-3 rounded-md text-center mb-3 ${retirementAnalysisFullResults.canMeetGoal ? 'bg-green-100 dark:bg-green-800/30' : 'bg-red-100 dark:bg-red-800/30'}`}>
              <p className={`font-semibold ${retirementAnalysisFullResults.canMeetGoal ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {retirementAnalysisFullResults.canMeetGoal 
                  ? `🎉 Parabéns! Sua projeção atinge o capital necessário para a renda desejada (SWR).`
                  : `⚠️ Atenção! Sua projeção atual não atinge o capital necessário para a renda desejada (SWR).`
                }
              </p>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Patrimônio Projetado aos {retirementAnalysisFullResults.targetAge} anos:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(retirementAnalysisFullResults.projectedCapitalAtRetirement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Renda Mensal Desejada (na aposentadoria):</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(retirementAnalysisFullResults.finalDesiredMonthlyIncome)}
                {inputValues.adjustContributionsForInflation && inputValues.desiredMonthlyIncomeToday &&
                    <span className="text-xs text-slate-500 dark:text-slate-400"> (eq. {formatCurrency(inputValues.desiredMonthlyIncomeToday)} hoje)</span>
                }
                </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Capital Necessário (SWR {formatNumber(DEFAULT_SAFE_WITHDRAWAL_RATE * 100, 1)}%):</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(retirementAnalysisFullResults.capitalNeededForDesiredIncome)}</span>
            </div>
             {retirementAnalysisFullResults.achievableMonthlyIncomeWithProjectedCapital !== undefined && (
                <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Renda Mensal Atingível com o Projetado (SWR):</span>
                    <span className={`font-medium ${retirementAnalysisFullResults.canMeetGoal ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>{formatCurrency(retirementAnalysisFullResults.achievableMonthlyIncomeWithProjectedCapital)}</span>
                </div>
            )}
            {retirementAnalysisFullResults.perpetualMonthlyWithdrawalFutureValue !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Retirada Mensal Vitalícia (SWR {formatNumber(DEFAULT_SAFE_WITHDRAWAL_RATE * 100, 1)}%):</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(retirementAnalysisFullResults.perpetualMonthlyWithdrawalFutureValue)}
                  {retirementAnalysisFullResults.perpetualMonthlyWithdrawalTodayValue !== undefined && (
                     <span className="text-xs text-slate-500 dark:text-slate-400"> (eq. {formatCurrency(retirementAnalysisFullResults.perpetualMonthlyWithdrawalTodayValue)} hoje)</span>
                  )}
                </span>
              </div>
            )}
             {retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalFutureValue !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Retirada Mensal Vitalícia (Só Juros):</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalFutureValue)}
                  {retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalTodayValue !== undefined && (
                     <span className="text-xs text-slate-500 dark:text-slate-400"> (eq. {formatCurrency(retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalTodayValue)} hoje)</span>
                  )}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
              <strong>Retirada SWR ({formatNumber(DEFAULT_SAFE_WITHDRAWAL_RATE * 100, 1)}% a.a.):</strong> Taxa Segura de Saque para estimar a retirada sem delapidar o principal (em teoria, corrigindo apenas pela inflação).
              <br/>
              <strong>Retirada Só Juros:</strong> Renda baseada apenas nos juros gerados pelo patrimônio, utilizando 100% da taxa de {formatNumberForDisplay(inputValues.rateValue, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. da simulação. Em teoria, não consome o principal.
            </p>
          </Card.Content>
        </Card>

        <Card className="mb-6 sm:mb-8 shadow-xl border-2 border-purple-500 dark:border-purple-400">
            <Card.Header className="bg-purple-50 dark:bg-purple-900/30">
                <Card.Title className="text-center text-purple-700 dark:text-purple-300">
                    Herança Estimada
                </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3 text-sm pt-5">
                <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Idade Considerada para Herança:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">72 anos</span>
                </div>
                {retirementAnalysisFullResults.projectedCapitalAt72 !== undefined ? (
                <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Patrimônio Estimado aos 72 anos:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(retirementAnalysisFullResults.projectedCapitalAt72)}</span>
                </div>
                ) : (
                <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Patrimônio Estimado aos 72 anos:</span>
                    <span className="font-medium text-slate-500 dark:text-slate-400 text-xs">Simulação não atinge 72 anos ou dado indisponível.</span>
                </div>
                )}
                 <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
                    Este valor considera que, após a aposentadoria na idade alvo, são realizadas retiradas mensais (equivalentes à renda desejada e corrigidas pela inflação, se aplicável) até os 72 anos. Se a aposentadoria for após os 72, considera o saldo antes das retiradas.
                </p>
            </Card.Content>
        </Card>
        </>
      )}


      <Card>
        <Card.Header className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
          <Card.Title>{scenarioData.label}</Card.Title>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setProjectionView('yearly')} variant={projectionView === 'yearly' ? 'primary' : 'secondary'} size="sm">Anual</Button>
            <Button onClick={() => setProjectionView('monthly')} variant={projectionView === 'monthly' ? 'primary' : 'secondary'} size="sm">Mensal</Button>
            <Button onClick={handleExportPDF} variant="secondary" size="sm" leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            }>Exportar PDF</Button>
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          {projectionView === 'yearly' && scenarioData.data && (
            <>
              <LineChartComponent 
                data={scenarioData.data} 
                specificContributions={inputValues.specificContributions}
                currentAge={ (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.currentAge) ? inputValues.currentAge : undefined }
                retirementAgeMarker={retirementAgeMarkerValue}
              />
              <DataTable data={scenarioData.data} inputValues={inputValues}/>
            </>
          )}
          {projectionView === 'monthly' && scenarioData.monthlyData && (
            <MonthlyDataTable data={scenarioData.monthlyData} inputValues={inputValues}/>
          )}
           {!scenarioData.data && projectionView === 'yearly' && <p>Nenhum dado anual para exibir.</p>}
           {!scenarioData.monthlyData && projectionView === 'monthly' && <p>Nenhum dado mensal para exibir.</p>}
        </Card.Content>
      </Card>
    </>
  );
};

export default ResultsDisplay;
