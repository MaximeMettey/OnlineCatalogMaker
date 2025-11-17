import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Edit3, Layers } from 'lucide-react';
import catalogService from '../services/catalog';
import ClickableAreaEditor from '../components/editor/ClickableAreaEditor';
import PageManagement from '../components/admin/PageManagement';

export default function CatalogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'manage'

  useEffect(() => {
    loadCatalog();
  }, [id]);

  const loadCatalog = async () => {
    try {
      const [catalogData, pagesData] = await Promise.all([
        catalogService.getCatalog(id),
        catalogService.getPages(id),
      ]);
      setCatalog(catalogData);
      setPages(pagesData);
    } catch (error) {
      console.error('Failed to load catalog:', error);
      alert('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  const currentPage = pages[currentPageIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!catalog || pages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Catalog not found or has no pages</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{catalog.name}</h1>
                <p className="text-sm text-gray-600">
                  {pages.length} page{pages.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Page Navigation (only shown in edit mode) */}
            {activeTab === 'edit' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex === 0}
                  className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="px-4 py-2 bg-gray-100 rounded-md">
                  {currentPageIndex + 1} / {pages.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))
                  }
                  disabled={currentPageIndex === pages.length - 1}
                  className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'edit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Edit3 size={18} />
              Edit Clickable Areas
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'manage'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Layers size={18} />
              Manage Pages
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'edit' && currentPage && <ClickableAreaEditor page={currentPage} />}
        {activeTab === 'manage' && (
          <PageManagement catalogId={id} pages={pages} onPagesChanged={loadCatalog} />
        )}
      </main>
    </div>
  );
}
