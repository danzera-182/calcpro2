
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // Added .tsx extension
import { ThemeProvider } from './hooks/useTheme.tsx'; // Added .tsx extension

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
