import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../Notifications/NotificationBell';
import DailyLoginBonus from '../Bonuses/DailyLoginBonus';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import './Dashboard.css';

function PlayerDashboard() {
  const { user, logout, fetchUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  
  // Load saved dashboard settings from localStorage on mount
  const [activeTab, setActiveTab] = useState('card');
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const gamesGridRef = useRef(null);
  const hasLoadedSettings = useRef(false);
  const loadedTabValue = useRef(null); // Track what we loaded from localStorage
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!hasLoadedSettings.current) {
      try {
        const saved = localStorage.getItem('dashboard_settings');
        console.log('Loading dashboard settings on mount:', saved);
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('Parsed settings:', parsed);
          if (parsed && parsed.activeTab) {
            console.log('Restoring tab from localStorage:', parsed.activeTab);
            loadedTabValue.current = parsed.activeTab; // Store what we loaded
            setActiveTab(parsed.activeTab);
          } else {
            loadedTabValue.current = 'card'; // Default value
          }
        } else {
          console.log('No saved settings found, using default: card');
          loadedTabValue.current = 'card'; // Default value
        }
        hasLoadedSettings.current = true;
      } catch (e) {
        console.error('Error loading dashboard settings:', e);
        loadedTabValue.current = 'card'; // Default value on error
        hasLoadedSettings.current = true;
      }
    }
  }, []);

  // Save dashboard settings to localStorage when they change (but not on initial load)
  useEffect(() => {
    if (!hasLoadedSettings.current) {
      return; // Don't save until we've loaded settings
    }
    // Don't save if this is the value we just loaded (prevents overwriting with default)
    if (loadedTabValue.current !== null && activeTab === loadedTabValue.current) {
      console.log('Skipping save - this is the loaded value:', activeTab);
      return;
    }
    try {
      console.log('Saving dashboard settings via useEffect:', activeTab);
      localStorage.setItem('dashboard_settings', JSON.stringify({ activeTab }));
      console.log('Saved successfully to localStorage');
      loadedTabValue.current = activeTab; // Update tracked value after saving
    } catch (e) {
      console.error('Error saving dashboard settings:', e);
    }
  }, [activeTab]);

  // Wrapper function to update activeTab and save immediately
  const handleTabChange = (tab) => {
    console.log('Tab changing to:', tab);
    try {
      // Save first, then update state
      const settings = { activeTab: tab };
      localStorage.setItem('dashboard_settings', JSON.stringify(settings));
      console.log('Saved to localStorage:', settings);
      // Verify it was saved
      const verify = localStorage.getItem('dashboard_settings');
      console.log('Verified saved value:', verify);
      loadedTabValue.current = tab; // Update tracked value
      setActiveTab(tab);
    } catch (e) {
      console.error('Error saving dashboard settings:', e);
      setActiveTab(tab); // Still update state even if save fails
    }
  };

  useEffect(() => {
    if (user) {
      setStats({
        gamesPlayed: user.gamesPlayed || {},
        totalWinnings: user.totalWinnings || 0,
        totalBets: user.totalBets || 0
      });
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const checkScrollPosition = () => {
    if (gamesGridRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = gamesGridRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const grid = gamesGridRef.current;
    if (grid) {
      grid.addEventListener('scroll', checkScrollPosition);
      // Check on resize
      window.addEventListener('resize', checkScrollPosition);
      return () => {
        grid.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
      };
    }
  }, [activeTab]);

  const scrollLeft = () => {
    if (gamesGridRef.current) {
      gamesGridRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (gamesGridRef.current) {
      gamesGridRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    // Validate password match if password is provided
    if (profileData.password && profileData.password !== profileData.confirmPassword) {
      setProfileError('Passwords do not match');
      return;
    }

    try {
      const updateData = {
        username: profileData.username,
        email: profileData.email
      };

      // Only include password if it's provided
      if (profileData.password) {
        updateData.password = profileData.password;
      }

      const response = await axios.put(`${API_URL}/users/profile`, updateData);
      await fetchUser();
      setProfileSuccess('Profile updated successfully!');
      setProfileData({
        ...profileData,
        password: '',
        confirmPassword: ''
      });
      setProfileEditMode(false);
      setTimeout(() => {
        setProfileSuccess('');
      }, 2000);
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🎰 Welcome, {user?.username}!</h1>
        <div className="header-actions">
          <ThemeToggle />
          <NotificationBell />
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="profile-icon-btn"
            title="Profile"
          >
            👤
          </button>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="profile-modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>My Profile</h2>
              <button 
                onClick={() => setShowProfile(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="profile-modal-content">
              {!profileEditMode ? (
                <div className="profile-display">
                  <div className="profile-info">
                    <div className="profile-item">
                      <span className="profile-label">Username:</span>
                      <span className="profile-value">{user?.username}</span>
                    </div>
                    <div className="profile-item">
                      <span className="profile-label">Email:</span>
                      <span className="profile-value">{user?.email}</span>
                    </div>
                    <div className="profile-item">
                      <span className="profile-label">Member Since:</span>
                      <span className="profile-value">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setProfileEditMode(true)}
                    className="btn btn-primary"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="profile-form">
                  {profileError && <div className="error-message">{profileError}</div>}
                  {profileSuccess && <div className="success-message">{profileSuccess}</div>}
                  <div className="form-group">
                    <label htmlFor="profile-username">Username</label>
                    <input
                      type="text"
                      id="profile-username"
                      name="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="input"
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-email">Email</label>
                    <input
                      type="email"
                      id="profile-email"
                      name="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="input"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-password">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      id="profile-password"
                      name="password"
                      value={profileData.password}
                      onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                      className="input"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                  </div>
                  {profileData.password && (
                    <div className="form-group">
                      <label htmlFor="profile-confirm-password">Confirm New Password</label>
                      <input
                        type="password"
                        id="profile-confirm-password"
                        name="confirmPassword"
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                        className="input"
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                      />
                    </div>
                  )}
                  <div className="profile-form-actions">
                    <button 
                      type="button" 
                      onClick={() => {
                        setProfileEditMode(false);
                        setProfileData({
                          username: user?.username || '',
                          email: user?.email || '',
                          password: '',
                          confirmPassword: ''
                        });
                        setProfileError('');
                        setProfileSuccess('');
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      Update Profile
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <DailyLoginBonus />
        <div className="balance-card card">
          <h2>Your Balance</h2>
          <div className="balance-amount">${user?.balance || 0}</div>
          <div className="balance-actions">
            <button 
              onClick={() => navigate('/transactions/deposit')} 
              className="btn btn-primary"
            >
              💰 Deposit/Withdraw
            </button>
            <button 
              onClick={() => navigate('/transactions/history')} 
              className="btn btn-secondary"
            >
              📜 Transaction History
            </button>
            <button 
              onClick={() => navigate('/games/history')} 
              className="btn btn-secondary"
            >
              🎮 Game History
            </button>
            <button 
              onClick={() => navigate('/leaderboard')} 
              className="btn btn-secondary"
            >
              🏆 Leaderboard
            </button>
            <button 
              onClick={() => navigate('/bonuses/history')} 
              className="btn btn-secondary"
            >
              🎁 Bonus History
            </button>
            <button 
              onClick={() => navigate('/stats')} 
              className="btn btn-secondary"
            >
              📊 Game Statistics
            </button>
            <button 
              onClick={() => navigate('/achievements')} 
              className="btn btn-secondary"
            >
              🏅 Achievements
            </button>
          </div>
        </div>

        <div className="games-section">
          <div className="tabs-container">
            <button 
              type="button"
              className={`tab ${activeTab === 'card' ? 'active' : ''}`}
              onClick={() => handleTabChange('card')}
            >
              🃏 Card Games
            </button>
            <button 
              type="button"
              className={`tab ${activeTab === 'dice' ? 'active' : ''}`}
              onClick={() => handleTabChange('dice')}
            >
              🎲 Dice & Numbers
            </button>
            <button 
              type="button"
              className={`tab ${activeTab === 'wheel' ? 'active' : ''}`}
              onClick={() => handleTabChange('wheel')}
            >
              🎡 Wheel Games
            </button>
            <button 
              type="button"
              className={`tab ${activeTab === 'lottery' ? 'active' : ''}`}
              onClick={() => handleTabChange('lottery')}
            >
              🎫 Lottery & Selection
            </button>
            <button 
              type="button"
              className={`tab ${activeTab === 'instant' ? 'active' : ''}`}
              onClick={() => handleTabChange('instant')}
            >
              ⚡ Instant Win
            </button>
            <button 
              type="button"
              className={`tab ${activeTab === 'slots' ? 'active' : ''}`}
              onClick={() => handleTabChange('slots')}
            >
              🎰 Slot Machines
            </button>
          </div>

          {activeTab === 'card' && (
          <div className="games-grid-wrapper">
            {showLeftArrow && (
              <button className="scroll-arrow scroll-arrow-left" onClick={scrollLeft} aria-label="Scroll left">
                ‹
              </button>
            )}
            <div className="games-grid" ref={gamesGridRef}>
            <div 
              className="game-card card" 
              data-game-type="card" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/games/blackjack');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/games/blackjack');
                }
              }}
            >
              <div className="game-icon">🃏</div>
              <h3>Blackjack</h3>
              <p>Beat the dealer!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.blackjack || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/poker')}>
              <div className="game-icon">🃏</div>
              <h3>Video Poker</h3>
              <p>Get the best hand!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.poker || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/texasholdem')}>
              <div className="game-icon">🃏</div>
              <h3>Texas Hold'em</h3>
              <p>Popular poker variant</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.texasholdem || 0} times</div>
            </div>
            <div 
              className="game-card card" 
              data-game-type="card" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/games/threecardpoker');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/games/threecardpoker');
                }
              }}
            >
              <div className="game-icon">🃏</div>
              <h3>Three Card Poker</h3>
              <p>Fast-paced poker</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.threecardpoker || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/caribbeanstud')}>
              <div className="game-icon">🃏</div>
              <h3>Caribbean Stud</h3>
              <p>Progressive jackpots</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.caribbeanstud || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/paigow')}>
              <div className="game-icon">🃏</div>
              <h3>Pai Gow</h3>
              <p>Two hands poker</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.paigow || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/letitride')}>
              <div className="game-icon">🃏</div>
              <h3>Let It Ride</h3>
              <p>Pull back bets</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.letitride || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/casinowar')}>
              <div className="game-icon">🃏</div>
              <h3>Casino War</h3>
              <p>Higher card wins!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.casinowar || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/reddog')}>
              <div className="game-icon">🃏</div>
              <h3>Red Dog</h3>
              <p>Card comparison</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.reddog || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/baccarat')}>
              <div className="game-icon">🎴</div>
              <h3>Baccarat</h3>
              <p>Player, banker, or tie</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.baccarat || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/spanish21')}>
              <div className="game-icon">🃏</div>
              <h3>Spanish 21</h3>
              <p>Spanish deck variant</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.spanish21 || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/pontoon')}>
              <div className="game-icon">🃏</div>
              <h3>Pontoon</h3>
              <p>British blackjack</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.pontoon || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/doubleexposure')}>
              <div className="game-icon">🃏</div>
              <h3>Double Exposure</h3>
              <p>Both cards face up</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.doubleexposure || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/perfectpairs')}>
              <div className="game-icon">🃏</div>
              <h3>Perfect Pairs</h3>
              <p>Pair betting</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.perfectpairs || 0} times</div>
            </div>
            </div>
            {showRightArrow && (
              <button className="scroll-arrow scroll-arrow-right" onClick={scrollRight} aria-label="Scroll right">
                ›
              </button>
            )}
          </div>
          )}

          {activeTab === 'dice' && (
          <div className="games-grid-wrapper">
            {showLeftArrow && (
              <button className="scroll-arrow scroll-arrow-left" onClick={scrollLeft} aria-label="Scroll left">
                ‹
              </button>
            )}
            <div className="games-grid" ref={gamesGridRef}>
            <div className="game-card card" data-game-type="dice" onClick={() => navigate('/games/craps')}>
              <div className="game-icon">🎲</div>
              <h3>Craps</h3>
              <p>Roll the dice!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.craps || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="dice" onClick={() => navigate('/games/sicbo')}>
              <div className="game-icon">🎲</div>
              <h3>Sic Bo</h3>
              <p>Three dice game</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.sicbo || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/dragontiger')}>
              <div className="game-icon">🐉</div>
              <h3>Dragon Tiger</h3>
              <p>Simple comparison</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.dragontiger || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="dice" onClick={() => navigate('/games/bigsmall')}>
              <div className="game-icon">🎲</div>
              <h3>Big Small</h3>
              <p>Bet on dice sum</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.bigsmall || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="card" onClick={() => navigate('/games/hilo')}>
              <div className="game-icon">🃏</div>
              <h3>Hi-Lo</h3>
              <p>High or low card</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.hilo || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="slot" onClick={() => navigate('/games/lucky7')}>
              <div className="game-icon">🎰</div>
              <h3>Lucky 7</h3>
              <p>Lucky number game</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.lucky7 || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="dice" onClick={() => navigate('/games/diceduel')}>
              <div className="game-icon">🎲</div>
              <h3>Dice Duel</h3>
              <p>Roll vs house</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.diceduel || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/numbermatch')}>
              <div className="game-icon">🎯</div>
              <h3>Number Match</h3>
              <p>Match numbers</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.numbermatch || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="instant" onClick={() => navigate('/games/quickdraw')}>
              <div className="game-icon">⚡</div>
              <h3>Quick Draw</h3>
              <p>Fast selection</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.quickdraw || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/numberwheel')}>
              <div className="game-icon">🎡</div>
              <h3>Number Wheel</h3>
              <p>Spin for numbers</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.numberwheel || 0} times</div>
            </div>
            </div>
            {showRightArrow && (
              <button className="scroll-arrow scroll-arrow-right" onClick={scrollRight} aria-label="Scroll right">
                ›
              </button>
            )}
          </div>
          )}

          {activeTab === 'wheel' && (
          <div className="games-grid-wrapper">
            {showLeftArrow && (
              <button className="scroll-arrow scroll-arrow-left" onClick={scrollLeft} aria-label="Scroll left">
                ‹
              </button>
            )}
            <div className="games-grid" ref={gamesGridRef}>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/roulette')}>
              <div className="game-icon">🎡</div>
              <h3>Roulette</h3>
              <p>Spin the wheel!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.roulette || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/wheel')}>
              <div className="game-icon">🎡</div>
              <h3>Wheel of Fortune</h3>
              <p>Big multipliers!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.wheel || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/moneywheel')}>
              <div className="game-icon">💰</div>
              <h3>Money Wheel</h3>
              <p>Cash prizes</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.moneywheel || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/bigsix')}>
              <div className="game-icon">🎡</div>
              <h3>Big Six</h3>
              <p>Classic wheel</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.bigsix || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/colorwheel')}>
              <div className="game-icon">🌈</div>
              <h3>Color Wheel</h3>
              <p>Bet on colors</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.colorwheel || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/multiplierwheel')}>
              <div className="game-icon">🎡</div>
              <h3>Multiplier Wheel</h3>
              <p>Big multipliers</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.multiplierwheel || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/bonuswheel')}>
              <div className="game-icon">🎁</div>
              <h3>Bonus Wheel</h3>
              <p>Bonus prizes</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.bonuswheel || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="wheel" onClick={() => navigate('/games/fortunewheel')}>
              <div className="game-icon">🎡</div>
              <h3>Fortune Wheel</h3>
              <p>Spin for fortune</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.fortunewheel || 0} times</div>
            </div>
            </div>
            {showRightArrow && (
              <button className="scroll-arrow scroll-arrow-right" onClick={scrollRight} aria-label="Scroll right">
                ›
              </button>
            )}
          </div>
          )}

          {activeTab === 'lottery' && (
          <div className="games-grid-wrapper">
            {showLeftArrow && (
              <button className="scroll-arrow scroll-arrow-left" onClick={scrollLeft} aria-label="Scroll left">
                ‹
              </button>
            )}
            <div className="games-grid" ref={gamesGridRef}>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/bingo')}>
              <div className="game-icon">🎱</div>
              <h3>Bingo</h3>
              <p>Match numbers!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.bingo || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/keno')}>
              <div className="game-icon">🎫</div>
              <h3>Keno</h3>
              <p>Pick numbers!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.keno || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/lotterydraw')}>
              <div className="game-icon">🎫</div>
              <h3>Lottery Draw</h3>
              <p>Draw for prizes</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.lotterydraw || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/pick3')}>
              <div className="game-icon">🎯</div>
              <h3>Pick 3</h3>
              <p>Pick 3 numbers</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.pick3 || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/pick5')}>
              <div className="game-icon">🎯</div>
              <h3>Pick 5</h3>
              <p>Pick 5 numbers</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.pick5 || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/numberball')}>
              <div className="game-icon">⚽</div>
              <h3>Number Ball</h3>
              <p>Number selection</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.numberball || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/luckynumbers')}>
              <div className="game-icon">🍀</div>
              <h3>Lucky Numbers</h3>
              <p>Pick lucky numbers</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.luckynumbers || 0} times</div>
            </div>
            </div>
            {showRightArrow && (
              <button className="scroll-arrow scroll-arrow-right" onClick={scrollRight} aria-label="Scroll right">
                ›
              </button>
            )}
          </div>
          )}

          {activeTab === 'instant' && (
          <div className="games-grid-wrapper">
            {showLeftArrow && (
              <button className="scroll-arrow scroll-arrow-left" onClick={scrollLeft} aria-label="Scroll left">
                ‹
              </button>
            )}
            <div className="games-grid" ref={gamesGridRef}>
            <div className="game-card card" data-game-type="lottery" onClick={() => navigate('/games/scratch')}>
              <div className="game-icon">🎫</div>
              <h3>Scratch Cards</h3>
              <p>Scratch and win!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.scratch || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="instant" onClick={() => navigate('/games/instantwin')}>
              <div className="game-icon">⚡</div>
              <h3>Instant Win</h3>
              <p>Instant win game</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.instantwin || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="instant" onClick={() => navigate('/games/match3')}>
              <div className="game-icon">🎮</div>
              <h3>Match 3</h3>
              <p>Match three symbols</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.match3 || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="instant" onClick={() => navigate('/games/coinflip')}>
              <div className="game-icon">🪙</div>
              <h3>Coin Flip</h3>
              <p>Heads or tails</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.coinflip || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="instant" onClick={() => navigate('/games/quickwin')}>
              <div className="game-icon">⚡</div>
              <h3>Quick Win</h3>
              <p>Fast win game</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.quickwin || 0} times</div>
            </div>
            </div>
            {showRightArrow && (
              <button className="scroll-arrow scroll-arrow-right" onClick={scrollRight} aria-label="Scroll right">
                ›
              </button>
            )}
          </div>
          )}

          {activeTab === 'slots' && (
          <div className="games-grid-wrapper">
            {showLeftArrow && (
              <button className="scroll-arrow scroll-arrow-left" onClick={scrollLeft} aria-label="Scroll left">
                ‹
              </button>
            )}
            <div className="games-grid" ref={gamesGridRef}>
            <div className="game-card card" data-game-type="slot" onClick={() => navigate('/games/slots')}>
              <div className="game-icon">🎰</div>
              <h3>Video Slots</h3>
              <p>Spin the reels!</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.slots || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="slot" onClick={() => navigate('/games/classicslots')}>
              <div className="game-icon">🎰</div>
              <h3>Classic Slots</h3>
              <p>Traditional slots</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.classicslots || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="slot" onClick={() => navigate('/games/fruitslots')}>
              <div className="game-icon">🍒</div>
              <h3>Fruit Slots</h3>
              <p>Fruit-themed</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.fruitslots || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="slot" onClick={() => navigate('/games/diamondslots')}>
              <div className="game-icon">💎</div>
              <h3>Diamond Slots</h3>
              <p>Diamond-themed</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.diamondslots || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="slot" onClick={() => navigate('/games/progressiveslots')}>
              <div className="game-icon">🎰</div>
              <h3>Progressive Slots</h3>
              <p>Progressive jackpot</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.progressiveslots || 0} times</div>
            </div>
            <div className="game-card card" data-game-type="slot" onClick={() => navigate('/games/multilineslots')}>
              <div className="game-icon">🎰</div>
              <h3>Multi-Line Slots</h3>
              <p>Multiple paylines</p>
              <div className="game-stats">Played: {stats?.gamesPlayed?.multilineslots || 0} times</div>
            </div>
            </div>
            {showRightArrow && (
              <button className="scroll-arrow scroll-arrow-right" onClick={scrollRight} aria-label="Scroll right">
                ›
              </button>
            )}
          </div>
          )}
        </div>

        <div className="stats-card card">
          <h2>Your Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Winnings</div>
              <div className="stat-value">${stats?.totalWinnings || 0}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Bets</div>
              <div className="stat-value">${stats?.totalBets || 0}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Net Profit</div>
              <div className={`stat-value ${(stats?.totalWinnings || 0) - (stats?.totalBets || 0) >= 0 ? 'positive' : 'negative'}`}>
                ${((stats?.totalWinnings || 0) - (stats?.totalBets || 0)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerDashboard;

