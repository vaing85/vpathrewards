import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Initialize axios interceptors for error tracking
import './utils/axiosInterceptor';
// Register service worker for PWA
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
// Initialize mobile detection
import { initMobileDetection, preventDoubleTapZoom } from './utils/mobileUtils';
// Initialize web vitals tracking
import { initWebVitals } from './utils/webVitals';

// Initialize mobile optimizations
initMobileDetection();
preventDoubleTapZoom();

// Initialize web vitals tracking
initWebVitals();

serviceWorkerRegistration.register();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

