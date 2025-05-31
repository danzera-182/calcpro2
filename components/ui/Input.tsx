
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, icon, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                {icon}
            </div>
        )}
        <input
          id={id}
          {...props}
          className={`w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400
                     bg-white text-slate-700 
                     dark:bg-slate-700 dark:text-slate-200
                     placeholder-slate-400 dark:placeholder-slate-500 
                     ${icon ? 'pl-10' : ''} ${props.className || ''}`}
        />
      </div>
    </div>
  );
};

export default Input;
