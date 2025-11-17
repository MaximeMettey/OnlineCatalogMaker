import { useRef, forwardRef, useEffect, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Page component - must use forwardRef for react-pageflip
const Page = forwardRef(({ page, onAreaClick, number }, ref) => {
  const handleAreaClick = (e, area) => {
    e.stopPropagation();
    if (onAreaClick) {
      onAreaClick(area, page);
    }
  };

  if (!page) {
    // Empty page
    return (
      <div ref={ref} className="page bg-white flex items-center justify-center">
        <p className="text-gray-300">-</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="page bg-white relative overflow-hidden">
      <img
        src={`/uploads/${page.png_path}`}
        alt={`Page ${page.page_number}`}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Clickable Areas */}
      {page.areas?.map((area) => (
        <div
          key={area.id}
          onClick={(e) => handleAreaClick(e, area)}
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

      {/* Page number indicator */}
      <div className="absolute bottom-4 right-4 bg-gray-900/70 text-white px-3 py-1 rounded text-sm">
        {page.page_number}
      </div>
    </div>
  );
});

Page.displayName = 'Page';

export default function FlipBook({ pages, onPageChange, onAreaClick }) {
  const bookRef = useRef();
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 550, height: 733 });

  useEffect(() => {
    // Calculate responsive dimensions
    const updateDimensions = () => {
      const maxWidth = Math.min(window.innerWidth * 0.9, 1200);
      const isMobile = window.innerWidth < 1024;

      if (isMobile) {
        setDimensions({ width: maxWidth, height: maxWidth * 1.4 });
      } else {
        // Desktop: half width for each page
        const pageWidth = maxWidth / 2;
        setDimensions({ width: pageWidth, height: pageWidth * 1.4 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (pages.length > 0) {
      // Total pages in the book including cover logic
      setTotalPages(pages.length);
    }
  }, [pages]);

  const handleFlip = (e) => {
    setCurrentPage(e.data);
    if (onPageChange) {
      onPageChange(e.data);
    }
  };

  const goToPrevPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const goToNextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white text-lg">No pages to display</p>
      </div>
    );
  }

  // Organize pages: first page alone, then pairs, last page alone if odd
  const bookPages = [];

  // First page (cover) - always alone
  bookPages.push(pages[0]);

  // Middle pages in pairs
  for (let i = 1; i < pages.length - 1; i++) {
    bookPages.push(pages[i]);
  }

  // Last page - alone if it's the last one and there's more than one page
  if (pages.length > 1) {
    bookPages.push(pages[pages.length - 1]);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-7xl mx-auto px-4">
      {/* Book Container */}
      <div className="relative flex items-center justify-center w-full">
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="stretch"
          minWidth={315}
          maxWidth={1000}
          minHeight={400}
          maxHeight={1533}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={false}
          onFlip={handleFlip}
          className="shadow-2xl"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={1000}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {bookPages.map((page, index) => (
            <Page
              key={page.id}
              page={page}
              onAreaClick={onAreaClick}
              number={index + 1}
            />
          ))}
        </HTMLFlipBook>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          aria-label="Previous page"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="bg-gray-800 text-white px-8 py-3 rounded-full shadow-lg min-w-[180px] text-center">
          <span className="font-medium text-lg">
            {currentPage + 1} / {totalPages}
          </span>
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - 1}
          className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          aria-label="Next page"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Instructions */}
      <div className="text-gray-400 text-sm text-center">
        <p>Cliquez sur les coins des pages ou utilisez les flèches pour feuilleter</p>
      </div>

      {/* Custom styles for pages */}
      <style>{`
        .page {
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
        }

        .stf__wrapper {
          background: #1f2937 !important;
          padding: 20px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
