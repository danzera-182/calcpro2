
import React, { useState, useCallback, useEffect } from 'react';
import { FixedIncomeInvestmentType, TermUnit, FixedIncomeResult, ConversionDirection } from '../types';
import { DEFAULT_CDI_RATE, DEFAULT_COMPREHENSIVE_INPUTS } from '../constants';
import { getIrRate, convertCdiPercentageToGrossRate, calculateNetAnnualYield, yearsToDays, calculateGrossAnnualYieldFromNet } from '../utils/fixedIncomeCalculations';
import Input from './ui/Input'; 
import Button from './ui/Button';
import Select from './ui/Select';
import { Card } from './ui/Card';
import FormattedNumericInput from './ui/FormattedNumericInput';
import { formatNumberForDisplay } from '../utils/formatters';
import { fetchEconomicIndicators } from '../utils/economicIndicatorsAPI'; 
import InfoTooltip from './ui/InfoTooltip'; 

const AutoFetchedMarker: React.FC<{ isFetched?: boolean; tooltipText?: string; className?: string }> = ({ isFetched, tooltipText, className }) => {
  if (!isFetched) return null;
  return <InfoTooltip text={tooltipText || "Valor preenchido automaticamente."}><span className={`text-blue-500 dark:text-blue-400 ${className || ''}`}>*</span></InfoTooltip>;
};


