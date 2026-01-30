/**
 * Service Worker Registration
 * 
 * Registers the service worker for PWA functionality
 */

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (process.env.NODE_ENV === 'production') {
        // Register service worker in production
        navigator.serviceWorker
          .register(swUrl)
          .then((registration) => {
            console.log('[Service Worker] Registered successfully:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('[Service Worker] New content available, please refresh');
                    // You can show a notification to the user here
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('[Service Worker] Registration failed:', error);
          });
      } else {
        // In development, unregister any existing service workers
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister();
        });
      }
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}

