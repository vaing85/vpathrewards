import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

interface Category {
  category: string;
  count: number;
}

// Map a category name to a representative emoji via keyword match.
const EMOJI_BY_KEYWORD: Array<[RegExp, string]> = [
  [/electron|tech|gadget|computer/i, '💻'],
  [/phone|mobile|telecom/i, '📱'],
  [/fashion|cloth|apparel|shoe|wear|jewel/i, '👗'],
  [/travel|flight|hotel|vacation|trip/i, '✈️'],
  [/food|grocery|restaurant|dining|meal|drink/i, '🍔'],
  [/beauty|cosmet|skincare|makeup/i, '💄'],
  [/health|wellness|fitness|pharma|medical/i, '💊'],
  [/home|furnitur|garden|decor|kitchen/i, '🏠'],
  [/sport|outdoor/i, '⚽'],
  [/book|education|learn|course|stationery/i, '📚'],
  [/pet|animal/i, '🐾'],
  [/toy|kid|baby|child/i, '🧸'],
  [/game|gaming/i, '🎮'],
  [/auto|car|vehicle|motor/i, '🚗'],
  [/finance|bank|insurance|money|invest/i, '💳'],
  [/entertain|movie|music|stream|media/i, '🎬'],
  [/gift|card/i, '🎁'],
  [/e-?commerce|shop|retail|store|market|general/i, '🛍️'],
];

const emojiFor = (name: string): string => {
  for (const [re, emoji] of EMOJI_BY_KEYWORD) {
    if (re.test(name)) return emoji;
  }
  return '🏷️';
};

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/search/categories')
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-4">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Categories</span>
        </nav>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Browse by category</h1>
        <p className="text-gray-600 mb-8">Pick a category to see the stores inside it.</p>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No categories available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.category}
                to={`/category/${encodeURIComponent(cat.category)}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 p-6 flex flex-col items-center text-center transition"
              >
                <span className="text-4xl mb-3" aria-hidden="true">{emojiFor(cat.category)}</span>
                <span className="font-semibold text-gray-800 group-hover:text-primary-600 transition">
                  {cat.category}
                </span>
                <span className="text-sm text-gray-500 mt-1">
                  {cat.count} {cat.count === 1 ? 'store' : 'stores'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
