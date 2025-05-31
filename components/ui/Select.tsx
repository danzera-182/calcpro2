
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
}

const Select: React.FC<SelectProps> = ({ label, id, options, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        {...props}
        className={`w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400
                   bg-white text-slate-700 
                   dark:bg-slate-700 dark:text-slate-200
                   ${props.className || ''}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
