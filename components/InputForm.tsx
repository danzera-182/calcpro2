import React from 'react';
import { InputFormData } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
// import Select from './ui/Select'; // No longer used
import ToggleSwitch from './ui/ToggleSwitch'; // Import the new ToggleSwitch

interface InputFormProps {
  inputValues: InputFormData;
  onFormChange: (values: Partial<InputFormData>) => void;
  onSimulate: () => void;
}

const InputForm: React.FC<InputFormProps> = ({
  inputValues,
  onFormChange,
  onSimulate
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    const target = e.target;

    if (target instanceof HTMLInputElement && target.type === 'number' && name !== 'frequencyType') {
      parsedValue = value === '' ? 0 : parseFloat(value);
      if (name === 'rateValue' || name === 'initialInvestment' || name === 'contributionValue') {
        if ( (name === 'initialInvestment' || name === 'contributionValue') && parsedValue < 0 && target.min === '0') {
            parsedValue = 0;
        }
      }
    }
    
    onFormChange({ [name]: parsedValue });
  };

  const handleFrequencyToggle = (isChecked: boolean) => {
    onFormChange({ frequencyType: isChecked ? 'yearly' : 'monthly' });
  };

  const contributionLabel = inputValues.frequencyType === 'yearly' 
    ? "Aporte Anual (R$)" 
    : "Aporte Mensal (R$)";
  
  const rateLabel = inputValues.frequencyType === 'yearly' 
    ? "Taxa Anual de Juros (%)" 
    : "Taxa Mensal de Juros (%)";

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Static Parameters First */}
      <Input
        label="Valor Inicial (R$)"
        type="number"
        id="initialInvestment"
        name="initialInvestment"
        value={inputValues.initialInvestment.toString()}
        onChange={handleChange}
        min="0"
        step="100"
        icon={<span className="text-gray-400 dark:text-gray-500">R$</span>}
      />
      <Input
        label="Período (Anos)"
        type="number"
        id="investmentPeriodYears"
        name="investmentPeriodYears"
        value={inputValues.investmentPeriodYears.toString()}
        onChange={handleChange}
        min="1"
        step="1"
        icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 dark:text-gray-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008Z" />
        </svg>}
      />
      
      {/* Frequency Dependent Section */}
      <div className="pt-5 border-t border-gray-200 dark:border-slate-700/60 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-blue-400 mb-2">
            Frequência
          </label>
          <div className="flex items-center space-x-3">
            <span className={`text-sm ${inputValues.frequencyType === 'monthly' ? 'font-semibold text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
              Mensal
            </span>
            <ToggleSwitch
              id="frequencyTypeToggle"
              checked={inputValues.frequencyType === 'yearly'}
              onChange={handleFrequencyToggle}
            />
            <span className={`text-sm ${inputValues.frequencyType === 'yearly' ? 'font-semibold text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
              Anual
            </span>
          </div>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Define se os aportes e a taxa de juros abaixo são mensais ou anuais.
          </p>
        </div>

        <Input
          label={contributionLabel}
          type="number"
          id="contributionValue"
          name="contributionValue"
          value={inputValues.contributionValue.toString()}
          onChange={handleChange}
          min="0"
          step="50"
          icon={<span className="text-gray-400 dark:text-gray-500">R$</span>}
        />
        
        <Input
          label={rateLabel}
          type="number"
          id="rateValue"
          name="rateValue"
          value={inputValues.rateValue.toString()}
          onChange={handleChange} 
          max={inputValues.frequencyType === 'monthly' ? 20 : 100}
          step="0.1"
          icon={<span className="text-gray-400 dark:text-gray-500">%</span>}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3"> {/* Adjusted margin */}
          {inputValues.frequencyType === 'monthly' 
            ? `Taxa de juros mensal: ${inputValues.rateValue.toFixed(2)}%. (Taxa Anual Efetiva: ${inputValues.effectiveAnnualRate.toFixed(2)}% a.a.)`
            : `Taxa de juros anual: ${inputValues.rateValue.toFixed(2)}% a.a.`
          }
        </p>
      </div>

      <Button
        type="button"
        onClick={onSimulate}
        variant="primary"
        size="lg"
        className="w-full mt-8" // Adjusted top margin
      >
        Simular
      </Button>
    </form>
  );
};

export default InputForm;