import React from 'react';
import './AchievementBadge.css';

function AchievementBadge({ achievement }) {
  const { userProgress } = achievement;
  const isUnlocked = userProgress?.isUnlocked || false;
  const progress = userProgress?.progress || 0;
  const requirement = achievement.requirement;
  const target = requirement.value;

  const getProgressPercentage = () => {
    if (isUnlocked) return 100;
    if (target === 0) return 0;
    return Math.min((progress / target) * 100, 100);
  };

  const getRarityClass = () => {
    return `rarity-${achievement.rarity}`;
  };

  const formatProgress = () => {
    if (requirement.type === 'total_winnings' || requirement.type === 'biggest_win' || 
        requirement.type === 'balance' || requirement.type === 'total_bets') {
      return `$${progress.toLocaleString()}`;
    }
    return progress.toLocaleString();
  };

  const formatTarget = () => {
    if (requirement.type === 'total_winnings' || requirement.type === 'biggest_win' || 
        requirement.type === 'balance' || requirement.type === 'total_bets') {
      return `$${target.toLocaleString()}`;
    }
    return target.toLocaleString();
  };

  return (
    <div className={`achievement-badge ${getRarityClass()} ${isUnlocked ? 'unlocked' : 'locked'}`}>
      <div className="achievement-icon">
        {achievement.icon}
      </div>
      <div className="achievement-content">
        <div className="achievement-header">
          <h3 className="achievement-name">{achievement.name}</h3>
          {isUnlocked && <span className="unlocked-badge">✓</span>}
        </div>
        <p className="achievement-description">{achievement.description}</p>
        
        {!isUnlocked && (
          <div className="achievement-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <div className="progress-text">
              <span>{formatProgress()}</span>
              <span> / {formatTarget()}</span>
            </div>
          </div>
        )}

        {isUnlocked && userProgress?.unlockedAt && (
          <div className="achievement-unlocked-date">
            Unlocked: {new Date(userProgress.unlockedAt).toLocaleDateString()}
          </div>
        )}

        {achievement.reward.type === 'bonus' && achievement.reward.amount > 0 && (
          <div className="achievement-reward">
            Reward: ${achievement.reward.amount}
          </div>
        )}
      </div>
    </div>
  );
}

export default AchievementBadge;

