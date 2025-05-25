
import React from 'react';
import { InputFormData } from '../types';
// import Input from './ui/Input'; // No longer directly used for formatted fields
import Button from './ui/Button';
import FormattedNumericInput from './ui/FormattedNumericInput';
import Input from './ui/Input'; // For non-formatted inputs like years
// FIX: Import formatNumberForDisplay from utils/formatters
import { formatNumberForDisplay } from '../utils/formatters';

interface InputFormProps {
  inputValues: InputFormData;
  onFormChange: (values: Partial<InputFormData>) => void;
  onSimulate: () => void;
  isLoading: boolean; // Added isLoading prop
}

const InputForm: React.FC<InputFormProps> = ({
  inputValues,
  onFormChange,
  onSimulate,
  isLoading // Destructure isLoading
}) => {
  const handleFormattedChange = (name: string, val: number | null) => {
    onFormChange({ [name]: val === null ? 0 : val });
  };
  
  const handleDirectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    if (e.target.type === 'number') {
      parsedValue = value === '' ? 0 : parseInt(value, 10); // Assuming years are integers
      if (parsedValue < 0) parsedValue = 0;
    }
    onFormChange({ [name]: parsedValue });
  };


  // Calculate equivalent monthly rate for display purposes
  const annualRateDecimal = inputValues.rateValue / 100;
  let monthlyEquivalentRatePercent = 0;
  if (annualRateDecimal > -1) { // Avoid issues with -100% rate leading to NaN
      monthlyEquivalentRatePercent = (Math.pow(1 + annualRateDecimal, 1 / 12) - 1) * 100;
  } else {
      monthlyEquivalentRatePercent = -100; // if annual rate is -100%, monthly is also -100%
  }


  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <FormattedNumericInput
        label="Valor Inicial (R$)"
        id="initialInvestment"
        name="initialInvestment"
        value={inputValues.initialInvestment}
        onChange={handleFormattedChange}
        min={0}
        icon={<span className="text-gray-400 dark:text-gray-500">R$</span>}
        displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        disabled={isLoading}
      />
      <Input // Investment period is an integer, no complex formatting needed
        label="Período (Anos)"
        type="number"
        id="investmentPeriodYears"
        name="investmentPeriodYears"
        value={inputValues.investmentPeriodYears.toString()}
        onChange={handleDirectChange}
        min="1"
        step="1"
        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 dark:text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008Z" />
        </svg>}
        disabled={isLoading}
      />
      
      <div className="pt-5 border-t border-gray-200 dark:border-slate-700/60 space-y-5">
        <FormattedNumericInput
          label="Aporte Mensal (R$)"
          id="contributionValue"
          name="contributionValue"
          value={inputValues.contributionValue}
          onChange={handleFormattedChange}
          min={0}
          icon={<span className="text-gray-400 dark:text-gray-500">R$</span>}
          displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          disabled={isLoading}
        />
        
        <FormattedNumericInput
          label="Taxa Anual de Juros (%)"
          id="rateValue"
          name="rateValue"
          value={inputValues.rateValue}
          onChange={handleFormattedChange}
          max={1000} // Allow higher rates
          min={-100} // Allow negative rates
          icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
          displayOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 4 }} // More precision for rates
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
          Taxa Anual: {formatNumberForDisplay(inputValues.rateValue, {minimumFractionDigits:2, maximumFractionDigits:2})}% a.a. 
          (Equivalente a aprox. {monthlyEquivalentRatePercent.toFixed(4)}% a.m. para os cálculos com aportes mensais.)
        </p>
      </div>

      <Button
        type="button"
        onClick={onSimulate}
        variant="primary"
        size="lg"
        className="w-full mt-8"
        disabled={isLoading} // Disable button when loading
      >
        {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Simulando...
            </>
          ) : (
            'Simular'
          )}
      </Button>
    </form>
  );
};

export default InputForm;