const FixedIncomeComparator: React.FC = () => {
  const [investmentType, setInvestmentType] = useState<FixedIncomeInvestmentType>('pre');
  const [conversionDirection, setConversionDirection] = useState<ConversionDirection>('grossToNet');
  
  const [inputRateValue, setInputRateValue] = useState<number | null>(12); 
  const [currentCdiRatePost, setCurrentCdiRatePost] = useState<number | null>(DEFAULT_CDI_RATE);
  
  // State for IPCA+ type
  const [inputIpcaRate, setInputIpcaRate] = useState<number | null>(DEFAULT_COMPREHENSIVE_INPUTS.ipcaRate ?? 3.5);
  const [isFetchingIpca, setIsFetchingIpca] = useState<boolean>(false);
  const [ipcaFetchError, setIpcaFetchError] = useState<string | null>(null);
  const [ipcaAutoFetched, setIpcaAutoFetched] = useState<boolean>(false);


  const [termValue, setTermValue] = useState<number>(2); 
  const [termUnit, setTermUnit] = useState<TermUnit>('years');
  
  const [result, setResult] = useState<FixedIncomeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setResult(null); 
    if (investmentType === 'pre') {
      setInputRateValue(conversionDirection === 'grossToNet' ? 12 : 6); 
    } else if (investmentType === 'post') { 
      setInputRateValue(conversionDirection === 'grossToNet' ? 100 : 85); 
    } else if (investmentType === 'ipca') {
      setInputRateValue(conversionDirection === 'grossToNet' ? 6 : 3); // Default real rate or net rate for IPCA+
    }
  }, [investmentType, conversionDirection]);

  useEffect(() => {
    if (investmentType === 'ipca') {
      setIsFetchingIpca(true);
      setIpcaFetchError(null);
      setIpcaAutoFetched(false);
      fetchEconomicIndicators()
        .then(data => {
          if (data.ipcaRate !== undefined) {
            setInputIpcaRate(data.ipcaRate);
            setIpcaAutoFetched(true); 
          } else {
            setIpcaFetchError("IPCA não encontrado. Usando valor padrão.");
            setInputIpcaRate(DEFAULT_COMPREHENSIVE_INPUTS.ipcaRate ?? 3.5);
          }
        })
        .catch(err => {
          console.error("Error fetching IPCA for comparator:", err);
          setIpcaFetchError("Erro ao buscar IPCA. Usando valor padrão.");
          setInputIpcaRate(DEFAULT_COMPREHENSIVE_INPUTS.ipcaRate ?? 3.5);
        })
        .finally(() => setIsFetchingIpca(false));
    } else {
      setIpcaFetchError(null);
      setIpcaAutoFetched(false);
    }
  }, [investmentType]);


  const handleFormattedRateChange = (name: string, value: number | null) => {
    if (name === 'inputRateValue') setInputRateValue(value);
    if (name === 'currentCdiRatePost') setCurrentCdiRatePost(value);
    if (name === 'inputIpcaRate') {
        setInputIpcaRate(value);
        setIpcaAutoFetched(false); 
    }
    setResult(null); 
  };
  
  const handleTermValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermValue(parseFloat(e.target.value) || 0);
    setResult(null);
  };

  const handleCalculate = useCallback(() => {
    setIsLoading(true);
    setResult(null);

    setTimeout(() => {
      const termDays = termUnit === 'years' ? yearsToDays(termValue) : termValue;
      if (termDays <= 0) {
          alert("O prazo do investimento deve ser positivo.");
          setIsLoading(false);
          return;
      }

      const irRateDecimal = getIrRate(termDays);
      const irRateAppliedPercent = irRateDecimal * 100;

      const rateInput = inputRateValue ?? 0;
      const cdiRateActual = currentCdiRatePost ?? 0;
      const ipcaRateActual = inputIpcaRate ?? 0;

      let calculatedResult: FixedIncomeResult | null = null;

      if (investmentType === 'pre') {
        if (conversionDirection === 'grossToNet') {
          if (rateInput < -100) {
            alert("A taxa bruta anual pré-fixada não pode ser menor que -100%.");
            setIsLoading(false); return;
          }
          const grossRate = rateInput;
          const netRate = calculateNetAnnualYield(grossRate, termDays);
          calculatedResult = {
            conversionDirection, investmentType, termDays, irRateAppliedPercent,
            inputRateDirect: grossRate,
            finalGrossAnnualRate: grossRate,
            finalNetAnnualRate: netRate,
          };
        } else { 
           if (rateInput < -100 / (1-irRateDecimal) && rateInput < 0 ) { 
            alert("A taxa líquida anual desejada é muito baixa para ser compensada pela taxa bruta.");
            setIsLoading(false); return;
          }
          const netRate = rateInput;
          const grossRate = calculateGrossAnnualYieldFromNet(netRate, termDays);
           calculatedResult = {
            conversionDirection, investmentType, termDays, irRateAppliedPercent,
            inputRateDirect: netRate,
            finalGrossAnnualRate: grossRate,
            finalNetAnnualRate: netRate,
          };
        }
      } else if (investmentType === 'post') { 
        if (cdiRateActual <= 0 && rateInput !== 0) { 
          alert("O Valor Atual do CDI deve ser maior que zero para cálculos pós-fixados significativos.");
          setIsLoading(false); return;
        }

        if (conversionDirection === 'grossToNet') {
          if (rateInput < 0) {
            alert("A porcentagem do CDI (bruta) deve ser não negativa.");
            setIsLoading(false); return;
          }
          const grossCdiPercentage = rateInput;
          const actualGrossRate = convertCdiPercentageToGrossRate(grossCdiPercentage, cdiRateActual);
          const actualNetRate = calculateNetAnnualYield(actualGrossRate, termDays);
          const netCdiPercentage = cdiRateActual > 0 ? (actualNetRate / cdiRateActual) * 100 : 0;
          
          calculatedResult = {
            conversionDirection, investmentType, termDays, irRateAppliedPercent,
            inputRateDirect: grossCdiPercentage,
            currentCdiRateForPost: cdiRateActual,
            finalGrossAnnualRate: actualGrossRate,
            finalNetAnnualRate: actualNetRate,
            equivalentGrossCdiPercentage: grossCdiPercentage,
            equivalentNetCdiPercentage: netCdiPercentage,
          };

        } else { 
          if (rateInput < 0 && cdiRateActual > 0) { 
          } else if (rateInput < 0 && cdiRateActual <=0) {
             alert("A porcentagem do CDI (líquida) desejada deve ser não negativa se o CDI atual for zero ou negativo.");
            setIsLoading(false); return;
          }

          const netCdiPercentageDesired = rateInput;
          const desiredActualNetRate = convertCdiPercentageToGrossRate(netCdiPercentageDesired, cdiRateActual);
          const requiredActualGrossRate = calculateGrossAnnualYieldFromNet(desiredActualNetRate, termDays);
          const requiredGrossCdiPercentage = cdiRateActual > 0 ? (requiredActualGrossRate / cdiRateActual) * 100 : (requiredActualGrossRate === 0 ? 0 : Infinity);
          
          calculatedResult = {
            conversionDirection, investmentType, termDays, irRateAppliedPercent,
            inputRateDirect: netCdiPercentageDesired,
            currentCdiRateForPost: cdiRateActual,
            finalGrossAnnualRate: requiredActualGrossRate,
            finalNetAnnualRate: desiredActualNetRate,
            equivalentGrossCdiPercentage: requiredGrossCdiPercentage,
            equivalentNetCdiPercentage: netCdiPercentageDesired,
          };
        }
      } else if (investmentType === 'ipca') {
        const ipcaExpectedDecimal = ipcaRateActual / 100;
        const realRateInput = rateInput;
        let finalNetNominalRateForEquivCalc = 0;
        
        if (conversionDirection === 'grossToNet') {
            const realRateDecimal = realRateInput / 100;
            const nominalGrossAnnualRateDecimal = (1 + realRateDecimal) * (1 + ipcaExpectedDecimal) - 1;
            const nominalGrossAnnualRatePercent = nominalGrossAnnualRateDecimal * 100;
            const netRate = calculateNetAnnualYield(nominalGrossAnnualRatePercent, termDays);
            finalNetNominalRateForEquivCalc = netRate;
            calculatedResult = {
                conversionDirection, investmentType, termDays, irRateAppliedPercent,
                inputRateDirect: realRateInput, 
                inputIpcaRate: ipcaRateActual,
                inputRealRate: realRateInput,
                finalGrossAnnualRate: nominalGrossAnnualRatePercent,
                finalNetAnnualRate: netRate,
            };
        } else { 
            const desiredNetRatePercent = realRateInput;
            finalNetNominalRateForEquivCalc = desiredNetRatePercent;
            const requiredNominalGrossAnnualRatePercent = calculateGrossAnnualYieldFromNet(desiredNetRatePercent, termDays);
            const requiredNominalGrossAnnualRateDecimal = requiredNominalGrossAnnualRatePercent / 100;
            
            let calculatedRealRateDecimal;
            const ipcaFactorForCalc = 1 + ipcaExpectedDecimal;
            if (ipcaFactorForCalc === 0) { 
                calculatedRealRateDecimal = requiredNominalGrossAnnualRateDecimal;
            } else {
                calculatedRealRateDecimal = ((1 + requiredNominalGrossAnnualRateDecimal) / ipcaFactorForCalc) - 1;
            }
            const calculatedRealRatePercent = calculatedRealRateDecimal * 100;

            calculatedResult = {
                conversionDirection, investmentType, termDays, irRateAppliedPercent,
                inputRateDirect: desiredNetRatePercent, 
                inputIpcaRate: ipcaRateActual,
                calculatedRealRate: calculatedRealRatePercent, 
                finalGrossAnnualRate: requiredNominalGrossAnnualRatePercent,
                finalNetAnnualRate: desiredNetRatePercent,
            };
        }

        // Calculate equivalent exempt real rate for IPCA+
        let equivalentExemptRealRate: number | undefined = undefined;
        const netNominalRateDecimal = finalNetNominalRateForEquivCalc / 100;
        const ipcaFactor = 1 + (ipcaRateActual / 100);
        if (ipcaFactor > 0) { // Avoid division by zero or meaningless results if IPCA is -100% or less
            const equivalentExemptRealRateDecimal = ((1 + netNominalRateDecimal) / ipcaFactor) - 1;
            equivalentExemptRealRate = equivalentExemptRealRateDecimal * 100;
        }
        if (calculatedResult) {
          calculatedResult.equivalentExemptRealRate_Ipca = equivalentExemptRealRate;
        }
      }
      setResult(calculatedResult);
      setIsLoading(false);
    }, 1000);

  }, [investmentType, conversionDirection, inputRateValue, currentCdiRatePost, inputIpcaRate, termValue, termUnit]);

  const getRateInputLabel = () => {
    if (investmentType === 'pre') {
      return conversionDirection === 'grossToNet' ? "Taxa Bruta Anual Pré-fixada (%)" : "Taxa Líquida Anual Desejada (%)";
    } else if (investmentType === 'post'){ 
      return conversionDirection === 'grossToNet' ? "% do CDI (Bruto)" : "% do CDI Líquido Desejado";
    } else if (investmentType === 'ipca') {
      return conversionDirection === 'grossToNet' ? "Taxa Real Anual Pré-fixada (%)" : "Taxa Líquida Anual Desejada (%)";
    }
    return "Taxa (%)";
  };
  
  const getExplanatoryText = () => {
    if (!result) return "";
    const { 
        finalGrossAnnualRate, finalNetAnnualRate, irRateAppliedPercent, 
        inputRateDirect, currentCdiRateForPost, 
        equivalentGrossCdiPercentage, equivalentNetCdiPercentage,
        inputIpcaRate, inputRealRate, calculatedRealRate, equivalentExemptRealRate_Ipca
    } = result;

    const termDescription = termUnit === 'years' ? `${termValue} ano(s)` : `${result.termDays} dia(s)`;
    const irText = `${formatNumberForDisplay(irRateAppliedPercent, {minimumFractionDigits:1, maximumFractionDigits:1})}%`;

    if (result.investmentType === 'pre') {
        if (result.conversionDirection === 'grossToNet') {
            return `Um investimento pré-fixado com taxa bruta de ${formatNumberForDisplay(inputRateDirect, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a., prazo de ${termDescription} (IR de ${irText}), tem uma rentabilidade líquida de ${formatNumberForDisplay(finalNetAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a.`;
        } else { 
            return `Para obter uma rentabilidade líquida de ${formatNumberForDisplay(inputRateDirect, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. em um investimento pré-fixado com prazo de ${termDescription} (IR de ${irText}), seria necessária uma taxa bruta de ${formatNumberForDisplay(finalGrossAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a.`;
        }
    } else if (result.investmentType === 'post') { 
        const cdiRateText = formatNumberForDisplay(currentCdiRateForPost, {minimumFractionDigits:2, maximumFractionDigits:2});
        if (result.conversionDirection === 'grossToNet') {
            const inputGrossCdiText = formatNumberForDisplay(inputRateDirect, {minimumFractionDigits:0, maximumFractionDigits:2});
            const equivNetCdiText = formatNumberForDisplay(equivalentNetCdiPercentage, {minimumFractionDigits:2, maximumFractionDigits:2});
            return `Um investimento pós-fixado de ${inputGrossCdiText}% do CDI (bruto), com CDI de ${cdiRateText}% a.a. (rendendo ${formatNumberForDisplay(finalGrossAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. bruto), prazo de ${termDescription} (IR de ${irText}), gera uma rentabilidade líquida de ${formatNumberForDisplay(finalNetAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. Isso equivale a ${equivNetCdiText}% do CDI líquido.`;
        } else { 
            const inputNetCdiText = formatNumberForDisplay(inputRateDirect, {minimumFractionDigits:0, maximumFractionDigits:2});
            const equivGrossCdiText = formatNumberForDisplay(equivalentGrossCdiPercentage, {minimumFractionDigits:2, maximumFractionDigits:2});
             return `Para obter uma rentabilidade líquida de ${inputNetCdiText}% do CDI, com CDI de ${cdiRateText}% a.a. (equivalente a ${formatNumberForDisplay(finalNetAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. líquido), prazo de ${termDescription} (IR de ${irText}), seria necessário um investimento que renda ${equivGrossCdiText}% do CDI bruto (ou ${formatNumberForDisplay(finalGrossAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. bruto).`;
        }
    } else if (result.investmentType === 'ipca') {
        const ipcaText = formatNumberForDisplay(inputIpcaRate, {minimumFractionDigits:2, maximumFractionDigits:2});
        const equivExemptRealText = equivalentExemptRealRate_Ipca !== undefined ? formatNumberForDisplay(equivalentExemptRealRate_Ipca, {minimumFractionDigits:2, maximumFractionDigits:2}) : "N/A";
        let baseText = "";

        if (result.conversionDirection === 'grossToNet') {
            const realRateText = formatNumberForDisplay(inputRealRate, {minimumFractionDigits:2, maximumFractionDigits:2});
            baseText = `Um investimento IPCA+ com taxa real de ${realRateText}% a.a. + IPCA de ${ipcaText}% a.a. (totalizando ${formatNumberForDisplay(finalGrossAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. bruto), prazo de ${termDescription} (IR de ${irText} sobre o total), tem rentabilidade líquida de ${formatNumberForDisplay(finalNetAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a.`;
        } else { // netToGross
            const desiredNetText = formatNumberForDisplay(inputRateDirect, {minimumFractionDigits:2, maximumFractionDigits:2});
            const calcRealRateText = formatNumberForDisplay(calculatedRealRate, {minimumFractionDigits:2, maximumFractionDigits:2});
            baseText = `Para obter uma rentabilidade líquida de ${desiredNetText}% a.a. em um investimento IPCA+, com IPCA de ${ipcaText}% a.a. e prazo de ${termDescription} (IR de ${irText} sobre o total), seria necessária uma taxa real de ${calcRealRateText}% a.a. (resultando em ${formatNumberForDisplay(finalGrossAnnualRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. bruto).`;
        }
        if (equivalentExemptRealRate_Ipca !== undefined) {
            baseText += ` Isso seria equivalente a um título IPCA + ${equivExemptRealText}% isento de IR.`;
        }
        return baseText;
    }
    return "";
};
  
  const commonInputProps = {
    disabled: isLoading
  };
  const commonSelectProps = {
    disabled: isLoading
  };


  return (
    <Card>
      <Card.Header>
        <Card.Title>Comparador de Renda Fixa (Tributado vs. Isento)</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-blue-400 mb-1">Tipo de Rentabilidade</label>
          <div className="flex space-x-2">
            <Button variant={investmentType === 'pre' ? 'primary' : 'secondary'} onClick={() => setInvestmentType('pre')} disabled={isLoading}>Pré-fixado</Button>
            <Button variant={investmentType === 'post' ? 'primary' : 'secondary'} onClick={() => setInvestmentType('post')} disabled={isLoading}>Pós-fixado (% CDI)</Button>
            <Button variant={investmentType === 'ipca' ? 'primary' : 'secondary'} onClick={() => setInvestmentType('ipca')} disabled={isLoading}>IPCA+</Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-blue-400 mb-1">Direção da Conversão</label>
          <div className="flex space-x-2">
            <Button variant={conversionDirection === 'grossToNet' ? 'primary' : 'secondary'} onClick={() => setConversionDirection('grossToNet')} disabled={isLoading}>Bruto para Líquido</Button>
            <Button variant={conversionDirection === 'netToGross' ? 'primary' : 'secondary'} onClick={() => setConversionDirection('netToGross')} disabled={isLoading}>Líquido para Bruto</Button>
          </div>
        </div>
        
        <FormattedNumericInput
            label={getRateInputLabel()}
            id="inputRateValue"
            name="inputRateValue"
            value={inputRateValue}
            onChange={handleFormattedRateChange}
            min={investmentType === 'post' && conversionDirection === 'grossToNet' ? 0 : (investmentType === 'pre' && conversionDirection === 'grossToNet' ? -100 : (investmentType === 'ipca' && conversionDirection === 'grossToNet' ? undefined : undefined) ) } 
            icon={<span className="text-slate-400 dark:text-slate-500">%</span>}
            displayOptions={investmentType === 'pre' || investmentType === 'ipca' ? 
              { minimumFractionDigits: 2, maximumFractionDigits: 4 } : 
              { minimumFractionDigits: 0, maximumFractionDigits: 2 } 
            }
            {...commonInputProps}
        />

        {investmentType === 'post' && (
            <FormattedNumericInput
              label="Valor Atual do CDI (% a.a.)"
              id="currentCdiRatePost"
              name="currentCdiRatePost"
              value={currentCdiRatePost}
              onChange={handleFormattedRateChange}
              min={0.01} 
              icon={<span className="text-slate-400 dark:text-slate-500">%</span>}
              displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              {...commonInputProps}
            />
        )}
        {investmentType === 'ipca' && (
            <FormattedNumericInput
              label={<>IPCA Esperado Anual (%) <InfoTooltip text="Inflação anual (IPCA) esperada para o período do título. O valor é buscado automaticamente mas pode ser editado." /></>}
              id="inputIpcaRate"
              name="inputIpcaRate"
              value={inputIpcaRate}
              onChange={handleFormattedRateChange}
              icon={
                <>
                  <span className="text-slate-400 dark:text-slate-500">%</span>
                  <AutoFetchedMarker 
                    isFetched={ipcaAutoFetched && !isFetchingIpca && !ipcaFetchError} 
                    tooltipText={ipcaFetchError ? ipcaFetchError : "IPCA mais recente buscado automaticamente."}
                    className="ml-0.5" 
                  />
                </>
              }
              displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              disabled={isLoading || isFetchingIpca}
            />
        )}
        
        <div className="grid grid-cols-2 gap-4 items-end">
            <Input
                label="Prazo do Investimento"
                type="number" 
                value={termValue.toString()}
                onChange={handleTermValueChange}
                min="1" 
                {...commonInputProps}
             />
            <Select
                label="Unidade do Prazo"
                options={[
                    { value: 'years', label: 'Anos' },
                    { value: 'days', label: 'Dias' },
                ]}
                value={termUnit}
                onChange={(e) => {setTermUnit(e.target.value as TermUnit); setResult(null);}}
                {...commonSelectProps}
            />
        </div>

        <Button onClick={handleCalculate} variant="primary" size="lg" className="w-full" disabled={isLoading || isFetchingIpca}>
          {isLoading || isFetchingIpca ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isFetchingIpca ? 'Buscando IPCA...' : 'Calculando...'}
            </>
          ) : (
            'Calcular Equivalência'
          )}
        </Button>

        {isLoading && (
          <div className="mt-6 p-5 sm:p-6 bg-slate-100/80 dark:bg-slate-700/60 rounded-xl shadow-inner flex justify-center items-center">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Analisando taxas...</p>
            </div>
          </div>
        )}

        {!isLoading && result && (
          <div className="mt-6 p-5 sm:p-6 bg-slate-100/80 dark:bg-slate-700/60 rounded-xl shadow-inner space-y-4 sm:space-y-5">
            <h3 className="text-xl sm:text-2xl font-semibold text-center text-slate-800 dark:text-blue-300 mb-3 sm:mb-4">
              Resultado da Conversão
            </h3>
            
            <div className="text-center mb-3 sm:mb-4">
               {result.conversionDirection === 'grossToNet' && result.investmentType !== 'ipca' && (
                 <>
                    <span className="block text-xs text-slate-600 dark:text-slate-400 -mb-1">
                        {result.investmentType === 'pre' ? 'Taxa Bruta Informada:' : 
                         result.investmentType === 'post' ? '% CDI Bruto Informado:' : ''} {formatNumberForDisplay(result.inputRateDirect, {minimumFractionDigits: (result.investmentType === 'pre') ? 2:0, maximumFractionDigits: (result.investmentType === 'pre') ? 4:2})}%
                    </span>
                    <span className="block text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                        {formatNumberForDisplay(result.finalNetAnnualRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.
                    </span>
                    <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Taxa Anual Líquida Equivalente
                    </span>
                 </>
               )}
               {result.conversionDirection === 'netToGross' && result.investmentType !== 'ipca' && (
                 <>
                    <span className="block text-xs text-slate-600 dark:text-slate-400 -mb-1">
                        {result.investmentType === 'pre' ? 'Taxa Líquida Desejada:' : 
                         result.investmentType === 'post' ? '% CDI Líquido Desejado:' : ''} {formatNumberForDisplay(result.inputRateDirect, {minimumFractionDigits: (result.investmentType === 'pre') ? 2:0, maximumFractionDigits: (result.investmentType === 'pre') ? 4:2})}%
                    </span>
                    <span className="block text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {formatNumberForDisplay(result.finalGrossAnnualRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.
                    </span>
                     <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Taxa Anual Bruta Necessária
                    </span>
                 </>
               )}
            </div>

            {result.investmentType === 'post' && (
              <div className="text-center mb-4 sm:mb-5">
                <span className="block text-xl sm:text-2xl font-bold text-orange-500 dark:text-orange-400">
                  {result.conversionDirection === 'grossToNet' 
                    ? `${formatNumberForDisplay(result.equivalentNetCdiPercentage, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% do CDI Líquido`
                    : `${formatNumberForDisplay(result.equivalentGrossCdiPercentage, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% do CDI Bruto`}
                </span>
                <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {result.conversionDirection === 'grossToNet' ? 'Equivalente em % do CDI Líquido' : 'Equivalente em % do CDI Bruto Necessário'}
                </span>
              </div>
            )}

            {result.investmentType === 'ipca' && result.equivalentExemptRealRate_Ipca !== undefined && (
              <div className="text-center mb-4 sm:mb-5">
                 {result.conversionDirection === 'grossToNet' && (
                    <div className="mb-3">
                        <span className="block text-xs text-slate-600 dark:text-slate-400 -mb-0.5">Taxa Real Informada: {formatNumberForDisplay(result.inputRealRate, {minimumFractionDigits:2, maximumFractionDigits:2})}% + IPCA {formatNumberForDisplay(result.inputIpcaRate, {minimumFractionDigits:2, maximumFractionDigits:2})}%</span>
                        <span className="block text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                            {formatNumberForDisplay(result.finalNetAnnualRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.
                        </span>
                        <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5">Taxa Líquida Efetiva (Após IR)</span>
                    </div>
                 )}
                 {result.conversionDirection === 'netToGross' && (
                    <div className="mb-3">
                        <span className="block text-xs text-slate-600 dark:text-slate-400 -mb-0.5">Taxa Líquida Desejada: {formatNumberForDisplay(result.inputRateDirect, {minimumFractionDigits:2, maximumFractionDigits:2})}% (Com IPCA de {formatNumberForDisplay(result.inputIpcaRate, {minimumFractionDigits:2, maximumFractionDigits:2})}%)</span>
                        <span className="block text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                            IPCA + {formatNumberForDisplay(result.calculatedRealRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.
                        </span>
                        <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5">Taxa Real Bruta Necessária (Pré-IR)</span>
                    </div>
                 )}
                <span className="block text-xl sm:text-2xl font-bold text-teal-500 dark:text-teal-400">
                  IPCA + {formatNumberForDisplay(result.equivalentExemptRealRate_Ipca, {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                </span>
                <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Taxa Real Equivalente (Isenta de IR)
                </span>
              </div>
            )}
            
            <hr className="my-3 sm:my-4 border-slate-300 dark:border-slate-600/80" />

            <div className="space-y-1.5 sm:space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-700 dark:text-blue-400">Alíquota de IR Aplicada:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatNumberForDisplay(result.irRateAppliedPercent, {minimumFractionDigits:1, maximumFractionDigits:1})}%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-700 dark:text-blue-400">
                    {result.investmentType === 'pre' ? (result.conversionDirection === 'grossToNet' ? 'Taxa Bruta Informada:' : 'Taxa Líquida Desejada:') :
                     result.investmentType === 'post' ? (result.conversionDirection === 'grossToNet' ? '% CDI Bruto Informado:' : '% CDI Líquido Desejado:') :
                     result.investmentType === 'ipca' ? (result.conversionDirection === 'grossToNet' ? 'Taxa Real Informada:' : 'Taxa Líquida Desejada:') : ''
                    }
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                    {formatNumberForDisplay(result.inputRateDirect, {minimumFractionDigits: (result.investmentType === 'pre' || result.investmentType === 'ipca') ? 2:0, maximumFractionDigits: (result.investmentType === 'pre' || result.investmentType === 'ipca') ? 4:2})}%
                </span>
              </div>

              {result.investmentType === 'post' && result.currentCdiRateForPost !== undefined && (
                 <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-blue-400">CDI Atual Informado:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{formatNumberForDisplay(result.currentCdiRateForPost, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.</span>
                  </div>
              )}
              {result.investmentType === 'ipca' && result.inputIpcaRate !== undefined && (
                 <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-blue-400">IPCA Esperado Informado:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{formatNumberForDisplay(result.inputIpcaRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.</span>
                  </div>
              )}

              {(result.investmentType === 'post' || result.investmentType === 'ipca') && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-blue-400">Taxa Bruta Anual Efetiva{result.investmentType === 'ipca' ? ' (Nominal)' : ''}:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{formatNumberForDisplay(result.finalGrossAnnualRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-blue-400">Taxa Líquida Anual Efetiva:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{formatNumberForDisplay(result.finalNetAnnualRate, {minimumFractionDigits: 2, maximumFractionDigits: 2})}% a.a.</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-700 dark:text-blue-400">Prazo Considerado:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{termUnit === 'years' ? `${termValue} ano(s)` : `${result.termDays} dia(s)`}</span>
              </div>
            </div>
           
            <hr className="mt-3 mb-2 sm:mt-4 sm:mb-3 border-slate-300 dark:border-slate-600/80" />
            <p className="text-xs italic text-slate-600 dark:text-slate-400 text-center">{getExplanatoryText()}</p>
            
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-500 text-center border-t border-slate-300 dark:border-slate-600/80 pt-3">
              <strong>Atenção:</strong> O cálculo da taxa líquida/bruta é uma estimativa simplificada (Taxa Líquida = Taxa Bruta Anual × (1 - Alíquota IR) e vice-versa) 
              e pode não refletir com exatidão o efeito de capitalização para prazos não anuais como em calculadoras financeiras detalhadas.
              Para títulos IPCA+, o IR incide sobre a rentabilidade nominal total (Taxa Real + IPCA).
            </p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default FixedIncomeComparator;
