# Search & Filtering Feature Guide

## Overview

The search and filtering system allows users to quickly find merchants and offers based on various criteria.

## Features Implemented

### 1. Search Functionality
- **Real-time search** in the navbar (desktop) and homepage (mobile)
- **Autocomplete dropdown** showing merchants and offers as you type
- **Unified search** across merchants and offers
- **Debounced search** (300ms delay) for better performance
- **Search results page** with full filtering options

### 2. Filtering Options
- **Category filter**: Filter by merchant category (E-commerce, Retail, Electronics, etc.)
- **Cashback rate range**: Set minimum and maximum cashback percentages
- **Sort options**:
  - Highest Cashback (default)
  - Lowest Cashback
  - Merchant Name (A-Z)
  - Newest First

### 3. User Interface
- **Search bar** in navbar (desktop view)
- **Mobile search bar** on homepage
- **Filter sidebar** on search results page
- **Responsive design** for all screen sizes
- **Clear filters** button when filters are active

## How to Use

### Searching
1. Type in the search bar in the navbar
2. See instant results in the dropdown
3. Click on a result to go directly to that merchant/offer
4. Or click "View all results" to see the full search results page

### Filtering
1. Navigate to `/search` or use the search bar
2. Use the filter sidebar on the left:
   - Select a category from the dropdown
   - Set minimum/maximum cashback rates
   - Choose a sort option
3. Results update automatically as you change filters
4. Click "Clear All Filters" to reset

### URL Parameters
You can also use URL parameters directly:
- `/search?q=amazon` - Search for "amazon"
- `/search?category=Retail&minCashback=3` - Filter by category and minimum cashback
- `/search?sort=cashback_desc` - Sort by highest cashback

## API Endpoints

### Search
- `GET /api/search?q=term&type=all` - Unified search
- `GET /api/search/categories` - Get all categories

### Merchants with Filters
- `GET /api/merchants?search=term&category=Retail&minCashback=3&sort=cashback`

### Offers with Filters
- `GET /api/offers?search=term&category=Retail&minCashback=3&maxCashback=10&sort=cashback_desc`

### Query Parameters
- `search` - Search term (merchant/offer name)
- `category` - Filter by category
- `minCashback` - Minimum cashback rate
- `maxCashback` - Maximum cashback rate (offers only)
- `merchantId` - Filter offers by merchant (offers only)
- `sort` - Sort option:
  - Merchants: `cashback`, `name`, `offers`
  - Offers: `cashback_desc`, `cashback_asc`, `name`, `newest`

## Components

### SearchBar Component
- Located in `src/components/SearchBar.tsx`
- Real-time search with dropdown results
- Handles navigation to search results page

### Filters Component
- Located in `src/components/Filters.tsx`
- Category dropdown
- Cashback range inputs
- Sort dropdown
- Clear filters button

### SearchResults Page
- Located in `src/pages/SearchResults.tsx`
- Displays filtered merchants and offers
- Includes filter sidebar
- Shows result counts

## Technical Details

### Backend
- Updated `merchants.ts` route to support search/filter
- Updated `offers.ts` route to support search/filter
- New `search.ts` route for unified search
- SQL LIKE queries for text search
- COALESCE for handling null values in aggregations

### Frontend
- Debounced search input (300ms)
- Click-outside handler for dropdown
- URL state management with search params
- Responsive filter sidebar (collapsible on mobile)
- Loading states and error handling

## Future Enhancements

Potential improvements:
- Save favorite searches
- Recent searches history
- Advanced filters (date range, merchant type)
- Search analytics
- Popular searches suggestions
- Filter presets (e.g., "Best Deals", "New Offers")
