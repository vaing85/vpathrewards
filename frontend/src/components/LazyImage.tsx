import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  width?: number | string;
  height?: number | string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  fallback = 'https://placehold.co/150?text=No+Image',
  onError,
  width,
  height,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Use Intersection Observer for better lazy loading support
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded && !hasError) {
            // Start loading the image when it enters viewport
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };
            img.onerror = () => {
              setImageSrc(fallback);
              setHasError(true);
            };
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
      observer.disconnect();
    };
  }, [src, isLoaded, hasError, fallback]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setImageSrc(fallback);
      setHasError(true);
    }
    if (onError) {
      onError(e);
    }
  };

  // Show placeholder while loading
  const displaySrc = imageSrc || placeholder || fallback;
  const showPlaceholder = !isLoaded && !hasError && placeholder;

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {showPlaceholder && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        className={`${className} ${showPlaceholder ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading="lazy"
        onError={handleError}
        width={width}
        height={height}
        style={{ width, height }}
      />
    </div>
  );
};

export default LazyImage;
