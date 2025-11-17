import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function FlipBook({ pages, onPageChange, onAreaClick }) {
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Create spreads (pairs of pages for desktop view)
  const spreads = [];
  if (isMobile) {
    // Mobile: one page per spread
    pages.forEach((page, index) => {
      spreads.push({ left: null, right: page, index });
    });
  } else {
    // Desktop: two pages per spread
    for (let i = 0; i < pages.length; i += 2) {
      spreads.push({
        left: pages[i] || null,
        right: pages[i + 1] || null,
        index: i,
      });
    }
  }

  const handlePrevSpread = () => {
    if (currentSpreadIndex > 0 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection('prev');
      setTimeout(() => {
        setCurrentSpreadIndex(currentSpreadIndex - 1);
        if (onPageChange) {
          onPageChange(spreads[currentSpreadIndex - 1].index);
        }
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 600);
      }, 100);
    }
  };

  const handleNextSpread = () => {
    if (currentSpreadIndex < spreads.length - 1 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection('next');
      setTimeout(() => {
        setCurrentSpreadIndex(currentSpreadIndex + 1);
        if (onPageChange) {
          onPageChange(spreads[currentSpreadIndex + 1].index);
        }
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 600);
      }, 100);
    }
  };

  const handleAreaClick = (e, area, page) => {
    e.stopPropagation();
    if (onAreaClick) {
      onAreaClick(area, page);
    }
  };

  const renderPage = (page, side) => {
    if (!page) {
      return (
        <div className="flex-1 bg-gray-100 flex items-center justify-center">
          <p className="text-gray-400">-</p>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-white relative overflow-hidden shadow-inner">
        <img
          src={`/uploads/${page.png_path}`}
          alt={`Page ${page.page_number}`}
          className="w-full h-full object-contain"
          draggable={false}
        />

        {/* Clickable Areas */}
        {page.areas?.map((area) => (
          <div
            key={area.id}
            onClick={(e) => handleAreaClick(e, area, page)}
            style={{
              position: 'absolute',
              left: `${(area.x / page.width) * 100}%`,
              top: `${(area.y / page.height) * 100}%`,
              width: `${(area.width / page.width) * 100}%`,
              height: `${(area.height / page.height) * 100}%`,
              cursor: 'pointer',
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid transparent',
              transition: 'all 0.2s',
              zIndex: 10,
            }}
            className="hover:border-blue-400 hover:bg-blue-500/20"
            title={area.type?.replace('_', ' ') || 'Interactive area'}
          />
        ))}
      </div>
    );
  };

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white text-lg">No pages to display</p>
      </div>
    );
  }

  const currentSpread = spreads[currentSpreadIndex];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-7xl mx-auto px-4">
      {/* Book Container */}
      <div className="relative w-full" style={{ perspective: '2000px' }}>
        {/* Book Spread */}
        <div
          className={`relative bg-gray-800 rounded-lg shadow-2xl overflow-hidden transition-all duration-600 ${
            isFlipping ? 'flipping' : ''
          }`}
          style={{
            width: '100%',
            maxWidth: isMobile ? '600px' : '1400px',
            margin: '0 auto',
            aspectRatio: isMobile ? '3/4' : '16/10',
          }}
        >
          {/* Current Spread */}
          <div
            className={`spread-container ${
              isFlipping
                ? flipDirection === 'next'
                  ? 'flip-next'
                  : 'flip-prev'
                : ''
            }`}
            style={{
              display: 'flex',
              height: '100%',
              transformStyle: 'preserve-3d',
            }}
          >
            {!isMobile && (
              <>
                {/* Left Page */}
                {renderPage(currentSpread.left, 'left')}

                {/* Book Spine/Shadow */}
                <div
                  className="w-1 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900"
                  style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                />
              </>
            )}

            {/* Right Page */}
            {renderPage(currentSpread.right, 'right')}
          </div>

          {/* Navigation Buttons */}
          {currentSpreadIndex > 0 && (
            <button
              onClick={handlePrevSpread}
              disabled={isFlipping}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800/90 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed z-20"
              aria-label="Previous page"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {currentSpreadIndex < spreads.length - 1 && (
            <button
              onClick={handleNextSpread}
              disabled={isFlipping}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-gray-800/90 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed z-20"
              aria-label="Next page"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      </div>

      {/* Page Counter and Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrevSpread}
          disabled={currentSpreadIndex === 0 || isFlipping}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg min-w-[180px] text-center">
          <span className="font-medium">
            {isMobile
              ? `Page ${currentSpread.right?.page_number || '-'} / ${pages.length}`
              : `Pages ${currentSpread.left?.page_number || '-'}-${currentSpread.right?.page_number || '-'} / ${pages.length}`}
          </span>
        </div>

        <button
          onClick={handleNextSpread}
          disabled={currentSpreadIndex === spreads.length - 1 || isFlipping}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* CSS Animations */}
      <style>{`
        .spread-container {
          transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        .spread-container.flip-next {
          animation: page-flip-next 0.6s ease-in-out;
        }

        .spread-container.flip-prev {
          animation: page-flip-prev 0.6s ease-in-out;
        }

        @keyframes page-flip-next {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(-15deg) scale(0.98);
          }
          100% {
            transform: rotateY(0deg);
          }
        }

        @keyframes page-flip-prev {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(15deg) scale(0.98);
          }
          100% {
            transform: rotateY(0deg);
          }
        }

        /* Book shadow effect */
        .spread-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 100%;
          background: linear-gradient(to right,
            rgba(0,0,0,0.3) 0%,
            rgba(0,0,0,0.1) 50%,
            rgba(0,0,0,0.3) 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        @media (max-width: 1024px) {
          .spread-container::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
