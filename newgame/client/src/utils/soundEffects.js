/**
 * Sound Effects Manager
 * 
 * Manages game sound effects with volume control and mute functionality
 */

class SoundManager {
  constructor() {
    this.sounds = {};
    this.enabled = this.getStoredSetting('soundsEnabled', true);
    this.volume = this.getStoredSetting('soundVolume', 0.5);
    this.audioContext = null;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      // Create AudioContext for Web Audio API
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  getStoredSetting(key, defaultValue) {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  setStoredSetting(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save setting:', error);
    }
  }

  /**
   * Play a sound effect
   */
  play(soundName, options = {}) {
    if (!this.enabled) return;

    const {
      volume = this.volume,
      playbackRate = 1.0,
      loop = false
    } = options;

    // Use Web Audio API for better control
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.playWebAudio(soundName, { volume, playbackRate, loop });
    } else {
      // Fallback to HTML5 Audio
      this.playHTML5Audio(soundName, { volume, playbackRate, loop });
    }
  }

  /**
   * Play sound using Web Audio API (for programmatic sounds)
   */
  playWebAudio(soundName, options) {
    const { volume, playbackRate, loop } = options;

    // Generate simple tones for different game events
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure sound based on event type
    const soundConfig = this.getSoundConfig(soundName);
    oscillator.type = soundConfig.type || 'sine';
    oscillator.frequency.value = soundConfig.frequency || 440;
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * soundConfig.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + soundConfig.duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + soundConfig.duration);
  }

  /**
   * Play sound using HTML5 Audio (for file-based sounds)
   */
  playHTML5Audio(soundName, options) {
    const { volume, playbackRate, loop } = options;

    // For now, use Web Audio API tones
    // In production, you would load actual sound files here
    this.playWebAudio(soundName, { volume, playbackRate, loop });
  }

  /**
   * Get sound configuration for different game events
   */
  getSoundConfig(soundName) {
    const configs = {
      // Win sounds
      win: { frequency: 523.25, duration: 0.3, volume: 0.3, type: 'sine' }, // C5
      bigWin: { frequency: 659.25, duration: 0.5, volume: 0.4, type: 'sine' }, // E5
      jackpot: { frequency: 783.99, duration: 0.8, volume: 0.5, type: 'sine' }, // G5

      // Loss sounds
      lose: { frequency: 220, duration: 0.2, volume: 0.2, type: 'sine' }, // A3
      
      // Game action sounds
      spin: { frequency: 440, duration: 0.1, volume: 0.15, type: 'sawtooth' },
      click: { frequency: 800, duration: 0.05, volume: 0.1, type: 'square' },
      deal: { frequency: 392, duration: 0.15, volume: 0.2, type: 'sine' },
      shuffle: { frequency: 300, duration: 0.3, volume: 0.15, type: 'sawtooth' },
      bet: { frequency: 600, duration: 0.08, volume: 0.12, type: 'square' },
      
      // UI sounds
      button: { frequency: 400, duration: 0.05, volume: 0.1, type: 'square' },
      notification: { frequency: 600, duration: 0.2, volume: 0.2, type: 'sine' }
    };

    return configs[soundName] || configs.click;
  }

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.setStoredSetting('soundsEnabled', enabled);
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.setStoredSetting('soundVolume', this.volume);
  }

  /**
   * Toggle sounds on/off
   */
  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /**
   * Get current enabled state
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get current volume
   */
  getVolume() {
    return this.volume;
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;

