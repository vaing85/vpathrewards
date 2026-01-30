const express = require('express');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth, adminAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { status, gameType, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (gameType) query.gameType = gameType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tournaments = await Tournament.find(query)
      .populate('participants.userId', 'username')
      .populate('createdBy', 'username')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Tournament.countDocuments(query);

    res.json({
      tournaments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants.userId', 'username email')
      .populate('leaderboard.userId', 'username')
      .populate('createdBy', 'username');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create tournament (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      gameType,
      startDate,
      endDate,
      entryFee,
      prizePool,
      maxParticipants,
      minParticipants,
      prizeDistribution
    } = req.body;

    if (!name || !gameType || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const tournament = new Tournament({
      name,
      description,
      gameType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      entryFee: entryFee || 0,
      prizePool: prizePool || 0,
      maxParticipants: maxParticipants || null,
      minParticipants: minParticipants || 2,
      prizeDistribution: prizeDistribution || [
        { rank: 1, percentage: 50, fixedAmount: 0 },
        { rank: 2, percentage: 30, fixedAmount: 0 },
        { rank: 3, percentage: 20, fixedAmount: 0 }
      ],
      createdBy: req.user._id
    });

    await tournament.save();

    await logActivity(req.user._id, 'tournament_created', { tournamentId: tournament._id }, req);

    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join tournament
router.post('/:id/join', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
      return res.status(400).json({ message: 'Tournament is not accepting new participants' });
    }

    // Check if already joined
    const alreadyJoined = tournament.participants.some(
      p => p.userId.toString() === req.user._id.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({ message: 'You are already registered for this tournament' });
    }

    // Check max participants
    if (tournament.maxParticipants && tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ message: 'Tournament is full' });
    }

    // Check entry fee
    const user = await User.findById(req.user._id);
    if (user.balance < tournament.entryFee) {
      return res.status(400).json({ message: 'Insufficient balance to join tournament' });
    }

    // Deduct entry fee
    if (tournament.entryFee > 0) {
      user.balance -= tournament.entryFee;
      tournament.prizePool += tournament.entryFee;
      
      // Create transaction
      await Transaction.create({
        userId: user._id,
        type: 'tournament_entry',
        amount: tournament.entryFee,
        status: 'completed',
        description: `Entry fee for tournament: ${tournament.name}`
      });

      await user.save();
    }

    // Add participant
    tournament.participants.push({
      userId: req.user._id,
      joinedAt: new Date()
    });

    await tournament.save();

    await logActivity(req.user._id, 'tournament_joined', { tournamentId: tournament._id }, req);

    res.json({ message: 'Successfully joined tournament', tournament });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update tournament score (called after game play)
router.post('/:id/update-score', auth, async (req, res) => {
  try {
    const { score, winnings } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'active') {
      return res.status(400).json({ message: 'Tournament is not active' });
    }

    const participant = tournament.participants.find(
      p => p.userId.toString() === req.user._id.toString()
    );

    if (!participant) {
      return res.status(404).json({ message: 'You are not registered for this tournament' });
    }

    // Update participant stats
    participant.score += score || 0;
    participant.gamesPlayed += 1;
    participant.totalWinnings += winnings || 0;

    // Update leaderboard
    tournament.updateLeaderboard();

    await tournament.save();

    res.json({ message: 'Score updated', participant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('leaderboard.userId', 'username');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Update leaderboard before returning
    tournament.updateLeaderboard();
    await tournament.save();

    res.json({
      tournament: {
        id: tournament._id,
        name: tournament.name,
        status: tournament.status,
        prizePool: tournament.prizePool
      },
      leaderboard: tournament.leaderboard
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update tournament (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const updates = req.body;
    delete updates.participants; // Don't allow direct participant updates
    delete updates.leaderboard; // Don't allow direct leaderboard updates

    Object.assign(tournament, updates);
    tournament.updatedAt = new Date();

    await tournament.save();

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start tournament (admin only)
router.post('/:id/start', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.participants.length < tournament.minParticipants) {
      return res.status(400).json({ 
        message: `Tournament requires at least ${tournament.minParticipants} participants` 
      });
    }

    tournament.status = 'active';
    tournament.updatedAt = new Date();

    await tournament.save();

    res.json({ message: 'Tournament started', tournament });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// End tournament and distribute prizes (admin only)
router.post('/:id/end', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'active') {
      return res.status(400).json({ message: 'Tournament is not active' });
    }

    // Update final leaderboard
    tournament.updateLeaderboard();
    tournament.status = 'completed';

    // Distribute prizes
    const prizeRecipients = [];
    for (const distribution of tournament.prizeDistribution) {
      const winner = tournament.leaderboard.find(l => l.rank === distribution.rank);
      if (winner && winner.userId) {
        const prize = tournament.calculatePrize(distribution.rank);
        if (prize > 0) {
          const user = await User.findById(winner.userId);
          if (user) {
            user.balance += prize;
            await user.save();

            // Create transaction
            await Transaction.create({
              userId: user._id,
              type: 'tournament_prize',
              amount: prize,
              status: 'completed',
              description: `Tournament prize: ${tournament.name} - Rank ${distribution.rank}`
            });

            prizeRecipients.push({
              userId: user._id,
              username: user.username,
              rank: distribution.rank,
              prize
            });
          }
        }
      }
    }

    await tournament.save();

    res.json({
      message: 'Tournament ended and prizes distributed',
      tournament,
      prizeRecipients
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete tournament (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status === 'active') {
      return res.status(400).json({ message: 'Cannot delete active tournament' });
    }

    // Refund entry fees if tournament is cancelled
    if (tournament.status === 'upcoming' && tournament.entryFee > 0) {
      for (const participant of tournament.participants) {
        const user = await User.findById(participant.userId);
        if (user) {
          user.balance += tournament.entryFee;
          await user.save();

          await Transaction.create({
            userId: user._id,
            type: 'tournament_refund',
            amount: tournament.entryFee,
            status: 'completed',
            description: `Refund for cancelled tournament: ${tournament.name}`
          });
        }
      }
    }

    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

