import { useEffect, useRef, useState } from 'react';
import { PageFlip } from 'page-flip';

export default function FlipBook({ pages, onPageChange, onAreaClick }) {
  const flipBookRef = useRef(null);
  const pageFlipRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!flipBookRef.current || pages.length === 0) return;

    // Initialize PageFlip
    const pageFlip = new PageFlip(flipBookRef.current, {
      width: 550, // Base page width
      height: 733, // Base page height (A4 ratio)
      size: 'stretch',
      minWidth: 315,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1350,
      maxShadowOpacity: 0.5,
      showCover: true,
      mobileScrollSupport: false,
      swipeDistance: 30,
      clickEventForward: true,
      usePortrait: true,
      startPage: 0,
      autoSize: true,
      showPageCorners: true,
      disableFlipByClick: false,
    });

    pageFlipRef.current = pageFlip;

    // Load book
    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    // Event listeners
    pageFlip.on('flip', (e) => {
      const newPage = e.data;
      setCurrentPage(newPage);
      if (onPageChange) {
        onPageChange(newPage);
      }
    });

    pageFlip.on('changeOrientation', (e) => {
      pageFlip.updateState();
    });

    setIsReady(true);

    return () => {
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy();
      }
    };
  }, [pages, onPageChange]);

  const handleAreaClick = (e, area, pageData) => {
    // Stop event from triggering page flip
    e.stopPropagation();
    if (onAreaClick) {
      onAreaClick(area, pageData);
    }
  };

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white text-lg">No pages to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* FlipBook Container */}
      <div
        ref={flipBookRef}
        className="shadow-2xl"
        style={{
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="page bg-white relative"
            data-density="hard"
          >
            <div className="relative w-full h-full">
              {/* Page Image */}
              <img
                src={`/uploads/${page.png_path}`}
                alt={`Page ${page.page_number}`}
                className="w-full h-full object-contain"
                draggable={false}
              />

              {/* Clickable Areas Overlay */}
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
          </div>
        ))}
      </div>

      {/* Page Counter */}
      {isReady && (
        <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg">
          <span className="font-medium">
            Page {currentPage + 1} / {pages.length}
          </span>
        </div>
      )}
    </div>
  );
}
