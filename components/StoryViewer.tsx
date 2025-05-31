
import React, { useEffect, useRef } from 'react';
import { NewsItem, StorySource } from '../types';
import Button from './ui/Button'; // Assuming Button component is in ui folder
import { formatCurrency, formatNumberForDisplay } from '../utils/formatters'; // For date formatting consistency

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);


interface StoryViewerProps {
  source: StorySource;
  currentItem: NewsItem;
  currentItemIndex: number;
  totalItems: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  source,
  currentItem,
  currentItemIndex,
  totalItems,
  onClose,
  onNext,
  onPrev,
}) => {
  const SWIPE_THRESHOLD = 50; // Minimum pixels for a swipe
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onNext();
      if (event.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  const formatPubDate = (dateString?: string): string => {
    if (!dateString) return 'Data não disponível';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString; // Fallback to original string
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX; 
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;

    const deltaX = touchEndXRef.current - touchStartXRef.current;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) { // Swipe Right (previous)
        onPrev();
      } else { // Swipe Left (next)
        onNext();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };


  return (
    <div 
        className="fixed inset-0 bg-black/80 dark:bg-black/90 flex flex-col items-center justify-center z-[100] p-2 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-title"
    >
      {/* Progress Bars */}
      <div className="absolute top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 flex space-x-1 px-2 sm:px-0">
        {Array.from({ length: totalItems }).map((_, index) => (
          <div key={index} className="flex-1 h-1 rounded-full bg-white/30 dark:bg-white/20">
            <div
              className={`h-full rounded-full ${index <= currentItemIndex ? (source.color ? '' : 'bg-white dark:bg-slate-200') : ''}`}
              style={{ backgroundColor: index <= currentItemIndex && source.color ? source.color : undefined }}
            />
          </div>
        ))}
      </div>

      {/* Header: Source Info + Close Button */}
      <div className="absolute top-6 sm:top-8 left-2 right-2 sm:left-4 sm:right-4 flex items-center justify-between px-2 sm:px-0 z-10">
         <div className="flex items-center space-x-2">
            {source.iconUrl && (
                <img src={source.iconUrl} alt={`${source.name} logo`} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-white/50" />
            )}
            <span className="text-sm sm:text-md font-semibold text-white">{source.name}</span>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          className="p-1.5 sm:p-2 text-white hover:bg-white/20 rounded-full"
          aria-label="Fechar visualizador de stories"
        >
          <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>

      {/* Content Area: Centered, aspect ratio for story */}
      <div 
        className="relative w-full max-w-md aspect-[9/16] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shadow-2xl flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image (if available) */}
        {currentItem.imageUrl && (
          <div className="w-full h-2/5 sm:h-1/3 flex-shrink-0">
            <img 
                src={currentItem.imageUrl} 
                alt={currentItem.title} 
                className="w-full h-full object-cover" 
                onError={(e) => { e.currentTarget.style.display = 'none';}} // Hide if image fails
            />
          </div>
        )}
        
        {/* Text Content */}
        <div className="flex-grow p-4 overflow-y-auto">
          <h2 id="story-title" className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{currentItem.title}</h2>
          {currentItem.pubDate && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{formatPubDate(currentItem.pubDate)}</p>
          )}
          {currentItem.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentItem.description}
            </p>
          )}
        </div>
        
        {/* Footer: Read More Link */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 mt-auto">
          <a
            href={currentItem.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Ler Matéria Completa &rarr;
          </a>
        </div>
      </div>

      {/* Navigation Buttons (Overlay on Content Sides) */}
      {currentItemIndex > 0 && (
        <button
          onClick={onPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 h-3/4 w-1/4 sm:w-1/5 md:w-1/6 flex items-center justify-start pl-1 sm:pl-2 z-20 text-white/70 hover:text-white"
          aria-label="Notícia anterior"
        >
          <ChevronLeftIcon className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md" />
        </button>
      )}
      {currentItemIndex < totalItems - 1 && (
        <button
          onClick={onNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 h-3/4 w-1/4 sm:w-1/5 md:w-1/6 flex items-center justify-end pr-1 sm:pr-2 z-20 text-white/70 hover:text-white"
          aria-label="Próxima notícia"
        >
          <ChevronRightIcon className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md" />
        </button>
      )}
    </div>
  );
};

export default StoryViewer;
