
import React from 'react';
import { Card } from './ui/Card';
import { useTheme } from '../hooks/useTheme'; 

const EconomicCalendarWidget: React.FC = () => {
  const { theme } = useTheme();

  // Países atualizados: Brasil (32), EUA (5), China (35), Zona do Euro (72)
  const baseParams = "columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=32,5,35,72&calType=day&timeZone=12&lang=1";
  
  let styleParams = "";
  if (theme === 'light') {
    styleParams = `&backgroundColor=%23FFFFFF` + // white
                  `&ecoDayBackground=%23F8FAFC` + // slate-50
                  `&textColor=%23334155` +       // slate-700
                  `&borderColor=%23E2E8F0` +     // slate-200
                  `&headerColor=%231D4ED8` +      // primary-dark (blue-700)
                  `&linkColor=%232563EB`;        // primary (blue-600)
  } else { // dark theme
    styleParams = `&backgroundColor=%231E293B` + // slate-800
                  `&ecoDayBackground=%230F172A` + // slate-900
                  `&textColor=%23CBD5E1` +       // slate-300
                  `&borderColor=%23334155` +     // slate-700
                  `&headerColor=%2360A5FA` +      // blue-400
                  `&linkColor=%233B82F6`;        // primary-light (blue-500)
  }

  const iframeSrc = `https://sslecal2.investing.com?${baseParams}${styleParams}`;
  // Original dimensions: width="650" height="467"
  // Aspect ratio: (467 / 650) * 100 = 71.846%

  return (
    <Card>
      <Card.Header>
        <Card.Title>Calendário Econômico (Investing.com)</Card.Title>
      </Card.Header>
      <Card.Content>
        <div style={{
          position: 'relative',
          paddingBottom: '71.846%', // Aspect Ratio
          height: 0,
          overflow: 'hidden',
          // maxWidth: '650px', // Removido para melhorar a responsividade em telas menores
          margin: '0 auto', 
          border: '1px solid', 
          borderRadius: '0.75rem', 
        }}
        className="border-slate-200 dark:border-slate-700" 
        >
          <iframe
            src={iframeSrc}
            title="Calendário Econômico Investing.com"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
            frameBorder="0"
            allowFullScreen={false} 
          />
        </div>
        <div 
          style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px' }}
          className="text-slate-600 dark:text-slate-400 text-center mt-3"
        >
          Calendário Econômico em Tempo Real fornecido por <a
            href="https://www.investing.com/"
            rel="nofollow noreferrer"
            target="_blank"
            className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >Investing.com</a>.
        </div>
      </Card.Content>
    </Card>
  );
};

export default EconomicCalendarWidget;
