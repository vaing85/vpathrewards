import { useState, useEffect } from 'react';

/**
 * Custom hook for managing game settings in localStorage
 * @param {string} gameName - The name of the game (used as localStorage key)
 * @param {object} defaultSettings - Default settings object
 * @returns {[object, function]} - [settings, updateSettings] tuple
 */
export const useGameSettings = (gameName, defaultSettings = {}) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`${gameName}_settings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all keys exist
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error(`Error loading settings for ${gameName}:`, error);
    }
    return defaultSettings;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(`${gameName}_settings`, JSON.stringify(settings));
    } catch (error) {
      console.error(`Error saving settings for ${gameName}:`, error);
    }
  }, [gameName, settings]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return [settings, updateSettings];
};

