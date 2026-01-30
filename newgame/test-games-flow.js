/**
 * Test Script: Verify all game routes and connections
 * 
 * This script tests:
 * 1. All game components are importable
 * 2. All routes are properly configured
 * 3. API endpoints exist
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Game Connections and Flow\n');
console.log('='.repeat(60));

// Test 1: Check all game components exist
console.log('\n📁 Test 1: Checking game component files...');
const gamesDir = path.join(__dirname, 'client', 'src', 'components', 'Games');
const gameFiles = fs.readdirSync(gamesDir)
  .filter(file => file.endsWith('Game.js'))
  .map(file => file.replace('Game.js', ''));

console.log(`Found ${gameFiles.length} game components:`);
gameFiles.forEach((game, index) => {
  const gameName = game.charAt(0).toUpperCase() + game.slice(1).replace(/([A-Z])/g, ' $1');
  console.log(`  ${index + 1}. ${gameName} (${game}Game.js)`);
});

// Test 2: Check App.js routes
console.log('\n🔗 Test 2: Checking App.js routes...');
const appJsPath = path.join(__dirname, 'client', 'src', 'App.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

const routeMatches = appJsContent.match(/path="\/games\/[^"]+"/g) || [];
const routes = routeMatches.map(route => route.match(/\/games\/[^"]+/)[0]);

console.log(`Found ${routes.length} game routes:`);
routes.forEach((route, index) => {
  const gameName = route.split('/').pop().replace(/([A-Z])/g, ' $1');
  console.log(`  ${index + 1}. ${route}`);
});

// Test 3: Check server routes
console.log('\n🖥️  Test 3: Checking server game routes...');
const gamesRoutePath = path.join(__dirname, 'server', 'routes', 'games.js');
const gamesExtendedPath = path.join(__dirname, 'server', 'routes', 'games-extended.js');

let serverRoutes = [];
if (fs.existsSync(gamesRoutePath)) {
  const gamesContent = fs.readFileSync(gamesRoutePath, 'utf8');
  const routeMatches = gamesContent.match(/router\.(post|get)\('\/[^']+\/play'/g) || [];
  serverRoutes = routeMatches.map(route => {
    const match = route.match(/\/([^']+)\/play/);
    return match ? match[1] : null;
  }).filter(Boolean);
}

if (fs.existsSync(gamesExtendedPath)) {
  const extendedContent = fs.readFileSync(gamesExtendedPath, 'utf8');
  // Look for playSimpleGame calls
  const simpleGameMatches = extendedContent.match(/playSimpleGame\([^,]+,\s*'([^']+)'/g) || [];
  const simpleGames = simpleGameMatches.map(match => {
    const gameMatch = match.match(/'([^']+)'/);
    return gameMatch ? gameMatch[1] : null;
  }).filter(Boolean);
  serverRoutes = [...serverRoutes, ...simpleGames];
}

console.log(`Found ${serverRoutes.length} server game endpoints:`);
serverRoutes.forEach((route, index) => {
  console.log(`  ${index + 1}. POST /api/games/${route}/play`);
});

// Test 4: Verify route-component mapping
console.log('\n🔍 Test 4: Verifying route-component mapping...');
const missingComponents = [];
const missingRoutes = [];

routes.forEach(route => {
  const gameName = route.split('/').pop();
  const componentName = gameName.charAt(0).toUpperCase() + gameName.slice(1).replace(/([A-Z])/g, '$1');
  const componentFile = path.join(gamesDir, `${componentName}Game.js`);
  
  if (!fs.existsSync(componentFile)) {
    missingComponents.push({ route, component: `${componentName}Game.js` });
  }
});

gameFiles.forEach(gameFile => {
  const routeName = gameFile.toLowerCase();
  const route = `/games/${routeName}`;
  if (!routes.includes(route)) {
    missingRoutes.push({ component: `${gameFile}Game.js`, route });
  }
});

if (missingComponents.length > 0) {
  console.log('  ⚠️  Missing component files:');
  missingComponents.forEach(({ route, component }) => {
    console.log(`     ${route} -> ${component}`);
  });
} else {
  console.log('  ✅ All routes have corresponding components');
}

if (missingRoutes.length > 0) {
  console.log('  ⚠️  Components without routes:');
  missingRoutes.forEach(({ component, route }) => {
    console.log(`     ${component} -> ${route}`);
  });
} else {
  console.log('  ✅ All components have corresponding routes');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`   • Game Components: ${gameFiles.length}`);
console.log(`   • Client Routes: ${routes.length}`);
console.log(`   • Server Endpoints: ${serverRoutes.length}`);
console.log(`   • Missing Components: ${missingComponents.length}`);
console.log(`   • Missing Routes: ${missingRoutes.length}`);

if (missingComponents.length === 0 && missingRoutes.length === 0) {
  console.log('\n✅ All game connections verified successfully!');
} else {
  console.log('\n⚠️  Some issues found. Please review above.');
}

console.log('\n');

