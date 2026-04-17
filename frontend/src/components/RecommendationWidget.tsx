import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

interface Recommendation {
  id: number;
  merchant_id: number;
  title: string;
  cashback_rate: number;
  merchant_name: string;
  category: string;
  reason: string;
}

export default function RecommendationWidget() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/recommendations')
      .then(({ data }) => setRecs(data.recommendations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (recs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">✨</span>
        <h2 className="font-semibold text-gray-800">AI Picks For You</h2>
        <span className="text-xs text-gray-400 ml-auto">Powered by Claude</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {recs.map((rec) => (
          <Link
            key={rec.id}
            to={`/offers/${rec.id}`}
            className="group flex flex-col gap-1 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 truncate">{rec.merchant_name}</span>
              <span className="text-sm font-bold text-green-600 whitespace-nowrap ml-2">
                {rec.cashback_rate}%
              </span>
            </div>
            <span className="text-xs text-gray-500 truncate">{rec.category}</span>
            <p className="text-xs text-blue-600 mt-1 leading-snug">{rec.reason}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
