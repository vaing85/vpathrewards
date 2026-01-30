import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import LoadingSpinner from '../Loading/LoadingSpinner';
import BackToDashboard from '../Navigation/BackToDashboard';
import './Tournaments.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Tournaments() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [filter, setFilter] = useState('all'); // all, upcoming, active, completed

  useEffect(() => {
    fetchTournaments();
  }, [filter]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const status = filter === 'all' ? '' : filter;
      
      const response = await axios.get(`${API_URL}/tournaments?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTournaments(response.data.tournaments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tournamentId) => {
    try {
      const token = getAuthToken();
      await axios.post(`${API_URL}/tournaments/${tournamentId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Successfully joined tournament!');
      fetchTournaments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join tournament');
    }
  };

  const isParticipant = (tournament) => {
    if (!user || !tournament.participants) return false;
    return tournament.participants.some(p => 
      (p.userId?._id || p.userId)?.toString() === user._id
    );
  };

  if (loading) {
    return (
      <div className="tournaments-container">
        <LoadingSpinner size="large" text="Loading tournaments..." />
      </div>
    );
  }

  return (
    <div className="tournaments-container">
      <BackToDashboard />
      <div className="tournaments-header">
        <h2>🏆 Tournaments</h2>
        <div className="tournament-filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'upcoming' ? 'active' : ''}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tournaments-grid">
        {tournaments.map(tournament => (
          <div key={tournament._id} className="tournament-card">
            <div className="tournament-header">
              <h3>{tournament.name}</h3>
              <span className={`status-badge ${tournament.status}`}>
                {tournament.status}
              </span>
            </div>
            
            {tournament.description && (
              <p className="tournament-description">{tournament.description}</p>
            )}

            <div className="tournament-info">
              <div className="info-item">
                <span className="label">Game:</span>
                <span className="value">{tournament.gameType}</span>
              </div>
              <div className="info-item">
                <span className="label">Prize Pool:</span>
                <span className="value prize">${tournament.prizePool?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="info-item">
                <span className="label">Entry Fee:</span>
                <span className="value">${tournament.entryFee?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="info-item">
                <span className="label">Participants:</span>
                <span className="value">
                  {tournament.participants?.length || 0}
                  {tournament.maxParticipants && ` / ${tournament.maxParticipants}`}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Starts:</span>
                <span className="value">
                  {new Date(tournament.startDate).toLocaleString()}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Ends:</span>
                <span className="value">
                  {new Date(tournament.endDate).toLocaleString()}
                </span>
              </div>
            </div>

            {tournament.prizeDistribution && tournament.prizeDistribution.length > 0 && (
              <div className="prize-distribution">
                <h4>Prize Distribution</h4>
                <div className="prize-list">
                  {tournament.prizeDistribution.map((prize, idx) => (
                    <div key={idx} className="prize-item">
                      <span className="rank">#{prize.rank}</span>
                      <span className="prize-amount">
                        {prize.percentage}% + ${prize.fixedAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="tournament-actions">
              {tournament.status === 'upcoming' || tournament.status === 'active' ? (
                isParticipant(tournament) ? (
                  <button className="btn btn-secondary" disabled>
                    Already Joined
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleJoin(tournament._id)}
                  >
                    Join Tournament
                  </button>
                )
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedTournament(tournament)}
                >
                  View Leaderboard
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {tournaments.length === 0 && !loading && (
        <div className="empty-state">
          <p>No tournaments found</p>
        </div>
      )}
    </div>
  );
}

export default Tournaments;

