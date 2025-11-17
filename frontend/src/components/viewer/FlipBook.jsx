import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function FlipBook({ pages, onPageChange, onAreaClick }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState(null);

  const handlePrevPage = () => {
    if (currentPageIndex > 0 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection('prev');
      setTimeout(() => {
        setCurrentPageIndex(currentPageIndex - 1);
        if (onPageChange) {
          onPageChange(currentPageIndex - 1);
        }
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 300);
      }, 300);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection('next');
      setTimeout(() => {
        setCurrentPageIndex(currentPageIndex + 1);
        if (onPageChange) {
          onPageChange(currentPageIndex + 1);
        }
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 300);
      }, 300);
    }
  };

  const handleAreaClick = (e, area) => {
    e.stopPropagation();
    if (onAreaClick) {
      onAreaClick(area, pages[currentPageIndex]);
    }
  };

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white text-lg">No pages to display</p>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Book Container with Page Flip Animation */}
      <div className="relative perspective-1000">
        <div
          className={`relative bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-600 ${
            isFlipping
              ? flipDirection === 'next'
                ? 'animate-flip-next'
                : 'animate-flip-prev'
              : ''
          }`}
          style={{
            maxWidth: '900px',
            minHeight: '600px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Current Page */}
          <div className="relative w-full h-full">
            <img
              src={`/uploads/${currentPage.png_path}`}
              alt={`Page ${currentPage.page_number}`}
              className="w-full h-full object-contain"
              style={{ maxHeight: '80vh' }}
              draggable={false}
            />

            {/* Clickable Areas Overlay */}
            {currentPage.areas?.map((area) => (
              <div
                key={area.id}
                onClick={(e) => handleAreaClick(e, area)}
                style={{
                  position: 'absolute',
                  left: `${(area.x / currentPage.width) * 100}%`,
                  top: `${(area.y / currentPage.height) * 100}%`,
                  width: `${(area.width / currentPage.width) * 100}%`,
                  height: `${(area.height / currentPage.height) * 100}%`,
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

          {/* Navigation Buttons Overlay */}
          {currentPageIndex > 0 && (
            <button
              onClick={handlePrevPage}
              disabled={isFlipping}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed z-20"
              aria-label="Previous page"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {currentPageIndex < pages.length - 1 && (
            <button
              onClick={handleNextPage}
              disabled={isFlipping}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed z-20"
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
          onClick={handlePrevPage}
          disabled={currentPageIndex === 0 || isFlipping}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg min-w-[140px] text-center">
          <span className="font-medium">
            Page {currentPageIndex + 1} / {pages.length}
          </span>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPageIndex === pages.length - 1 || isFlipping}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Add custom CSS for flip animation */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }

        @keyframes flip-next {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(-90deg);
            opacity: 0.3;
          }
          100% {
            transform: rotateY(0deg);
          }
        }

        @keyframes flip-prev {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(90deg);
            opacity: 0.3;
          }
          100% {
            transform: rotateY(0deg);
          }
        }

        .animate-flip-next {
          animation: flip-next 0.6s ease-in-out;
        }

        .animate-flip-prev {
          animation: flip-prev 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
