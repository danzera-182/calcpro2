
import React from 'react';
import { StorySource } from '../../types';

interface StoryIconProps {
  source: StorySource;
  onClick: () => void;
  size?: number; // Diameter in pixels
}

const StoryIcon: React.FC<StoryIconProps> = ({ source, onClick, size = 64 }) => {
  // Determine ring style: use source color for a solid-ish gradient or a default multi-color gradient
  const ringStyle = source.color 
    ? { background: `linear-gradient(45deg, ${source.color}cc, ${source.color}ff)` } // Slight gradient from semi-transparent to opaque source color
    : { background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }; // Default Instagram-like gradient

  const [hasImageError, setHasImageError] = React.useState(false);
  const showImage = source.iconUrl && !hasImageError;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center space-y-1 focus:outline-none group flex-shrink-0" // Added flex-shrink-0
      aria-label={`Ver notícias de ${source.name}`}
      style={{ width: `${size + 16}px`}} 
    >
      <div
        className="p-0.5 rounded-full transition-transform group-hover:scale-105 group-focus:ring-2 group-focus:ring-offset-2 dark:group-focus:ring-offset-slate-900 group-focus:ring-blue-500"
        style={{ ...ringStyle, width: size, height: size }}
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-full w-full h-full flex items-center justify-center overflow-hidden"
        >
          {showImage ? (
            <img 
              src={source.iconUrl} 
              alt={`${source.name} logo`} 
              className="w-full h-full object-contain p-1" // Changed to object-contain and added padding
              onError={() => setHasImageError(true)} 
            />
          ) : (
            <span className="text-xl font-semibold text-slate-700 dark:text-slate-200 select-none">
              {source.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate w-full text-center" style={{maxWidth: `${size+12}px`}}>
        {source.name}
      </span>
    </button>
  );
};

export default StoryIcon;
