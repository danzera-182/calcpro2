
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyle = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 inline-flex items-center justify-center transition-all duration-150 active:scale-95";

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-400 shadow-subtle',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 focus:ring-slate-500 shadow-subtle',
    ghost: 'bg-transparent hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-subtle',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };

  return (
    <button
      type="button"
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
