# Comprehensive Game Consistency Review

## Issues Found

### 1. Back Button Class Names
**Inconsistent:** Some games use `btn btn-secondary`, others use `back-btn`
- **Using `btn btn-secondary`:** All card games, Keno, Wheel, Slot
- **Using `back-btn`:** Roulette, Match3, CoinFlip, InstantWin, QuickWin, Bingo, NumberWheel, QuickDraw, NumberMatch, DiceDuel, Lucky7, BigSmall, DragonTiger, SicBo, Craps, HiLo, ClassicSlots

**Standard:** Should use `back-btn` for consistency

### 2. Balance Display Class Names
**Inconsistent:** Some games use `balance`, others use `balance-display`
- **Using `balance`:** All card games, Keno, Wheel, Slot
- **Using `balance-display`:** Roulette, Match3, CoinFlip, InstantWin, QuickWin, Bingo, NumberWheel, QuickDraw, NumberMatch, DiceDuel, Lucky7, BigSmall, DragonTiger, SicBo, Craps, HiLo, ClassicSlots

**Standard:** Should use `balance-display` for consistency

### 3. Container Class Names
**Inconsistent:** Some use generic `game-container`, others use game-specific names
- **Using `game-container`:** All card games, Keno, Wheel, Slot
- **Using `{gamename}-game-container`:** Roulette, Match3, CoinFlip, InstantWin, QuickWin, Bingo, NumberWheel, QuickDraw, NumberMatch, DiceDuel, Lucky7, BigSmall, DragonTiger, SicBo, Craps, HiLo, ClassicSlots

**Note:** Game-specific container names are actually better for CSS scoping, but we should ensure all games follow the same pattern.

### 4. Header Class Names
**Inconsistent:** Some use generic `game-header`, others use game-specific names
- **Using `game-header`:** All card games, Keno, Wheel, Slot
- **Using `{gamename}-header`:** Roulette, Match3, CoinFlip, InstantWin, QuickWin, Bingo, NumberWheel, QuickDraw, NumberMatch, DiceDuel, Lucky7, BigSmall, DragonTiger, SicBo, Craps, HiLo, ClassicSlots

**Note:** Game-specific header names are actually better for CSS scoping, but we should ensure all games follow the same pattern.

### 5. Notification Timers
**Missing:** RouletteGame doesn't have notification timer display (has auto-close but no countdown)
- **Has timer:** Most games with result overlays
- **Missing timer:** RouletteGame (has auto-close but no visible countdown)

### 6. Result Overlay Structure
**Inconsistent:** Some games use `showResultPopup`, others may use different patterns
- Most games use `showResultPopup` state
- Need to verify all games have consistent result overlay structure

## Recommended Standard

1. **Back Button:** Use `back-btn` class
2. **Balance Display:** Use `balance-display` class  
3. **Container:** Use `{gamename}-game-container` pattern (more specific, better for CSS)
4. **Header:** Use `{gamename}-header` pattern (more specific, better for CSS)
5. **Notification Timer:** All games with result overlays should have visible countdown timer
6. **Result Overlay:** Use `showResultPopup` state with `notificationTimer` and `timerRef`

## Games to Fix

### Priority 1: Back Button & Balance Display
- All card games (15 games)
- KenoGame
- WheelGame  
- SlotGame

### Priority 2: Notification Timer
- RouletteGame

### Priority 3: Container/Header Naming (Optional - game-specific names are actually better)
- Consider if we want to standardize to game-specific or generic names

