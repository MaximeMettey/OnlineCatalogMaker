import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import catalogService from '../services/catalog';

export default function CatalogViewer() {
  const { slug } = useParams();
  const [catalog, setCatalog] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPageData, setCurrentPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoPopup, setVideoPopup] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);

  useEffect(() => {
    loadCatalog();
  }, [slug]);

  useEffect(() => {
    if (pages.length > 0) {
      loadPage(currentPageIndex + 1);
    }
  }, [currentPageIndex, pages]);

  const loadCatalog = async () => {
    try {
      const [catalogData, pagesData] = await Promise.all([
        catalogService.getViewerCatalog(slug),
        catalogService.getViewerPages(slug),
      ]);
      setCatalog(catalogData);
      setPages(pagesData);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async (pageNum) => {
    try {
      const data = await catalogService.getViewerPage(slug, pageNum);
      setCurrentPageData(data);
    } catch (error) {
      console.error('Failed to load page:', error);
    }
  };

  const handleAreaClick = (area) => {
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
        const pageIndex = pages.findIndex((p) => p.id === area.config.page_id);
        if (pageIndex >= 0) {
          setCurrentPageIndex(pageIndex);
        }
        break;

      case 'javascript':
        try {
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
        <div className="text-white text-xl">Loading...</div>
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

  const currentPage = pages[currentPageIndex];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">{catalog.name}</h1>
        </div>
      </header>

      {/* Viewer */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center">
          {/* Navigation */}
          <div className="mb-4 flex items-center gap-4">
            <button
              onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex === 0}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="text-white px-4 py-2 bg-gray-700 rounded-md">
              Page {currentPageIndex + 1} / {pages.length}
            </span>
            <button
              onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
              disabled={currentPageIndex === pages.length - 1}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Page with clickable areas */}
          {currentPage && currentPageData && (
            <div className="relative">
              <img
                src={`/${currentPage.png_path}`}
                alt={`Page ${currentPageIndex + 1}`}
                className="max-w-full h-auto shadow-2xl"
              />

              {/* Clickable areas overlay */}
              {currentPageData.areas?.map((area) => (
                <div
                  key={area.id}
                  onClick={() => handleAreaClick(area)}
                  style={{
                    position: 'absolute',
                    left: `${(area.x / currentPage.width) * 100}%`,
                    top: `${(area.y / currentPage.height) * 100}%`,
                    width: `${(area.width / currentPage.width) * 100}%`,
                    height: `${(area.height / currentPage.height) * 100}%`,
                    cursor: 'pointer',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                  className="hover:border-blue-400 hover:bg-blue-500/20"
                  title={area.type.replace('_', ' ')}
                />
              ))}
            </div>
          )}
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
