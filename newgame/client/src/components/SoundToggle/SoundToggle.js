import React, { useState, useEffect } from 'react';
import soundManager from '../../utils/soundEffects';
import './SoundToggle.css';

/**
 * Sound Toggle Component
 * 
 * Button to toggle sound effects on/off with volume control
 */
const SoundToggle = ({ className = '', showVolume = false }) => {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  useEffect(() => {
    // Update state when sound manager changes
    setEnabled(soundManager.isEnabled());
    setVolume(soundManager.getVolume());
  }, []);

  const handleToggle = () => {
    const newState = soundManager.toggle();
    setEnabled(newState);
    
    // Play a test sound when enabling
    if (newState) {
      soundManager.play('button');
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    soundManager.setVolume(newVolume);
    setVolume(newVolume);
    
    // Play a test sound
    if (enabled) {
      soundManager.play('button', { volume: newVolume });
    }
  };

  const handleVolumeClick = (e) => {
    e.stopPropagation();
    if (showVolume) {
      setShowVolumeSlider(!showVolumeSlider);
    }
  };

  return (
    <div className={`sound-toggle-container ${className}`}>
      <button
        className={`sound-toggle ${enabled ? 'enabled' : 'disabled'}`}
        onClick={handleToggle}
        aria-label={enabled ? 'Disable sound effects' : 'Enable sound effects'}
        title={enabled ? 'Sound: On' : 'Sound: Off'}
      >
        <span className="sound-toggle-icon">
          {enabled ? '🔊' : '🔇'}
        </span>
        {showVolume && (
          <span className="sound-toggle-text">
            {enabled ? 'On' : 'Off'}
          </span>
        )}
      </button>

      {showVolume && showVolumeSlider && enabled && (
        <div className="volume-control" onClick={(e) => e.stopPropagation()}>
          <label htmlFor="volume-slider" className="volume-label">
            Volume
          </label>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
            aria-label="Sound volume"
          />
          <span className="volume-value">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
};

export default SoundToggle;

