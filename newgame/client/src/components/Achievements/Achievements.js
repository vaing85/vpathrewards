import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../Loading/LoadingSpinner';
import { CardSkeleton } from '../Loading/SkeletonLoader';
import AchievementBadge from './AchievementBadge';
import BackToDashboard from '../Navigation/BackToDashboard';
import './Achievements.css';

function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filter, setFilter] = useState('all'); // all, unlocked, locked
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAchievements();
  }, [user]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/achievements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAchievements(response.data.achievements || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'games', 'winnings', 'streaks', 'milestones', 'special'];
  const filters = ['all', 'unlocked', 'locked'];

  const getCategoryLabel = (category) => {
    const labels = {
      all: 'All Categories',
      games: 'Games',
      winnings: 'Winnings',
      streaks: 'Streaks',
      milestones: 'Milestones',
      special: 'Special'
    };
    return labels[category] || category;
  };

  const getFilterLabel = (filter) => {
    const labels = {
      all: 'All Achievements',
      unlocked: 'Unlocked',
      locked: 'Locked'
    };
    return labels[filter] || filter;
  };

  const filteredAchievements = achievements.filter(achievement => {
    // Category filter
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) {
      return false;
    }
    // Status filter
    if (filter === 'unlocked' && !achievement.userProgress?.isUnlocked) {
      return false;
    }
    if (filter === 'locked' && achievement.userProgress?.isUnlocked) {
      return false;
    }
    return true;
  });

  const unlockedCount = achievements.filter(a => a.userProgress?.isUnlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="achievements-container">
        <div className="achievements-header">
          <h1>Achievements</h1>
        </div>
        <div className="achievements-grid">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="achievements-container">
      <BackToDashboard />
      <div className="achievements-header">
        <div>
          <h1>Achievements</h1>
          <p className="achievements-subtitle">
            Unlock achievements by playing games and reaching milestones
          </p>
        </div>
        <div className="achievements-stats">
          <div className="stat-card">
            <div className="stat-value">{unlockedCount}</div>
            <div className="stat-label">Unlocked</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completionPercentage}%</div>
            <div className="stat-label">Complete</div>
          </div>
        </div>
      </div>

      <div className="achievements-filters">
        <div className="filter-group">
          <label>Category:</label>
          <div className="filter-buttons">
            {categories.map(category => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <div className="filter-buttons">
            {filters.map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {getFilterLabel(f)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredAchievements.length === 0 ? (
        <div className="no-achievements">
          <p>No achievements found matching your filters.</p>
        </div>
      ) : (
        <div className="achievements-grid">
          {filteredAchievements.map(achievement => (
            <AchievementBadge
              key={achievement._id}
              achievement={achievement}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Achievements;

