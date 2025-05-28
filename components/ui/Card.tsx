
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
        bg-white/75 dark:bg-slate-800/75 
        backdrop-blur-xl 
        shadow-xl rounded-2xl 
        overflow-hidden 
        border border-gray-200/60 dark:border-slate-700/60
        ${className || ''}
      `} 
      {...rest}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', ...rest }) => {
  return <div className={`p-4 sm:p-5 border-b border-slate-900/10 dark:border-slate-50/10 ${className}`} {...rest}>{children}</div>;
};

const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', ...rest }) => {
  return <h2 className={`text-lg sm:text-xl font-semibold text-gray-900 dark:text-white ${className}`} {...rest}>{children}</h2>;
};

const CardContent: React.FC<CardContentProps> = ({ children, className = '', ...rest }) => {
  return <div className={`p-4 sm:p-5 ${className}`} {...rest}>{children}</div>;
};

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Content: CardContent,
});
