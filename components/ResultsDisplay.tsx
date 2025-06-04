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
import autoTable from 'jspdf-autotable';


interface ResultsDisplayProps {
  scenarioData: ScenarioData;
  inputValues: InputFormData;
}

type ProjectionView = 'yearly' | 'monthly';

// Helper function to convert SVG string to Data URL (PNG)
const svgToDataURL = (svgString: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svg);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2; // Render at 2x for better quality
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataURL);
      } else {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get canvas context for SVG conversion'));
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
};

// SVG string for the logo (white version)
const TWL_LOGO_SVG_STRING = `
  <svg viewBox="0 0 165 35" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Helvetica, Arial, sans-serif">
      <tspan font-size="15" font-weight="normal" fill="#FFFFFF">the </tspan>
      <tspan font-weight="normal" font-size="26" fill="#FFFFFF">wealth</tspan>
      <tspan font-weight="bold" font-size="26" fill="#FFFFFF">lab.</tspan>
    </text>
  </svg>
`;


const calculateRetirementAnalysis = ( // Renamed from calculateRetirementAnalysisAndInheritance
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

  // Removed projectedCapitalAt72 calculation

  return {
    targetAge: inputValues.targetAge,
    projectedCapitalAtRetirement,
    finalDesiredMonthlyIncome,
    capitalNeededForDesiredIncome,
    canMeetGoal,
    swrUsed: DEFAULT_SAFE_WITHDRAWAL_RATE,
    achievableMonthlyIncomeWithProjectedCapital,
    // projectedCapitalAt72, // REMOVED
    perpetualMonthlyWithdrawalFutureValue: perpetualMonthlyWithdrawalFutureValueSWR,
    perpetualMonthlyWithdrawalTodayValue: perpetualMonthlyWithdrawalTodayValueSWR,
    interestOnlyMonthlyWithdrawalFutureValue: interestOnlyMonthlyWithdrawalFutureValue,
    interestOnlyMonthlyWithdrawalTodayValue: interestOnlyMonthlyWithdrawalTodayValue,
  };
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ scenarioData, inputValues }) => {
  const [projectionView, setProjectionView] = useState<ProjectionView>('yearly');

  const retirementAnalysisFullResults = scenarioData.data ? calculateRetirementAnalysis(scenarioData.data, inputValues) : null;

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


  const handleExportPDF = async () => {
    try { 
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const TWL_BLUE_HEADER_FOOTER = '#1E40AF'; 
      const TWL_GOLD = '#B8860B'; 
      const TEXT_COLOR_DARK_ON_LIGHT_BG = '#334155'; 
      const TEXT_COLOR_LIGHT_ON_DARK_BG = '#FFFFFF';
      const SECTION_TITLE_COLOR = '#1D4ED8'; 
      const BACKGROUND_HIGHLIGHT = '#F3F4F6'; // For summary boxes
      const PARAMETER_BLOCK_BG = '#F8FAFC'; 
      const PARAMETER_BLOCK_BORDER = '#E2E8F0'; 

      const PAGE_MARGIN = 15;
      const CONTENT_WIDTH = doc.internal.pageSize.width - 2 * PAGE_MARGIN;
      const LOGO_HEIGHT = 10;
      const LOGO_WIDTH = (165/35) * LOGO_HEIGHT; 

      let logoDataURL = '';
      try {
          logoDataURL = await svgToDataURL(TWL_LOGO_SVG_STRING, 165, 35);
      } catch (e) {
          console.error("Error converting SVG logo to Data URL:", e);
      }
      
      let finalY = PAGE_MARGIN;

      const addHeader = (docInstance: jsPDF, pageNumber: number) => {
        docInstance.setFillColor(TWL_BLUE_HEADER_FOOTER);
        docInstance.rect(0, 0, docInstance.internal.pageSize.width, 20, 'F');
        if (logoDataURL) {
          docInstance.addImage(logoDataURL, 'PNG', PAGE_MARGIN, 5, LOGO_WIDTH, LOGO_HEIGHT);
        } else {
          docInstance.setFont("Helvetica", "bold");
          docInstance.setFontSize(14);
          docInstance.setTextColor(TEXT_COLOR_LIGHT_ON_DARK_BG);
          docInstance.text("The Wealth Lab", PAGE_MARGIN, 12);
        }
        docInstance.setFont("Helvetica", "normal");
        docInstance.setFontSize(9);
        docInstance.setTextColor(TEXT_COLOR_LIGHT_ON_DARK_BG);
        docInstance.text("Relatório de Projeção de Investimentos", docInstance.internal.pageSize.width - PAGE_MARGIN, 10, { align: 'right' });
        docInstance.setFontSize(8);
        docInstance.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, docInstance.internal.pageSize.width - PAGE_MARGIN, 15, { align: 'right' });
        finalY = 20 + 10; 
      };

      const addFooter = (docInstance: jsPDF, pageNumber: number, totalPages: number) => {
        const FOOTER_HEIGHT = 15;
        docInstance.setFillColor(TWL_BLUE_HEADER_FOOTER);
        docInstance.rect(0, docInstance.internal.pageSize.height - FOOTER_HEIGHT, docInstance.internal.pageSize.width, FOOTER_HEIGHT, 'F');
        docInstance.setFont("Helvetica", "normal");
        docInstance.setFontSize(8);
        docInstance.setTextColor(TEXT_COLOR_LIGHT_ON_DARK_BG);
        docInstance.text("Relatório gerado por The Wealth Lab – Seu Laboratório de Decisões Financeiras.", PAGE_MARGIN, docInstance.internal.pageSize.height - 8);
        docInstance.text(`Página ${pageNumber}/${totalPages}`, docInstance.internal.pageSize.width - PAGE_MARGIN, docInstance.internal.pageSize.height - 8, { align: 'right' });
      };

      const addSectionTitle = (title: string, yPos: number): number => {
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(SECTION_TITLE_COLOR);
          doc.text(title, PAGE_MARGIN, yPos);
          yPos += 6;
          doc.setDrawColor(TWL_GOLD);
          doc.setLineWidth(0.5);
          doc.line(PAGE_MARGIN, yPos, PAGE_MARGIN + CONTENT_WIDTH, yPos);
          return yPos + 5;
      };
      
      const addParagraph = (text: string, yPos: number, options: any = {}): number => {
          doc.setFont("Helvetica", options.style || "normal");
          doc.setFontSize(options.size || 10);
          doc.setTextColor(options.color || TEXT_COLOR_DARK_ON_LIGHT_BG);
          const splitText = doc.splitTextToSize(text, CONTENT_WIDTH);
          doc.text(splitText, PAGE_MARGIN, yPos);
          return yPos + (splitText.length * (options.lineHeightFactor || 5)); 
      };
      
      const addHighlightBox = (lines: {label: string, value: string, isSubHeader?: boolean}[], yPos: number, title?: string): number => {
          const boxPaddingHorizontal = 4;
          const boxPaddingVertical = 3;
          const lineHeight = 6;
          let boxHeight = (title ? lineHeight : 0) + lines.length * lineHeight + 2 * boxPaddingVertical;
          
          doc.setFillColor(BACKGROUND_HIGHLIGHT);
          doc.setDrawColor(TWL_GOLD);
          doc.setLineWidth(0.2);
          doc.rect(PAGE_MARGIN, yPos, CONTENT_WIDTH, boxHeight, 'FD'); 
          
          let currentYInBox = yPos + boxPaddingVertical;
          if (title) {
              doc.setFont("Helvetica", "bold");
              doc.setFontSize(10);
              doc.setTextColor(SECTION_TITLE_COLOR);
              doc.text(title, PAGE_MARGIN + boxPaddingHorizontal, currentYInBox + 4);
              currentYInBox += lineHeight;
          }
          lines.forEach(line => {
              doc.setFont("Helvetica", line.isSubHeader ? "bold" : "normal");
              doc.setFontSize(9);
              doc.setTextColor(TEXT_COLOR_DARK_ON_LIGHT_BG);
              doc.text(line.label, PAGE_MARGIN + boxPaddingHorizontal, currentYInBox + 4); 
              if (!line.isSubHeader) {
                doc.setFont("Helvetica", "bold"); 
                doc.setTextColor(SECTION_TITLE_COLOR);
                doc.text(line.value, PAGE_MARGIN + boxPaddingHorizontal + 70, currentYInBox + 4, {align: 'left'});
              }
              currentYInBox += lineHeight;
          });
          return yPos + boxHeight + 5; 
      };

      // --- CONTENT START ---
      finalY = addSectionTitle("Introdução", finalY);
      finalY = addParagraph("Este relatório personalizado, gerado pela plataforma The Wealth Lab, apresenta uma projeção detalhada dos seus investimentos e uma análise de aposentadoria baseada nos parâmetros que você forneceu. Nosso objetivo é oferecer clareza e insights para auxiliar em suas decisões financeiras.", finalY);
      finalY += 5;

      // --- Parâmetros da Simulação Block ---
      finalY = addSectionTitle("Parâmetros da Simulação", finalY);
      const paramBoxTopMargin = 2;
      finalY += paramBoxTopMargin; 

      const parameterLines: {key: string, value: string, highlightValue?: boolean, isSubHeader?: boolean}[] = [];
      const annualRateDecimal = inputValues.rateValue / 100;
      let monthlyEquivalentRatePercent = (Math.pow(1 + annualRateDecimal, 1 / 12) - 1) * 100;
      if (annualRateDecimal <= -1) monthlyEquivalentRatePercent = -100;
      
      parameterLines.push({ key: "Descrição da Projeção:", value: scenarioData.label });
      parameterLines.push({ key: "Valor Inicial:", value: formatCurrency(inputValues.initialInvestment) });
      let contributionText = formatCurrency(inputValues.contributionValue);
      if (inputValues.enableAdvancedSimulation && inputValues.adjustContributionsForInflation && inputValues.expectedInflationRate) {
          contributionText += ` (corrigido por inflação de ${inputValues.expectedInflationRate}% a.a.)`;
      }
      parameterLines.push({ key: "Aporte Mensal Base:", value: contributionText });
      parameterLines.push({ key: "Taxa Anual Informada:", value: `${formatNumber(inputValues.rateValue)}% a.a. (~${formatNumber(monthlyEquivalentRatePercent, 4)}% a.m.)` });
      parameterLines.push({ key: "Período do Investimento (base):", value: `${inputValues.investmentPeriodYears} ano(s)` });

      if (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && inputValues.currentAge && inputValues.targetAge) {
          parameterLines.push({ key: "Simulação de Aposentadoria Ativa:", value: "", isSubHeader: true}); // Sub-header style
          parameterLines.push({ key: "  Idade Atual:", value: `${inputValues.currentAge}, Idade Alvo Aposentadoria: ${inputValues.targetAge}` });
          parameterLines.push({ key: "  Renda Mensal Desejada (hoje):", value: formatCurrency(inputValues.desiredMonthlyIncomeToday || 0) });
          if (inputValues.adjustContributionsForInflation) {
              parameterLines.push({ key: "  Ajuste pela Inflação:", value: `Sim (Taxa: ${formatNumber(inputValues.expectedInflationRate || 0, 2)}% a.a.)` });
          } else {
              parameterLines.push({ key: "  Ajuste pela Inflação:", value: "Não" });
          }
          parameterLines.push({ key: "  Simulação estendida até 72 anos.", value: "" });
      }
      
      const paramLineHeight = 6;
      const paramBoxInternalVPadding = 4; 
      const paramBoxInternalHPadding = 4; 
      const paramBoxHeight = (parameterLines.length * paramLineHeight) + (2 * paramBoxInternalVPadding);

      doc.setFillColor(PARAMETER_BLOCK_BG);
      doc.setDrawColor(PARAMETER_BLOCK_BORDER);
      doc.setLineWidth(0.2);
      doc.rect(PAGE_MARGIN, finalY, CONTENT_WIDTH, paramBoxHeight, 'FD');

      let currentLineY = finalY + paramBoxInternalVPadding;
      parameterLines.forEach(pLine => {
          if (pLine.isSubHeader) {
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(SECTION_TITLE_COLOR);
            doc.text(pLine.key, PAGE_MARGIN + paramBoxInternalHPadding, currentLineY + 1, { align: 'left' });
          } else {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(TEXT_COLOR_DARK_ON_LIGHT_BG);
            doc.text(pLine.key, PAGE_MARGIN + paramBoxInternalHPadding, currentLineY + 1);
            
            doc.setFont("Helvetica", pLine.highlightValue ? "bold" : "normal");
            doc.setTextColor(pLine.highlightValue ? SECTION_TITLE_COLOR : TEXT_COLOR_DARK_ON_LIGHT_BG);
            doc.text(pLine.value, PAGE_MARGIN + paramBoxInternalHPadding + 70, currentLineY + 1, { align: 'left' });
          }
          currentLineY += paramLineHeight;
      });
      finalY += paramBoxHeight + 5;
      // --- End Parâmetros da Simulação Block ---


      const lastProjectionPointPdf = scenarioData.data[scenarioData.data.length - 1];
      if (lastProjectionPointPdf) {
          finalY = addSectionTitle("Resumo da Projeção Final", finalY);
          const summaryLines = [
              {label: "Total Investido (aportes):", value: formatCurrency(lastProjectionPointPdf.cumulativeContributions)},
              {label: "Total de Juros Ganhos:", value: formatCurrency(lastProjectionPointPdf.cumulativeInterest)},
              {label: "Total de Retiradas (durante simulação):", value: formatCurrency(lastProjectionPointPdf.cumulativeWithdrawals || 0)},
              {label: `Valor Final Acumulado (aos ${lastProjectionPointPdf.age !== undefined ? lastProjectionPointPdf.age + 1 : inputValues.investmentPeriodYears + (inputValues.currentAge||0)} anos):`, value: formatCurrency(lastProjectionPointPdf.finalBalance)}
          ];
          finalY = addHighlightBox(summaryLines, finalY);
      }
      

      if (retirementAnalysisFullResults) {
          finalY = addSectionTitle("Análise de Renda de Aposentadoria", finalY);
          let retirementSummaryLines = [
              {label: "Idade Alvo para Aposentadoria:", value: `${retirementAnalysisFullResults.targetAge} anos`},
              {label: "Patrimônio Projetado na Aposentadoria:", value: formatCurrency(retirementAnalysisFullResults.projectedCapitalAtRetirement)},
              {label: "Renda Mensal Desejada (corrigida):", value: formatCurrency(retirementAnalysisFullResults.finalDesiredMonthlyIncome)},
              {label: "  (Equivalente a hoje):", value: formatCurrency(inputValues.desiredMonthlyIncomeToday || 0)},
              {label: `Capital Necessário (SWR ${retirementAnalysisFullResults.swrUsed*100}%):`, value: formatCurrency(retirementAnalysisFullResults.capitalNeededForDesiredIncome)},
              {label: "Meta Atingida:", value: retirementAnalysisFullResults.canMeetGoal ? 'Sim ✅' : 'Não ❌'},
          ];
          if (!retirementAnalysisFullResults.canMeetGoal && retirementAnalysisFullResults.achievableMonthlyIncomeWithProjectedCapital !== undefined) {
              retirementSummaryLines.push({label: "Renda Máxima Atingível (SWR):", value: formatCurrency(retirementAnalysisFullResults.achievableMonthlyIncomeWithProjectedCapital)});
          }
          if (retirementAnalysisFullResults.perpetualMonthlyWithdrawalFutureValue !== undefined) {
             let valSWR = formatCurrency(retirementAnalysisFullResults.perpetualMonthlyWithdrawalFutureValue);
             if (retirementAnalysisFullResults.perpetualMonthlyWithdrawalTodayValue !== undefined) {
               valSWR += ` (eq. ${formatCurrency(retirementAnalysisFullResults.perpetualMonthlyWithdrawalTodayValue)} hoje)`;
             }
             retirementSummaryLines.push({label: `Retirada Vitalícia (SWR ${retirementAnalysisFullResults.swrUsed*100}%):`, value: valSWR});
          }
          if (retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalFutureValue !== undefined) {
             let valInterest = formatCurrency(retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalFutureValue);
             if (retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalTodayValue !== undefined) {
               valInterest += ` (eq. ${formatCurrency(retirementAnalysisFullResults.interestOnlyMonthlyWithdrawalTodayValue)} hoje)`;
             }
             retirementSummaryLines.push({label: `Retirada Vitalícia (Só Juros ${formatNumber(inputValues.rateValue, 2)}% a.a.):`, value: valInterest});
          }
          finalY = addHighlightBox(retirementSummaryLines, finalY, "Status da Aposentadoria");

          // Removed "Herança Estimada" section from PDF
      }
      
      finalY = addSectionTitle("Evolução do Patrimônio", finalY);
      finalY = addParagraph("O gráfico detalhado da evolução do seu patrimônio e aportes está disponível na versão interativa do The Wealth Lab. Acesse o aplicativo para uma visualização completa.", finalY, {style: 'italic', size: 9});
      finalY += 10;

      if (finalY > doc.internal.pageSize.height - 60) { 
        doc.addPage();
        finalY = PAGE_MARGIN; 
      }
      finalY = addSectionTitle("Detalhes da Projeção Anual", finalY);

      if (scenarioData.data && scenarioData.data.length > 0) {
        autoTable(doc, { 
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
            theme: 'grid',
            headStyles: { fillColor: TWL_BLUE_HEADER_FOOTER, textColor: TEXT_COLOR_LIGHT_ON_DARK_BG, fontStyle: 'bold', fontSize: 8, halign: 'center' }, 
            bodyStyles: { fontSize: 7, cellPadding: 1.5, textColor: TEXT_COLOR_DARK_ON_LIGHT_BG },
            alternateRowStyles: { fillColor: BACKGROUND_HIGHLIGHT },
            columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 10, halign: 'center' } },
            didDrawPage: (data: any) => { 
                addHeader(doc, data.pageNumber);
                const totalPagesNow = doc.getNumberOfPages(); 
                addFooter(doc, data.pageNumber, totalPagesNow);
                finalY = data.cursor?.y || finalY; 
                 if (data.pageNumber > 1 && data.pageNumber === doc.getNumberOfPages()) { 
                    finalY = PAGE_MARGIN + 25; 
                 } else {
                    finalY = data.cursor?.y || finalY;
                 }
            }
        });
        if ((doc as any).lastAutoTable) { 
          finalY = (doc as any).lastAutoTable.finalY + 10;
        }
      } else {
        finalY = addParagraph("Nenhum dado de projeção anual para exibir na tabela.", finalY);
      }

      if (finalY > doc.internal.pageSize.height - 50 && finalY < doc.internal.pageSize.height - 15 /* footer height approx */) { 
          // Only add page if there's still content to draw for disclaimers
      } else if (finalY > doc.internal.pageSize.height - 15) { // If already in footer area
          doc.addPage();
          finalY = PAGE_MARGIN;
      }


      finalY = addSectionTitle("Observações Importantes", finalY);
      const disclaimers = [
          "Este é um relatório de simulação e não garante rentabilidade futura.",
          "Os valores apresentados são projeções baseadas nos parâmetros informados.",
          "Aportes são considerados mensais e a taxa de juros informada é anual (convertida para mensal nos cálculos).",
           inputValues.enableAdvancedSimulation && inputValues.advancedSimModeSpecificContributions && inputValues.specificContributions && inputValues.specificContributions.length > 0 
              ? "Aportes específicos foram incluídos na simulação." : "",
          "Retiradas (se em modo aposentadoria) são mensais, baseadas na renda desejada e corrigidas pela inflação (se aplicável), até os 72 anos.", // Kept "até 72 anos" as it describes simulation behavior
          "Consulte um profissional financeiro para decisões de investimento."
      ].filter(d => d);

      disclaimers.forEach(disc => {
          if (finalY + 4 > doc.internal.pageSize.height - 20) { // Check space before drawing
              doc.addPage();
              finalY = PAGE_MARGIN;
              addHeader(doc, doc.getNumberOfPages()); 
          }
          finalY = addParagraph(disc, finalY, {size: 8, style: 'italic', lineHeightFactor: 4});
      });
      finalY += 5;
      
      if (finalY + 5 > doc.internal.pageSize.height - 20) { 
            doc.addPage();
            finalY = PAGE_MARGIN;
            addHeader(doc, doc.getNumberOfPages());
      }
      finalY = addParagraph("Acesse The Wealth Lab: https://wealthlab.com.br/", finalY, {size: 9, color: SECTION_TITLE_COLOR});

      const totalFinalPages = doc.getNumberOfPages();
      if (totalFinalPages > 0) {
        let lastPageHandledByAutoTable = false;
        if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.pageNumber) {
            lastPageHandledByAutoTable = ((doc as any).lastAutoTable.pageNumber === totalFinalPages);
        }
        
        if (!lastPageHandledByAutoTable && totalFinalPages === 1 && !(scenarioData.data && scenarioData.data.length > 0 && (doc as any).lastAutoTable)) {
             doc.setPage(1);
             if (finalY < 20 + 10) addHeader(doc, 1); 
             addFooter(doc, 1, 1);
        } else if (!lastPageHandledByAutoTable) { 
            doc.setPage(totalFinalPages);
            addFooter(doc, totalFinalPages, totalFinalPages);
        }
      }

      doc.save('TheWealthLab_Projecao.pdf');
    } catch (e: any) {
      console.error("Erro ao gerar PDF:", e);
      alert(`Ocorreu um erro ao gerar o PDF: ${e.message}. Verifique o console para mais detalhes.`);
    }
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
             { (inputValues.enableAdvancedSimulation && inputValues.advancedSimModeRetirement && mainSummaryPoint.cumulativeWithdrawals !== undefined && mainSummaryPoint.cumulativeWithdrawals > 0) && (
                <>
                 <hr className="my-3 border-slate-200 dark:border-slate-700/60" />
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Total de Retiradas (durante simulação):</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                        {formatCurrency(mainSummaryPoint.cumulativeWithdrawals)}
                    </span>
                 </div>
                </>
             )}
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
        {/* "Herança Estimada" Card REMOVED from UI */}
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