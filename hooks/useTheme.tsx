
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Theme, ThemeContextType } from '../types';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        // Validate that the stored theme is actually one of the expected values
        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
          return storedTheme;
        }
      } catch (e) {
        console.warn("Error accessing localStorage for theme:", e);
        // Fall through to use matchMedia or default
      }

      try {
        // Check if matchMedia is available and is a function
        if (window.matchMedia && typeof window.matchMedia === 'function') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      } catch (e) {
        console.warn("Error accessing window.matchMedia for theme:", e);
        // Fall through to default
      }
      return 'light'; // Default if localStorage and matchMedia fail or are unavailable
    }
    return 'light'; // Default for non-browser environments
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.document && window.document.documentElement) {
        const root = window.document.documentElement;
        if (theme === 'dark') {
          root.classList.remove('light'); // Ensure light is removed if dark is added
          root.classList.add('dark');
        } else {
          root.classList.remove('dark'); // Ensure dark is removed if light is added
          root.classList.add('light');
        }
        
        // Also guard localStorage access here
        if (window.localStorage) {
          localStorage.setItem('theme', theme);
        }
      }
    } catch (e) {
      console.warn("Error applying theme or saving to localStorage:", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
