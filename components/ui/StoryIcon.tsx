
import React from 'react';
import { StorySource } from '../../types';

interface StoryIconProps {
  source: StorySource;
  onClick: () => void;
  size?: number; // Diameter in pixels
}

const StoryIcon: React.FC<StoryIconProps> = ({ source, onClick, size = 64 }) => {
  const ringColor = source.color || 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600';
  const hasImageIcon = source.iconUrl && source.iconUrl !== "";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center space-y-1 focus:outline-none group"
      aria-label={`Ver notícias de ${source.name}`}
      style={{ minWidth: `${size + 16}px`}} // Ensure enough space for name below
    >
      <div
        className={`p-0.5 rounded-full ${ringColor} transition-transform group-hover:scale-105 group-focus:ring-2 group-focus:ring-offset-2 dark:group-focus:ring-offset-slate-900 group-focus:ring-blue-500`}
        style={{ width: size, height: size }}
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-full w-full h-full flex items-center justify-center overflow-hidden"
        >
          {hasImageIcon ? (
            <img 
              src={source.iconUrl} 
              alt={`${source.name} logo`} 
              className="w-full h-full object-cover" 
              onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if image fails to load
            />
          ) : (
            // Fallback if no image or image failed
            <span className="text-xl font-semibold text-slate-700 dark:text-slate-200">
              {source.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate" style={{maxWidth: `${size+8}px`}}>
        {source.name}
      </span>
    </button>
  );
};

export default StoryIcon;
