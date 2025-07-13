import React from 'react';

interface InfoPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  currentLocation?: string;
  totalFeatures?: number;
  activeLayers?: number;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ 
  isVisible, 
  onToggle, 
  currentLocation, 
  totalFeatures, 
  activeLayers 
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 1000
    }}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#333',
          border: '1px solid #ddd',
          cursor: 'pointer',
          fontSize: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ℹ️
      </button>

      {/* Info Panel */}
      {isVisible && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '0',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          minWidth: '250px',
          maxWidth: '300px'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Map Information
          </h3>
          
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Location:</strong> {currentLocation || 'Estonia'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Active Layers:</strong> {activeLayers || 0}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Total Features:</strong> {totalFeatures || 0}
            </div>
            
            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#666'
            }}>
              <strong>Data Sources:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                <li>Buildings (OpenStreetMap)</li>
                <li>Roads (OpenStreetMap)</li>
                <li>Land Use (OpenStreetMap)</li>
              </ul>
            </div>
            
            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              backgroundColor: '#e7f3ff', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#0056b3'
            }}>
              💡 <strong>Tip:</strong> Use the chat to explore data or try quick actions for common queries.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoPanel; 