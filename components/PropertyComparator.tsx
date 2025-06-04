
import React, { useState, useCallback } from 'react';
import { Card } from './ui/Card';
import Button from './ui/Button';
import FormattedNumericInput from './ui/FormattedNumericInput';
import InfoTooltip from './ui/InfoTooltip';
import { PropertyComparatorInputs, PropertyComparisonResults, PropertyScenarioOutput } from '../types';
import { calculatePropertyComparison } from '../utils/propertyCalculations';
import { formatCurrency } from '../utils/formatters';
import PropertyCalculationDetailModal from './PropertyCalculationDetailModal';

const DEFAULT_PROPERTY_COMPARATOR_INPUTS: PropertyComparatorInputs = {
  propertyValue: 300000,
  downPayment: 60000, // 20%
  financingCosts: 15000, // 5% of property value for ITBI, etc.
  financingTermMonths: 360, // 30 years
  annualInterestRatePercent: 7.0,
  monthlyRent: 1500, // 0.5% of property value
  annualRentIncreasePercent: 5.0, // IGPM example
  annualPropertyAppreciationPercent: 4.0,
  annualInvestmentReturnPercent: 8.0,
  additionalMonthlyInvestmentIfBuying: 0,
};

interface ResultsCardProps {
  result: PropertyScenarioOutput;
  scenarioType: 'buyOnly' | 'buyAndInvest' | 'rentAndInvest';
  isBest?: boolean;
}

// Icon Components
const BuildingOfficeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 12h6m-6 5.25h6M5.25 6.75h.008v.008H5.25V6.75zm0 5.25h.008v.008H5.25v-.008zm0 5.25h.008v.008H5.25v-.008zm13.5-5.25h.008v.008h-.008v-.008zm0 5.25h.008v.008h-.008v-.008zm0-10.5h.008v.008h-.008V6.75z" />
  </svg>
);

const ScaleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52M6.25 4.97A48.417 48.417 0 0112 4.5c2.291 0 4.545.16 6.75.47m-13.5 0C1.633 5.377 1.5 5.721 1.5 6.125v7.5c0 .404.133.748.375 1.025m18.75-8.55C22.367 5.377 22.5 5.721 22.5 6.125v7.5c0 .404-.133.748-.375 1.025M1.5 15h21M1.5 9h21" />
  </svg>
);


