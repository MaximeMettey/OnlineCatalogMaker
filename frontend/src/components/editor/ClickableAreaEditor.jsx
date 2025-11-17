import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from '../../hooks/use-image';
import { Plus, Trash2, Edit2, Save } from 'lucide-react';
import clickableAreaService from '../../services/clickableArea';
import AreaConfigModal from './AreaConfigModal';

function PageImage({ src, onLoad }) {
  const [image] = useImage(src);

  useEffect(() => {
    if (image) {
      onLoad(image);
    }
  }, [image, onLoad]);

  return <KonvaImage image={image} />;
}

export default function ClickableAreaEditor({ page }) {
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [tempRect, setTempRect] = useState(null);
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const stageRef = useRef(null);

  const imageUrl = `/uploads/${page.png_path}`;

  useEffect(() => {
    loadAreas();
  }, [page.id]);

  const loadAreas = async () => {
    try {
      const data = await clickableAreaService.getPageAreas(page.id);
      setAreas(data);
    } catch (error) {
      console.error('Failed to load areas:', error);
    }
  };

  const handleImageLoad = (image) => {
    setImageLoaded(true);
    // Calculate scale to fit in viewport
    const maxWidth = 1000;
    const maxHeight = 700;
    const scaleX = maxWidth / image.width;
    const scaleY = maxHeight / image.height;
    setScale(Math.min(scaleX, scaleY, 1));
  };

  const handleMouseDown = (e) => {
    if (!isDrawing) return;

    const stage = stageRef.current;
    const point = stage.getPointerPosition();
    const scaledPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };
    setDrawStart(scaledPoint);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !drawStart) return;

    const stage = stageRef.current;
    const point = stage.getPointerPosition();
    const scaledPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };

    setTempRect({
      x: Math.min(drawStart.x, scaledPoint.x),
      y: Math.min(drawStart.y, scaledPoint.y),
      width: Math.abs(scaledPoint.x - drawStart.x),
      height: Math.abs(scaledPoint.y - drawStart.y),
    });
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !tempRect || tempRect.width < 10 || tempRect.height < 10) {
      setDrawStart(null);
      setTempRect(null);
      return;
    }

    // Open modal to configure the area
    setEditingArea(tempRect);
    setShowModal(true);
    setDrawStart(null);
    setTempRect(null);
    setIsDrawing(false);
  };

  const handleSaveArea = async (areaData) => {
    try {
      if (selectedArea) {
        // Update existing area
        await clickableAreaService.updateArea(selectedArea.id, areaData);
      } else {
        // Create new area
        await clickableAreaService.createArea(page.id, areaData);
      }
      loadAreas();
      setShowModal(false);
      setEditingArea(null);
      setSelectedArea(null);
    } catch (error) {
      alert('Failed to save area: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteArea = async (area) => {
    if (!confirm('Delete this clickable area?')) return;

    try {
      await clickableAreaService.deleteArea(area.id);
      loadAreas();
    } catch (error) {
      alert('Failed to delete area: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditArea = (area) => {
    setSelectedArea(area);
    setEditingArea({
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      ...area,
    });
    setShowModal(true);
  };

  const getAreaColor = (type) => {
    const colors = {
      link_external: '#3b82f6',
      link_internal: '#10b981',
      javascript: '#f59e0b',
      audio: '#8b5cf6',
      video: '#ec4899',
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="flex gap-4">
      {/* Canvas */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-4">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              isDrawing
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Plus size={18} />
            {isDrawing ? 'Drawing... (Click to stop)' : 'Draw New Area'}
          </button>
        </div>

        {imageLoaded && (
          <Stage
            ref={stageRef}
            width={page.width * scale}
            height={page.height * scale}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="border border-gray-300"
          >
            <Layer>
              <PageImage src={imageUrl} onLoad={handleImageLoad} />

              {/* Existing areas */}
              {areas.map((area, i) => (
                <Rect
                  key={area.id}
                  x={area.x}
                  y={area.y}
                  width={area.width}
                  height={area.height}
                  stroke={getAreaColor(area.type)}
                  strokeWidth={2 / scale}
                  fill={getAreaColor(area.type) + '33'}
                  onClick={() => handleEditArea(area)}
                />
              ))}

              {/* Temporary drawing rectangle */}
              {tempRect && (
                <Rect
                  x={tempRect.x}
                  y={tempRect.y}
                  width={tempRect.width}
                  height={tempRect.height}
                  stroke="#3b82f6"
                  strokeWidth={2 / scale}
                  fill="#3b82f633"
                  dash={[10 / scale, 5 / scale]}
                />
              )}
            </Layer>
          </Stage>
        )}
      </div>

      {/* Areas List */}
      <div className="w-80 bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">Clickable Areas</h3>
        {areas.length === 0 ? (
          <p className="text-gray-500 text-sm">No clickable areas yet</p>
        ) : (
          <div className="space-y-2">
            {areas.map((area, i) => (
              <div
                key={area.id}
                className="border border-gray-200 rounded p-3 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded"
                    style={{
                      backgroundColor: getAreaColor(area.type) + '33',
                      color: getAreaColor(area.type),
                    }}
                  >
                    {area.type.replace('_', ' ')}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditArea(area)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteArea(area)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  Position: ({Math.round(area.x)}, {Math.round(area.y)})
                  <br />
                  Size: {Math.round(area.width)} x {Math.round(area.height)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Area Config Modal */}
      {showModal && (
        <AreaConfigModal
          area={editingArea}
          onSave={handleSaveArea}
          onClose={() => {
            setShowModal(false);
            setEditingArea(null);
            setSelectedArea(null);
          }}
        />
      )}
    </div>
  );
}
