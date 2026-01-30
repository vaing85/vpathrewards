/**
 * Web Vitals Tracking
 * Tracks Core Web Vitals (CLS, FID, LCP, FCP, TTFB) and sends to backend
 */

import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { getAuthToken } from './authToken';

let vitalsSent = false;

/**
 * Send web vitals to backend
 */
const sendToBackend = async (metric) => {
  try {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = getAuthToken();

    await fetch(`${API_URL}/performance/web-vitals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Error sending web vitals:', error);
  }
};

/**
 * Initialize Web Vitals tracking
 */
export const initWebVitals = () => {
  if (vitalsSent) return;
  
  try {
    // Track Cumulative Layout Shift (CLS)
    onCLS((metric) => {
      console.log('CLS:', metric);
      sendToBackend(metric);
    });

    // Track Interaction to Next Paint (INP) - replaces FID in v5
    onINP((metric) => {
      console.log('INP:', metric);
      sendToBackend(metric);
    });

    // Track Largest Contentful Paint (LCP)
    onLCP((metric) => {
      console.log('LCP:', metric);
      sendToBackend(metric);
    });

    // Track First Contentful Paint (FCP)
    onFCP((metric) => {
      console.log('FCP:', metric);
      sendToBackend(metric);
    });

    // Track Time to First Byte (TTFB)
    onTTFB((metric) => {
      console.log('TTFB:', metric);
      sendToBackend(metric);
    });

    vitalsSent = true;
  } catch (error) {
    console.error('Error initializing web vitals:', error);
  }
};

/**
 * Get performance timing data
 */
export const getPerformanceTiming = () => {
  if (!window.performance || !window.performance.timing) {
    return null;
  }

  const timing = window.performance.timing;
  const navigation = window.performance.navigation;

  return {
    // DNS lookup time
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    // TCP connection time
    tcp: timing.connectEnd - timing.connectStart,
    // Request time
    request: timing.responseStart - timing.requestStart,
    // Response time
    response: timing.responseEnd - timing.responseStart,
    // DOM processing time
    domProcessing: timing.domComplete - timing.domLoading,
    // Page load time
    pageLoad: timing.loadEventEnd - timing.navigationStart,
    // Navigation type
    navigationType: navigation.type === 0 ? 'navigate' : 
                   navigation.type === 1 ? 'reload' : 
                   navigation.type === 2 ? 'back_forward' : 'prerender'
  };
};

export default {
  initWebVitals,
  getPerformanceTiming
};

