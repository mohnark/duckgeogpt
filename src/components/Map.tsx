import React, { useEffect, useState, useRef } from 'react';
import { Map, useControl } from 'react-map-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { DeckProps } from '@deck.gl/core';
import { LineLayer, PolygonLayer } from '@deck.gl/layers';
import { NavigationControl } from 'react-map-gl';
import ChatBox from './ChatBox';
import { fetchTartuData } from '../services/overpassService';

const TARTU_CENTER = [26.7251, 58.3776];

interface MapData {
  roads: any[];
  buildings: any[];
  queryLayers?: any[];
}

function DeckGLOverlay(props: DeckProps & { interleaved?: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({ ...props, interleaved: props.interleaved }));
  overlay.setProps(props);
  return null;
}

const MapComponent: React.FC = () => {
  const [mapData, setMapData] = useState<MapData>({ roads: [], buildings: [], queryLayers: [] });
  const [viewState, setViewState] = useState({
    longitude: TARTU_CENTER[0],
    latitude: TARTU_CENTER[1],
    zoom: 13,
    pitch: 0,
    bearing: 0,
    width: window.innerWidth,
    height: window.innerHeight
    // padding?: any
  } as any);
  const mapRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTartuData();
      setMapData(prev => ({ ...prev, roads: data.roads, buildings: data.buildings }));
    };
    loadData();
  }, []);

  // Update width/height on resize
  useEffect(() => {
    const handleResize = () => {
      setViewState((prev: any) => ({ ...prev, width: window.innerWidth, height: window.innerHeight }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layers = [
    new LineLayer({
      id: 'roads-layer',
      data: mapData.roads,
      getPath: (d: any) => d.geometry?.coordinates || [],
      getColor: [255, 0, 0],
      getWidth: 2,
      pickable: true,
      visible: true
    }),
    new PolygonLayer({
      id: 'buildings-layer',
      data: mapData.buildings,
      getPolygon: (d: any) => d.geometry?.coordinates || [],
      getFillColor: [0, 0, 255],
      getLineColor: [0, 0, 0],
      getLineWidth: 1,
      pickable: true,
      visible: true
    }),
    ...(mapData.queryLayers || [])
  ];

  // Add a new query layer to the map
  const handleQueryGenerated = async (query: string, label?: string) => {
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch data from Overpass API');
      const data = await response.json();
      if (data.elements && data.elements.length > 0) {
        // Try to detect geometry type
        const isPolygon = data.elements.some((el: any) => el.geometry && el.geometry.length > 2 && el.geometry[0].lat === el.geometry[el.geometry.length-1].lat && el.geometry[0].lon === el.geometry[el.geometry.length-1].lon);
        const processedData = data.elements
          .filter((element: any) => element.type === 'way' && element.geometry)
          .map((element: any) => ({
            id: element.id,
            type: 'Feature',
            geometry: {
              type: isPolygon ? 'Polygon' : 'LineString',
              coordinates: isPolygon
                ? [element.geometry.map((coord: any) => [coord.lon, coord.lat])]
                : element.geometry.map((coord: any) => [coord.lon, coord.lat])
            },
            properties: element.tags || {}
          }));
        const color = isPolygon ? [255, 165, 0, 180] : [0, 255, 0, 180];
        const layer = isPolygon
          ? new PolygonLayer({
              id: `query-polygon-${Date.now()}`,
              data: processedData,
              getPolygon: (d: any) => d.geometry.coordinates,
              getFillColor: () => [255, 165, 0, 180],
              getLineColor: () => [0, 0, 0, 255],
              getLineWidth: 2,
              pickable: true,
              visible: true
            })
          : new LineLayer({
              id: `query-line-${Date.now()}`,
              data: processedData,
              getPath: (d: any) => d.geometry.coordinates,
              getColor: () => [0, 255, 0, 180],
              getWidth: 3,
              pickable: true,
              visible: true
            });
        setMapData(prev => ({
          ...prev,
          queryLayers: [...(prev.queryLayers || []), layer]
        }));
      }
    } catch (error) {
      console.error('Error executing generated query:', error);
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
        setViewState((prev: any) => ({
          ...prev,
          longitude: parseFloat(lon),
          latitude: parseFloat(lat),
          zoom: 13
        }));
      }
    } catch (error) {
      console.error('Error centering map:', error);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map
        ref={mapRef}
        initialViewState={viewState}
        viewState={viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
      >
        <DeckGLOverlay layers={layers} interleaved />
        <NavigationControl position="top-right" />
      </Map>
      <ChatBox onQueryGenerated={handleQueryGenerated} onCenterMap={handleCenterMap} />
    </div>
  );
};

export default MapComponent; 