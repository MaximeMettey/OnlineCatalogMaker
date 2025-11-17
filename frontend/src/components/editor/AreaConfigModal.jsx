import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AreaConfigModal({ area, onSave, onClose }) {
  const [type, setType] = useState(area?.type || 'link_external');
  const [config, setConfig] = useState(area?.config || {});

  useEffect(() => {
    if (area) {
      setType(area.type || 'link_external');
      setConfig(area.config || {});
    }
  }, [area]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const areaData = {
      type,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      config,
    };

    onSave(areaData);
  };

  const renderConfigFields = () => {
    switch (type) {
      case 'link_external':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Target</label>
              <select
                value={config.target || '_blank'}
                onChange={(e) => setConfig({ ...config, target: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="_blank">New Tab</option>
                <option value="iframe">Iframe</option>
              </select>
            </div>
          </>
        );

      case 'link_internal':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Page Number
            </label>
            <input
              type="number"
              value={config.page_id || ''}
              onChange={(e) => setConfig({ ...config, page_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              required
            />
          </div>
        );

      case 'javascript':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JavaScript Code
            </label>
            <textarea
              value={config.code || ''}
              onChange={(e) => setConfig({ ...config, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              rows="4"
              placeholder="alert('Hello!');"
              required
            />
          </div>
        );

      case 'audio':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Audio URL</label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com/audio.mp3"
                required
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.autoplay || false}
                  onChange={(e) => setConfig({ ...config, autoplay: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Autoplay</span>
              </label>
            </div>
          </>
        );

      case 'video':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Video URL</label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://youtube.com/watch?v=..."
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <select
                value={config.provider || 'youtube'}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="mp4">MP4</option>
                <option value="youtube">YouTube</option>
                <option value="dailymotion">Dailymotion</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Display</label>
              <select
                value={config.display || 'popup'}
                onChange={(e) => setConfig({ ...config, display: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="inline">Inline</option>
                <option value="popup">Popup</option>
              </select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Configure Clickable Area</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Area Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setConfig({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="link_external">External Link</option>
              <option value="link_internal">Internal Link</option>
              <option value="javascript">JavaScript</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
          </div>

          {renderConfigFields()}

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
