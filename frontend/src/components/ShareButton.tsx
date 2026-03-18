import { useState } from 'react';

interface ShareButtonProps {
  offerId?: number;
  merchantId?: number;
  title: string;
  description?: string;
  cashbackRate?: number;
  size?: 'sm' | 'md' | 'lg';
}

const ShareButton = ({ offerId, merchantId, title, description, cashbackRate, size = 'md' }: ShareButtonProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && navigator.share;

  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    if (offerId) {
      return `${baseUrl}/offers/${offerId}`;
    } else if (merchantId) {
      return `${baseUrl}/merchants/${merchantId}`;
    }
    return baseUrl;
  };

  const shareText = cashbackRate
    ? `Check out ${title} with ${cashbackRate}% cashback!`
    : `Check out ${title}!`;

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: title,
        text: shareText,
        url: getShareUrl()
      });
      setShowMenu(false);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
    }
  };

  const handleShare = async (platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'copy') => {
    const url = getShareUrl();
    const fullText = `${shareText} ${url}`;

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(fullText);
        alert('Link copied to clipboard!');
        break;
    }
    setShowMenu(false);
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`${sizeClasses[size]} text-gray-600 hover:text-primary-600 transition-colors`}
        title="Share"
      >
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 border-b border-gray-100"
                >
                  <span>📤</span>
                  <span>Share (device)</span>
                </button>
              )}
              <button
                onClick={() => handleShare('facebook')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <span className="text-blue-600">📘</span>
                <span>Facebook</span>
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <span className="text-blue-400">🐦</span>
                <span>Twitter</span>
              </button>
              <button
                onClick={() => handleShare('linkedin')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <span className="text-blue-700">💼</span>
                <span>LinkedIn</span>
              </button>
              <button
                onClick={() => handleShare('whatsapp')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <span className="text-green-600">💬</span>
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare('copy')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
