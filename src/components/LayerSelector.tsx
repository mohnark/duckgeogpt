import React, { useState } from 'react';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
}

interface LayerSelectorProps {
  layers: Layer[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
}

const LayerSelector: React.FC<LayerSelectorProps> = ({ layers, onLayerToggle }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: '200px',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div 
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #eee',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span>Layers</span>
        <span style={{ 
          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.3s ease'
        }}>
          ▼
        </span>
      </div>

      {/* Layer List */}
      {!isCollapsed && (
        <div style={{ padding: '8px 0' }}>
          {layers.map((layer) => (
            <div 
              key={layer.id}
              style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => onLayerToggle(layer.id, !layer.visible)}
            >
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => onLayerToggle(layer.id, !layer.visible)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>{layer.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LayerSelector; 