# Casino Game Platform

A comprehensive casino game platform with table card games, video slots, bingo, and admin/player dashboards.

## Features

- 🎰 **Video Slots** - Spin the reels with animated spinning effects
- 🃏 **Blackjack** - Classic card game against the dealer
- 🎱 **Bingo** - Match numbers and win prizes
- 👤 **Player Dashboard** - Manage balance, view stats, and play games
- 👑 **Admin Dashboard** - Manage users, view platform statistics, and adjust balances

## Tech Stack

### Backend
- Node.js & Express
- MongoDB & Mongoose
- JWT Authentication
- Socket.io for real-time features

### Frontend
- React
- React Router
- Axios for API calls
- Modern CSS with animations

## Installation

1. Install root dependencies:
```bash
npm install
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Set up environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Update MongoDB URI and JWT secret

5. Start MongoDB (if running locally):
```bash
# Make sure MongoDB is running on localhost:27017
# Or update MONGODB_URI in server/.env
```

## Running the Application

### Development Mode (runs both server and client):
```bash
npm run dev
```

### Or run separately:

**Server:**
```bash
npm run server
# Server runs on http://localhost:5000
```

**Client:**
```bash
npm run client
# Client runs on http://localhost:3000
```

## Default Setup

- Server runs on port 5000
- Client runs on port 3000
- MongoDB connection: `mongodb://localhost:27017/casino`

## Creating an Admin User

To create an admin user, you can either:
1. Register a new user and manually update the role in MongoDB:
```javascript
db.users.updateOne({email: "admin@example.com"}, {$set: {role: "admin"}})
```

2. Or modify the registration route to allow admin creation with a special code

## Game Features

### Video Slots
- Animated spinning reels
- Multiple symbol types
- Win multipliers based on matches
- Real-time balance updates

### Blackjack
- Standard blackjack rules
- Hit/Stand actions
- Dealer AI (draws until 17+)
- Win/loss calculations

### Bingo
- 5x5 bingo card generation
- Number drawing system
- Row, column, and diagonal win detection
- Progressive prize multipliers

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Games
- `POST /api/games/slots/play` - Play slots
- `POST /api/games/blackjack/play` - Play blackjack
- `POST /api/games/bingo/play` - Start bingo game

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/balance` - Update balance (deposit/withdraw)

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get platform statistics
- `PUT /api/admin/users/:id/balance` - Adjust user balance

## License

ISC

