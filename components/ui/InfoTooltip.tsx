import React, { useState, useRef } from 'react';

interface InfoTooltipProps {
  text: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const InfoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  };

  const hideTooltip = (immediate = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (immediate) {
        setIsVisible(false);
    } else {
        timeoutRef.current = window.setTimeout(() => {
          setIsVisible(false);
        }, 200); // Small delay to allow mouse travel to tooltip
    }
  };
  
  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    hideTooltip();
  };
  

  let positionClasses = '';
  switch (position) {
    case 'top':
      positionClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      break;
    case 'bottom':
      positionClasses = 'top-full left-1/2 -translate-x-1/2 mt-2';
      break;
    case 'left':
      positionClasses = 'right-full top-1/2 -translate-y-1/2 mr-2';
      break;
    case 'right':
      positionClasses = 'left-full top-1/2 -translate-y-1/2 ml-2';
      break;
  }

  return (
    <span 
      className="relative inline-flex items-center" 
      onMouseEnter={showTooltip} 
      onMouseLeave={() => hideTooltip()}
      onFocus={showTooltip}
      onBlur={() => hideTooltip(true)} // Hide immediately on blur
      tabIndex={0} // Make it focusable
      role="tooltip"
      aria-describedby={isVisible ? `tooltip-text-${text.substring(0,10)}` : undefined}
    >
      {children || <InfoIcon className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" />}
      {isVisible && (
        <span
          id={`tooltip-text-${text.substring(0,10)}`}
          className={`absolute ${positionClasses} w-max max-w-xs p-2 text-xs text-white bg-gray-700 dark:bg-slate-800 rounded-md shadow-lg z-10 whitespace-normal`}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default InfoTooltip;
