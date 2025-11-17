import { useState, useRef } from 'react';
import { Upload, Trash2, FileUp, X, GripVertical, Plus } from 'lucide-react';
import catalogService from '../../services/catalog';

export default function PageManagement({ catalogId, pages, onPagesChanged }) {
  const [draggedPage, setDraggedPage] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertPosition, setInsertPosition] = useState(1);
  const [insertFile, setInsertFile] = useState(null);
  const [replacePageId, setReplacePageId] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  const handleDragStart = (e, page, index) => {
    setDraggedPage({ page, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedPage || draggedPage.index === targetIndex) {
      setDraggedPage(null);
      return;
    }

    try {
      // Create new page order
      const reorderedPages = [...pages];
      const [movedPage] = reorderedPages.splice(draggedPage.index, 1);
      reorderedPages.splice(targetIndex, 0, movedPage);

      // Create pageOrders array for API
      const pageOrders = reorderedPages.map((page, index) => ({
        pageId: page.id,
        newPosition: index + 1,
      }));

      setLoading(true);
      await catalogService.reorderPages(catalogId, pageOrders);

      // Reload pages
      await onPagesChanged();
    } catch (error) {
      alert('Failed to reorder pages: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      setDraggedPage(null);
    }
  };

  const handleDeletePage = async (pageId, pageNumber) => {
    if (!confirm(`Delete page ${pageNumber}? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await catalogService.deletePage(pageId);
      await onPagesChanged();
    } catch (error) {
      alert('Failed to delete page: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInsertPages = async (e) => {
    e.preventDefault();
    if (!insertFile) return;

    try {
      setLoading(true);
      await catalogService.insertPages(catalogId, insertPosition, insertFile);
      setShowInsertModal(false);
      setInsertFile(null);
      setInsertPosition(1);
      await onPagesChanged();
    } catch (error) {
      alert('Failed to insert pages: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReplacePage = async () => {
    if (!replaceFile || !replacePageId) return;

    try {
      setLoading(true);
      await catalogService.replacePage(replacePageId, replaceFile);
      setReplacePageId(null);
      setReplaceFile(null);
      await onPagesChanged();
    } catch (error) {
      alert('Failed to replace page: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Insert Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Page Management</h3>
        <button
          onClick={() => setShowInsertModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus size={18} />
          Insert Pages
        </button>
      </div>

      {/* Page Grid with Drag & Drop */}
      <div className="grid grid-cols-4 gap-4">
        {pages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => handleDragStart(e, page, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`relative border-2 rounded-lg p-2 cursor-move transition-all ${
              dragOverIndex === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            {/* Drag Handle */}
            <div className="absolute top-1 left-1 bg-white rounded p-1 shadow">
              <GripVertical size={16} className="text-gray-400" />
            </div>

            {/* Page Number */}
            <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
              {page.page_number}
            </div>

            {/* Thumbnail */}
            <img
              src={`/${page.png_path}`}
              alt={`Page ${page.page_number}`}
              className="w-full h-32 object-contain bg-gray-100 rounded mb-2"
            />

            {/* Actions */}
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setReplacePageId(page.id);
                  replaceInputRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded text-xs"
                title="Replace page"
              >
                <FileUp size={14} />
                Replace
              </button>
              <button
                onClick={() => handleDeletePage(page.id, page.page_number)}
                className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs"
                title="Delete page"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Insert Pages Modal */}
      {showInsertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Insert Pages</h2>
              <button
                onClick={() => setShowInsertModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInsertPages}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insert at position
                </label>
                <input
                  type="number"
                  value={insertPosition}
                  onChange={(e) => setInsertPosition(parseInt(e.target.value))}
                  min="1"
                  max={pages.length + 1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pages will be inserted before this position
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setInsertFile(e.target.files[0])}
                  className="w-full"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  All pages from the PDF will be inserted
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !insertFile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Inserting...' : 'Insert'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInsertModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden file input for replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => {
          setReplaceFile(e.target.files[0]);
          if (e.target.files[0]) {
            handleReplacePage();
          }
        }}
        className="hidden"
      />

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700">Processing...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
