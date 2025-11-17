import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import catalogService from '../services/catalog';
import FlipBook from '../components/viewer/FlipBook';

export default function CatalogViewer() {
  const { slug } = useParams();
  const [catalog, setCatalog] = useState(null);
  const [pagesWithAreas, setPagesWithAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoPopup, setVideoPopup] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedWords, setHighlightedWords] = useState([]);
  const [containerWidth, setContainerWidth] = useState(null);
  const flipBookRef = useRef();
  const viewerContainerRef = useRef();

  useEffect(() => {
    // Calculate container width for FlipBook
    const updateContainerWidth = () => {
      if (viewerContainerRef.current) {
        setContainerWidth(viewerContainerRef.current.offsetWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, [searchResults]); // Recalculate when search results change (sidebar appears/disappears)

  useEffect(() => {
    loadCatalog();
  }, [slug]);

  const loadCatalog = async () => {
    try {
      const [catalogData, pagesData] = await Promise.all([
        catalogService.getViewerCatalog(slug),
        catalogService.getViewerPages(slug),
      ]);
      setCatalog(catalogData);

      // Load all pages with their clickable areas
      const pagesWithAreasData = await Promise.all(
        pagesData.map(async (page) => {
          try {
            const pageData = await catalogService.getViewerPage(slug, page.page_number);
            return {
              ...page,
              areas: pageData.areas || [],
            };
          } catch (error) {
            console.error(`Failed to load areas for page ${page.page_number}:`, error);
            return {
              ...page,
              areas: [],
            };
          }
        })
      );

      setPagesWithAreas(pagesWithAreasData);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setHighlightedWords([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await catalogService.searchCatalog(slug, searchQuery);
      setSearchResults(results);
      setHighlightedWords([]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (pageNumber, words) => {
    // Find the index in the pagesWithAreas array
    const pageIndex = pagesWithAreas.findIndex((p) => p.page_number === pageNumber);
    if (pageIndex >= 0 && flipBookRef.current) {
      flipBookRef.current.goToPage(pageIndex);
      // Add page_number to each word so the filter works in FlipBook
      const wordsWithPageNumber = words.map(word => ({
        ...word,
        page_number: pageNumber
      }));
      setHighlightedWords(wordsWithPageNumber);
    }
  };

  const handleAreaClick = (area, currentPage) => {
    switch (area.type) {
      case 'link_external':
        if (area.config.target === 'iframe') {
          // Open in iframe popup (simplified)
          window.open(area.config.url, '_blank');
        } else {
          window.open(area.config.url, '_blank');
        }
        break;

      case 'link_internal':
        // Find the page by ID and flip to it
        const pageIndex = pagesWithAreas.findIndex((p) => p.id === area.config.page_id);
        if (pageIndex >= 0) {
          // The flipbook will handle the page change
          console.log('Navigate to page:', pageIndex + 1);
        }
        break;

      case 'javascript':
        try {
          // Execute custom JavaScript
          eval(area.config.code);
        } catch (error) {
          console.error('JavaScript execution error:', error);
        }
        break;

      case 'audio':
        if (audioPlayer) {
          audioPlayer.pause();
        }
        const audio = new Audio(area.config.url);
        if (area.config.autoplay) {
          audio.play();
        }
        setAudioPlayer(audio);
        break;

      case 'video':
        if (area.config.display === 'popup') {
          setVideoPopup(area);
        } else {
          window.open(area.config.url, '_blank');
        }
        break;

      default:
        break;
    }
  };

  const getEmbedUrl = (url, provider) => {
    if (provider === 'youtube') {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    } else if (provider === 'vimeo') {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    } else if (provider === 'dailymotion') {
      const videoId = url.match(/dailymotion\.com\/video\/([^_]+)/)?.[1];
      return videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : url;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading catalog...</div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Catalog not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header with Search */}
      <header className="bg-gray-800 text-white shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold truncate">{catalog.name}</h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans le catalogue..."
                  className="w-full px-4 py-2 pr-10 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <Search size={20} />
                </button>
              </div>
              {searchResults && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                    setHighlightedWords([]);
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </form>
          </div>

          {/* Search Results Summary */}
          {searchResults && (
            <div className="mt-2 text-sm text-gray-300">
              {searchResults.totalOccurrences} occurrence(s) trouvée(s) sur {searchResults.totalPages} page(s)
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Search Results Sidebar */}
        {searchResults && searchResults.results.length > 0 && (
          <aside className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <h2 className="text-white font-semibold mb-3">Résultats</h2>
              <div className="space-y-2">
                {searchResults.results.map((result) => (
                  <button
                    key={result.pageNumber}
                    onClick={() => handleResultClick(result.pageNumber, result.words)}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="text-white font-medium">Page {result.pageNumber}</div>
                    <div className="text-gray-400 text-sm">
                      {result.occurrences} occurrence(s)
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Flipbook Viewer */}
        <div ref={viewerContainerRef} className="flex-1 flex items-center justify-center overflow-auto">
          <FlipBook
            ref={flipBookRef}
            pages={pagesWithAreas}
            highlightedWords={highlightedWords}
            containerWidth={containerWidth}
            onAreaClick={handleAreaClick}
            onPageChange={(pageIndex) => {
              console.log('Page changed to:', pageIndex);
            }}
          />
        </div>
      </main>

      {/* Video Popup */}
      {videoPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg max-w-4xl w-full mx-4">
            <button
              onClick={() => setVideoPopup(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded"
            >
              <X size={24} />
            </button>
            <div className="aspect-video">
              {videoPopup.config.provider === 'mp4' ? (
                <video
                  src={videoPopup.config.url}
                  controls
                  autoPlay
                  className="w-full h-full rounded-lg"
                />
              ) : (
                <iframe
                  src={getEmbedUrl(videoPopup.config.url, videoPopup.config.provider)}
                  className="w-full h-full rounded-lg"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
