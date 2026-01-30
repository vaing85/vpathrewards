import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './components/Games/GameViewportFix.css'; // Global game viewport fix
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PlayerDashboard from './components/Dashboard/PlayerDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import DepositWithdraw from './components/Transactions/DepositWithdraw';
import TransactionHistory from './components/Transactions/TransactionHistory';
import GameHistory from './components/Games/GameHistory';
import Leaderboard from './components/Leaderboard/Leaderboard';
import BonusHistory from './components/Bonuses/BonusHistory';
import GameStats from './components/GameStats/GameStats';
import Achievements from './components/Achievements/Achievements';
import Tournaments from './components/Tournaments/Tournaments';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus/NetworkStatus';
import './App.css';

// Lazy load all game components for code splitting
const SlotGame = lazy(() => import('./components/Games/SlotGame'));
const BlackjackGame = lazy(() => import('./components/Games/BlackjackGame'));
const BingoGame = lazy(() => import('./components/Games/BingoGame'));
const RouletteGame = lazy(() => import('./components/Games/RouletteGame'));
const PokerGame = lazy(() => import('./components/Games/PokerGame'));
const WheelGame = lazy(() => import('./components/Games/WheelGame'));
const CrapsGame = lazy(() => import('./components/Games/CrapsGame'));
const KenoGame = lazy(() => import('./components/Games/KenoGame'));
const ScratchGame = lazy(() => import('./components/Games/ScratchGame'));
// Card Games
const TexasHoldemGame = lazy(() => import('./components/Games/TexasHoldemGame'));
const ThreeCardPokerGame = lazy(() => import('./components/Games/ThreeCardPokerGame'));
const CaribbeanStudGame = lazy(() => import('./components/Games/CaribbeanStudGame'));
const PaiGowGame = lazy(() => import('./components/Games/PaiGowGame'));
const LetItRideGame = lazy(() => import('./components/Games/LetItRideGame'));
const CasinoWarGame = lazy(() => import('./components/Games/CasinoWarGame'));
const RedDogGame = lazy(() => import('./components/Games/RedDogGame'));
const BaccaratGame = lazy(() => import('./components/Games/BaccaratGame'));
const Spanish21Game = lazy(() => import('./components/Games/Spanish21Game'));
const PontoonGame = lazy(() => import('./components/Games/PontoonGame'));
const DoubleExposureGame = lazy(() => import('./components/Games/DoubleExposureGame'));
const PerfectPairsGame = lazy(() => import('./components/Games/PerfectPairsGame'));
// Dice & Number Games
const SicBoGame = lazy(() => import('./components/Games/SicBoGame'));
const DragonTigerGame = lazy(() => import('./components/Games/DragonTigerGame'));
const BigSmallGame = lazy(() => import('./components/Games/BigSmallGame'));
const HiLoGame = lazy(() => import('./components/Games/HiLoGame'));
const Lucky7Game = lazy(() => import('./components/Games/Lucky7Game'));
const DiceDuelGame = lazy(() => import('./components/Games/DiceDuelGame'));
const NumberMatchGame = lazy(() => import('./components/Games/NumberMatchGame'));
const QuickDrawGame = lazy(() => import('./components/Games/QuickDrawGame'));
const NumberWheelGame = lazy(() => import('./components/Games/NumberWheelGame'));
// Wheel Games
const MoneyWheelGame = lazy(() => import('./components/Games/MoneyWheelGame'));
const BigSixGame = lazy(() => import('./components/Games/BigSixGame'));
const ColorWheelGame = lazy(() => import('./components/Games/ColorWheelGame'));
const MultiplierWheelGame = lazy(() => import('./components/Games/MultiplierWheelGame'));
const BonusWheelGame = lazy(() => import('./components/Games/BonusWheelGame'));
const FortuneWheelGame = lazy(() => import('./components/Games/FortuneWheelGame'));
// Lottery Games
const LotteryDrawGame = lazy(() => import('./components/Games/LotteryDrawGame'));
const Pick3Game = lazy(() => import('./components/Games/Pick3Game'));
const Pick5Game = lazy(() => import('./components/Games/Pick5Game'));
const NumberBallGame = lazy(() => import('./components/Games/NumberBallGame'));
const LuckyNumbersGame = lazy(() => import('./components/Games/LuckyNumbersGame'));
// Instant Win
const InstantWinGame = lazy(() => import('./components/Games/InstantWinGame'));
const Match3Game = lazy(() => import('./components/Games/Match3Game'));
const CoinFlipGame = lazy(() => import('./components/Games/CoinFlipGame'));
const QuickWinGame = lazy(() => import('./components/Games/QuickWinGame'));
// Slot Variants
const ClassicSlotsGame = lazy(() => import('./components/Games/ClassicSlotsGame'));
const FruitSlotsGame = lazy(() => import('./components/Games/FruitSlotsGame'));
const DiamondSlotsGame = lazy(() => import('./components/Games/DiamondSlotsGame'));
const ProgressiveSlotsGame = lazy(() => import('./components/Games/ProgressiveSlotsGame'));
const MultiLineSlotsGame = lazy(() => import('./components/Games/MultiLineSlotsGame'));

// Loading component for lazy-loaded routes
import LoadingSpinner from './components/Loading/LoadingSpinner';
import { GameSkeleton } from './components/Loading/SkeletonLoader';

function GameLoading() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <LoadingSpinner size="large" color="white" text="Loading game..." />
    </div>
  );
}

