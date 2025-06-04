
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface InfoTooltipProps {
  text: React.ReactNode;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string; 
  tooltipWidthClass?: string; 
}

// New Default Styled Question Mark Icon
const StyledQuestionMarkIcon: React.FC = () => (
  <span 
    className="inline-flex items-center justify-center w-5 h-5 border-2 border-blue-500 dark:border-blue-400 rounded-sm bg-transparent group-hover:bg-blue-50 dark:group-hover:bg-blue-700/30 transition-colors"
    aria-hidden="true"
  >
    <span className="font-bold text-sm text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300">
      ?
    </span>
  </span>
);


const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  text, 
  children, 
  position = 'top', 
  className = "relative inline-flex items-center align-middle", // Adjusted default class for better alignment
  tooltipWidthClass = "max-w-md" 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 200); 
  }, []);
  
  const handleTooltipInteractionEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleTooltipInteractionLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isVisible && 
          triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
          tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible]);


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
      ref={triggerRef}
      className={`${className} group`} // Added group for hover effects on the icon
      onMouseEnter={showTooltip} 
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip} 
      tabIndex={0} 
      role="tooltip"
      aria-describedby={isVisible ? `tooltip-text-${String(text).substring(0,10)}` : undefined}
    >
      {children || <StyledQuestionMarkIcon />} {/* Use new default icon */}
      {isVisible && (
        <span
          ref={tooltipRef}
          id={`tooltip-text-${String(text).substring(0,10)}`}
          role="document"
          className={`absolute ${positionClasses} ${tooltipWidthClass} p-3 text-xs text-white bg-slate-700 dark:bg-slate-800 rounded-lg shadow-xl z-20 whitespace-normal ring-1 ring-slate-600 dark:ring-slate-700`}
          onMouseEnter={handleTooltipInteractionEnter}
          onMouseLeave={handleTooltipInteractionLeave}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default InfoTooltip;
