
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // FIX: Changed label type from string to React.ReactNode to allow JSX elements
  label?: React.ReactNode;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, icon, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                {icon}
            </div>
        )}
        <input
          id={id}
          {...props}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 
                     bg-white text-gray-900 
                     dark:bg-gray-700 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500 
                     ${icon ? 'pl-10' : ''} ${props.className || ''}`}
        />
      </div>
    </div>
  );
};

export default Input;