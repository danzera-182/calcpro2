
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchEconomicIndicators, FetchedEconomicIndicators, fetchLatestUsdBrlRate, fetchHistoricalSgsData, fetchHistoricalPtAXData } from '../utils/economicIndicatorsAPI';
import { UsdBrlRateInfo, IndicatorModalData, HistoricalDataPoint, AppView } from '../types';
import IndicatorCard from './ui/IndicatorCard';
import IndicatorDetailsModal from './IndicatorDetailsModal'; 
import { Card } from './ui/Card';
import Button from './ui/Button';
import { formatNumberForDisplay } from '../utils/formatters';

// Icons
const PercentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V6.375c0-.621.504-1.125 1.125-1.125h.375m16.5 0h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V6.375c0-.621.504-1.125 1.125-1.125h.375M4.5 12.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75H4.5Zm.75 0a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75H5.25Zm-.75 0a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75H4.5Z" />
  </svg>
);
const InflationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
</svg>
);
const DollarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.219 12.768 11 12 11c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
</svg>
);

const GoldBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( 
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const BanknotesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m3-3.75l-3.75-3.75M14.25 15l-3.75-3.75M3.75 7.5h16.5v9.75A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
  </svg>
);


const GridIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);
const ListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const CommandLineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5 9 9.75l-2.25 2.25M10.5 13.5h6.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.276V3.75A1.753 1.753 0 0 1 4.753 2h14.494A1.753 1.753 0 0 1 21 3.75v16.5A1.753 1.753 0 0 1 19.247 22H4.753A1.753 1.753 0 0 1 3 20.25V17.724" />
  </svg>
);

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);


const getValidatedAndPotentiallyCorrectedPercentage = (
  value: number | undefined | null,
  indicatorNameForLog: string,
  isPibOrPrimarySurplus: boolean // Kept for consistency, might not be needed if primary surplus is removed
): number | undefined | null => {
  if (value === undefined || value === null) {
    return value; 
  }

  let potentiallyCorrectedValue = value;
  // Heuristic for extremely large values that might indicate a scale error (e.g. value in millions instead of unit for % of PIB)
  const HEURISTIC_LARGE_PERCENTAGE_THRESHOLD = 10000; 
  const HEURISTIC_DIVISION_FACTOR = 1000000; // Example, adjust based on observed anomalies

  // Apply correction only if it's a PIB-related percentage AND looks suspiciously large
  if (isPibOrPrimarySurplus && typeof value === 'number' && Math.abs(value) > HEURISTIC_LARGE_PERCENTAGE_THRESHOLD) {
    console.warn(`[Data Correction Heuristic] Anomalously large percentage ${value} for ${indicatorNameForLog}. Assuming error and dividing by ${HEURISTIC_DIVISION_FACTOR}.`);
    potentiallyCorrectedValue = value / HEURISTIC_DIVISION_FACTOR;
  }

  // General anomaly check after potential correction
  const STANDARD_ANOMALY_THRESHOLD = 1000; // A debt-to-GDP of 1000% is highly anomalous
  if (typeof potentiallyCorrectedValue === 'number' && Math.abs(potentiallyCorrectedValue) > STANDARD_ANOMALY_THRESHOLD) {
    console.warn(`[Data Validation] Anomalous percentage value for ${indicatorNameForLog} after potential correction: ${potentiallyCorrectedValue}. Displaying as 'N/D'.`);
    return undefined; // Mark as Not Available due to anomaly
  }
  return potentiallyCorrectedValue;
};

interface MacroEconomicPanelProps {
  setActiveView: (view: AppView) => void;
}

