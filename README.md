# V PATHing Rewards

A modern rewards aggregator app that helps users earn money back on purchases while generating revenue through merchant commissions and affiliate partnerships.

## Features

- 🛍️ Browse merchants and cashback offers
- 💰 Track earnings and cashback transactions
- 🔐 User authentication (register/login)
- 📊 Personal dashboard with earnings summary
- 🎨 Modern, responsive UI built with React and Tailwind CSS

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- SQLite database
- JWT authentication
- RESTful API

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Project Structure

```
cashback-app/
├── backend/
│   ├── src/
│   │   ├── database.ts          # Database setup and initialization
│   │   ├── server.ts            # Express server setup
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT authentication middleware
│   │   └── routes/
│   │       ├── auth.ts          # Authentication routes
│   │       ├── merchants.ts     # Merchant routes
│   │       ├── offers.ts        # Offer routes
│   │       └── cashback.ts      # Cashback tracking routes
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── components/          # Reusable React components
    │   ├── pages/               # Page components
    │   ├── context/             # React context (Auth)
    │   ├── api/                 # API client setup
    │   ├── App.tsx              # Main app component
    │   └── main.tsx             # Entry point
    ├── package.json
    └── vite.config.ts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Merchants
- `GET /api/merchants` - Get all merchants
- `GET /api/merchants/:id` - Get merchant by ID
- `GET /api/merchants/:id/offers` - Get offers for a merchant

### Offers
- `GET /api/offers` - Get all active offers
- `GET /api/offers/:id` - Get offer by ID

### Cashback (Protected)
- `GET /api/cashback/transactions` - Get user's transactions
- `GET /api/cashback/summary` - Get earnings summary
- `POST /api/cashback/track` - Track a cashback transaction

## Revenue Model

This app can generate revenue through:

1. **Merchant Commissions**: Earn a percentage of each transaction when users shop through affiliate links
2. **Affiliate Partnerships**: Partner with affiliate networks (e.g., Commission Junction, Rakuten)
3. **Premium Subscriptions**: Offer premium features for a monthly fee
4. **Interchange Fees**: If integrated with payment cards
5. **Advertising**: Display relevant ads to users

## Next Steps for Production

1. **Integrate Real Affiliate Networks**: Connect with actual affiliate networks (CJ, Rakuten, Impact, etc.)
2. **Payment Processing**: Add payment gateway for withdrawals
3. **Email Notifications**: Send email alerts for cashback confirmations
4. **Admin Dashboard**: Build admin panel for managing merchants and offers
5. **Analytics**: Add tracking and analytics for user behavior
6. **Mobile App**: Develop native mobile apps (React Native)
7. **Security**: Implement rate limiting, input validation, and security headers
8. **Database Migration**: Move from SQLite to PostgreSQL for production
9. **Deployment**: Deploy to cloud platforms (AWS, Vercel, Railway)

## License

MIT
