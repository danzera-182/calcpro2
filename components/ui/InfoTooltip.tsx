
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
  className = "relative inline-flex items-center align-middle",
  tooltipWidthClass = "max-w-md"
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Detect touch device on mount
    setIsTouchDevice(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  }, []);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    // Only hide with delay if not a touch device, to allow interaction with tooltip content
    if (!isTouchDevice) {
        timeoutRef.current = window.setTimeout(() => {
            setIsVisible(false);
        }, 200);
    } else {
        // For touch devices, hiding is handled by click toggle or click outside
    }
  }, [isTouchDevice]);

  const handleTriggerClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (isTouchDevice) {
      event.preventDefault(); // Prevent focusing other elements like input fields
      event.stopPropagation(); // Stop event from bubbling up
      setIsVisible(prev => !prev);
    }
    // For non-touch devices, click on trigger does not toggle visibility by default,
    // hover/focus handles it. If a click-to-open on desktop is desired, it would be added here.
  };

  const handleMouseEnterTrigger = () => {
    if (!isTouchDevice) {
      showTooltip();
    }
  };

  const handleMouseLeaveTrigger = () => {
    if (!isTouchDevice) {
      hideTooltip();
    }
  };
  
  const handleFocusTrigger = () => {
    if (!isTouchDevice) {
      showTooltip();
    }
  };

  const handleBlurTrigger = () => {
    if (!isTouchDevice) {
      hideTooltip();
    }
  };


  const handleTooltipInteractionEnter = useCallback(() => {
    if (!isTouchDevice && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [isTouchDevice]);

  const handleTooltipInteractionLeave = useCallback(() => {
    if (!isTouchDevice) {
      hideTooltip();
    }
  }, [hideTooltip, isTouchDevice]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isVisible &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
          tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false); // Close if click is outside trigger and tooltip
      }
    };
    // Add listener only when tooltip is visible
    if (isVisible) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible]); // Re-run when isVisible changes


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

  const triggerElement = children || <StyledQuestionMarkIcon />;

  return (
    <span 
      className={`${className} group`} // Added group for icon styling
      ref={triggerRef}
      onClick={handleTriggerClick} // Centralized click handler
      onMouseEnter={handleMouseEnterTrigger}
      onMouseLeave={handleMouseLeaveTrigger}
      onFocus={handleFocusTrigger}
      onBlur={handleBlurTrigger}
      tabIndex={0} // Make it focusable
      role="button"
      aria-expanded={isVisible}
      aria-describedby={isVisible ? `tooltip-${triggerRef.current?.id || 'content'}` : undefined}
    >
      {triggerElement}
      {isVisible && (
        <span
          id={`tooltip-${triggerRef.current?.id || 'content'}`}
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 p-3 text-xs sm:text-sm text-white dark:text-slate-100 bg-slate-700/95 dark:bg-slate-900/95 rounded-lg shadow-xl whitespace-normal transition-opacity duration-150 ${tooltipWidthClass} ${positionClasses} ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
