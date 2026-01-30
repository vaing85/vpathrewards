/**
 * Comprehensive Game Connection Test
 * Tests all 50 games for proper imports, routes, and API endpoints
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Comprehensive Game Connection Test\n');
console.log('='.repeat(70));

// Game mapping: route name -> component name
const gameMappings = {
  'slots': 'SlotGame',
  'blackjack': 'BlackjackGame',
  'bingo': 'BingoGame',
  'roulette': 'RouletteGame',
  'poker': 'PokerGame',
  'wheel': 'WheelGame',
  'craps': 'CrapsGame',
  'keno': 'KenoGame',
  'scratch': 'ScratchGame',
  'texasholdem': 'TexasHoldemGame',
  'threecardpoker': 'ThreeCardPokerGame',
  'caribbeanstud': 'CaribbeanStudGame',
  'paigow': 'PaiGowGame',
  'letitride': 'LetItRideGame',
  'casinowar': 'CasinoWarGame',
  'reddog': 'RedDogGame',
  'baccarat': 'BaccaratGame',
  'spanish21': 'Spanish21Game',
  'pontoon': 'PontoonGame',
  'doubleexposure': 'DoubleExposureGame',
  'perfectpairs': 'PerfectPairsGame',
  'sicbo': 'SicBoGame',
  'dragontiger': 'DragonTigerGame',
  'bigsmall': 'BigSmallGame',
  'hilo': 'HiLoGame',
  'lucky7': 'Lucky7Game',
  'diceduel': 'DiceDuelGame',
  'numbermatch': 'NumberMatchGame',
  'quickdraw': 'QuickDrawGame',
  'numberwheel': 'NumberWheelGame',
  'moneywheel': 'MoneyWheelGame',
  'bigsix': 'BigSixGame',
  'colorwheel': 'ColorWheelGame',
  'multiplierwheel': 'MultiplierWheelGame',
  'bonuswheel': 'BonusWheelGame',
  'fortunewheel': 'FortuneWheelGame',
  'lotterydraw': 'LotteryDrawGame',
  'pick3': 'Pick3Game',
  'pick5': 'Pick5Game',
  'numberball': 'NumberBallGame',
  'luckynumbers': 'LuckyNumbersGame',
  'instantwin': 'InstantWinGame',
  'match3': 'Match3Game',
  'coinflip': 'CoinFlipGame',
  'quickwin': 'QuickWinGame',
  'classicslots': 'ClassicSlotsGame',
  'fruitslots': 'FruitSlotsGame',
  'diamondslots': 'DiamondSlotsGame',
  'progressiveslots': 'ProgressiveSlotsGame',
  'multilineslots': 'MultiLineSlotsGame'
};

const gamesDir = path.join(__dirname, 'client', 'src', 'components', 'Games');
const appJsPath = path.join(__dirname, 'client', 'src', 'App.js');
const gamesRoutePath = path.join(__dirname, 'server', 'routes', 'games.js');
const gamesExtendedPath = path.join(__dirname, 'server', 'routes', 'games-extended.js');

// Read files
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const gamesRouteContent = fs.existsSync(gamesRoutePath) ? fs.readFileSync(gamesRoutePath, 'utf8') : '';
const gamesExtendedContent = fs.existsSync(gamesExtendedPath) ? fs.readFileSync(gamesExtendedPath, 'utf8') : '';

console.log('\n📋 Testing All 50 Games:\n');

let passed = 0;
let failed = 0;
const issues = [];

Object.entries(gameMappings).forEach(([routeName, componentName]) => {
  const route = `/games/${routeName}`;
  const componentFile = path.join(gamesDir, `${componentName}.js`);
  const componentExists = fs.existsSync(componentFile);
  
  // Check if route exists in App.js
  const routePattern = new RegExp(`path="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
  const routeExists = routePattern.test(appJsContent);
  
  // Check if component is imported
  const importPattern = new RegExp(`import.*${componentName}`, 'i');
  const lazyPattern = new RegExp(`lazy\\(.*${componentName}`, 'i');
  const importExists = importPattern.test(appJsContent) || lazyPattern.test(appJsContent);
  
  // Check if API endpoint exists
  const apiPattern = new RegExp(`/${routeName}/play`, 'i');
  const apiExists = apiPattern.test(gamesRouteContent) || apiPattern.test(gamesExtendedContent);
  
  const allGood = componentExists && routeExists && importExists && apiExists;
  
  if (allGood) {
    passed++;
    process.stdout.write('✅');
  } else {
    failed++;
    process.stdout.write('❌');
    issues.push({
      game: routeName,
      component: componentName,
      componentExists,
      routeExists,
      importExists,
      apiExists
    });
  }
  
  // Print every 10 games
  if ((passed + failed) % 10 === 0) {
    process.stdout.write(` ${passed + failed}/50\n`);
  }
});

if ((passed + failed) % 10 !== 0) {
  console.log(` ${passed + failed}/50`);
}

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (issues.length > 0) {
  console.log('⚠️  Issues Found:\n');
  issues.forEach(({ game, component, componentExists, routeExists, importExists, apiExists }) => {
    console.log(`  Game: ${game} (${component})`);
    if (!componentExists) console.log('    ❌ Component file missing');
    if (!routeExists) console.log('    ❌ Route not found in App.js');
    if (!importExists) console.log('    ❌ Component not imported');
    if (!apiExists) console.log('    ❌ API endpoint missing');
    console.log('');
  });
} else {
  console.log('✅ All games are properly connected!\n');
}

// Test shared components
console.log('🔧 Testing Shared Components:\n');
const sharedComponents = ['GameHeader', 'BetControls', 'ResultOverlay'];
const sharedDir = path.join(__dirname, 'client', 'src', 'components', 'Games', 'Shared');

sharedComponents.forEach(component => {
  const componentFile = path.join(sharedDir, `${component}.js`);
  const exists = fs.existsSync(componentFile);
  console.log(`  ${exists ? '✅' : '❌'} ${component}.js`);
});

console.log('\n' + '='.repeat(70));
console.log('\n✨ Test Complete!\n');

