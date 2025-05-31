
import React, { ReactNode } from 'react';

// Define specific props interfaces for each sub-component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  // className is part of HTMLAttributes
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  // className is part of HTMLAttributes
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  // className is part of HTMLAttributes
}

interface CardRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const CardRoot: React.FC<CardRootProps> = ({ children, className, ...rest }) => {
  return (
    <div 
      className={`
        bg-white dark:bg-slate-800/80 
        backdrop-blur-xl 
        shadow-premium rounded-2xl 
        overflow-hidden 
        border border-gray-200 dark:border-slate-700
        ${className || ''}
      `} 
      {...rest}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', ...rest }) => {
  return <div className={`p-5 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 ${className}`} {...rest}>{children}</div>;
};

const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', ...rest }) => {
  return <h2 className={`text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 ${className}`} {...rest}>{children}</h2>;
};

const CardContent: React.FC<CardContentProps> = ({ children, className = '', ...rest }) => {
  return <div className={`p-5 sm:p-6 ${className}`} {...rest}>{children}</div>;
};

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Content: CardContent,
});