// Wrapper component that combines ErrorBoundary and Suspense for game routes
function GameRouteWrapper({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<GameLoading />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <LoadingSpinner size="large" color="white" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <AdminDashboard /> : <PlayerDashboard />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/slots"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <SlotGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/blackjack"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <BlackjackGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/bingo"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <BingoGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/roulette"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <RouletteGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/poker"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <PokerGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/wheel"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <WheelGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/craps"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <CrapsGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/keno"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <KenoGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/scratch"
        element={
          <ProtectedRoute>
            <GameRouteWrapper>
              <ScratchGame />
            </GameRouteWrapper>
          </ProtectedRoute>
        }
      />
      {/* Card Games */}
      <Route path="/games/texasholdem" element={<ProtectedRoute><GameRouteWrapper><TexasHoldemGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/threecardpoker" element={<ProtectedRoute><GameRouteWrapper><ThreeCardPokerGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/caribbeanstud" element={<ProtectedRoute><GameRouteWrapper><CaribbeanStudGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/paigow" element={<ProtectedRoute><GameRouteWrapper><PaiGowGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/letitride" element={<ProtectedRoute><GameRouteWrapper><LetItRideGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/casinowar" element={<ProtectedRoute><GameRouteWrapper><CasinoWarGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/reddog" element={<ProtectedRoute><GameRouteWrapper><RedDogGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/baccarat" element={<ProtectedRoute><GameRouteWrapper><BaccaratGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/spanish21" element={<ProtectedRoute><GameRouteWrapper><Spanish21Game /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/pontoon" element={<ProtectedRoute><GameRouteWrapper><PontoonGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/doubleexposure" element={<ProtectedRoute><GameRouteWrapper><DoubleExposureGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/perfectpairs" element={<ProtectedRoute><GameRouteWrapper><PerfectPairsGame /></GameRouteWrapper></ProtectedRoute>} />
      {/* Dice & Number Games */}
      <Route path="/games/sicbo" element={<ProtectedRoute><GameRouteWrapper><SicBoGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/dragontiger" element={<ProtectedRoute><GameRouteWrapper><DragonTigerGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/bigsmall" element={<ProtectedRoute><GameRouteWrapper><BigSmallGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/hilo" element={<ProtectedRoute><GameRouteWrapper><HiLoGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/lucky7" element={<ProtectedRoute><GameRouteWrapper><Lucky7Game /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/diceduel" element={<ProtectedRoute><GameRouteWrapper><DiceDuelGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/numbermatch" element={<ProtectedRoute><GameRouteWrapper><NumberMatchGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/quickdraw" element={<ProtectedRoute><GameRouteWrapper><QuickDrawGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/numberwheel" element={<ProtectedRoute><GameRouteWrapper><NumberWheelGame /></GameRouteWrapper></ProtectedRoute>} />
      {/* Wheel Games */}
      <Route path="/games/moneywheel" element={<ProtectedRoute><GameRouteWrapper><MoneyWheelGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/bigsix" element={<ProtectedRoute><GameRouteWrapper><BigSixGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/colorwheel" element={<ProtectedRoute><GameRouteWrapper><ColorWheelGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/multiplierwheel" element={<ProtectedRoute><GameRouteWrapper><MultiplierWheelGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/bonuswheel" element={<ProtectedRoute><GameRouteWrapper><BonusWheelGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/fortunewheel" element={<ProtectedRoute><GameRouteWrapper><FortuneWheelGame /></GameRouteWrapper></ProtectedRoute>} />
      {/* Lottery Games */}
      <Route path="/games/lotterydraw" element={<ProtectedRoute><GameRouteWrapper><LotteryDrawGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/pick3" element={<ProtectedRoute><GameRouteWrapper><Pick3Game /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/pick5" element={<ProtectedRoute><GameRouteWrapper><Pick5Game /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/numberball" element={<ProtectedRoute><GameRouteWrapper><NumberBallGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/luckynumbers" element={<ProtectedRoute><GameRouteWrapper><LuckyNumbersGame /></GameRouteWrapper></ProtectedRoute>} />
      {/* Instant Win */}
      <Route path="/games/instantwin" element={<ProtectedRoute><GameRouteWrapper><InstantWinGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/match3" element={<ProtectedRoute><GameRouteWrapper><Match3Game /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/coinflip" element={<ProtectedRoute><GameRouteWrapper><CoinFlipGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/quickwin" element={<ProtectedRoute><GameRouteWrapper><QuickWinGame /></GameRouteWrapper></ProtectedRoute>} />
      {/* Slot Variants */}
      <Route path="/games/classicslots" element={<ProtectedRoute><GameRouteWrapper><ClassicSlotsGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/fruitslots" element={<ProtectedRoute><GameRouteWrapper><FruitSlotsGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/diamondslots" element={<ProtectedRoute><GameRouteWrapper><DiamondSlotsGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/progressiveslots" element={<ProtectedRoute><GameRouteWrapper><ProgressiveSlotsGame /></GameRouteWrapper></ProtectedRoute>} />
      <Route path="/games/multilineslots" element={<ProtectedRoute><GameRouteWrapper><MultiLineSlotsGame /></GameRouteWrapper></ProtectedRoute>} />
      {/* Transactions */}
      <Route path="/transactions/deposit" element={<ProtectedRoute><DepositWithdraw /></ProtectedRoute>} />
      <Route path="/transactions/history" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
      {/* Game History */}
      <Route path="/games/history" element={<ProtectedRoute><GameHistory /></ProtectedRoute>} />
      {/* Leaderboard */}
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      {/* Bonuses */}
      <Route path="/bonuses/history" element={<ProtectedRoute><BonusHistory /></ProtectedRoute>} />
      {/* Statistics */}
      <Route path="/stats" element={<ProtectedRoute><GameStats /></ProtectedRoute>} />
      {/* Achievements */}
      <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
      {/* Tournaments */}
      <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="App">
              <NetworkStatus />
              <AppRoutes />
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

