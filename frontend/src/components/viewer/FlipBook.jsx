import { useRef, forwardRef, useEffect, useState, useImperativeHandle } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Page component - must use forwardRef for react-pageflip
const Page = forwardRef(({ page, onAreaClick, number, highlightedWords = [] }, ref) => {
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

  // Filter highlighted words for this page
  const pageHighlights = highlightedWords.filter(
    (word) => word.page_number === page.page_number
  );

  return (
    <div ref={ref} className="page">
      <img
        src={`/uploads/${page.png_path}`}
        alt={`Page ${page.page_number}`}
        draggable={false}
      />

      {/* Highlighted Words */}
      {pageHighlights.map((word) => (
        <div
          key={word.id}
          style={{
            position: 'absolute',
            left: `${(word.x / page.width) * 100}%`,
            top: `${(word.y / page.height) * 100}%`,
            width: `${(word.width / page.width) * 100}%`,
            height: `${(word.height / page.height) * 100}%`,
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        />
      ))}

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

const FlipBook = forwardRef(({ pages, onPageChange, onAreaClick, highlightedWords = [], containerWidth }, ref) => {
  const bookRef = useRef();
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 550, height: 733 });

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    goToPage: (pageIndex) => {
      if (bookRef.current) {
        bookRef.current.pageFlip().flip(pageIndex);
      }
    },
  }));

  useEffect(() => {
    // Calculate responsive dimensions based on first page ratio
    const updateDimensions = () => {
      if (pages.length === 0) return;

      // Get the ratio from the first page (all pages should have similar ratios)
      const firstPage = pages[0];
      const pageRatio = firstPage.height / firstPage.width; // height/width ratio (usually ~1.4 for A4)

      const isMobile = window.innerWidth < 1024;

      // Use containerWidth if provided, otherwise use window width
      const baseWidth = containerWidth || window.innerWidth;

      // Calculate available space more precisely
      // Header is ~60px, controls are ~70px, gap ~16px = ~146px total
      const availableHeight = window.innerHeight - 146;
      const availableWidth = baseWidth - 20; // Small margin to prevent overflow

      if (isMobile) {
        // Mobile: single page
        let width = availableWidth * 0.9;
        let height = width * pageRatio;

        // If height is too large, recalculate based on height
        if (height > availableHeight) {
          height = availableHeight;
          width = height / pageRatio;
        }

        setDimensions({ width, height });
      } else {
        // Desktop: two pages side by side
        // Try to maximize usage of available space
        // Account for the gap between pages and some margin
        let pageWidth = (availableWidth - 40) / 2; // 40px total for spacing
        let pageHeight = pageWidth * pageRatio;

        // If height is too large, recalculate based on height
        if (pageHeight > availableHeight) {
          pageHeight = availableHeight * 0.95; // Use 95% of available height
          pageWidth = pageHeight / pageRatio;
        }

        setDimensions({ width: pageWidth, height: pageHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [pages, containerWidth]);

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
    <div className="flex flex-col items-center gap-4 h-full w-full">
      {/* Book Container */}
      <div className="relative flex items-center justify-center flex-1 w-full">
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="fixed"
          minWidth={400}
          maxWidth={2000}
          minHeight={500}
          maxHeight={2800}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={false}
          onFlip={handleFlip}
          className="shadow-2xl"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={600}
          usePortrait={false}
          startZIndex={0}
          autoSize={false}
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
              highlightedWords={highlightedWords}
            />
          ))}
        </HTMLFlipBook>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="bg-gray-800 text-white px-6 py-2 rounded-full shadow-lg min-w-[140px] text-center">
          <span className="font-medium">
            {currentPage + 1} / {totalPages}
          </span>
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - 1}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Custom styles for pages */}
      <style>{`
        .page {
          background: white;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .stf__wrapper {
          background: #1f2937 !important;
          padding: 0 !important;
          border-radius: 0px;
        }

        .stf__block {
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.3) !important;
        }

        .stf__page {
          background: white !important;
        }
      `}</style>
    </div>
  );
});

FlipBook.displayName = 'FlipBook';

export default FlipBook;
