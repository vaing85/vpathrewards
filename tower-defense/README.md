# Tower Defense – Guinea Pig

A minimal single-player Tower Defense game for learning and as a base for mobile. Play in the browser; same build can later run in a mobile WebView (e.g. Capacitor).

## Quick start

1. **Run the game** — **must run from the `tower-defense` folder** or you get 404.
   - **Easiest (PowerShell):** right‑click `run.ps1` → Run with PowerShell, or in a terminal:
     ```powershell
     cd C:\Users\villa\tower-defense
     .\run.ps1
     ```
   - Or:
     ```bash
     cd C:\Users\villa\tower-defense
     npm install
     npm start
     ```
   - Open in the browser: **http://localhost:3333**
   - **If you get 404:** the server is running from the wrong folder. Stop it (Ctrl+C), then `cd C:\Users\villa\tower-defense` and run `.\run.ps1` or `npm start` from there.

2. **Play**
   - Tap/click a tower type (Basic, Cannon, Sniper), then tap an empty tile to build.
   - Tap **Start Wave** to send enemies. Survive 5 waves to win; don’t let lives reach 0.

## What’s in the box

| Feature | Details |
|--------|--------|
| **Path** | One route: top → right → down → left → down → exit (bottom-right). |
| **Towers** | Basic (cheap, fast), Cannon (AoE, slow), Sniper (long range). |
| **Enemies** | Normal, Fast, Tank (more HP). More variety appears in later waves. |
| **Input** | Mouse and touch (tap to select tower, tap to place). |
| **Win** | Complete wave 5. **Lose** if lives hit 0. |

## Phone & tablet layout

| Screen | Layout | What you see |
|--------|--------|----------------|
| **Desktop (>900px)** | Side-by-side | Control panel (stats, difficulty, Pause/Mute/Start Wave, tower picker) on the **left**; fixed 640×480 game board on the **right**. No empty gap. |
| **Tablet (≤900px)** | Stacked | Control panel **on top** (scrollable if needed, ~38% height); game board **below** and gets most of the screen. Tower buttons wrap in a row to save space. |
| **Phone (≤480px)** | Stacked, compact | Same stack; panel is a bit tighter (stats, buttons smaller); board scales to fit and gets at least half the viewport. Touch targets stay 44px+ for taps. |

The game board keeps a fixed aspect ratio (640×480) and scales down on small screens so it always fits; controls stay usable with large tap targets on touch devices.

## Project layout

```
tower-defense/
├── index.html      # Entry, canvas, HUD, tower picker
├── css/style.css   # Layout, HUD, buttons, mobile-friendly
├── js/game.js      # All logic: path, towers, enemies, waves, input, draw
└── README.md       # This file
```

## Next steps (when you’re ready)

- **More content:** New tower types, enemy types, wave patterns (edit `TOWER_TYPES`, `ENEMY_TYPES`, `getWaveEnemies` in `game.js`).
- **Mobile app:** Wrap in [Capacitor](https://capacitorjs.com/) or similar so it runs as an iOS/Android app; no game logic change needed.
- **Multiplayer later:** Keep single-player as-is; add a backend for leaderboards, then async or real-time co-op/vs (same core rules, extra mode).

## Tech

- Vanilla HTML5 Canvas + JavaScript (no framework).
- Single `game.js` for simplicity; you can split into modules later if the project grows.
