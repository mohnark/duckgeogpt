import React, { useEffect, useState, useMemo } from 'react';
import { Map, NavigationControl, ViewState } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { WebMercatorViewport } from '@deck.gl/core';
import 'mapbox-gl/dist/mapbox-gl.css';
import ChatBox from './ChatBox';

const TARTU_CENTER = [26.7251, 58.3776];

const INITIAL_VIEW_STATE: ViewState = {
  longitude: TARTU_CENTER[0],
  latitude: TARTU_CENTER[1],
  zoom: 13,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 }
};

interface MapData {
  roads: any[];
  buildings: any[];
  queryLayers?: any[];
}

const MapComponent: React.FC = () => {
  const [mapData, setMapData] = useState<MapData>({ roads: [], buildings: [], queryLayers: [] });
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [queryResults, setQueryResults] = useState<any>(null);

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
      }
    } catch (error) {
      console.error('Error centering map:', error);
    }
  };

  // Create layers using useMemo for better performance
  const layers = useMemo(() => {
    const out = [];
    
    // Add query results layer
    if (queryResults) {
      console.log('Creating GeoJsonLayer with data:', queryResults);
      out.push(
        new GeoJsonLayer({
          id: 'duckdb-query-results',
          data: queryResults,
          pickable: true,
          stroked: true,
          filled: true,
          getLineColor: [0, 255, 0],
          getFillColor: [255, 165, 0, 180],
          lineWidthMinPixels: 2,
          getTooltip: ({ object }: { object: any }) =>
            object && `Feature: ${JSON.stringify(object.properties, null, 2)}`
        })
      );
    }
    
    console.log('Layers created:', out.length, 'layers');
    return out;
  }, [queryResults]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
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
      <ChatBox onQueryGenerated={handleQueryGenerated} onCenterMap={handleCenterMap} />
    </div>
  );
};

export default MapComponent; 