const MacroEconomicPanel: React.FC<MacroEconomicPanelProps> = ({ setActiveView }) => {
  const [ecoData, setEcoData] = useState<FetchedEconomicIndicators | null>(null);
  const [usdRateInfo, setUsdRateInfo] = useState<UsdBrlRateInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [selectedIndicatorForModal, setSelectedIndicatorForModal] = useState<IndicatorModalData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      setLastUpdated(null);
      try {
        const [fetchedEcoData, fetchedUsdRate] = await Promise.all([
          fetchEconomicIndicators(),
          fetchLatestUsdBrlRate(),
        ]);
        setEcoData(fetchedEcoData);
        setUsdRateInfo(fetchedUsdRate);
        if (fetchedEcoData?.lastUpdated) setLastUpdated(fetchedEcoData.lastUpdated);
        
         let errorsCombined: string[] = [];
        if(fetchedEcoData?.errors && fetchedEcoData.errors.length > 0) {
            const errorKeyMap: { [key: string]: string } = {
              "Reservas Internacionais - Ouro": "Ouro (Reservas)",
              "Dívida Líquida Setor Público (% PIB)": "Dív. Líquida (% PIB)",
              "Dívida Bruta Gov. Geral": "Dív. Bruta Gov. Ger.",
              "M2 (Base Monetária)": "M2",
            };
            errorsCombined = [...errorsCombined, ...fetchedEcoData.errors.map(e => errorKeyMap[e] || `${e}`)];
        }
        if(!fetchedUsdRate && (!fetchedEcoData?.errors || !fetchedEcoData.errors.find(e => e.toLowerCase().includes("dólar")))) { // Check if Dolar not in error list
            errorsCombined.push("Dólar PTAX");
        }


        if (errorsCombined.length > 0) {
           const totalIndicators = 13; // Adjusted for M2
           if (errorsCombined.length >= totalIndicators - 2) { 
             setError("Falha ao buscar a maioria dos indicadores. Verifique sua conexão com a internet, desative bloqueadores de anúncio ou tente novamente mais tarde.");
           } else {
             setError(`Falha ao buscar: ${errorsCombined.join(', ')}. Verifique sua conexão ou tente novamente.`);
           }
        }

      } catch (e) {
        console.error("Error loading macroeconomic data:", e);
        setError("Erro geral ao carregar dados. Verifique sua conexão ou tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOpenModal = (indicator: IndicatorModalData) => {
    setSelectedIndicatorForModal(indicator);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIndicatorForModal(null);
  };

  const fetchHistoricalDataForModal = useCallback(async (
    identifier: string | number, 
    startDate: string, 
    endDate: string,   
    seriesType?: IndicatorModalData['seriesType']
  ): Promise<HistoricalDataPoint[] | null> => {
    try {
      let rawData: Array<{ data?: string; valor?: string; cotacaoVenda?: number; dataHoraCotacao?: string }> = [];
      if (seriesType === 'PTAX') {
        rawData = await fetchHistoricalPtAXData(startDate, endDate);
      } else {
        // For other SGS codes, including those potentially needing specific calculations (not yet implemented here but structure allows)
        rawData = await fetchHistoricalSgsData(identifier, startDate, endDate);
      }

      if (!rawData || rawData.length === 0) return [];

      return rawData.map(item => {
        let dateStr: string;
        let value: number;

        if (seriesType === 'PTAX' && item.dataHoraCotacao && item.cotacaoVenda !== undefined) {
          dateStr = new Date(item.dataHoraCotacao).toISOString().split('T')[0]; 
          value = item.cotacaoVenda;
        } else if (item.data && item.valor !== undefined) {
          const parts = item.data.split('/'); 
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; 
          value = parseFloat(item.valor.replace(',', '.'));
        } else {
          throw new Error("Formato de dado histórico inesperado");
        }
        return { date: dateStr, value };
      }).filter(item => !isNaN(item.value)); 

    } catch (error: any) {
      console.error(`Error fetching historical data for ${identifier}:`, error);
      throw error; 
    }
  }, []);


  const formatReferenceDate = (refDate?: string, type: 'dayMonthYear' | 'monthYear' = 'dayMonthYear'): string | undefined => {
    if (!refDate) return undefined;
    if (type === 'monthYear' && refDate.length === 7 && refDate.includes('/')) { 
        return `Ref: ${refDate}`;
    }
    if (type === 'dayMonthYear' && refDate.length === 10 && refDate.split('/').length === 3) { 
        return `Ref: ${refDate}`;
    }
    if (refDate.length === 7 && refDate.includes('/')) { // Fallback for MM/YYYY if not explicitly specified
        return `Ref: ${refDate}`;
    }
    return `Ref: ${refDate}`;
  };
  
  const formatIpcaReference = (sourceType?: 'projection' | 'accumulated12m', refDate?: string): string | undefined => {
    if (!sourceType || !refDate) return undefined;
    return sourceType === 'projection' ? `Projeção Focus para ${refDate}` : `Acumulado 12m até ${refDate}`;
  };

  const formatGdpReference = (refDate?: string): string | undefined => {
    if (!refDate) return undefined;
    return `Projeção Focus para ${refDate}`;
  };
  
  const formatDollarDateTime = (isoDateTimeString?: string): string | undefined => {
    if (!isoDateTimeString) return undefined;
    try {
      const date = new Date(isoDateTimeString);
      return isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    } catch (e) { return undefined; }
  };

  const indicatorCardDataList: IndicatorModalData[] = useMemo(() => {
    const dlspSgsRefDate = ecoData?.netPublicDebtToGdpSGS4513ReferenceDate;
    let dlspBaseReferenceText = formatReferenceDate(dlspSgsRefDate, 'monthYear');
    let finalDlspReferenceText = dlspBaseReferenceText;

    if (dlspSgsRefDate) {
      const [refMonthStr, refYearStr] = dlspSgsRefDate.split('/');
      const refMonth = parseInt(refMonthStr, 10);
      const refYear = parseInt(refYearStr, 10);

      if (!isNaN(refMonth) && !isNaN(refYear)) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; 
        const currentYear = now.getFullYear();
        
        const refTotalMonths = refYear * 12 + refMonth;
        const currentTotalMonths = currentYear * 12 + currentMonth;

        if (currentTotalMonths - refTotalMonths > 2) { 
          const staleWarning = "⚠️ Dado Antigo (Potencialmente Desatualizado)";
          finalDlspReferenceText = dlspBaseReferenceText ? `${dlspBaseReferenceText} ${staleWarning}` : staleWarning;
        }
      }
    }

    return [
      {
        title: "Taxa Selic (Meta)", sgsCode: 432, 
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.selicRate, "Taxa Selic (Meta)", false), 
        valueSuffix: "% a.a.", valuePrecision: 2,
        referenceText: formatReferenceDate(ecoData?.selicReferenceDate), sourceText: "BCB-SGS 432",
        description: "A Taxa Selic Meta é o principal instrumento de política monetária do Banco Central do Brasil (BCB) para controlar a inflação. Definida pelo Comitê de Política Monetária (Copom), influencia todas as taxas de juros do país.",
        isPercentage: true, historicalSeriesName: "Selic Meta (% a.a.)", historicalYAxisLabel: "% a.a."
      },
      {
        title: "Taxa CDI", 
        sgsCode: 4391, 
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.cdiRate, "Taxa CDI", false), 
        valueSuffix: "% a.a.", valuePrecision: 2,
        referenceText: ecoData?.cdiReferenceDate ? `${formatReferenceDate(ecoData.cdiReferenceDate)} (anualizada com base no SGS 12)` : undefined, 
        sourceText: "BCB-SGS 12/4391",
        description: "A Taxa DI (Depósito Interfinanceiro), ou CDI, reflete o custo do dinheiro entre bancos. É a principal referência para rentabilidade de investimentos de renda fixa pós-fixados. O valor atual exibido é anualizado com base na taxa diária (SGS 12). O gráfico histórico exibe a taxa média mensal (SGS 4391).",
        isPercentage: true, 
        historicalSeriesName: "CDI (Taxa Média Mensal %)", 
        historicalYAxisLabel: "% a.m.", 
        isDailyData: false 
      },
      {
        title: "IPCA (Inflação)", 
        sgsCode: 433, 
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.ipcaRate, "IPCA (Inflação)", false), 
        valueSuffix: ecoData?.ipcaSourceType === 'accumulated12m' ? "%" : "% a.a.", // Suffix changes based on source
        valuePrecision: 2,
        referenceText: formatIpcaReference(ecoData?.ipcaSourceType, ecoData?.ipcaReferenceDate),
        sourceText: ecoData?.ipcaSourceType === 'projection' ? "BCB-Focus/SGS 433" : "BCB-SGS 13522/433",
        description: "O Índice Nacional de Preços ao Consumidor Amplo (IPCA) é o índice oficial de inflação do Brasil, medido pelo IBGE. O valor atual pode ser uma projeção anual (Focus) ou o acumulado em 12 meses (SGS 13522). Os gráficos históricos exibem a variação mensal (SGS 433) e o acumulado em 12 meses (SGS 13522).",
        isPercentage: true, 
        historicalSeriesName: "IPCA (Variação Mensal %)", 
        historicalYAxisLabel: "Variação %"
      },
      {
        title: "IGP-M (Inflação)", 
        sgsCode: 189, 
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.igpmRate, "IGP-M (Inflação)", false), 
        valueSuffix: "%", // Is accumulated 12m
        valuePrecision: 2, 
        referenceText: ecoData?.igpmReferenceDate ? `Acum. 12m (calc. SGS 189) até ${ecoData.igpmReferenceDate}` : 'Acum. 12m (calc. SGS 189)', 
        sourceText: "BCB-SGS 189 (FGV)", 
        description: "O Índice Geral de Preços – Mercado (IGP-M), calculado pela FGV, é um indicador amplo de inflação, usado frequentemente para reajuste de aluguéis e tarifas. O valor atual exibido é o acumulado nos últimos 12 meses, calculado a partir das variações mensais (SGS 189). O gráfico histórico exibe a variação mensal (SGS 189).",
        isPercentage: true, historicalSeriesName: "IGP-M (Variação Mensal %)", historicalYAxisLabel: "Variação %" 
      },
       {
        title: "Dólar PTAX (Venda)", sgsCode: 'PTAX', currentValue: usdRateInfo?.rate, 
        valueSuffix: "", // Handled by displayPrefix/SuffixOverride
        valuePrecision: 4,
        displayPrefix: "R$ ",
        displaySuffixOverride: "",
        referenceText: usdRateInfo?.dateTime ? `Ref: ${formatDollarDateTime(usdRateInfo.dateTime)}` : undefined, sourceText: "BCB-PTAX",
        description: "A PTAX é uma taxa de câmbio de referência para o dólar americano, calculada pelo Banco Central com base nas negociações do dia. O valor de venda é usado para transações de saída de dólares do país.",
        isUSD: true, seriesType: 'PTAX', historicalSeriesName: "Dólar PTAX (Venda R$)", historicalYAxisLabel: "R$", isDailyData: true,
      },
      {
        title: "M2 (Base Monetária)", sgsCode: 27842, 
        currentValue: ecoData?.m2BalanceSGS27842, // Value in "Milhares de R$"
        valuePrecision: 1, // For "6,5 tri R$"
        displayDivisor: 1000000000, // Milhares to Trilhões
        displayPrefix: "R$ ",
        displaySuffixOverride: " tri",
        referenceText: formatReferenceDate(ecoData?.m2BalanceSGS27842ReferenceDate, 'monthYear'), 
        sourceText: "BCB-SGS 27842",
        description: "M2 é uma medida da oferta de moeda que inclui M1 (papel moeda em poder do público e depósitos à vista) mais depósitos de poupança, depósitos a prazo e títulos públicos federais. Indica a liquidez na economia. Valor em milhares de reais (histórico) e trilhões de reais (card).",
        isPercentage: false, 
        historicalSeriesName: "M2 (Milhares R$)", 
        historicalYAxisLabel: "Milhares R$"
      },
      {
        title: "Taxa Referencial (TR)", sgsCode: 226, 
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.trRate, "Taxa Referencial (TR)", false), 
        valueSuffix: "% a.m.", valuePrecision: 4,
        referenceText: formatReferenceDate(ecoData?.trReferenceDate), sourceText: "BCB-SGS 226",
        description: "A Taxa Referencial (TR) é um índice utilizado na correção de algumas aplicações financeiras, como a Poupança e o FGTS, e em alguns financiamentos imobiliários.",
        isPercentage: true, historicalSeriesName: "TR (% a.m.)", historicalYAxisLabel: "% a.m."
      },
      {
        title: "Dívida Líquida Setor Público (% PIB)", sgsCode: 4513, 
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.netPublicDebtToGdpSGS4513, "Dívida Líquida Setor Público (% PIB)", true), 
        valueSuffix: "% do PIB", 
        isBillions: false, isUSD: false, isPercentage: true, valuePrecision: 2,
        referenceText: finalDlspReferenceText, 
        sourceText: "BCB-SGS 4513",
        description: "Dívida líquida do setor público consolidado (federal, estadual e municipal) como percentual do Produto Interno Bruto (PIB). Valores observados.",
        historicalSeriesName: "DLSP (% PIB)", historicalYAxisLabel: "% PIB"
      },
      {
        title: "Dívida Bruta Gov. Geral (% PIB)", sgsCode: 13762,
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.grossGeneralGovernmentDebtToGdp, "Dívida Bruta Gov. Geral (% PIB)", true),
        valueSuffix: "% do PIB", valuePrecision: 2,
        referenceText: formatReferenceDate(ecoData?.grossGeneralGovernmentDebtToGdpReferenceDate, 'monthYear'),
        sourceText: "BCB-SGS 13762",
        description: "Dívida bruta do governo geral, que engloba governo federal, INSS, governos estaduais e municipais, como percentual do Produto Interno Bruto (PIB). Metodologia utilizada a partir de 2008.",
        isPercentage: true, historicalSeriesName: "Dívida Bruta Gov. Geral (% PIB)", historicalYAxisLabel: "% PIB"
      },
      {
        title: "IBC-Br (Atividade Econ.)", sgsCode: 24364, 
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.ibcBrRate, "IBC-Br (Atividade Econ.)", false), 
        valueSuffix: "%", // Is accumulated 12m
        valuePrecision: 2,
        referenceText: `Acum. 12m até ${ecoData?.ibcBrReferenceDate || 'N/D'}`, sourceText: "BCB-SGS 24364",
        description: "O Índice de Atividade Econômica do Banco Central (IBC-Br) com ajuste sazonal (SGS 24364) é considerado uma 'prévia' do PIB. O valor exibido no card é a variação acumulada nos últimos 12 meses, calculada a partir do índice. O gráfico histórico mostra a evolução do próprio índice (Base: 2002=100).",
        isPercentage: true, 
        historicalSeriesName: "IBC-Br (Índice Dessazonalizado)", historicalYAxisLabel: "Índice (Base: 2002=100)"
      },
      {
        title: "Reservas Internacionais", sgsCode: 13621, 
        currentValue: ecoData?.internationalReserves, // Value in Millions USD
        valuePrecision: 2,
        displayDivisor: 1000, // Millions to Billions
        displaySuffixOverride: " bi USD",
        referenceText: formatReferenceDate(ecoData?.internationalReservesReferenceDate), sourceText: "BCB-SGS 13621",
        description: "As Reservas Internacionais são os ativos em moeda estrangeira (como dólar, euro, ouro) que o Brasil possui. Servem como seguro contra crises cambiais e para intervenções no mercado de câmbio. Valor em milhões de USD (histórico) e bilhões de USD (card).",
        isUSD: true, isBillions: true, // For chart modal tooltip and y-axis formatting, data is in millions
        historicalSeriesName: "Reservas (Milhões USD)", historicalYAxisLabel: "Milhões USD", isDailyData: true,
      },
      {
        title: "Reservas Internacionais - Ouro", 
        sgsCode: 3552, 
        currentValue: ecoData?.goldReservesSGS3552MillionsUSD, // Value in Millions USD
        valuePrecision: 2, 
        displayDivisor: 1000, // Millions to Billions
        displaySuffixOverride: " bi USD",
        referenceText: formatReferenceDate(ecoData?.goldReservesSGS3552MillionsUSDReferenceDate, 'monthYear'), 
        sourceText: "BCB-SGS 3552",
        description: "Parcela das reservas internacionais composta por ouro, incluindo depósitos de ouro. Valor em milhões de dólares americanos (histórico) e bilhões de USD (card).",
        isUSD: true, isBillions: true, // For chart modal tooltip and y-axis formatting, data is in millions
        historicalSeriesName: "Ouro (Reservas Milhões USD)", 
        historicalYAxisLabel: "Milhões USD"
      },
      {
        title: "PIB", 
        sgsCode: 'FOCUS_ONLY', // Special identifier, no direct SGS for historical line chart in same way
        currentValue: getValidatedAndPotentiallyCorrectedPercentage(ecoData?.gdpProjection, "PIB", true), 
        valueSuffix: "%", // Is % variation
        valuePrecision: 2,
        referenceText: formatGdpReference(ecoData?.gdpProjectionReferenceDate), 
        sourceText: "BCB-Focus (Projeção)", 
        description: "Projeção do Produto Interno Bruto (PIB) com base nas expectativas de mercado (Focus - BCB). Sua variação percentual indica o crescimento (ou retração) esperado da economia.",
        isPercentage: true, 
        historicalSeriesName: undefined, 
        historicalYAxisLabel: undefined  
      },
    ];
  }, [ecoData, usdRateInfo]);


  if (isLoading && !ecoData && !usdRateInfo) { 
    return (
      <Card><Card.Content className="py-20 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-lg">Carregando painel...</p>
          </div></Card.Content></Card>
    );
  }
  
  const icons: { [key: string]: React.ReactNode } = {
    "Taxa Selic (Meta)": <PercentIcon />, "Taxa CDI": <PercentIcon />,
    "IPCA (Inflação)": <InflationIcon />, "IGP-M (Inflação)": <InflationIcon />,
    "Dólar PTAX (Venda)": <DollarIcon />, 
    "M2 (Base Monetária)": <BanknotesIcon />,
    "Taxa Referencial (TR)": <PercentIcon />,
    "Dívida Líquida Setor Público (% PIB)": <PercentIcon />, 
    "Dívida Bruta Gov. Geral (% PIB)": <PercentIcon />,
    "IBC-Br (Atividade Econ.)": <InflationIcon />, "Reservas Internacionais": <DollarIcon />,
    "Reservas Internacionais - Ouro": <GoldBarIcon />, 
    "PIB": <InflationIcon />,
  };

  const getCardSpecificError = (indicator: IndicatorModalData): string | null => {
    let cardError: string | null = null;
    // 1. General fetch error check
    if (ecoData?.errors?.includes(indicator.title) || (indicator.title === "M2 (Base Monetária)" && ecoData?.errors?.includes("M2"))) {
        cardError = "Erro ao buscar";
    }


    // 2. Dólar PTAX specific (if not covered by general error and USD rate is missing)
    if (!cardError && indicator.title === "Dólar PTAX (Venda)" && !usdRateInfo && !isLoading) {
        const ptaxErrorInGeneralList = ecoData?.errors?.some(e => e.toLowerCase().includes("dólar"));
        if (!ptaxErrorInGeneralList) {
          cardError = "Cotação Indisponível";
        }
    }

    // 3. PIB specific (if projection is null/undefined and no general fetch error for PIB)
    if (!cardError && indicator.title === "PIB" && (ecoData?.gdpProjection === null || ecoData?.gdpProjection === undefined) && !isLoading && indicator.sgsCode === 'FOCUS_ONLY') {
        cardError = "Projeção Indisponível";
    }
    return cardError;
  };


  const renderListView = () => (
    <div className="space-y-3">
      {/* Terminal Card - Special Item */}
      <Card
        className="cursor-pointer hover:shadow-xl transition-shadow duration-200 ease-in-out transform hover:-translate-y-0.5 bg-slate-700 dark:bg-slate-800 text-white dark:text-blue-300"
        onClick={() => setActiveView('macroEconomicTerminal')}
        aria-label="Acessar Terminal Financeiro Interativo"
      >
        <Card.Header className="border-b-slate-600 dark:border-b-slate-500/50 !pb-3 !pt-3">
          <div className="flex items-center space-x-3">
            <CommandLineIcon className="w-6 h-6 text-green-400 dark:text-green-300" />
            <Card.Title className="text-md text-white dark:text-blue-300">Terminal Financeiro Interativo</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="!pt-2 !pb-3">
          <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300 dark:text-slate-400 mb-2 flex-grow">
                Compare indicadores macroeconômicos em gráficos interativos e analise tendências históricas.
              </p>
              <span 
                className="ml-2 inline-flex items-center bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                aria-label="Ferramenta em fase de testes"
                title="Esta ferramenta está em fase de testes. Alguns recursos podem não funcionar como esperado."
              >
                <WarningIcon className="w-3 h-3 mr-1.5 text-yellow-300 dark:text-yellow-200" />
                EM TESTES
              </span>
          </div>
          <Button variant="secondary" size="sm" className="w-full !bg-green-500 hover:!bg-green-600 !text-white !text-xs mt-1" tabIndex={-1}>
            Acessar Terminal &rarr;
          </Button>
        </Card.Content>
      </Card>

      {indicatorCardDataList.map((indicator, index) => {
        const cardSpecificError = getCardSpecificError(indicator);
        let displayValueStr: string;
        
        let finalPrefix = indicator.displayPrefix || '';
        let finalSuffix = indicator.displaySuffixOverride !== undefined ? indicator.displaySuffixOverride : (indicator.valueSuffix || '');


        if (isLoading && indicator.currentValue === undefined) {
          displayValueStr = 'Carregando...';
          finalPrefix = ''; finalSuffix = '';
        } else if (cardSpecificError) {
          displayValueStr = cardSpecificError;
          finalPrefix = ''; finalSuffix = '';
        } else if (indicator.currentValue === null || indicator.currentValue === undefined || (typeof indicator.currentValue === 'string' && indicator.currentValue.trim() === '')) {
          displayValueStr = 'N/D';
           finalPrefix = ''; finalSuffix = '';
        } else {
          let numToFormat = typeof indicator.currentValue === 'number' ? indicator.currentValue : parseFloat(String(indicator.currentValue).replace(',', '.'));
          if (!isNaN(numToFormat)) {
              if (indicator.displayDivisor && indicator.displayDivisor !== 0) {
                  numToFormat /= indicator.displayDivisor;
              }
              displayValueStr = formatNumberForDisplay(numToFormat, { 
                  minimumFractionDigits: indicator.valuePrecision ?? 2, 
                  maximumFractionDigits: indicator.valuePrecision ?? 2 // Use same for max unless specifically needed
              });
          } else {
              displayValueStr = String(indicator.currentValue);
              finalPrefix = ''; finalSuffix = '';
          }
        }

        return (
          <div
            key={indicator.title || index}
            className="p-4 bg-white dark:bg-slate-800/80 shadow-md hover:shadow-lg rounded-lg transition-shadow duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => handleOpenModal(indicator)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenModal(indicator); }}
            aria-label={`Ver detalhes sobre ${indicator.title}`}
          >
            <div className="flex-grow mb-2 sm:mb-0">
              <h3 className="text-md font-semibold text-gray-800 dark:text-blue-300">{indicator.title}</h3>
              <p className={`text-xl font-bold ${cardSpecificError ? (cardSpecificError === "Erro ao buscar" ? 'text-red-500 dark:text-red-400' : 'text-orange-500 dark:text-orange-400') : 'text-gray-900 dark:text-white'}`}>
                {finalPrefix}{displayValueStr}{finalSuffix}
              </p>
              {indicator.referenceText && !isLoading && !cardSpecificError && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" dangerouslySetInnerHTML={{ __html: indicator.referenceText.replace("⚠️", "<span class='text-orange-500 dark:text-orange-400'>⚠️</span>") }}></p>
              )}
              {indicator.sourceText && !isLoading && !cardSpecificError && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fonte: {indicator.sourceText}</p>
              )}
               {isLoading && indicator.currentValue === undefined && (
                 <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Atualizando...</p>
               )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleOpenModal(indicator); }}
              className="mt-2 sm:mt-0 sm:ml-4 self-start sm:self-center whitespace-nowrap text-xs"
              aria-hidden="true" 
              tabIndex={-1} 
            >
              Ver detalhes
            </Button>
          </div>
        );
      })}
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {/* Terminal Card - Special Item */}
      <Card
        className="cursor-pointer hover:shadow-2xl transition-shadow duration-200 ease-in-out transform hover:-translate-y-1 bg-slate-700 dark:bg-slate-800 text-white dark:text-blue-300 sm:col-span-1 lg:col-span-1"
        onClick={() => setActiveView('macroEconomicTerminal')}
        aria-label="Acessar Terminal Financeiro Interativo"
      >
        <Card.Header className="border-b-slate-600 dark:border-b-slate-500/50 !pb-3 !pt-4">
          <div className="flex items-center space-x-3">
            <CommandLineIcon className="w-7 h-7 text-green-400 dark:text-green-300" />
            <Card.Title className="text-md text-white dark:text-blue-300">Terminal Financeiro</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="!pt-2 !pb-4 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between">
            <p className="text-xs text-slate-300 dark:text-slate-400 mb-3 flex-grow">
              Compare indicadores em gráficos interativos e analise tendências.
            </p>
             <span 
              className="ml-2 inline-flex items-center bg-gray-400 dark:bg-gray-500 text-white dark:text-gray-100 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              aria-label="Ferramenta em fase de testes"
              title="Esta ferramenta está em fase de testes. Alguns recursos podem não funcionar como esperado."
            >
              <WarningIcon className="w-3 h-3 mr-1 text-yellow-300 dark:text-yellow-200" />
              EM TESTES
            </span>
          </div>
          <Button variant="secondary" size="sm" className="w-full !bg-green-500 hover:!bg-green-600 !text-white !text-xs mt-auto" tabIndex={-1}>
            Acessar Terminal &rarr;
          </Button>
        </Card.Content>
      </Card>
      
      {indicatorCardDataList.map((indicator, index) => {
        const cardSpecificError = getCardSpecificError(indicator);
        return (
          <IndicatorCard 
            key={indicator.title || index} 
            indicatorData={indicator}
            icon={icons[indicator.title] || <PercentIcon/>} 
            isLoading={isLoading && indicator.currentValue === undefined} 
            error={cardSpecificError}
            onDetailsClick={handleOpenModal}
          />
        );
      })}
    </div>
  );


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-blue-300">Painel Macroeconômico</h2>
        <div className="flex items-center space-x-2">
          {lastUpdated && !isLoading && (
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">Última atualização: {lastUpdated}</p>
          )}
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-label="Visualizar em grade"
            title="Visualizar em grade"
            className="p-2"
          >
            <GridIcon className="w-5 h-5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label="Visualizar em lista"
            title="Visualizar em lista"
            className="p-2"
          >
            <ListIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
       {lastUpdated && !isLoading && (
          <p className="text-xs text-gray-500 dark:text-gray-400 block md:hidden text-center sm:text-left">Última atualização: {lastUpdated}</p>
        )}


      {error && !isLoading && (
         <Card className="border-l-4 border-red-500 dark:border-red-400"><Card.Content>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p></Card.Content></Card>
      )}

      {viewMode === 'grid' ? renderGridView() : renderListView()}
      
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
        Clique nos cards/itens para mais detalhes. Dados das APIs do BCB, podem ter defasagens. Consulte fontes oficiais. Fins ilustrativos.
      </p>
      {isModalOpen && selectedIndicatorForModal && (
        <IndicatorDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          indicator={selectedIndicatorForModal}
          onFetchHistoricalData={fetchHistoricalDataForModal}
        />
      )}
    </div>
  );
};

export default MacroEconomicPanel;
