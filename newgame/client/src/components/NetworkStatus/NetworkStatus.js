import React, { useState, useEffect } from 'react';
import './NetworkStatus.css';

function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Clear the "was offline" flag after showing reconnected message
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !wasOffline) {
    return null; // Don't show anything when online and haven't been offline
  }

  return (
    <div className={`network-status ${isOnline ? 'online' : 'offline'} ${wasOffline && isOnline ? 'reconnected' : ''}`}>
      <div className="network-status-content">
        {!isOnline ? (
          <>
            <span className="network-icon">⚠️</span>
            <span className="network-message">You're offline. Some features may not work.</span>
          </>
        ) : wasOffline ? (
          <>
            <span className="network-icon">✓</span>
            <span className="network-message">Connection restored!</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default NetworkStatus;

