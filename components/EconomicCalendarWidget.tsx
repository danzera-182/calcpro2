
import React, { useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { useTheme } from '../hooks/useTheme'; 

const EconomicCalendarWidget: React.FC = () => {
  const { theme } = useTheme();
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentWidgetRef = widgetContainerRef.current;
    if (!currentWidgetRef) {
      return;
    }

    // Clear previous widget instance before appending a new one
    currentWidgetRef.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    
    const widgetConfig = {
      "colorTheme": theme,
      "isTransparent": false, 
      "width": "100%",
      "height": "100%", 
      "locale": "br",
      "timezone": "America/Sao_Paulo",
      "importanceFilter": "-1,0,1", // Reverted to show all importance levels
      "countryFilter": "us,br,eu,cn"
    };

    script.innerHTML = JSON.stringify(widgetConfig);

    currentWidgetRef.appendChild(script);

    // Cleanup function to remove the script when component unmounts or theme changes
    return () => {
      if (currentWidgetRef) {
        currentWidgetRef.innerHTML = '';
      }
    };
  }, [theme]); // Re-run when theme changes

  return (
    <Card className="border-none">
      <Card.Header>
        <Card.Title>Calendário Econômico (TradingView)</Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        {/* Container for the TradingView widget */}
        <div 
          ref={widgetContainerRef} 
          style={{ height: '550px', width: '100%' }}
          className="rounded-2xl overflow-hidden"
        >
          {/* TradingView widget will be injected here by the script */}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EconomicCalendarWidget;
