
import React, { useState, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card } from './ui/Card';
import Button from './ui/Button';
import FormattedNumericInput from './ui/FormattedNumericInput';
import Input from './ui/Input';
import InfoTooltip from './ui/InfoTooltip';
import { UpfrontVsInstallmentsInputs, UpfrontVsInstallmentsResults, BarChartDataPoint, DynamicHistoricalAverage } from '../types';
import { DEFAULT_UPFRONT_VS_INSTALLMENTS_INPUTS, CHART_COLORS, SGS_CODE_CDI_MONTHLY } from '../constants';
import { calculateUpfrontVsInstallments } from '../utils/upfrontVsInstallmentsCalculations';
import { formatCurrency, formatNumberForDisplay } from '../utils/formatters';
import { fetchAndCalculateHistoricalAverage } from '../utils/economicIndicatorsAPI';
import { useTheme } from '../hooks/useTheme';

const CustomTooltipContent: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 shadow-lg rounded-md border border-slate-300 dark:border-slate-700">
        <p className="label font-semibold text-slate-700 dark:text-slate-200">{`${label}`}</p>
        <p className="text-sm" style={{ color: payload[0].fill }}>
          {`Valor: ${formatCurrency(payload[0].value)}`}
        </p>
      </div>
    );
  }
  return null;
};


const UpfrontVsInstallmentsCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<UpfrontVsInstallmentsInputs>(DEFAULT_UPFRONT_VS_INSTALLMENTS_INPUTS);
  const [results, setResults] = useState<UpfrontVsInstallmentsResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chartData, setChartData] = useState<BarChartDataPoint[]>([]);

  const { theme } = useTheme();
  const axisLabelColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tickColor = theme === 'dark' ? '#D1D5DB' : '#374151';
  const gridColor = theme === 'dark' ? '#4B5563' : '#D1D5DB';

  const initialDynamicAverageState: DynamicHistoricalAverage = { value: null, isLoading: true, error: null };
  const [cdiAverageData, setCdiAverageData] = useState<DynamicHistoricalAverage>(initialDynamicAverageState);
  const HISTORICAL_YEARS_FOR_CDI = 20;

  useEffect(() => {
    const fetchCDIAverage = async () => {
      setCdiAverageData(prev => ({ ...prev, isLoading: true, error: null, sourceSgsCode: SGS_CODE_CDI_MONTHLY }));
      const cdiResult = await fetchAndCalculateHistoricalAverage(SGS_CODE_CDI_MONTHLY, HISTORICAL_YEARS_FOR_CDI);
      
      // Convert annual average to monthly equivalent for this calculator
      if (cdiResult.value !== null) {
        const annualRateDecimal = cdiResult.value / 100;
        const monthlyEquivalentDecimal = Math.pow(1 + annualRateDecimal, 1/12) - 1;
        cdiResult.value = monthlyEquivalentDecimal * 100; // Store monthly rate
      }
      setCdiAverageData({ ...cdiResult, isLoading: false, sourceSgsCode: SGS_CODE_CDI_MONTHLY });
    };
    fetchCDIAverage();
  }, []);

  const handleInputChange = useCallback((name: keyof UpfrontVsInstallmentsInputs, value: number | null) => {
    setInputs(prev => ({ ...prev, [name]: value }));
    setResults(null);
    setChartData([]);
  }, []);

  const handleFormattedInputChange = (name: string, value: number | null) => {
    handleInputChange(name as keyof UpfrontVsInstallmentsInputs, value);
  };
  
  const handleDirectNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? null : parseInt(value, 10);
    if (numValue === null || (!isNaN(numValue) && numValue >= 0)) {
      handleInputChange(name as keyof UpfrontVsInstallmentsInputs, numValue);
    }
  };

  const handleCalculate = useCallback(() => {
    setIsLoading(true);
    setResults(null);
    setChartData([]);

    setTimeout(() => {
      const calculatedResults = calculateUpfrontVsInstallments(inputs);
      setResults(calculatedResults);

      if (calculatedResults.bestOption !== 'insufficientData') {
        setChartData([
          { name: 'À Vista c/ Desc.', valor: calculatedResults.amountToPayUpfront },
          { name: 'Total Parcelado', valor: calculatedResults.totalPaidInInstallments },
          { name: 'VPL Parcelas', valor: calculatedResults.npvOfInstallments },
        ]);
      }
      setIsLoading(false);
    }, 1000);
  }, [inputs]);

  const handleUseCDI = () => {
    if (cdiAverageData.value !== null && !cdiAverageData.isLoading && !cdiAverageData.error) {
      handleInputChange('alternativeInvestmentRatePercentMonthly', cdiAverageData.value);
    }
  };
  
  const cdiButtonTooltipText = cdiAverageData.isLoading 
    ? "Carregando CDI médio..." 
    : cdiAverageData.error 
    ? `Erro ao buscar CDI: ${cdiAverageData.error}` 
    : cdiAverageData.value !== null 
    ? `Usar média histórica CDI: ${formatNumberForDisplay(cdiAverageData.value, {minimumFractionDigits:2, maximumFractionDigits:4})}% a.m. (Base: ${cdiAverageData.sourceDateRange || '20 anos'}).`
    : "CDI médio não disponível.";


  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title className="text-xl sm:text-2xl">Calculadora: Pagar à Vista ou Parcelado?</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <FormattedNumericInput
              id="productPrice"
              name="productPrice"
              label={<>Valor do Produto/Serviço (R$) <InfoTooltip text="O preço original do item antes de qualquer desconto." /></>}
              value={inputs.productPrice}
              onChange={handleFormattedInputChange}
              icon={<span className="text-slate-400 dark:text-slate-500">R$</span>}
              disabled={isLoading}
            />
            <FormattedNumericInput
              id="upfrontDiscountPercent"
              name="upfrontDiscountPercent"
              label={<>Desconto à Vista (%) <InfoTooltip text="Percentual de desconto oferecido para pagamento à vista." /></>}
              value={inputs.upfrontDiscountPercent}
              onChange={handleFormattedInputChange}
              icon={<span className="text-slate-400 dark:text-slate-500">%</span>}
              min={0} max={100}
              displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              disabled={isLoading}
            />
            <Input
              id="numberOfInstallments"
              name="numberOfInstallments"
              type="number"
              label={<>Número de Parcelas <InfoTooltip text="Quantidade total de parcelas no plano de pagamento." /></>}
              value={inputs.numberOfInstallments?.toString() ?? ''}
              onChange={handleDirectNumberChange}
              min="1"
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 dark:text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5M12 15.75h.008v.008H12v-.008Z" /></svg>}
              disabled={isLoading}
            />
            <FormattedNumericInput
              id="installmentInterestRatePercentMonthly"
              name="installmentInterestRatePercentMonthly"
              label={<>Taxa de Juros Mensal do Parcelamento (%) <InfoTooltip text="Juros cobrados pelo vendedor ao mês sobre o valor financiado. Se for 'parcelado sem juros', informe 0%." /></>}
              value={inputs.installmentInterestRatePercentMonthly}
              onChange={handleFormattedInputChange}
              icon={<span className="text-slate-400 dark:text-slate-500">%</span>}
              min={0}
              displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 4 }}
              disabled={isLoading}
            />
            <div className="md:col-span-2">
              <FormattedNumericInput
                id="alternativeInvestmentRatePercentMonthly"
                name="alternativeInvestmentRatePercentMonthly"
                label={
                  <span className="flex items-center">
                    Rentabilidade do investimento (% ao mês)
                    <InfoTooltip 
                        text="Sua taxa de oportunidade. Quanto seu dinheiro renderia por mês se investido, em vez de usado para pagar à vista. Use para calcular o VPL das parcelas." 
                        className="ml-1.5"
                    />
                  </span>
                }
                value={inputs.alternativeInvestmentRatePercentMonthly}
                onChange={handleFormattedInputChange}
                icon={<span className="text-slate-400 dark:text-slate-500">%</span>}
                displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 4 }}
                disabled={isLoading}
              />
              <Button 
                onClick={handleUseCDI} 
                variant="ghost" 
                size="sm" 
                className="text-xs mt-1"
                disabled={cdiAverageData.isLoading || cdiAverageData.value === null}
                title={cdiButtonTooltipText}
              >
                {cdiAverageData.isLoading ? "Buscando CDI..." : cdiAverageData.error ? "CDI Indisp." : `Usar média CDI (${formatNumberForDisplay(cdiAverageData.value, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.m.)`}
              </Button>
            </div>
          </div>
          <Button onClick={handleCalculate} variant="primary" size="lg" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? "Calculando..." : "Calcular Decisão"}
          </Button>
        </Card.Content>
      </Card>

      {isLoading && !results && ( /* Show this only during initial loading, not if results are already there */
        <Card>
          <Card.Content className="py-10 flex justify-center items-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="ml-3 text-slate-500 dark:text-slate-400">Analisando opções...</p>
          </Card.Content>
        </Card>
      )}
      
      {results && (
        <Card className="shadow-xl">
          <Card.Header>
            <Card.Title className="text-xl sm:text-2xl text-center">Análise Financeira</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <div className={`p-4 rounded-lg text-center ${
              results.bestOption === 'upfront' ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-200' :
              results.bestOption === 'installments' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200' :
              results.bestOption === 'equivalent' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200' :
              'bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200'
            }`}>
              <p className="text-lg font-semibold">{results.recommendationText}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                <p className="text-xs text-slate-500 dark:text-slate-400">Pagando à Vista com Desconto</p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-100">{formatCurrency(results.amountToPayUpfront)}</p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                <p className="text-xs text-slate-500 dark:text-slate-400">Custo Total Parcelado</p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-100">{formatCurrency(results.totalPaidInInstallments)}</p>
                <p className="text-xxs text-slate-400 dark:text-slate-500">({results.inputsUsed.numberOfInstallments}x de {formatCurrency(results.installmentValue)})</p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
                  VPL das Parcelas 
                  <InfoTooltip 
                    text="Valor Presente Líquido (VPL) das Parcelas: Traz todos os pagamentos futuros das parcelas para o valor de 'hoje', descontando-os pela 'Rentabilidade do investimento'. Se o VPL for menor que o 'Valor à Vista com Desconto', pode ser mais vantajoso parcelar e investir a diferença, assumindo que você consiga a rentabilidade informada." 
                    className="ml-1"
                  />
                </p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-100">{formatCurrency(results.npvOfInstallments)}</p>
              </div>
            </div>
            
            {chartData.length > 0 && (
              <div className="mt-6 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 10 }} interval={0} />
                    <YAxis tickFormatter={(value) => formatCurrency(value).replace("R$", "")} tick={{ fill: tickColor, fontSize: 10 }} label={{ value: "Valor (R$)", angle: -90, position: 'insideLeft', offset:-5, fill:axisLabelColor, fontSize: 12 }}/>
                    <Tooltip content={<CustomTooltipContent />} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}/>
                    <Legend wrapperStyle={{fontSize: "12px", color: tickColor }}/>
                    <Bar dataKey="valor" name="Valor Monetário">
                      {chartData.map((entry, index) => {
                        let barColor = CHART_COLORS.mainStrategy; // Default color
                        if (entry.name === 'À Vista c/ Desc.') barColor = CHART_COLORS.upfrontAmount;
                        else if (entry.name === 'Total Parcelado') barColor = CHART_COLORS.totalInstallments;
                        else if (entry.name === 'VPL Parcelas') barColor = CHART_COLORS.npvInstallments;
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
             <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
                Nota: Se a "Taxa de Juros Mensal do Parcelamento" for 0%, significa que o valor parcelado é o preço cheio do produto, sem juros do vendedor. A "Rentabilidade do investimento" é o seu custo de oportunidade ou o rendimento que você deixaria de ganhar ao pagar à vista.
            </p>
          </Card.Content>
        </Card>
      )}
      {!isLoading && !results && (
          <Card>
            <Card.Content>
                <p className="text-center text-slate-500 dark:text-slate-400 py-10">
                    Preencha os campos acima e clique em "Calcular Decisão" para ver a análise.
                </p>
            </Card.Content>
          </Card>
      )}
    </div>
  );
};

export default UpfrontVsInstallmentsCalculator;
