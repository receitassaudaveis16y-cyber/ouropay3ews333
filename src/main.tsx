import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (
    message.includes('Supabase credentials') ||
    message.includes('Error creating Supabase') ||
    message.includes('credentials not found')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
