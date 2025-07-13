import React, { useEffect, useState, useMemo } from 'react';
import { Map, NavigationControl, ViewState } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { WebMercatorViewport } from '@deck.gl/core';
import 'mapbox-gl/dist/mapbox-gl.css';
import ChatBox from './ChatBox';
import InfoPanel from './InfoPanel';
import SearchBar from './SearchBar';
import ExportPanel from './ExportPanel';

const TARTU_CENTER = [26.7251, 58.3776];

const INITIAL_VIEW_STATE: ViewState = {
  longitude: TARTU_CENTER[0],
  latitude: TARTU_CENTER[1],
  zoom: 13,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 }
};

interface QueryResult {
  id: string;
  name: string;
  data: any;
  timestamp: Date;
  visible: boolean;
}

interface MapData {
  roads: any[];
  buildings: any[];
  queryLayers?: any[];
}

const MapComponent: React.FC = () => {
  const [mapData, setMapData] = useState<MapData>({ roads: [], buildings: [], queryLayers: [] });
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [queryResults, setQueryResults] = useState<any>(null);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [showLayerControls, setShowLayerControls] = useState(false);
  const [currentQueryName, setCurrentQueryName] = useState<string>('');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('Estonia');

  // Calculate bounding box and fit viewport
  const fitViewportToFeatures = (features: any[]) => {
    if (!features || features.length === 0) return;

    console.log('Fitting viewport to', features.length, 'features');

    const coords = features.flatMap((f: any) => {
      const g = f.geometry;
      if (!g) return [];
      const c = g.coordinates;
      switch (g.type) {
        case 'Point': return [c];
        case 'MultiPoint':
        case 'LineString': return c;
        case 'Polygon':
        case 'MultiLineString': return c.flat();
        case 'MultiPolygon': return c.flat(2);
        default: return [];
      }
    });

    if (coords.length) {
      const lons = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      
      console.log('Coordinate ranges:', {
        lons: [Math.min(...lons), Math.max(...lons)],
        lats: [Math.min(...lats), Math.max(...lats)]
      });

      const viewport = new WebMercatorViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      const { longitude, latitude, zoom } = viewport.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)]
        ],
        { padding: 20 }
      );
      
      console.log('New viewport:', { longitude, latitude, zoom });
      setViewState({ 
        longitude, 
        latitude, 
        zoom, 
        pitch: 0, 
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 }
      });
    }
  };

  // Handle DuckDB query results
  const handleQueryGenerated = async (geoJSONString: string, label?: string) => {
    try {
      console.log('Received GeoJSON string:', geoJSONString.substring(0, 200) + '...');
      const geoJSON = JSON.parse(geoJSONString);
      console.log('Parsed GeoJSON:', geoJSON);
      
      if (geoJSON.features && geoJSON.features.length > 0) {
        console.log(`Processing ${geoJSON.features.length} features`);
        
        // Store the query results
        setQueryResults(geoJSON);
        
        // Add to query history
        const queryName = label || `Query ${queryHistory.length + 1}`;
        const newQuery: QueryResult = {
          id: Date.now().toString(),
          name: queryName,
          data: geoJSON,
          timestamp: new Date(),
          visible: true
        };
        
        setQueryHistory(prev => [...prev, newQuery]);
        setCurrentQueryName(queryName);
        
        // Fit viewport to the features
        fitViewportToFeatures(geoJSON.features);
        
        console.log(`Added ${geoJSON.features.length} features from DuckDB query`);
      } else {
        console.log('No features found in GeoJSON');
      }
    } catch (error) {
      console.error('Error processing DuckDB results:', error);
    }
  };

  // Center the map on a place using Nominatim
  const handleCenterMap = async (place: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lon, lat } = data[0];
        setViewState({
          longitude: parseFloat(lon),
          latitude: parseFloat(lat),
          zoom: 13,
          pitch: 0,
          bearing: 0,
          padding: { top: 0, bottom: 0, left: 0, right: 0 }
        });
        setCurrentLocation(place);
      }
    } catch (error) {
      console.error('Error centering map:', error);
    }
  };

  // Handle location selection from search bar
  const handleLocationSelect = (place: string, lat: number, lon: number) => {
    if (lat !== 0 && lon !== 0) {
      setViewState({
        longitude: lon,
        latitude: lat,
        zoom: 13,
        pitch: 0,
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      setCurrentLocation(place);
    } else {
      handleCenterMap(place);
    }
  };

  // Toggle layer visibility
  const toggleLayerVisibility = (queryId: string) => {
    setQueryHistory(prev => 
      prev.map(query => 
        query.id === queryId 
          ? { ...query, visible: !query.visible }
          : query
      )
    );
  };

  // Remove layer from history
  const removeLayer = (queryId: string) => {
    setQueryHistory(prev => prev.filter(query => query.id !== queryId));
  };

  // Clear all layers
  const clearAllLayers = () => {
    setQueryHistory([]);
    setQueryResults(null);
  };

  // Create layers using useMemo for better performance
  const layers = useMemo(() => {
    const out: any[] = [];
    
    // Add layers from query history
    queryHistory.forEach((query, index) => {
      if (query.visible) {
        const colors = [
          [255, 165, 0, 180], // Orange
          [0, 255, 0, 180],   // Green
          [255, 0, 255, 180], // Magenta
          [0, 255, 255, 180], // Cyan
          [255, 255, 0, 180], // Yellow
          [255, 0, 0, 180],   // Red
          [0, 0, 255, 180],   // Blue
        ];
        
        const color = colors[index % colors.length];
        const lineColor = [color[0] * 0.7, color[1] * 0.7, color[2] * 0.7];
        
        out.push(
          new GeoJsonLayer({
            id: `query-${query.id}`,
            data: query.data,
            pickable: true,
            stroked: true,
            filled: true,
            getLineColor: lineColor as [number, number, number],
            getFillColor: color as [number, number, number, number],
            lineWidthMinPixels: 2,
            getTooltip: ({ object }: { object: any }) =>
              object && `${query.name}: ${JSON.stringify(object.properties, null, 2)}`
          })
        );
      }
    });
    
    console.log('Layers created:', out.length, 'layers');
    return out;
  }, [queryHistory]);

  return (
    <div style={{ width: '100%', height: '99vh', position: 'relative' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => {
          if (newViewState && typeof newViewState === 'object' && 'longitude' in newViewState) {
            setViewState(newViewState as ViewState);
          }
        }}
        controller
        layers={layers}
      >
        <Map
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
          mapStyle="mapbox://styles/mapbox/light-v11"
        >
          <NavigationControl position="top-left" />
        </Map>
      </DeckGL>

      {/* Layer Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '300px',
        maxHeight: '400px',
        overflow: 'auto',
        zIndex: 1000
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          borderBottom: '1px solid #eee',
          paddingBottom: '8px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Layers</h3>
          <button
            onClick={() => setShowLayerControls(!showLayerControls)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            {showLayerControls ? '−' : '+'}
          </button>
        </div>
        
        {showLayerControls && (
          <div>
            {queryHistory.length === 0 ? (
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                No layers yet. Run a query to see results here.
              </p>
            ) : (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <button
                    onClick={clearAllLayers}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
                
                {queryHistory.map((query) => (
                  <div
                    key={query.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      backgroundColor: query.visible ? '#f8f9fa' : '#f1f3f4'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: query.visible ? '#000' : '#666'
                      }}>
                        {query.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        {query.data.features.length} features
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => toggleLayerVisibility(query.id)}
                        style={{
                          background: query.visible ? '#28a745' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        {query.visible ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => removeLayer(query.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Current Query Info */}
      {currentQueryName && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 123, 255, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          {currentQueryName}
        </div>
      )}

      <ChatBox onQueryGenerated={handleQueryGenerated} onCenterMap={handleCenterMap} />
      
      <SearchBar onLocationSelect={handleLocationSelect} />
      
      <InfoPanel 
        isVisible={showInfoPanel}
        onToggle={() => setShowInfoPanel(!showInfoPanel)}
        currentLocation={currentLocation}
        totalFeatures={queryHistory.reduce((sum, query) => sum + query.data.features.length, 0)}
        activeLayers={queryHistory.filter(q => q.visible).length}
      />
      
      <ExportPanel
        isVisible={showExportPanel}
        onToggle={() => setShowExportPanel(!showExportPanel)}
        queryHistory={queryHistory}
      />
    </div>
  );
};

export default MapComponent; 