const ResultsCard: React.FC<ResultsCardProps> = ({ result, scenarioType, isBest }) => {
  const baseColorConfig = {
    buyOnly: {
      border: "border-blue-500 dark:border-blue-400",
      headerBg: "bg-blue-50 dark:bg-blue-900/30",
      titleText: "text-blue-700 dark:text-blue-300",
    },
    buyAndInvest: {
      border: "border-indigo-500 dark:border-indigo-400",
      headerBg: "bg-indigo-50 dark:bg-indigo-900/30",
      titleText: "text-indigo-700 dark:text-indigo-300",
    },
    rentAndInvest: {
      border: "border-amber-500 dark:border-amber-400",
      headerBg: "bg-amber-50 dark:bg-amber-900/30",
      titleText: "text-amber-700 dark:text-amber-300",
    },
  };

  const bestOptionColorConfig = {
    border: "border-green-500 dark:border-green-400",
    headerBg: "bg-green-50 dark:bg-green-900/30",
    titleText: "text-green-700 dark:text-green-300",
  };

  const currentColors = isBest ? bestOptionColorConfig : baseColorConfig[scenarioType];

  return (
    <Card className={`flex-1 min-w-[280px] border-2 ${currentColors.border} ${isBest ? 'shadow-xl' : 'shadow-lg'}`}>
      <Card.Header className={`${currentColors.headerBg} flex flex-col items-center`}>
        <Card.Title className={`text-center ${currentColors.titleText}`}>
          {result.scenarioName}
        </Card.Title>
        {isBest && (
            <span className="mt-1.5 inline-block bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md">
              Melhor Opção
            </span>
        )}
      </Card.Header>
      <Card.Content className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span>Patrimônio Total Final:</span>
          <span className="font-bold">{formatCurrency(result.totalPatrimony)}</span>
        </div>
        {result.propertyValueEndOfPeriod !== undefined && (
          <div className="flex justify-between">
            <span>Valor do Imóvel (Final):</span>
            <span>{formatCurrency(result.propertyValueEndOfPeriod)}</span>
          </div>
        )}
        {result.investmentsValueEndOfPeriod !== undefined && (
          <div className="flex justify-between">
            <span>Saldo Investimentos (Final):</span>
            <span>{formatCurrency(result.investmentsValueEndOfPeriod)}</span>
          </div>
        )}
        {result.totalFinancingPaid !== undefined && (
          <div className="flex justify-between">
            <span>Total Pago (Financiamento):</span>
            <span>{formatCurrency(result.totalFinancingPaid)}</span>
          </div>
        )}
         {result.totalInitialCashOutlay !== undefined && (
          <div className="flex justify-between">
            <span>Desembolso Inicial Total:</span>
            <span>{formatCurrency(result.totalInitialCashOutlay)}</span>
          </div>
        )}
        {result.totalAdditionalInvestedPrincipal !== undefined && result.totalAdditionalInvestedPrincipal > 0 && (
          <div className="flex justify-between">
            <span>Total Aportado (Invest. Paralelo):</span>
            <span>{formatCurrency(result.totalAdditionalInvestedPrincipal)}</span>
          </div>
        )}
        {result.totalRentPaid !== undefined && (
          <div className="flex justify-between">
            <span>Total Pago (Aluguel):</span>
            <span>{formatCurrency(result.totalRentPaid)}</span>
          </div>
        )}
        {result.details && result.details.length > 0 && (
          <ul className="list-disc list-inside text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
            {result.details.map((detail, index) => <li key={index}>{detail}</li>)}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
};


const PropertyComparator: React.FC = () => {
  const [inputs, setInputs] = useState<PropertyComparatorInputs>(DEFAULT_PROPERTY_COMPARATOR_INPUTS);
  const [results, setResults] = useState<PropertyComparisonResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const handleInputChange = useCallback((name: keyof PropertyComparatorInputs, value: number | null) => {
    setInputs(prev => ({ ...prev, [name]: value }));
    setResults(null); 
  }, []);
  
  const handleFormattedInputChange = (name: string, value: number | null) => {
    handleInputChange(name as keyof PropertyComparatorInputs, value);
  };


  const handleCalculate = useCallback(() => {
    setIsLoading(true);
    setResults(null);
    
    setTimeout(() => {
      try {
        const comparisonResults = calculatePropertyComparison(inputs);
        setResults(comparisonResults);
      } catch (error) {
        console.error("Error during property comparison calculation:", error);
        setResults({
            buyOnly: { scenarioName: "Erro", totalPatrimony: 0, totalInitialCashOutlay:0, details: ["Erro ao calcular Comprar."] },
            buyAndInvest: { scenarioName: "Erro", totalPatrimony: 0, totalInitialCashOutlay:0, details: ["Erro ao calcular Comprar e Investir."] },
            rentAndInvest: { scenarioName: "Erro", totalPatrimony: 0, totalInitialCashOutlay:0, details: ["Erro ao calcular Alugar e Investir."] },
            bestOption: 'insufficientData',
            analysisPeriodYears: (inputs.financingTermMonths || 1) / 12,
            recommendationText: "Ocorreu um erro durante os cálculos. Verifique os valores de entrada, especialmente taxas de juros muito baixas ou negativas."
        });
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  }, [inputs]);

  const handleClear = () => {
    setInputs(DEFAULT_PROPERTY_COMPARATOR_INPUTS);
    setResults(null);
    setIsDetailModalOpen(false);
  };
  
  const inputGroups = [
    {
      title: "Detalhes da Compra e Financiamento do Imóvel",
      icon: <BuildingOfficeIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />,
      fields: [
        { name: "propertyValue", label: "Valor do Imóvel (R$)", icon: "R$", tooltip: "Preço total de compra do imóvel."},
        { name: "downPayment", label: "Valor da Entrada (R$)", icon: "R$", tooltip: "Montante pago inicialmente na compra do imóvel."},
        { name: "financingCosts", label: "Custos Iniciais da Compra (R$)", icon: "R$", tooltip: "Ex: ITBI, taxas de cartório, etc."},
        { name: "financingTermMonths", label: "Prazo do Financiamento (Meses)", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5M12 15.75h.008v.008H12v-.008Z" /></svg>, displayOptions: {minimumFractionDigits: 0, maximumFractionDigits: 0}, tooltip: "Número total de parcelas do financiamento."},
        { name: "annualInterestRatePercent", label: "Taxa de Juros Anual do Financiamento (%)", icon: "%", displayOptions: {minimumFractionDigits: 2, maximumFractionDigits: 4}, tooltip: "Taxa de juros nominal anual do financiamento imobiliário."},
      ]
    },
    {
      title: "Custos de Moradia e Parâmetros de Investimento",
      icon: <ScaleIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />,
      fields: [
        { name: "monthlyRent", label: "Valor do Aluguel Mensal (R$)", icon: "R$", isRental: true, tooltip: "Custo mensal do aluguel, caso opte por não comprar."},
        { name: "annualRentIncreasePercent", label: "Correção Anual do Aluguel (Ex: IGPM %)", icon: "%", isRental: true, tooltip: "Percentual de reajuste anual do contrato de aluguel."},
        { name: "annualPropertyAppreciationPercent", label: "Valorização Anual do Imóvel (%)", icon: "%", isProperty: true, tooltip: "Expectativa de valorização anual do imóvel."},
        { name: "annualInvestmentReturnPercent", label: "Rentabilidade Anual dos Investimentos (%)", icon: "%", isInvestment: true, tooltip: "Taxa de retorno anual esperada para os investimentos (seja da diferença do aluguel ou aportes paralelos)."},
        { name: "additionalMonthlyInvestmentIfBuying", label: "Aporte Mensal para Investimentos Adicionais (R$)", icon: "R$", isInvestment: true, isBuyScenarioSpecific: true, tooltip: "Caso compre o imóvel, quanto você investiria mensalmente em paralelo (para o cenário 'Comprar e Investir'). Deixe 0 se não for o caso."},
      ]
    }
  ];


  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title className="text-xl sm:text-2xl">Alugar ou Financiar um Imóvel?</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-8">
          {inputGroups.map(group => (
            <Card key={group.title} className="bg-slate-50 dark:bg-slate-800/50 p-4 shadow-inner">
              <Card.Title className="text-lg mb-4 text-blue-600 dark:text-blue-400 flex items-center">
                {group.icon}
                {group.title}
              </Card.Title>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {group.fields.map(field => (
                   <FormattedNumericInput
                    key={field.name}
                    id={field.name}
                    name={field.name}
                    label={<>{field.label} <InfoTooltip text={field.tooltip} /></>}
                    value={inputs[field.name as keyof PropertyComparatorInputs]}
                    onChange={handleFormattedInputChange}
                    icon={typeof field.icon === 'string' ? <span className="text-slate-400 dark:text-slate-500">{field.icon}</span> : field.icon}
                    displayOptions={field.displayOptions || { minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </Card>
          ))}
          
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center border-t border-b border-slate-200 dark:border-slate-700 py-3">
            Nota: Os cálculos do financiamento utilizam o <strong>Sistema de Amortização Constante (SAC)</strong>, onde as parcelas diminuem ao longo do tempo.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button onClick={handleCalculate} variant="primary" size="lg" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculando...
                </>
              ) : 'Calcular Comparativo'}
            </Button>
            <Button onClick={handleClear} variant="secondary" size="lg" className="flex-1 sm:flex-none" disabled={isLoading}>
              Limpar
            </Button>
          </div>
        </Card.Content>
      </Card>

      {isLoading && !results && (
        <Card>
          <Card.Content className="py-10 flex justify-center items-center">
             <div className="flex flex-col items-center">
              <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-center text-slate-500 dark:text-slate-400 mt-4">Analisando cenários...</p>
             </div>
          </Card.Content>
        </Card>
      )}

      {!isLoading && results && (
        <>
          <Card>
            <Card.Header>
              <Card.Title className="text-xl sm:text-2xl text-center">Resultado da Análise ({results.analysisPeriodYears} anos)</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-6">
              <div className={`p-4 rounded-lg text-center ${
                  results.bestOption !== 'insufficientData' && results.bestOption !== 'comparable' 
                  ? 'bg-green-50 dark:bg-green-900/40' 
                  : 'bg-slate-100 dark:bg-slate-800/40'
              }`}>
                <p className={`text-lg font-semibold ${
                  results.bestOption !== 'insufficientData' && results.bestOption !== 'comparable' 
                  ? 'text-green-700 dark:text-green-200' 
                  : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {results.recommendationText}
                </p>
              </div>
              <div className="flex flex-col lg:flex-row gap-4 justify-center items-stretch">
                <ResultsCard result={results.buyOnly} scenarioType="buyOnly" isBest={results.bestOption === 'buyOnly'} />
                <ResultsCard result={results.buyAndInvest} scenarioType="buyAndInvest" isBest={results.bestOption === 'buyAndInvest'} />
                <ResultsCard result={results.rentAndInvest} scenarioType="rentAndInvest" isBest={results.bestOption === 'rentAndInvest'} />
              </div>
              <div className="mt-6 text-center">
                <Button
                    onClick={() => setIsDetailModalOpen(true)}
                    variant="secondary"
                    size="md"
                >
                    Detalhar Cálculo
                </Button>
              </div>
               <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
                  Esta é uma simulação simplificada e não considera todos os fatores (ex: custos de manutenção do imóvel, imposto de renda sobre investimentos e ganhos de capital, liquidez, etc.). Consulte um profissional para decisões financeiras.
              </p>
            </Card.Content>
          </Card>
          {isDetailModalOpen && (
            <PropertyCalculationDetailModal
              isOpen={isDetailModalOpen}
              onClose={() => setIsDetailModalOpen(false)}
              results={results}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PropertyComparator;
