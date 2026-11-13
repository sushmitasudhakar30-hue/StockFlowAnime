import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { MotionConfig } from 'framer-motion';
import './styles.css';
import './premium.css';

// Apply the saved theme before the first paint (so the login page is dark too, with no flash)
try {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('stockflow_theme_v2') || 'dark');
} catch { document.documentElement.setAttribute('data-theme', 'dark'); }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* reducedMotion="user" → people who turn off animations in their OS get none */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
