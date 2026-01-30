import React from 'react';
import './SkeletonLoader.css';

/**
 * Skeleton Loader Component
 * 
 * Used to show loading placeholders for content
 */
const SkeletonLoader = ({ 
  variant = 'text', 
  width = '100%', 
  height = '1em',
  count = 1,
  className = ''
}) => {
  const skeletons = Array(count).fill(0).map((_, i) => (
    <div
      key={i}
      className={`skeleton ${variant} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  ));

  return <>{skeletons}</>;
};

/**
 * Card Skeleton - For game cards, dashboard cards, etc.
 */
export const CardSkeleton = ({ count = 1 }) => {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton skeleton-image" style={{ height: '200px' }} />
          <div className="skeleton-card-content">
            <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '12px' }} />
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Game Skeleton - For game loading states
 */
export const GameSkeleton = () => {
  return (
    <div className="skeleton-game-container" aria-hidden="true">
      <div className="skeleton skeleton-header" style={{ height: '60px', marginBottom: '20px' }} />
      <div className="skeleton-game-layout">
        <div className="skeleton-game-main">
          <div className="skeleton skeleton-box" style={{ height: '400px', marginBottom: '20px' }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: '10px' }} />
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        </div>
        <div className="skeleton-game-sidebar">
          <div className="skeleton skeleton-box" style={{ height: '200px', marginBottom: '20px' }} />
          <div className="skeleton skeleton-text" style={{ width: '100%', marginBottom: '10px' }} />
          <div className="skeleton skeleton-text" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;

