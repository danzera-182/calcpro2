
import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, disabled }) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={handleToggle}
      disabled={disabled}
      className={`
        relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500 dark:focus:ring-blue-400
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-500'}
      `}
    >
      <span
        className={`
          inline-block w-4 h-4 transform bg-white dark:bg-slate-200 rounded-full transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};

export default ToggleSwitch;
