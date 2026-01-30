/**
 * Tower Defense – Guinea Pig
 * Single path, a few towers and enemies, waves. Touch + mouse.
 */

(function () {
  'use strict';

  // --- Constants ---
  const TILE = 40;
  const COLS = 16;
  const ROWS = 12;
  const CANVAS_W = TILE * COLS;
  const CANVAS_H = TILE * ROWS;

  // Path: waypoints in grid coords (col, row). Enemies walk top → right → down → left → down → end
  const PATH = [
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
    [9, 3], [9, 4], [9, 5], [9, 6],
    [8, 6], [7, 6], [6, 6], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6],
    [1, 7], [1, 8], [1, 9], [1, 10],
    [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
    [10, 11]  // exit
  ];

  const MAX_TOWER_LEVEL = 3;
  const TOWER_TYPES = {
    basic:  { name: 'Basic', cost: 50, range: 1.5, fireRate: 500, damage: 1, color: '#4a9', accent: '#6cb', shape: 'circle', glow: 'rgba(80,200,120,0.4)' },
    cannon: { name: 'Cannon', cost: 100, range: 1.2, fireRate: 1200, damage: 2, aoe: true, color: '#c84', accent: '#8a4', shape: 'hex', glow: 'rgba(255,140,60,0.45)' },
    sniper: { name: 'Sniper', cost: 120, range: 3, fireRate: 800, damage: 2, color: '#68c', accent: '#9ae', shape: 'diamond', glow: 'rgba(80,180,255,0.5)' },
    slow:   { name: 'Slow', cost: 80, range: 2, fireRate: 600, damage: 0, slow: true, slowMult: 0.5, slowDuration: 1500, color: '#8a8', accent: '#acf', shape: 'square', glow: 'rgba(120,220,220,0.4)' },
    splash: { name: 'Splash', cost: 70, range: 1.2, fireRate: 500, damage: 1, aoe: true, color: '#a8c', accent: '#c8e', shape: 'circle', glow: 'rgba(160,200,220,0.4)' },
    aura:   { name: 'Aura', cost: 90, range: 2, fireRate: 0, damage: 0, aura: true, auraDamage: 0.2, color: '#c8a', accent: '#e8c', shape: 'star', glow: 'rgba(200,180,120,0.35)' }
  };
  // Upgrade cost to go from level N to N+1 = base cost * 0.5
  function getUpgradeCost(tower) {
    const base = TOWER_TYPES[tower.type].cost;
    return Math.floor(base * 0.5);
  }
  // Effective stats for a tower at its current level
  function getTowerStats(tower) {
    const def = TOWER_TYPES[tower.type];
    const l = tower.level || 1;
    const rangeMult = 1 + (l - 1) * 0.15;
    if (def.aura) {
      return {
        range: def.range * rangeMult,
        aura: true,
        auraDamage: (def.auraDamage || 0.2) * (1 + (l - 1) * 0.25)
      };
    }
    const dmgMult = 1 + (l - 1) * 0.5;
    const rateMult = 1 + (l - 1) * 0.15;
    const stats = {
      damage: Math.max(0, Math.floor(def.damage * dmgMult)),
      range: def.range * rangeMult,
      fireRate: def.fireRate ? Math.max(200, Math.floor(def.fireRate / rateMult)) : 9999,
      aoe: def.aoe
    };
    if (def.slow) {
      stats.slow = true;
      stats.slowMult = Math.max(0.2, (def.slowMult || 0.5) - (l - 1) * 0.1);
      stats.slowDuration = (def.slowDuration || 1500) * (1 + (l - 1) * 0.2);
    }
    return stats;
  }

  function getAuraDamageMultiplier(tower) {
    let sum = 0;
    for (const t of towers) {
      const def = TOWER_TYPES[t.type];
      if (!def || !def.aura) continue;
      const astats = getTowerStats(t);
      const rangePx = astats.range * TILE;
      const d = Math.hypot(t.x - tower.x, t.y - tower.y);
      if (d <= rangePx) sum += astats.auraDamage || 0;
    }
    return 1 + sum;
  }

  const ENEMY_TYPES = {
    normal:  { hp: 1, speed: 0.4, reward: 12, color: '#a66', shape: 'blob', scale: 1 },
    fast:    { hp: 1, speed: 0.8, reward: 18, color: '#6a6', shape: 'oval', scale: 0.9 },
    tank:    { hp: 3, speed: 0.2, reward: 30, color: '#66a', shape: 'armor', scale: 1.15 },
    swarm:   { hp: 1, speed: 0.5, reward: 6, color: '#aa6', shape: 'bug', scale: 0.75 },
    armored: { hp: 2, speed: 0.3, reward: 22, color: '#555', shape: 'armor', scale: 1.1, armor: 0.5 },
    boss:    { hp: 8, speed: 0.15, reward: 80, color: '#822', shape: 'boss', scale: 1.35 }
  };

  const DIFFICULTIES = {
    easy:   { lives: 25, gold: 140, winWave: 8 },
    normal: { lives: 20, gold: 120, winWave: 10 },
    hard:   { lives: 15, gold: 100, winWave: 12 }
  };

  const MODE_KEY = 'towerDefense_mode';
  const SPEED_KEY = 'towerDefense_speed';

  // --- State ---
  let canvas, ctx;
  let lives = 20;
  let gold = 120;
  let waveIndex = 0;
  let waveInProgress = false;
  let enemies = [];
  let towers = [];
  let projectiles = [];
  let pathSet = new Set(PATH.map(([c, r]) => `${c},${r}`));
  let selectedTowerType = null;
  let selectedTower = null;
  let lastFire = {};
  let spawnQueue = [];
  let spawnTimer = 0;
  let nextWavePreview = null;
  let gameOver = false;
  let win = false;
  let difficulty = 'normal';
  let deathParticles = [];
  let floatTexts = [];
  let shotLines = [];
  let paused = false;
  let muted = false;
  let hasSoldThisGame = false;
  let startingLives = 20;
  let gameMode = 'standard';
  let gameSpeed = 2;
  let killsThisGame = 0;
  let shakeUntil = 0;
  let shakeAmount = 0;
  let shakeDuration = 0;

  function triggerShake(durationMs, amount) {
    const now = Date.now();
    if (now < shakeUntil && amount <= shakeAmount) return;
    shakeUntil = now + durationMs;
    shakeAmount = amount;
    shakeDuration = durationMs;
  }

  function getWinWave() {
    if (gameMode === 'endless') return Infinity;
    return (DIFFICULTIES[difficulty] || DIFFICULTIES.normal).winWave;
  }

  function loadMode() {
    try {
      const v = localStorage.getItem(MODE_KEY);
      if (v === 'endless' || v === 'standard') gameMode = v;
    } catch (e) {}
  }

  function saveMode() {
    try { localStorage.setItem(MODE_KEY, gameMode); } catch (e) {}
  }

  function loadSpeed() {
    try {
      const v = localStorage.getItem(SPEED_KEY);
      const n = parseInt(v, 10);
      if (n === 1 || n === 2 || n === 3) gameSpeed = n;
    } catch (e) {}
  }

  function saveSpeed() {
    try { localStorage.setItem(SPEED_KEY, String(gameSpeed)); } catch (e) {}
  }

  // --- Sound (Web Audio) ---
  let audioCtx = null;
  let masterGain = null;
  let musicGain = null;
  let volumeLevel = 70;
  let lastShootSound = 0;
  let lastDeathSound = 0;
  let winSoundPlayed = false;
  let gameOverSoundPlayed = false;
  let musicIntervalId = null;

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.22;
      musicGain.connect(masterGain);
      applyVolume();
    } catch (e) {}
  }

  function applyVolume() {
    if (!masterGain) return;
    const v = muted ? 0 : Math.min(1, Math.max(0, volumeLevel / 100));
    masterGain.gain.setValueAtTime(v, audioCtx ? audioCtx.currentTime : 0);
  }

  function playMusicNote(freq, duration) {
    if (!audioCtx || !musicGain) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(musicGain);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function startMusicLoop() {
    if (musicIntervalId) return;
    initAudio();
    if (!audioCtx) return;
    const notes = [262, 330, 392, 523, 392, 330, 262, 349];
    const intervalMs = 1800;
    let i = 0;
    musicIntervalId = setInterval(function () {
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
      playMusicNote(notes[i % notes.length], 0.7);
      i++;
    }, intervalMs);
  }

  function playTone(freq, duration, type) {
    if (!audioCtx || !masterGain) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.value = freq;
      osc.type = type || 'sine';
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playSound(name) {
    if (muted) return;
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
    const now = Date.now();
    switch (name) {
      case 'build':
        playTone(440, 0.08, 'sine');
        break;
      case 'upgrade':
        playTone(554, 0.1, 'sine');
        break;
      case 'sell':
        playTone(330, 0.12, 'sine');
        break;
      case 'shoot':
        if (now - lastShootSound < 80) return;
        lastShootSound = now;
        playTone(180, 0.04, 'square');
        break;
      case 'enemyDeath':
        if (now - lastDeathSound < 60) return;
        lastDeathSound = now;
        playTone(120, 0.05, 'square');
        break;
      case 'waveStart':
        playTone(523, 0.12, 'sine');
        break;
      case 'slow':
        if (now - lastShootSound < 100) return;
        lastShootSound = now;
        playTone(280, 0.06, 'sine');
        break;
      case 'win':
        playTone(523, 0.15, 'sine');
        setTimeout(() => playTone(659, 0.2, 'sine'), 120);
        setTimeout(() => playTone(784, 0.25, 'sine'), 280);
        break;
      case 'gameOver':
        playTone(220, 0.3, 'sine');
        setTimeout(() => playTone(165, 0.4, 'sine'), 200);
        break;
      default:
        break;
    }
  }

  const SAVE_KEY = 'towerDefense_save';
  const HIGHSCORE_KEY = 'towerDefense_highScore';
  const LEADERBOARD_KEY = 'towerDefense_leaderboard';
  const MUTE_KEY = 'towerDefense_muted';
  const VOLUME_KEY = 'towerDefense_volume';
  const TOOLTIP_SEEN_KEY = 'towerDefense_tooltip_seen';
  const ACHIEVE_KEY = 'towerDefense_achievements';
  const STATS_KEY = 'towerDefense_stats';

  function getStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return { kills: 0, towers: 0, games: 0, wins: 0 };
      const o = JSON.parse(raw);
      return {
        kills: Math.max(0, parseInt(o.kills, 10) || 0),
        towers: Math.max(0, parseInt(o.towers, 10) || 0),
        games: Math.max(0, parseInt(o.games, 10) || 0),
        wins: Math.max(0, parseInt(o.wins, 10) || 0)
      };
    } catch (e) {
      return { kills: 0, towers: 0, games: 0, wins: 0 };
    }
  }

  function addStat(key, delta) {
    const s = getStats();
    s[key] = (s[key] || 0) + delta;
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function updateStatsUI() {
    const s = getStats();
    const set = function (id, val) { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-kills', s.kills);
    set('stat-towers', s.towers);
    set('stat-games', s.games);
    set('stat-wins', s.wins);
    const diffs = ['easy', 'normal', 'hard'];
    const modes = ['standard', 'endless'];
    diffs.forEach(function (d) {
      modes.forEach(function (m) {
        const id = 'lb-' + d + '-' + (m === 'standard' ? 'std' : 'end');
        const val = getLeaderboardEntry(d, m);
        set(id, val);
      });
    });
  }

  function getHighScore() {
    const v = localStorage.getItem(HIGHSCORE_KEY);
    return v === null ? 0 : Math.max(0, parseInt(v, 10));
  }

  function loadMuted() {
    try {
      const v = localStorage.getItem(MUTE_KEY);
      return v === '1' || v === 'true';
    } catch (e) {
      return false;
    }
  }

  function saveMuted(value) {
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch (e) {}
  }

  function togglePause() {
    if (gameOver || win) return;
    paused = !paused;
    updatePauseButton();
  }

  function toggleMute() {
    muted = !muted;
    saveMuted(muted);
    applyVolume();
    updateMuteButton();
  }

  function loadVolume() {
    try {
      const v = localStorage.getItem(VOLUME_KEY);
      if (v !== null) {
        const n = parseInt(v, 10);
        if (!isNaN(n)) volumeLevel = Math.max(0, Math.min(100, n));
      }
    } catch (e) {}
  }

  function saveVolume() {
    try {
      localStorage.setItem(VOLUME_KEY, String(volumeLevel));
    } catch (e) {}
  }

  function setVolume(value) {
    const n = Number(value);
    volumeLevel = Math.max(0, Math.min(100, isNaN(n) ? 70 : n));
    applyVolume();
    saveVolume();
    updateVolumeSlider();
    updateMuteButton();
  }

  function updateVolumeSlider() {
    const el = document.getElementById('volume-slider');
    if (el) {
      el.value = String(volumeLevel);
      el.setAttribute('aria-valuenow', String(volumeLevel));
    }
  }

  function updatePauseButton() {
    const btn = el('btn-pause');
    if (btn) {
      btn.textContent = paused ? '▶ Resume' : '❚❚ Pause';
      btn.classList.toggle('paused', paused);
      btn.disabled = !!gameOver || !!win;
    }
  }

  function updateMuteButton() {
    const btn = el('btn-mute');
    if (btn) {
      btn.setAttribute('aria-label', muted ? 'Unmute sound (volume ' + volumeLevel + '%)' : 'Mute sound (volume ' + volumeLevel + '%)');
      btn.classList.toggle('muted', muted);
      btn.textContent = (muted ? '🔇' : '🔊') + ' ' + volumeLevel + '%';
    }
  }

  function getEarnedAchievements() {
    try {
      const raw = localStorage.getItem(ACHIEVE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function setAchievementEarned(id) {
    const earned = getEarnedAchievements();
    if (earned.indexOf(id) >= 0) return;
    earned.push(id);
    try { localStorage.setItem(ACHIEVE_KEY, JSON.stringify(earned)); } catch (e) {}
  }

  const ACHIEVEMENTS = [
    { id: 'win_no_sell', label: 'Win without selling', check: function () { return win && !hasSoldThisGame; } },
    { id: 'zero_leaks_5', label: 'Reach wave 5 with 0 leaks', check: function () { return waveIndex >= 5 && lives === startingLives; } },
    { id: 'win_hard', label: 'Win on Hard', check: function () { return win && difficulty === 'hard'; } }
  ];

  function checkAchievements() {
    const earned = getEarnedAchievements();
    for (const a of ACHIEVEMENTS) {
      if (earned.indexOf(a.id) >= 0) continue;
      if (a.check()) {
        setAchievementEarned(a.id);
        showMessage('Achievement: ' + a.label);
      }
    }
  }

  function showFirstTimeTooltipIfNeeded() {
    try {
      if (localStorage.getItem(TOOLTIP_SEEN_KEY)) return;
    } catch (e) { return; }
    const overlay = el('first-time-tooltip');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    const btn = el('tooltip-got-it');
    if (btn) {
      btn.addEventListener('click', function dismiss() {
        try { localStorage.setItem(TOOLTIP_SEEN_KEY, '1'); } catch (e) {}
        overlay.classList.add('hidden');
        btn.removeEventListener('click', dismiss);
      }, { once: true });
    }
  }

  function getLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return {};
      const o = JSON.parse(raw);
      return typeof o === 'object' && o !== null ? o : {};
    } catch (e) {
      return {};
    }
  }

  function getLeaderboardEntry(difficulty, mode) {
    const key = difficulty + '_' + mode;
    const lb = getLeaderboard();
    const v = lb[key];
    return typeof v === 'number' ? Math.max(0, v) : 0;
  }

  function updateLeaderboardEntry(difficulty, mode, wave) {
    if (wave <= 0) return;
    const key = difficulty + '_' + mode;
    const lb = getLeaderboard();
    const cur = typeof lb[key] === 'number' ? lb[key] : 0;
    if (wave > cur) {
      lb[key] = wave;
      try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb)); } catch (e) {}
    }
  }

  function updateHighScore() {
    const best = getHighScore();
    if (waveIndex > best) {
      try { localStorage.setItem(HIGHSCORE_KEY, String(waveIndex)); } catch (e) {}
    }
    updateLeaderboardEntry(difficulty, gameMode, waveIndex);
  }

  function saveGame() {
    if (waveInProgress && !gameOver && !win) return;
    const data = {
      lives,
      gold,
      waveIndex,
      difficulty,
      startingLives,
      towers: towers.map(t => ({ type: t.type, col: t.col, row: t.row, level: t.level || 1 })),
      gameOver,
      win
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
  }

  function applySave(data) {
    lives = data.lives;
    gold = data.gold;
    waveIndex = data.waveIndex;
    difficulty = data.difficulty && DIFFICULTIES[data.difficulty] ? data.difficulty : 'normal';
    startingLives = data.startingLives != null ? data.startingLives : lives;
    gameOver = !!data.gameOver;
    win = !!data.win;
    towers = (data.towers || []).map((t, i) => {
      const { x, y } = gridToWorld(t.col, t.row);
      return {
        id: 'loaded-' + i + '-' + Date.now(),
        type: t.type,
        col: t.col,
        row: t.row,
        x, y,
        level: t.level || 1
      };
    });
    enemies = [];
    spawnQueue = [];
    waveInProgress = false;
    lastFire = {};
    if (btnWave()) btnWave().textContent = gameOver || win ? 'Start Wave' : 'Start Wave';
  }

  function resetGame() {
    const d = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    lives = d.lives;
    gold = d.gold;
    startingLives = d.lives;
    waveIndex = 0;
    waveInProgress = false;
    towers = [];
    enemies = [];
    spawnQueue = [];
    gameOver = false;
    win = false;
    winSoundPlayed = false;
    gameOverSoundPlayed = false;
    paused = false;
    hasSoldThisGame = false;
    selectedTowerType = null;
    selectedTower = null;
    lastFire = {};
    killsThisGame = 0;
    nextWavePreview = getWaveEnemies(1);
    clearSave();
    const btn = el('btn-play-again');
    if (btn) btn.classList.add('hidden');
    const summaryEl = el('game-over-summary');
    if (summaryEl) summaryEl.classList.add('hidden');
    if (btnWave()) btnWave().textContent = 'Start Wave';
    updateHUD();
    renderTowerPicker();
  }

  // --- DOM ---
  const el = (id) => document.getElementById(id);
  const livesEl = () => el('lives');
  const goldEl = () => el('gold');
  const waveEl = () => el('wave');
  const btnWave = () => el('btn-wave');
  const pickerEl = () => el('tower-picker');
  const messageEl = () => el('message');
  const canvasEl = () => el('canvas');

  function showMessage(text, isError = false) {
    const m = messageEl();
    if (!m) return;
    m.textContent = text;
    m.className = 'message message-over-board ' + (isError ? 'error' : '');
    m.classList.remove('hidden');
    setTimeout(() => m.classList.add('hidden'), 2000);
  }

  let lastGold = 0;
  let goldFlashTimeout = null;

  function updateHUD() {
    if (livesEl()) livesEl().textContent = lives;
    if (goldEl()) goldEl().textContent = gold;
    if (gold > lastGold) {
      const card = goldEl() && goldEl().closest('.stat-card');
      if (card) {
        if (goldFlashTimeout) clearTimeout(goldFlashTimeout);
        card.classList.add('gold-flash');
        goldFlashTimeout = setTimeout(function () {
          card.classList.remove('gold-flash');
          goldFlashTimeout = null;
        }, 450);
      }
    }
    lastGold = gold;
    if (waveEl()) waveEl().textContent = waveIndex;
    const bestEl = el('best');
    if (bestEl) bestEl.textContent = getHighScore();
    const btnAgain = el('btn-play-again');
    if (btnAgain) {
      if (gameOver || win) btnAgain.classList.remove('hidden');
      else btnAgain.classList.add('hidden');
    }
    const summaryEl = el('game-over-summary');
    if (summaryEl) {
      if (gameOver) {
        summaryEl.textContent = 'Wave ' + waveIndex + ' · ' + killsThisGame + ' kills · ' + gold + ' gold';
        summaryEl.classList.remove('hidden');
      } else {
        summaryEl.classList.add('hidden');
      }
    }
    updatePauseButton();
    const waveReady = !waveInProgress && !gameOver && !win;
    const btn = btnWave();
    if (btn) {
      btn.classList.toggle('wave-ready', waveReady);
      btn.setAttribute('aria-label', waveReady ? 'Wave ready — start next wave' : 'Start next wave');
    }
    const canChange = waveIndex === 0 && !waveInProgress && !gameOver && !win;
    const diffPanel = el('difficulty');
    if (diffPanel) {
      ['easy', 'normal', 'hard'].forEach(key => {
        const diffBtn = el('diff-' + key);
        if (diffBtn) {
          diffBtn.disabled = !canChange;
          diffBtn.classList.toggle('selected', difficulty === key);
          diffBtn.setAttribute('aria-checked', difficulty === key ? 'true' : 'false');
        }
      });
    }
    const modePanel = el('game-mode');
    if (modePanel) {
      ['standard', 'endless'].forEach(key => {
        const modeBtn = el('mode-' + key);
        if (modeBtn) {
          modeBtn.disabled = !canChange;
          modeBtn.classList.toggle('selected', gameMode === key);
          modeBtn.setAttribute('aria-checked', gameMode === key ? 'true' : 'false');
        }
      });
    }
    const speedPanel = el('game-speed');
    if (speedPanel) {
      [1, 2, 3].forEach(n => {
        const speedBtn = el('speed-' + n);
        if (speedBtn) {
          speedBtn.classList.toggle('selected', gameSpeed === n);
          speedBtn.setAttribute('aria-checked', gameSpeed === n ? 'true' : 'false');
        }
      });
    }
    const winWaveEl = el('win-wave');
    if (winWaveEl) winWaveEl.textContent = gameMode === 'endless' ? '∞' : getWinWave();
    const previewEl = el('next-wave-preview');
    if (previewEl) {
      if (waveInProgress || gameOver || win) {
        previewEl.textContent = '';
        previewEl.classList.add('hidden');
      } else {
        if (!nextWavePreview && waveIndex >= 0) nextWavePreview = getWaveEnemies(waveIndex + 1);
        if (nextWavePreview && nextWavePreview.length > 0) {
          const counts = {};
          nextWavePreview.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
          const labels = { normal: 'Norm', fast: 'Fast', tank: 'Tank', armored: 'Armor', swarm: 'Swarm', boss: 'Boss' };
          const parts = Object.entries(counts).map(([k, n]) => n + ' ' + (labels[k] || k)).join(', ');
          previewEl.textContent = 'Next: ' + nextWavePreview.length + ' (' + parts + ')';
          previewEl.classList.remove('hidden');
        } else {
          previewEl.textContent = '';
          previewEl.classList.add('hidden');
        }
      }
    }
    updateTowerActionsUI();
    updateStatsUI();
  }

  function setDifficulty(key) {
    if (!DIFFICULTIES[key] || waveIndex > 0 || waveInProgress) return;
    difficulty = key;
    const d = DIFFICULTIES[key];
    lives = d.lives;
    gold = d.gold;
    updateHUD();
  }

  function setGameMode(key) {
    if (key !== 'standard' && key !== 'endless') return;
    if (waveIndex > 0 || waveInProgress || gameOver || win) return;
    gameMode = key;
    saveMode();
    updateHUD();
  }

  function setGameSpeed(n) {
    if (n !== 1 && n !== 2 && n !== 3) return;
    gameSpeed = n;
    saveSpeed();
    updateHUD();
  }

  function updateTowerActionsUI() {
    const panel = el('tower-actions');
    if (!panel) return;
    const btnUpgrade = el('btn-upgrade');
    const btnSell = el('btn-sell');
    if (!selectedTower) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    const level = selectedTower.level || 1;
    const canUpgrade = level < MAX_TOWER_LEVEL;
    const upgradeCost = canUpgrade ? getUpgradeCost(selectedTower) : 0;
    const refund = getTowerRefund(selectedTower);
    if (btnUpgrade) {
      btnUpgrade.textContent = canUpgrade ? 'Upgrade (' + upgradeCost + ')' : 'Max';
      btnUpgrade.disabled = !canUpgrade || gold < upgradeCost;
    }
    if (btnSell) btnSell.textContent = 'Sell (' + refund + ')';
  }

  // --- Path helpers ---
  function worldToGrid(x, y) {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    return { col, row, key: `${col},${row}` };
  }

  function gridToWorld(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
  }

  function isPath(col, row) {
    return pathSet.has(`${col},${row}`);
  }

  function canBuild(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    if (isPath(col, row)) return false;
    return !towers.some(t => t.col === col && t.row === row);
  }

  function getTowerAt(col, row) {
    return towers.find(t => t.col === col && t.row === row) || null;
  }

  // --- Waves ---
  function getWaveEnemies(wave) {
    const list = [];
    const count = 5 + wave * 2 + Math.floor(wave / 3);
    const tankChance = wave >= 6 ? 0.25 : wave >= 3 ? 0.2 : 0;
    const fastChance = wave >= 6 ? 0.3 : wave >= 2 ? 0.25 : 0;
    const swarmChance = wave >= 1 ? 0.4 : 0;
    const armoredChance = wave >= 4 ? 0.15 : 0;
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      if (wave >= 3 && r < tankChance) list.push('tank');
      else if (wave >= 2 && r < tankChance + fastChance) list.push('fast');
      else if (wave >= 4 && r < tankChance + fastChance + armoredChance) list.push('armored');
      else if (wave >= 1 && r < tankChance + fastChance + armoredChance + swarmChance) list.push('swarm');
      else list.push('normal');
    }
    if (wave >= 6) list.push('boss');
    return list;
  }

  function startWave() {
    if (gameOver || win) return;
    if (waveInProgress) {
      showMessage('Wave in progress', true);
      return;
    }
    startMusicLoop();
    waveIndex++;
    if (waveIndex === 1) addStat('games', 1);
    waveInProgress = true;
    spawnQueue = (nextWavePreview && nextWavePreview.length > 0) ? nextWavePreview.slice() : getWaveEnemies(waveIndex);
    nextWavePreview = null;
    spawnTimer = 0;
    if (btnWave()) btnWave().textContent = 'Wave ' + waveIndex + '...';
    playSound('waveStart');
  }

  function spawnEnemy(type) {
    const def = ENEMY_TYPES[type];
    if (!def) return;
    const { x, y } = gridToWorld(PATH[0][0], PATH[0][1]);
    enemies.push({
      type,
      x, y,
      pathIndex: 0,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      reward: def.reward,
      color: def.color,
      shape: def.shape || 'blob',
      scale: def.scale != null ? def.scale : 1,
      armor: def.armor != null ? def.armor : 0
    });
  }

  function updateSpawn(dt) {
    if (spawnQueue.length === 0) return;
    spawnTimer += dt;
    if (spawnTimer >= 400) {
      spawnTimer = 0;
      spawnEnemy(spawnQueue.shift());
    }
  }

  function checkWaveEnd() {
    if (spawnQueue.length > 0 || enemies.length > 0) return;
    if (!waveInProgress) return; // no wave in progress — don't run wave-end logic every frame when idle
    waveInProgress = false;
    nextWavePreview = getWaveEnemies(waveIndex + 1);
    if (btnWave()) btnWave().textContent = 'Start Wave';
    gold += 65; // bonus between waves
    updateHighScore();
    saveGame();
    checkAchievements();
    if (waveIndex >= getWinWave()) {
      win = true;
      addStat('wins', 1);
      if (!winSoundPlayed) {
        winSoundPlayed = true;
        playSound('win');
      }
      checkAchievements();
      showMessage('You won!');
    }
  }

  // --- Enemies ---
  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const next = PATH[e.pathIndex + 1];
      if (!next) {
        lives--;
        enemies.splice(i, 1);
        if (lives <= 0) {
          gameOver = true;
          if (!gameOverSoundPlayed) {
            gameOverSoundPlayed = true;
            playSound('gameOver');
            triggerShake(150, 3);
          }
          updateHighScore();
          saveGame();
        } else {
          triggerShake(100, 2);
        }
        continue;
      }
      const target = gridToWorld(next[0], next[1]);
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy);
      const slowMult = (e.slowTil && Date.now() < e.slowTil) ? (e.slowMult ?? 0.5) : 1;
      const effectiveSpeed = e.speed * slowMult;
      const move = Math.min(dist, effectiveSpeed * TILE * (dt / 16));
      if (dist > 0.5) {
        e.x += (dx / dist) * move;
        e.y += (dy / dist) * move;
      } else {
        e.pathIndex++;
      }
    }
  }

  // --- Towers ---
  function findTarget(tower) {
    const stats = getTowerStats(tower);
    const rangePx = stats.range * TILE;
    let best = null;
    let bestProgress = -1;
    for (const e of enemies) {
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= rangePx && e.pathIndex > bestProgress) {
        bestProgress = e.pathIndex;
        best = e;
      }
    }
    return best;
  }

  function fireAt(tower, target) {
    const stats = getTowerStats(tower);
    if (stats.slow) {
      const now = Date.now();
      target.slowTil = now + stats.slowDuration;
      target.slowMult = stats.slowMult;
      playSound('slow');
      shotLines.push({ x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, life: 1 });
      return;
    }
    tower.muzzleUntil = Date.now() + 80;
    if (stats.aoe) {
      const rangePx = stats.range * TILE;
      const baseDmg = stats.damage * getAuraDamageMultiplier(tower);
      playSound('shoot');
      shotLines.push({ x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, life: 1 });
      for (const e of enemies) {
        const d = Math.hypot(e.x - target.x, e.y - target.y);
        if (d <= rangePx) {
          const dmg = Math.max(1, Math.ceil(baseDmg * (1 - (e.armor != null ? e.armor : 0))));
          e.hp -= dmg;
          e.hitFlashUntil = Date.now() + 120;
          if (e.hp <= 0) {
            gold += e.reward;
            addStat('kills', 1);
            killsThisGame++;
            spawnFloatText(e.x, e.y - 10, '+' + e.reward, 'gold');
            playSound('enemyDeath');
            spawnDeathParticles(e.x, e.y, e.color);
            enemies.splice(enemies.indexOf(e), 1);
          }
        }
      }
      triggerShake(60, 1.5);
    } else {
      const dmg = Math.max(1, Math.ceil(stats.damage * getAuraDamageMultiplier(tower) * (1 - (target.armor != null ? target.armor : 0))));
      playSound('shoot');
      shotLines.push({ x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, life: 1 });
      target.hp -= dmg;
      target.hitFlashUntil = Date.now() + 120;
      if (target.hp <= 0) {
        gold += target.reward;
        addStat('kills', 1);
        killsThisGame++;
        spawnFloatText(target.x, target.y - 10, '+' + target.reward, 'gold');
        playSound('enemyDeath');
        spawnDeathParticles(target.x, target.y, target.color);
        enemies.splice(enemies.indexOf(target), 1);
      }
    }
  }

  function updateTowers(dt) {
    const now = Date.now();
    for (const tower of towers) {
      const def = TOWER_TYPES[tower.type];
      if (def && def.aura) continue;
      const stats = getTowerStats(tower);
      const key = tower.id;
      if (!lastFire[key]) lastFire[key] = 0;
      const target = findTarget(tower);
      if (target && now - lastFire[key] >= stats.fireRate) {
        lastFire[key] = now;
        fireAt(tower, target);
      }
    }
  }

  // --- Build ---
  function buildTower(col, row) {
    if (!selectedTowerType) return;
    const def = TOWER_TYPES[selectedTowerType];
    if (gold < def.cost) {
      showMessage('Not enough gold', true);
      return;
    }
    if (!canBuild(col, row)) {
      showMessage('Can\'t build here', true);
      return;
    }
    gold -= def.cost;
    addStat('towers', 1);
    const { x, y } = gridToWorld(col, row);
    towers.push({
      id: towers.length + '-' + Date.now(),
      type: selectedTowerType,
      col, row, x, y,
      level: 1
    });
    selectedTowerType = null;
    renderTowerPicker();
    saveGame();
    playSound('build');
  }

  function getTowerRefund(tower) {
    const base = TOWER_TYPES[tower.type].cost;
    const level = tower.level || 1;
    const totalSpent = base + (level - 1) * getUpgradeCost(tower);
    return Math.floor(totalSpent * 0.5);
  }

  function upgradeTower(tower) {
    const level = tower.level || 1;
    if (level >= MAX_TOWER_LEVEL) {
      showMessage('Max level', true);
      return;
    }
    const cost = getUpgradeCost(tower);
    if (gold < cost) {
      showMessage('Need ' + cost + ' gold', true);
      return;
    }
    gold -= cost;
    tower.level = level + 1;
    showMessage('Upgraded to level ' + tower.level);
    saveGame();
    updateTowerActionsUI();
    playSound('upgrade');
  }

  function sellTower(tower) {
    hasSoldThisGame = true;
    const refund = getTowerRefund(tower);
    gold += refund;
    towers = towers.filter(t => t !== tower);
    delete lastFire[tower.id];
    selectedTower = null;
    showMessage('Sold for ' + refund + ' gold');
    saveGame();
    updateTowerActionsUI();
    playSound('sell');
  }

  // --- Draw ---
  function spawnFloatText(x, y, text, type) {
    floatTexts.push({ x, y, text, life: 1, vy: -0.8, type: type || 'damage' });
  }

  function updateFloatTexts(dt) {
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const f = floatTexts[i];
      f.y += f.vy * (dt / 16);
      f.life -= (dt / 16) * 0.04;
      if (f.life <= 0) floatTexts.splice(i, 1);
    }
  }

  function updateShotLines(dt) {
    for (let i = shotLines.length - 1; i >= 0; i--) {
      shotLines[i].life -= (dt / 16) * 0.12;
      if (shotLines[i].life <= 0) shotLines.splice(i, 1);
    }
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    grad.addColorStop(0, '#0f1812');
    grad.addColorStop(0.4, '#0a120e');
    grad.addColorStop(0.7, '#0d1510');
    grad.addColorStop(1, '#0f1a12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(25,45,30,0.6)';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (pathSet.has(`${col},${row}`)) continue;
        const x = col * TILE;
        const y = row * TILE;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = 'rgba(40,70,45,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        for (let g = 0; g < 8; g++) {
          const gx = x + 5 + (g % 4) * (TILE / 4);
          const gy = y + 5 + Math.floor(g / 4) * (TILE / 2);
          ctx.fillStyle = 'rgba(35,65,40,0.2)';
          ctx.beginPath();
          ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPath() {
    const pathW = TILE * 0.9;
    function pathLines() {
      ctx.beginPath();
      const first = gridToWorld(PATH[0][0], PATH[0][1]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < PATH.length; i++) {
        const p = gridToWorld(PATH[i][0], PATH[i][1]);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1410';
    ctx.lineWidth = pathW + 5;
    pathLines();
    ctx.stroke();
    const pathGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    pathGrad.addColorStop(0, '#3d3528');
    pathGrad.addColorStop(0.3, '#352d22');
    pathGrad.addColorStop(0.6, '#2e261c');
    pathGrad.addColorStop(1, '#282218');
    ctx.strokeStyle = pathGrad;
    ctx.lineWidth = pathW;
    pathLines();
    ctx.stroke();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(90,75,55,0.4)';
    ctx.lineWidth = 2;
    pathLines();
    ctx.stroke();
    ctx.setLineDash([]);
    const start = gridToWorld(PATH[0][0], PATH[0][1]);
    const end = gridToWorld(PATH[PATH.length - 1][0], PATH[PATH.length - 1][1]);
    const glowGrad = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, TILE * 2);
    glowGrad.addColorStop(0, 'rgba(180,120,60,0.45)');
    glowGrad.addColorStop(0.4, 'rgba(100,60,30,0.2)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(start.x, start.y, TILE * 2, 0, Math.PI * 2);
    ctx.fill();
    const endGrad = ctx.createRadialGradient(end.x, end.y, 0, end.x, end.y, TILE * 2);
    endGrad.addColorStop(0, 'rgba(180,60,60,0.35)');
    endGrad.addColorStop(0.4, 'rgba(80,30,30,0.15)');
    endGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = endGrad;
    ctx.beginPath();
    ctx.arc(end.x, end.y, TILE * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(80,120,80,0.08)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TILE, 0);
      ctx.lineTo(c * TILE, CANVAS_H);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TILE);
      ctx.lineTo(CANVAS_W, r * TILE);
      ctx.stroke();
    }
  }

  function spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 2;
      deathParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 1,
        color,
        r: 3 + Math.random() * 5
      });
    }
    for (let i = 0; i < 6; i++) {
      deathParticles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 3,
        vy: -1 - Math.random() * 2,
        life: 1,
        color: lightenColor(color, 30),
        r: 2 + Math.random() * 3
      });
    }
  }

  function updateDeathParticles(dt) {
    for (let i = deathParticles.length - 1; i >= 0; i--) {
      const p = deathParticles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= (dt / 16) * 0.08;
      if (p.life <= 0) deathParticles.splice(i, 1);
    }
  }

  function drawDeathParticles() {
    for (const p of deathParticles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawShotLines() {
    for (const s of shotLines) {
      ctx.globalAlpha = s.life;
      ctx.strokeStyle = 'rgba(255,220,120,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,180,80,0.5)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawFloatTexts() {
    for (const f of floatTexts) {
      ctx.globalAlpha = f.life;
      if (f.type === 'gold') {
        ctx.fillStyle = '#eca';
        ctx.strokeStyle = '#864';
      } else {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#c00';
      }
      ctx.lineWidth = 2;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  function drawRangeCircle(x, y, rangePx) {
    ctx.beginPath();
    ctx.arc(x, y, rangePx, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y, rangePx * 0.6, x, y, rangePx);
    grad.addColorStop(0, 'rgba(80,180,80,0.08)');
    grad.addColorStop(0.8, 'rgba(60,140,60,0.12)');
    grad.addColorStop(1, 'rgba(40,100,40,0.06)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,200,100,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawVignette() {
    const v = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.15, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.65);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    v.addColorStop(0.85, 'rgba(0,0,0,0.25)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function setGlowAlpha(rgbaStr, alpha) {
    if (!rgbaStr || rgbaStr.indexOf('rgba') !== 0) return 'rgba(100,180,100,' + alpha + ')';
    return rgbaStr.replace(/[\d.]+\)$/, alpha + ')');
  }

  function drawTowerGlow(x, y, r, glowColor) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, glowColor);
    g.addColorStop(0.35, setGlowAlpha(glowColor, 0.18));
    g.addColorStop(0.65, setGlowAlpha(glowColor, 0.06));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTowers() {
    const now = Date.now();
    for (const t of towers) {
      const def = TOWER_TYPES[t.type];
      const level = t.level || 1;
      const r = TILE * 0.35;
      const baseR = TILE * 0.46;
      const accent = def.accent || def.color;
      const glow = def.glow || 'rgba(100,180,100,0.3)';

      drawTowerGlow(t.x, t.y, baseR, glow);
      drawTowerBase3D(t.x, t.y, baseR);
      if (!def.aura && t.muzzleUntil && now < t.muzzleUntil) {
        const f = 1 - (now - (t.muzzleUntil - 80)) / 80;
        const beamColor = def.shape === 'hex' ? 'rgba(255,160,80,' + (0.6 * f) + ')' : def.shape === 'diamond' ? 'rgba(100,180,255,' + (0.55 * f) + ')' : 'rgba(255,240,180,' + (0.45 * f) + ')';
        const beamH = TILE * 1.2 * f;
        const beamG = ctx.createLinearGradient(t.x, t.y, t.x, t.y - beamH);
        beamG.addColorStop(0, beamColor);
        beamG.addColorStop(0.3, beamColor.replace(/[\d.]+\)/, (0.4 * f) + ')'));
        beamG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beamG;
        ctx.beginPath();
        ctx.moveTo(t.x - baseR * 0.4, t.y);
        ctx.lineTo(t.x + baseR * 0.4, t.y);
        ctx.lineTo(t.x + baseR * 0.25, t.y - beamH);
        ctx.lineTo(t.x - baseR * 0.25, t.y - beamH);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,240,200,' + (0.35 * f) + ')';
        ctx.beginPath();
        ctx.arc(t.x, t.y, baseR * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      switch (def.shape) {
        case 'circle':
          drawTowerBasic(t.x, t.y, r, def.color, accent);
          break;
        case 'hex':
          drawTowerCannon(t.x, t.y, r, def.color, accent);
          break;
        case 'diamond':
          drawTowerSniper(t.x, t.y, r, def.color, accent);
          break;
        case 'square':
          drawTowerSlow(t.x, t.y, r, def.color, accent);
          break;
        case 'star':
          drawTowerStar(t.x, t.y, r, def.color, accent);
          break;
        default:
          drawTowerBasic(t.x, t.y, r, def.color, accent);
      }

      drawTowerCore(t.x, t.y, r, def.glow || def.color);
      ctx.strokeStyle = t === selectedTower ? '#ff0' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = t === selectedTower ? 3 : 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.stroke();

      const lx = t.x + 1;
      const ly = t.y + 1;
      const lr = r * 0.42;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(level), lx, ly);
    }
  }

  function drawTowerCore(x, y, r, glowColor) {
    const coreR = r * 0.35;
    const g = ctx.createRadialGradient(x - coreR * 0.3, y - coreR * 0.3, 0, x, y, coreR * 1.5);
    const base = glowColor && glowColor.indexOf('rgba') === 0 ? glowColor : 'rgba(100,180,100,0.5)';
    g.addColorStop(0, setGlowAlpha(base, 0.85));
    g.addColorStop(0.5, setGlowAlpha(base, 0.35));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, coreR * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTowerBase3D(x, y, baseR) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#080605';
    ctx.beginPath();
    ctx.arc(x, y + 3, baseR + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const baseGrad = ctx.createLinearGradient(x, y - baseR, x, y + baseR);
    baseGrad.addColorStop(0, '#4a4035');
    baseGrad.addColorStop(0.25, '#352d24');
    baseGrad.addColorStop(0.5, '#282218');
    baseGrad.addColorStop(0.8, '#1a1612');
    baseGrad.addColorStop(1, '#0f0d0a');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(x, y, baseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,75,55,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,50,40,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, baseR - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(140,110,80,0.25)';
    ctx.beginPath();
    ctx.ellipse(x - baseR * 0.35, y - baseR * 0.35, baseR * 0.55, baseR * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTowerSpecular(x, y, r) {
    const specGrad = ctx.createRadialGradient(x - r * 0.5, y - r * 0.6, 0, x - r * 0.3, y - r * 0.3, r * 0.6);
    specGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
    specGrad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
    specGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTowerBottomRim(x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const rimGrad = ctx.createLinearGradient(x, y - r, x, y + r);
    rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(0.85, 'rgba(0,0,0,0.25)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function drawTowerBasic(x, y, r, color, accent) {
    const grad = ctx.createRadialGradient(x - r * 0.5, y - r * 0.5, 0, x + r * 0.3, y + r * 0.3, r * 1.2);
    grad.addColorStop(0, lightenColor(color, 55));
    grad.addColorStop(0.25, lightenColor(color, 25));
    grad.addColorStop(0.5, color);
    grad.addColorStop(0.85, darkenColor(color, 25));
    grad.addColorStop(1, darkenColor(color, 45));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    drawTowerBottomRim(x, y, r);
    ctx.fillStyle = darkenColor(color, 30);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = darkenColor(color, 15);
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.15, r * 0.5 * 0.9, r * 0.5 * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    const barrelGrad = ctx.createRadialGradient(x - r * 0.1, y - r * 0.4, 0, x, y - r * 0.35, r * 0.25);
    barrelGrad.addColorStop(0, lightenColor(accent, 40));
    barrelGrad.addColorStop(1, accent);
    ctx.fillStyle = barrelGrad;
    ctx.fill();
    drawTowerSpecular(x, y, r);
  }

  function drawTowerCannon(x, y, r, color, accent) {
    const grad = ctx.createRadialGradient(x - r * 0.5, y - r * 0.5, 0, x + r * 0.2, y + r * 0.2, r * 1.15);
    grad.addColorStop(0, lightenColor(color, 50));
    grad.addColorStop(0.3, lightenColor(color, 20));
    grad.addColorStop(0.6, color);
    grad.addColorStop(0.9, darkenColor(color, 25));
    grad.addColorStop(1, darkenColor(color, 45));
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();
    drawTowerBottomRim(x, y, r);
    ctx.restore();
    ctx.strokeStyle = lightenColor(color, 15);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = darkenColor(color, 35);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    const barrelGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r * 0.5);
    barrelGrad.addColorStop(0, darkenColor(accent, 20));
    barrelGrad.addColorStop(0.5, darkenColor(accent, 45));
    barrelGrad.addColorStop(1, darkenColor(accent, 60));
    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = darkenColor(accent, 65);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.15, y - r * 0.15, r * 0.2, r * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();
    drawTowerSpecular(x, y, r);
  }

  function drawTowerSniper(x, y, r, color, accent) {
    const grad = ctx.createLinearGradient(x - r * 0.5, y - r, x + r * 0.5, y + r);
    grad.addColorStop(0, lightenColor(color, 55));
    grad.addColorStop(0.2, lightenColor(color, 30));
    grad.addColorStop(0.45, color);
    grad.addColorStop(0.75, darkenColor(color, 20));
    grad.addColorStop(1, darkenColor(color, 50));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.85, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.85, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = darkenColor(color, 40);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = lightenColor(color, 20);
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const scopeGrad = ctx.createRadialGradient(x - r * 0.15, y - r * 0.55, 0, x, y - r * 0.5, r * 0.28);
    scopeGrad.addColorStop(0, lightenColor(accent, 35));
    scopeGrad.addColorStop(0.5, accent);
    scopeGrad.addColorStop(1, darkenColor(accent, 25));
    ctx.fillStyle = scopeGrad;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.5, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.5, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.08, y - r * 0.55, r * 0.08, r * 0.05, 0.3, 0, Math.PI * 2);
    ctx.fill();
    drawTowerSpecular(x, y, r);
  }

  function drawTowerSlow(x, y, r, color, accent) {
    const s = r * 0.88;
    const rad = s * 0.25;
    const grad = ctx.createRadialGradient(x - s * 0.5, y - s * 0.5, 0, x + s * 0.2, y + s * 0.2, s * 1.3);
    grad.addColorStop(0, lightenColor(color, 55));
    grad.addColorStop(0.3, lightenColor(color, 25));
    grad.addColorStop(0.6, color);
    grad.addColorStop(0.9, darkenColor(color, 25));
    grad.addColorStop(1, darkenColor(color, 45));
    ctx.fillStyle = grad;
    roundRect(x - s, y - s, s * 2, s * 2, rad);
    ctx.fill();
    ctx.save();
    roundRect(x - s, y - s, s * 2, s * 2, rad);
    ctx.clip();
    drawTowerBottomRim(x, y, s);
    ctx.restore();
    ctx.strokeStyle = lightenColor(color, 25);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = darkenColor(color, 30);
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(200,240,255,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      const dx = Math.cos(a) * r * 0.5;
      const dy = Math.sin(a) * r * 0.5;
      const dotGrad = ctx.createRadialGradient(x + dx - r * 0.05, y + dy - r * 0.05, 0, x + dx, y + dy, r * 0.15);
      dotGrad.addColorStop(0, lightenColor(accent, 35));
      dotGrad.addColorStop(1, accent);
      ctx.fillStyle = dotGrad;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.35, y - s * 0.4, s * 0.4, s * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    drawTowerSpecular(x, y, r);
  }

  function drawTowerStar(x, y, r, color, accent) {
    const grad = ctx.createRadialGradient(x - r * 0.5, y - r * 0.5, 0, x + r * 0.3, y + r * 0.3, r * 1.2);
    grad.addColorStop(0, lightenColor(color, 50));
    grad.addColorStop(0.35, lightenColor(color, 20));
    grad.addColorStop(0.65, color);
    grad.addColorStop(0.9, darkenColor(color, 25));
    grad.addColorStop(1, darkenColor(color, 45));
    ctx.fillStyle = grad;
    ctx.beginPath();
    const points = 5;
    const innerR = r * 0.45;
    for (let i = 0; i < points * 2; i++) {
      const a = (Math.PI / points) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : innerR;
      const px = x + rad * Math.cos(a);
      const py = y + rad * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    drawTowerBottomRim(x, y, r);
    ctx.strokeStyle = lightenColor(color, 20);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = darkenColor(color, 35);
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const coreGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r * 0.4);
    coreGrad.addColorStop(0, lightenColor(accent, 40));
    coreGrad.addColorStop(0.6, accent);
    coreGrad.addColorStop(1, darkenColor(accent, 20));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    drawTowerSpecular(x, y, r);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function hexToRgb(hex) {
    const h = hex.slice(1);
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function lightenColor(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    return '#' + [r, g, b].map(x => Math.min(255, x + amt)).map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }

  function darkenColor(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    return '#' + [r, g, b].map(x => Math.max(0, x - amt)).map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }

  function drawEnemies() {
    const now = Date.now();
    for (const e of enemies) {
      const hitFlash = e.hitFlashUntil && now < e.hitFlashUntil;
      const baseRad = TILE * 0.28;
      const rad = baseRad * (e.scale != null ? e.scale : 1);
      const shape = e.shape || 'blob';

      const glowR = rad * 1.4;
      const [er, eg, eb] = hexToRgb(e.color);
      const glowGrad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, glowR);
      glowGrad.addColorStop(0, 'rgba(' + er + ',' + eg + ',' + eb + ',0.28)');
      glowGrad.addColorStop(0.5, 'rgba(' + er + ',' + eg + ',' + eb + ',0.1)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      drawEnemyShape(e.x + 2, e.y + 2, rad, shape, true);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = hitFlash ? '#fff' : e.color;
      drawEnemyShape(e.x, e.y, rad, shape, false);
      ctx.fill();
      ctx.strokeStyle = hitFlash ? '#f88' : (shape === 'armor' ? lightenColor(e.color, 15) : shape === 'boss' ? lightenColor(e.color, 20) : 'rgba(0,0,0,0.4)');
      ctx.lineWidth = hitFlash ? 2 : (shape === 'boss' ? 2.5 : shape === 'armor' ? 1.5 : 1);
      ctx.stroke();

      if (shape === 'boss') {
        ctx.strokeStyle = darkenColor(e.color, 15);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(e.x - rad * 0.5, e.y - rad * 0.9);
        ctx.lineTo(e.x, e.y - rad * 1.15);
        ctx.lineTo(e.x + rad * 0.5, e.y - rad * 0.9);
        ctx.stroke();
      }
      if (shape === 'blob') {
        ctx.fillStyle = hitFlash ? '#333' : darkenColor(e.color, 40);
        ctx.beginPath();
        ctx.arc(e.x - rad * 0.3, e.y - rad * 0.2, rad * 0.15, 0, Math.PI * 2);
        ctx.arc(e.x + rad * 0.3, e.y - rad * 0.2, rad * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      if (shape === 'bug') {
        ctx.strokeStyle = hitFlash ? '#fff' : darkenColor(e.color, 30);
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(e.x - rad * 0.6, e.y - rad * 0.5);
        ctx.lineTo(e.x - rad * 1.2, e.y - rad * 1);
        ctx.moveTo(e.x + rad * 0.6, e.y - rad * 0.5);
        ctx.lineTo(e.x + rad * 1.2, e.y - rad * 1);
        ctx.stroke();
      }
      if (shape === 'armor') {
        ctx.strokeStyle = darkenColor(e.color, 25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x - rad * 0.8, e.y + rad * 0.6);
        ctx.lineTo(e.x + rad * 0.8, e.y + rad * 0.6);
        ctx.stroke();
      }

      if (e.maxHp > 1) {
        const barW = rad * 2.2;
        const barH = 5;
        const barY = e.y - rad - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(e.x - barW / 2, barY, barW, barH);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(e.x - barW / 2, barY, barW, barH);
        ctx.fillStyle = '#6f6';
        ctx.fillRect(e.x - barW / 2 + 1, barY + 1, (barW - 2) * (e.hp / e.maxHp), barH - 2);
      }
    }
  }

  function drawEnemyShape(x, y, rad, shape, shadow) {
    ctx.beginPath();
    switch (shape) {
      case 'oval':
        ctx.ellipse(x, y, rad * 1.35, rad * 0.7, 0, 0, Math.PI * 2);
        break;
      case 'armor':
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + rad * Math.cos(a);
          const py = y + rad * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'boss': {
        const w = rad * 1.4;
        const h = rad * 1.2;
        const r = rad * 0.35;
        roundRect(x - w / 2, y - h / 2, w, h, r);
        break;
      }
      case 'bug':
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        break;
      default:
        ctx.ellipse(x, y, rad * 1.08, rad * 0.92, 0, 0, Math.PI * 2);
    }
  }

  function drawHover(col, row) {
    if (!selectedTowerType || gameOver || win) return;
    if (canBuild(col, row)) {
      ctx.fillStyle = 'rgba(0,200,0,0.25)';
    } else {
      ctx.fillStyle = 'rgba(200,0,0,0.25)';
    }
    ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
  }

  function draw() {
    ctx.save();
    const now = Date.now();
    if (now < shakeUntil && shakeDuration > 0) {
      const a = shakeAmount * (shakeUntil - now) / shakeDuration;
      ctx.translate((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
    }
    drawBackground();
    drawPath();
    drawGrid();
    drawDeathParticles();
    drawShotLines();
    drawTowers();
    drawEnemies();
    drawFloatTexts();
    if (selectedTower) {
      const stats = getTowerStats(selectedTower);
      drawRangeCircle(selectedTower.x, selectedTower.y, stats.range * TILE);
    }
    if (hoverCell && selectedTowerType && canBuild(hoverCell.col, hoverCell.row)) {
      const def = TOWER_TYPES[selectedTowerType];
      const rangePx = def.range * TILE;
      const { x, y } = gridToWorld(hoverCell.col, hoverCell.row);
      drawRangeCircle(x, y, rangePx);
    }
    if (hoverCell) drawHover(hoverCell.col, hoverCell.row);
    drawVignette();
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#c8d8cc';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Paused', CANVAS_W / 2, CANVAS_H / 2 - 12);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'rgba(200,220,200,0.9)';
      ctx.fillText('Click Pause to resume', CANVAS_W / 2, CANVAS_H / 2 + 18);
    }
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#f66';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', CANVAS_W / 2, CANVAS_H / 2);
    }
    if (win) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#6f6';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You Win!', CANVAS_W / 2, CANVAS_H / 2);
    }
    ctx.restore();
  }

  // --- Input ---
  let hoverCell = null;

  function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function handleCanvasClick(e) {
    e.preventDefault();
    startMusicLoop();
    if (gameOver || win || paused) return;
    const p = getCanvasPoint(e);
    const { col, row } = worldToGrid(p.x, p.y);
    const existing = getTowerAt(col, row);
    if (existing) {
      if (selectedTowerType) {
        selectedTowerType = null;
        renderTowerPicker();
      } else {
        selectedTower = existing;
        updateTowerActionsUI();
      }
      return;
    }
    selectedTower = null;
    updateTowerActionsUI();
    buildTower(col, row);
  }

  function handleCanvasMove(e) {
    const p = getCanvasPoint(e);
    const g = worldToGrid(p.x, p.y);
    if (g.col >= 0 && g.col < COLS && g.row >= 0 && g.row < ROWS) {
      hoverCell = g;
    } else {
      hoverCell = null;
    }
  }

  function handleCanvasLeave() {
    hoverCell = null;
  }

  function getTowerTooltip(key, def) {
    const parts = ['Cost: ' + def.cost + ' · Range: ' + def.range];
    if (def.aura) {
      parts.push('Buffs nearby towers +' + Math.round((def.auraDamage || 0.2) * 100) + '% damage');
    } else if (def.slow) {
      parts.push('Slows enemies ' + (def.slowMult ? Math.round((1 - def.slowMult) * 100) + '%' : '50%') + ' · ' + (def.slowDuration || 1500) + 'ms');
    } else {
      if (def.damage > 0) parts.push('Damage: ' + def.damage);
      if (def.fireRate > 0) parts.push(def.fireRate + 'ms');
      if (def.aoe) parts.push('AOE');
    }
    return parts.join(' · ');
  }

  function renderTowerPicker() {
    const root = pickerEl();
    if (!root) return;
    root.innerHTML = '';
    for (const [key, def] of Object.entries(TOWER_TYPES)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tower-btn' + (selectedTowerType === key ? ' selected' : '');
      btn.setAttribute('aria-label', 'Build ' + def.name + ' tower, ' + def.cost + ' gold');
      btn.title = getTowerTooltip(key, def);
      btn.innerHTML = `<span class="tower-dot" style="background:${def.color}"></span> ${def.name} (${def.cost})`;
      btn.addEventListener('click', () => {
        selectedTowerType = selectedTowerType === key ? null : key;
        renderTowerPicker();
      });
      root.appendChild(btn);
    }
  }

  // --- Loop ---
  let lastTime = 0;
  function loop(now) {
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 200) dt = 16;
    const scaledDt = dt * gameSpeed;
    if (!gameOver && !win && !paused) {
      updateSpawn(scaledDt);
      updateEnemies(scaledDt);
      updateTowers(scaledDt);
      updateDeathParticles(scaledDt);
      updateFloatTexts(scaledDt);
      updateShotLines(scaledDt);
      checkWaveEnd();
    }
    updateHUD();
    draw();
    requestAnimationFrame(loop);
  }

  // --- Init ---
  function init() {
    canvas = canvasEl();
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    muted = loadMuted();
    loadVolume();
    loadMode();
    loadSpeed();
    initAudio();
    const saved = loadGame();
    if (saved) {
      applySave(saved);
      updateHighScore();
    } else {
      const d = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
      lives = d.lives;
      gold = d.gold;
      startingLives = d.lives;
      nextWavePreview = getWaveEnemies(1);
    }
    lastGold = gold;
    ['easy', 'normal', 'hard'].forEach(key => {
      const btn = el('diff-' + key);
      if (btn) btn.addEventListener('click', () => setDifficulty(key));
    });
    ['standard', 'endless'].forEach(key => {
      const btn = el('mode-' + key);
      if (btn) btn.addEventListener('click', () => setGameMode(key));
    });
    [1, 2, 3].forEach(n => {
      const btn = el('speed-' + n);
      if (btn) btn.addEventListener('click', () => setGameSpeed(n));
    });
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasClick, { passive: false });
    canvas.addEventListener('mousemove', handleCanvasMove);
    canvas.addEventListener('touchmove', handleCanvasMove, { passive: true });
    canvas.addEventListener('mouseleave', handleCanvasLeave);
    if (btnWave()) btnWave().addEventListener('click', startWave);
    const btnAgain = el('btn-play-again');
    if (btnAgain) btnAgain.addEventListener('click', resetGame);
    const btnNewGame = el('btn-new-game');
    if (btnNewGame) btnNewGame.addEventListener('click', resetGame);
    const btnUpgrade = el('btn-upgrade');
    const btnSell = el('btn-sell');
    if (btnUpgrade) btnUpgrade.addEventListener('click', () => { if (selectedTower) upgradeTower(selectedTower); });
    if (btnSell) btnSell.addEventListener('click', () => { if (selectedTower) sellTower(selectedTower); });
    const btnPause = el('btn-pause');
    if (btnPause) btnPause.addEventListener('click', togglePause);
    const btnMute = el('btn-mute');
    if (btnMute) btnMute.addEventListener('click', toggleMute);
    const btnFullscreen = el('btn-fullscreen');
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
    const volumeSlider = el('volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', function () { setVolume(volumeSlider.value); });
      volumeSlider.addEventListener('change', function () { setVolume(volumeSlider.value); });
    }
    document.addEventListener('keydown', handleKeydown);
    renderTowerPicker();
    updateHUD();
    updateMuteButton();
    updateVolumeSlider();
    showFirstTimeTooltipIfNeeded();
    requestAnimationFrame(loop);
  }

  function handleKeydown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!gameOver && !win && !waveInProgress) startWave();
    } else if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
      if (!gameOver && !win) togglePause();
    }
  }

  function toggleFullscreen() {
    const app = document.getElementById('app');
    if (!app) return;
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        (app.requestFullscreen || app.webkitRequestFullscreen || app.msRequestFullscreen).call(app);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
