import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import './index.css';

const theme = localStorage.getItem('ai-job-predictor-storage') 
  ? JSON.parse(localStorage.getItem('ai-job-predictor-storage')).state?.theme || 'light'
  : 'light';

document.documentElement.classList.toggle('dark', theme === 'dark');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
